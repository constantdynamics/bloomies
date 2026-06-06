import type { Seizoen, Task } from './types'

export const MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

export function getSeason(d: Date = new Date()): Seizoen {
  const m = d.getMonth() + 1
  if (m >= 3 && m <= 5) return 'lente'
  if (m >= 6 && m <= 8) return 'zomer'
  if (m >= 9 && m <= 11) return 'herfst'
  return 'winter'
}

export function seizoenEmoji(s: Seizoen): string {
  return { lente: '🌷', zomer: '☀️', herfst: '🍂', winter: '❄️' }[s]
}

export function maandNaam(d: Date = new Date()): string {
  return MAANDEN[d.getMonth()]
}

export function datumNL(d: Date = new Date()): string {
  return `${d.getDate()} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`
}

// Broedseizoen: globaal half maart t/m juli (waarschuwing: niet snoeien).
export function inBroedseizoen(d: Date = new Date()): boolean {
  const m = d.getMonth() + 1
  const dag = d.getDate()
  if (m === 3) return dag >= 15
  return m >= 4 && m <= 7
}

export type Timing = 'ideaal' | 'goed' | 'niet' | 'neutraal'

// Lichtgewicht inschatting of het nú een goed moment is voor een taak,
// op basis van vrije-tekst periodes (maandnaam of seizoen genoemd).
export function timingStatus(task: Task, d: Date = new Date()): Timing {
  const maand = maandNaam(d)
  const seizoen = getSeason(d)
  const hay = (s: string | null | undefined) => (s || '').toLowerCase()
  const matches = (period: string | null | undefined) => {
    const p = hay(period)
    if (!p) return false
    return (
      p.includes(maand) ||
      p.includes(seizoen) ||
      p.includes('hele jaar') ||
      p.includes('jaarrond') ||
      p.includes('het hele jaar') ||
      p.includes('doorlopend')
    )
  }
  if (matches(task.niet_doen_periode)) return 'niet'
  if (matches(task.ideale_periode)) return 'ideaal'
  if (matches(task.goede_periode)) return 'goed'
  return 'neutraal'
}

export function timingLabel(t: Timing): { label: string; klasse: string } {
  switch (t) {
    case 'ideaal':
      return { label: 'Ideale tijd nu', klasse: 'bg-leaf-100 text-leaf-700' }
    case 'goed':
      return { label: 'Goede tijd', klasse: 'bg-cream-200 text-bark-600' }
    case 'niet':
      return { label: 'Liever niet nu', klasse: 'bg-bloom-100 text-bloom-700' }
    default:
      return { label: 'Kan altijd', klasse: 'bg-cream-200 text-bark-500' }
  }
}
