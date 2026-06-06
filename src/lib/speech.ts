// Web Speech API — spraak-naar-tekst (invoer) en tekst-naar-spraak (uitvoer).
// Volledig gratis en in de browser. Werkt het best in Chrome/Edge; valt netjes
// terug als de browser het niet ondersteunt.

export function sttBeschikbaar(): boolean {
  return typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}

export function ttsBeschikbaar(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export interface Luisteraar {
  start: () => void
  stop: () => void
}

export function maakLuisteraar(opts: {
  onResultaat: (tekst: string) => void
  onEinde?: () => void
  onFout?: (msg: string) => void
}): Luisteraar | null {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = 'nl-NL'
  rec.interimResults = false
  rec.maxAlternatives = 1
  rec.continuous = false

  rec.onresult = (e: any) => {
    const tekst = e.results?.[0]?.[0]?.transcript ?? ''
    if (tekst) opts.onResultaat(tekst)
  }
  rec.onend = () => opts.onEinde?.()
  rec.onerror = (e: any) => opts.onFout?.(e?.error ?? 'spraakfout')

  return {
    start: () => {
      try {
        rec.start()
      } catch {
        /* dubbel starten negeren */
      }
    },
    stop: () => {
      try {
        rec.stop()
      } catch {
        /* niets */
      }
    },
  }
}

let huidigeStem: SpeechSynthesisVoice | null = null
function kiesNederlandseStem(): SpeechSynthesisVoice | null {
  if (huidigeStem) return huidigeStem
  const stemmen = window.speechSynthesis.getVoices()
  huidigeStem =
    stemmen.find((s) => s.lang?.toLowerCase().startsWith('nl')) ??
    stemmen.find((s) => s.lang?.toLowerCase().includes('nl')) ??
    null
  return huidigeStem
}

export function spreek(tekst: string) {
  if (!ttsBeschikbaar()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(tekst)
  u.lang = 'nl-NL'
  const stem = kiesNederlandseStem()
  if (stem) u.voice = stem
  u.rate = 1
  u.pitch = 1.05
  window.speechSynthesis.speak(u)
}

export function stopSpreken() {
  if (ttsBeschikbaar()) window.speechSynthesis.cancel()
}
