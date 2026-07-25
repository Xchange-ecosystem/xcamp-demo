// User-selected ElevenLabs voice, persisted in localStorage.

export interface VoiceOption {
  id: string
  label: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George (default)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura' },
  { id: 'IKne3meq5aSn9XLyUdCD', label: 'Charlie' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice' },
  { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily' },
  { id: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica' },
  { id: 'SAz9YHcvj6GT2YYXdXww', label: 'River' },
]

const STORAGE_KEY = 'chi.tts.voiceId.v1'
const DEFAULT_VOICE_ID = VOICE_OPTIONS[0].id

const listeners = new Set<(id: string) => void>()

export function getVoiceId(): string {
  if (typeof window === 'undefined') return DEFAULT_VOICE_ID
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored && VOICE_OPTIONS.some((v) => v.id === stored)) return stored
  return DEFAULT_VOICE_ID
}

export function setVoiceId(id: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, id)
  listeners.forEach((cb) => cb(id))
}

export function subscribeVoice(cb: (id: string) => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
