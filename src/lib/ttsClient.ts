// Client-side TTS manager. Calls the Supabase Edge Function
// `elevenlabs-tts` which proxies ElevenLabs. Handles queueing, cancellation,
// mute persistence, the browser's autoplay-policy unlock, and progressive
// playback via MediaSource Extensions so audio begins as soon as the first
// chunk arrives.

import { isAudioUnlocked, waitForAudioUnlock } from './audio-unlock'
export { onAudioUnlock } from './audio-unlock'
import { getVoiceId } from './voicePreference'

const MUTE_KEY = 'chi.tts.muted.v1'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const TTS_URL = `${SUPABASE_URL}/functions/v1/elevenlabs-tts`

export type TTSStatus = 'idle' | 'loading' | 'buffering' | 'speaking' | 'stopped' | 'error'

export interface SpeakOptions {
  voiceId?: string
  onStart?: () => void
  onDuration?: (ms: number) => void
  onEnd?: (reason: 'completed' | 'cancelled' | 'error') => void
  onStatus?: (status: TTSStatus) => void
}

interface Job {
  text: string
  opts?: SpeakOptions
  cancelled: boolean
  resolve: () => void
}

const queue: Job[] = []
let running = false
let currentJob: Job | null = null
let currentAudio: HTMLAudioElement | null = null
let currentObjectUrl: string | null = null
let currentAbort: AbortController | null = null
let currentMediaSource: MediaSource | null = null

const muteListeners = new Set<(muted: boolean) => void>()

export type TTSErrorKind = 'missing_key' | 'http_error' | 'network_error'
export interface TTSErrorInfo {
  kind: TTSErrorKind
  status?: number
  message: string
}
let lastError: TTSErrorInfo | null = null
const errorListeners = new Set<(err: TTSErrorInfo | null) => void>()
function emitError(err: TTSErrorInfo | null) {
  lastError = err
  errorListeners.forEach((cb) => cb(err))
}
export function getTTSError(): TTSErrorInfo | null { return lastError }
export function subscribeTTSError(cb: (err: TTSErrorInfo | null) => void): () => void {
  errorListeners.add(cb)
  cb(lastError)
  return () => { errorListeners.delete(cb) }
}
export function clearTTSError() { emitError(null) }

// ---- Prefetch cache --------------------------------------------------------
const blobCache = new Map<string, Promise<Blob | null>>()

function ttsCacheKey(text: string, voiceId: string): string {
  return `${voiceId}::${text}`
}

async function fetchTTSBlob(text: string, voiceId: string): Promise<Blob | null> {
  try {
    const res = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
      },
      body: JSON.stringify({ text, voiceId }),
    })
    if (!res.ok || res.status === 204) return null
    const raw = await res.blob()
    return raw.type === 'audio/mpeg' ? raw : new Blob([raw], { type: 'audio/mpeg' })
  } catch {
    return null
  }
}

export function prefetchTTS(text: string, voiceId?: string): Promise<void> {
  if (typeof window === 'undefined' || !text || !text.trim()) return Promise.resolve()
  const vid = voiceId ?? getVoiceId()
  const key = ttsCacheKey(text, vid)
  if (!blobCache.has(key)) {
    blobCache.set(key, fetchTTSBlob(text, vid))
  }
  return blobCache.get(key)!.then(() => undefined)
}

function disposeCurrent() {
  if (currentAudio) {
    try { currentAudio.pause() } catch { /* ignore */ }
    currentAudio.src = ''
    currentAudio = null
  }
  if (currentMediaSource) {
    try {
      if (currentMediaSource.readyState === 'open') currentMediaSource.endOfStream()
    } catch { /* ignore */ }
    currentMediaSource = null
  }
  if (currentObjectUrl) {
    try { URL.revokeObjectURL(currentObjectUrl) } catch { /* ignore */ }
    currentObjectUrl = null
  }
  if (currentAbort) {
    try { currentAbort.abort() } catch { /* ignore */ }
    currentAbort = null
  }
}

export function isMuted(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(MUTE_KEY) === '1'
}

export function setMuted(v: boolean) {
  if (typeof window === 'undefined') return
  if (v) {
    window.localStorage.setItem(MUTE_KEY, '1')
    stopSpeaking()
  } else {
    window.localStorage.removeItem(MUTE_KEY)
  }
  muteListeners.forEach((cb) => cb(v))
}

export function subscribeMuted(cb: (muted: boolean) => void): () => void {
  muteListeners.add(cb)
  return () => muteListeners.delete(cb)
}

function canStreamMpeg(): boolean {
  if (typeof window === 'undefined') return false
  const MS = (window as unknown as { MediaSource?: typeof MediaSource }).MediaSource
  if (!MS) return false
  try { return MS.isTypeSupported('audio/mpeg') } catch { return false }
}

async function playViaMediaSource(
  job: Job,
  res: Response,
  ac: AbortController,
): Promise<'completed' | 'cancelled' | 'error'> {
  return new Promise<'completed' | 'cancelled' | 'error'>((resolve) => {
    let settled = false
    const finish = (reason: 'completed' | 'cancelled' | 'error') => {
      if (settled) return
      settled = true
      resolve(reason)
    }

    const ms = new MediaSource()
    currentMediaSource = ms
    const url = URL.createObjectURL(ms)
    currentObjectUrl = url
    const audio = new Audio()
    audio.preload = 'auto'
    audio.src = url
    currentAudio = audio

    let started = false
    let durationSent = false
    const sendDuration = () => {
      if (durationSent) return
      const d = audio.duration
      if (Number.isFinite(d) && d > 0) {
        durationSent = true
        job.opts?.onDuration?.(d * 1000)
      }
    }

    audio.addEventListener('loadedmetadata', sendDuration)
    audio.addEventListener('durationchange', sendDuration)
    audio.addEventListener('playing', () => {
      if (started) return
      started = true
      sendDuration()
      job.opts?.onStatus?.('speaking')
      job.opts?.onStart?.()
    })
    audio.addEventListener('ended', () => finish('completed'))
    audio.addEventListener('error', () => finish(job.cancelled ? 'cancelled' : 'error'))

    ms.addEventListener('sourceopen', async () => {
      let sb: SourceBuffer
      try {
        sb = ms.addSourceBuffer('audio/mpeg')
      } catch {
        finish('error')
        return
      }

      const reader = res.body!.getReader()
      const pending: Uint8Array[] = []
      let readerDone = false
      let appending = false

      const flush = () => {
        if (appending || sb.updating) return
        if (pending.length === 0) {
          if (readerDone) {
            try { if (ms.readyState === 'open') ms.endOfStream() } catch { /* ignore */ }
          }
          return
        }
        appending = true
        const chunk = pending.shift()!
        try { sb.appendBuffer(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer) } catch {
          appending = false
          finish('error')
        }
      }

      sb.addEventListener('updateend', async () => {
        appending = false
        if (!started && !job.cancelled && !ac.signal.aborted) {
          if (!isAudioUnlocked()) await waitForAudioUnlock()
          if (job.cancelled || ac.signal.aborted) { finish('cancelled'); return }
          audio.play().catch(() => finish('error'))
        }
        flush()
      })

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (job.cancelled || ac.signal.aborted) { finish('cancelled'); return }
          if (done) {
            readerDone = true
            flush()
            return
          }
          if (value && value.byteLength) {
            pending.push(value)
            flush()
          }
        }
      } catch {
        if (!job.cancelled && !ac.signal.aborted) finish('error')
        else finish('cancelled')
      }
    })
  })
}

async function playViaBlob(
  job: Job,
  res: Response,
  ac: AbortController,
): Promise<'completed' | 'cancelled' | 'error'> {
  let blob: Blob
  try {
    const raw = await res.blob()
    blob = raw.type === 'audio/mpeg' ? raw : new Blob([raw], { type: 'audio/mpeg' })
  } catch {
    return job.cancelled || ac.signal.aborted ? 'cancelled' : 'error'
  }
  if (job.cancelled || ac.signal.aborted) return 'cancelled'

  const url = URL.createObjectURL(blob)
  currentObjectUrl = url
  const audio = new Audio(url)
  currentAudio = audio

  if (!isAudioUnlocked()) {
    await waitForAudioUnlock()
    if (job.cancelled || ac.signal.aborted) return 'cancelled'
  }

  return new Promise<'completed' | 'cancelled' | 'error'>((resolve) => {
    let started = false
    let durationSent = false
    let settled = false
    const finish = (reason: 'completed' | 'cancelled' | 'error') => {
      if (settled) return
      settled = true
      resolve(reason)
    }
    const sendDuration = () => {
      if (durationSent) return
      const d = audio.duration
      if (Number.isFinite(d) && d > 0) {
        durationSent = true
        job.opts?.onDuration?.(d * 1000)
      }
    }
    audio.addEventListener('loadedmetadata', sendDuration)
    audio.addEventListener('durationchange', sendDuration)
    audio.addEventListener('playing', () => {
      if (started) return
      started = true
      sendDuration()
      job.opts?.onStatus?.('speaking')
      job.opts?.onStart?.()
    })
    audio.addEventListener('ended', () => finish('completed'))
    audio.addEventListener('error', () => finish(job.cancelled ? 'cancelled' : 'error'))
    audio.play().catch(() => finish(job.cancelled ? 'cancelled' : 'error'))
  })
}

async function runJob(job: Job): Promise<void> {
  if (job.cancelled || isMuted()) {
    job.opts?.onStatus?.(job.cancelled ? 'stopped' : 'idle')
    job.opts?.onEnd?.('cancelled')
    return
  }

  currentJob = job
  const ac = new AbortController()
  currentAbort = ac
  job.opts?.onStatus?.('loading')

  const cacheVoiceId = job.opts?.voiceId ?? getVoiceId()
  const cacheKey = ttsCacheKey(job.text, cacheVoiceId)
  const cachedPromise = blobCache.get(cacheKey)
  if (cachedPromise) {
    const cachedBlob = await cachedPromise
    if (cachedBlob) {
      job.opts?.onStatus?.('buffering')
      const reason = await playViaBlob(job, new Response(cachedBlob), ac)
      if (currentJob === job) { disposeCurrent(); currentJob = null }
      const finalReason = job.cancelled ? 'cancelled' : reason
      job.opts?.onStatus?.(finalReason === 'cancelled' ? 'stopped' : finalReason === 'error' ? 'error' : 'idle')
      job.opts?.onEnd?.(finalReason)
      return
    }
    blobCache.delete(cacheKey)
  }

  let res: Response
  try {
    res = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
      },
      body: JSON.stringify({ text: job.text, voiceId: cacheVoiceId }),
      signal: ac.signal,
    })
  } catch (e) {
    if (currentJob === job) { disposeCurrent(); currentJob = null }
    const aborted = job.cancelled || ac.signal.aborted
    if (!aborted) {
      emitError({
        kind: 'network_error',
        message: `Could not reach the TTS edge function. Is it deployed? (${(e as Error).message || 'network error'})`,
      })
    }
    job.opts?.onStatus?.(aborted ? 'stopped' : 'error')
    job.opts?.onEnd?.(aborted ? 'cancelled' : 'error')
    return
  }

  if (job.cancelled || ac.signal.aborted) {
    if (currentJob === job) { disposeCurrent(); currentJob = null }
    job.opts?.onStatus?.('stopped')
    job.opts?.onEnd?.('cancelled')
    return
  }
  if (res.status === 204) {
    emitError({
      kind: 'missing_key',
      status: 204,
      message: 'Text-to-speech is not configured. Set ELEVENLABS_API_KEY in Supabase and redeploy the `elevenlabs-tts` edge function.',
    })
    if (currentJob === job) { disposeCurrent(); currentJob = null }
    job.opts?.onStatus?.('error')
    job.opts?.onEnd?.('error')
    return
  }
  if (!res.ok) {
    let bodyText = ''
    try { bodyText = (await res.text()).slice(0, 300) } catch { /* ignore */ }
    emitError({
      kind: 'http_error',
      status: res.status,
      message: `TTS edge function returned ${res.status}${bodyText ? `: ${bodyText}` : ''}`,
    })
    if (currentJob === job) { disposeCurrent(); currentJob = null }
    job.opts?.onStatus?.('error')
    job.opts?.onEnd?.('error')
    return
  }
  if (lastError) emitError(null)

  job.opts?.onStatus?.('buffering')

  const reason = canStreamMpeg()
    ? await playViaMediaSource(job, res, ac)
    : await playViaBlob(job, res, ac)

  if (currentJob === job) { disposeCurrent(); currentJob = null }
  const finalReason = job.cancelled ? 'cancelled' : reason
  job.opts?.onStatus?.(finalReason === 'cancelled' ? 'stopped' : finalReason === 'error' ? 'error' : 'idle')
  job.opts?.onEnd?.(finalReason)
}

async function drain() {
  if (running) return
  running = true
  while (queue.length) {
    const job = queue.shift()!
    await runJob(job)
    job.resolve()
  }
  running = false
}

export function speak(text: string, opts?: SpeakOptions): { cancel: () => void; done: Promise<void> } {
  if (typeof window === 'undefined' || !text || !text.trim()) {
    opts?.onStatus?.('idle')
    opts?.onEnd?.('cancelled')
    return { cancel: () => {}, done: Promise.resolve() }
  }
  const job: Job = { text, opts, cancelled: false, resolve: () => {} }
  const done = new Promise<void>((r) => { job.resolve = r })
  queue.push(job)
  void drain()
  return {
    cancel: () => {
      if (job.cancelled) return
      job.cancelled = true
      if (currentJob === job) disposeCurrent()
    },
    done,
  }
}

export function stopSpeaking() {
  for (const j of queue) j.cancelled = true
  queue.length = 0
  if (currentJob) currentJob.cancelled = true
  disposeCurrent()
  currentJob = null
}
