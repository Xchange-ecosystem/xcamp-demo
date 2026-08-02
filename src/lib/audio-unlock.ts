// Primes the browser's autoplay policy on the first user gesture so
// HTMLAudioElement.play() calls launched from effects (e.g. TTS auto-play
// alongside a typewriter animation) are not silently blocked.

const SILENT_MP3 =
  'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7097LFr/2q+ce7v//x9X///2eH///7v/c3//0PdT3/9//dxQACAAAACd6tIAB0v'

let unlocked = false
let installed = false
let resolveUnlock: (() => void) | null = null
const unlockedPromise: Promise<void> = new Promise((res) => {
  resolveUnlock = res
})
const unlockCallbacks = new Set<() => void>()

function tryPrime(): void {
  try {
    const a = new Audio(SILENT_MP3)
    a.muted = true
    a.volume = 0
    const p = a.play()
    if (p && typeof p.then === 'function') {
      p.then(() => {
        try { a.pause() } catch { /* ignore */ }
      }).catch(() => { /* ignore */ })
    }
  } catch { /* ignore */ }
}

function onFirstGesture(): void {
  if (unlocked) return
  unlocked = true
  tryPrime()
  resolveUnlock?.()
  resolveUnlock = null
  unlockCallbacks.forEach((cb) => cb())
  unlockCallbacks.clear()
  removeListeners()
}

const EVENTS: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'mousedown']

function addListeners(): void {
  for (const ev of EVENTS) {
    window.addEventListener(ev, onFirstGesture, { capture: true, passive: true })
  }
}
function removeListeners(): void {
  for (const ev of EVENTS) {
    window.removeEventListener(ev, onFirstGesture, { capture: true } as EventListenerOptions)
  }
}

export function onAudioUnlock(cb: () => void): () => void {
  if (unlocked) {
    cb()
    return () => {}
  }
  unlockCallbacks.add(cb)
  return () => { unlockCallbacks.delete(cb) }
}

export function installAudioUnlock(): void {
  if (typeof window === 'undefined') return
  if (installed) return
  installed = true
  addListeners()
}

export function isAudioUnlocked(): boolean {
  return unlocked
}

export function waitForAudioUnlock(): Promise<void> {
  if (unlocked) return Promise.resolve()
  return unlockedPromise
}
