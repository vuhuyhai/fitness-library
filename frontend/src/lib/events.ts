/**
 * Wails runtime event helpers.
 * The runtime object is injected by Wails at startup.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const runtime = () => (window as any).runtime

export function EventsOn(event: string, callback: (...args: unknown[]) => void): () => void {
  try {
    runtime().EventsOn(event, callback)
  } catch {
    // Runtime not available in browser dev mode
  }
  return () => EventsOff(event)
}

export function EventsOff(...events: string[]) {
  try {
    runtime().EventsOff(...events)
  } catch {
    // Runtime not available in browser dev mode
  }
}

export function EventsEmit(event: string, ...data: unknown[]) {
  try {
    runtime().EventsEmit(event, ...data)
  } catch {
    // Runtime not available in browser dev mode
  }
}

// Window controls
export const WindowMinimise = () => {
  try { runtime().WindowMinimise() } catch { /* noop */ }
}
export const WindowToggleMaximise = () => {
  try { runtime().WindowToggleMaximise() } catch { /* noop */ }
}
export const Quit = () => {
  try { runtime().Quit() } catch { /* noop */ }
}
