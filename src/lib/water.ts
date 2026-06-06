import type { Plant } from './types'

const DAG = 86400000

export function volgendeWaterDatum(p: Plant): Date | null {
  if (!p.water_interval_dagen || p.water_interval_dagen <= 0) return null
  const basis = p.laatst_water ? new Date(p.laatst_water) : new Date(p.created_at)
  return new Date(basis.getTime() + p.water_interval_dagen * DAG)
}

export type WaterFase = 'teLaat' | 'vandaag' | 'binnenkort' | 'ok' | 'geen'

export interface WaterStatus {
  actief: boolean
  datum: Date | null
  msTot: number
  dagen: number
  due: boolean
  fase: WaterFase
}

export function waterStatus(p: Plant, nu: number = Date.now()): WaterStatus {
  const datum = volgendeWaterDatum(p)
  if (!datum) return { actief: false, datum: null, msTot: NaN, dagen: NaN, due: false, fase: 'geen' }
  const msTot = datum.getTime() - nu
  const dagen = Math.ceil(msTot / DAG)
  const due = msTot <= 0
  const fase: WaterFase = due ? (dagen < 0 ? 'teLaat' : 'vandaag') : dagen <= 2 ? 'binnenkort' : 'ok'
  return { actief: true, datum, msTot, dagen, due, fase }
}

export function waterLabel(s: WaterStatus): string {
  if (!s.actief) return ''
  if (s.fase === 'teLaat') {
    const d = Math.abs(s.dagen)
    return `${d} dag${d === 1 ? '' : 'en'} te laat`
  }
  if (s.fase === 'vandaag') return 'Nu water geven'
  if (s.dagen <= 1) {
    const uren = Math.max(1, Math.round(s.msTot / 3600000))
    return `over ${uren} uur`
  }
  return `over ${s.dagen} dagen`
}

export function waterKleur(fase: WaterFase): string {
  switch (fase) {
    case 'teLaat':
      return 'bg-bloom-100 text-bloom-700'
    case 'vandaag':
      return 'bg-bloom-50 text-bloom-700'
    case 'binnenkort':
      return 'bg-cream-200 text-bark-600'
    default:
      return 'bg-leaf-100 text-leaf-700'
  }
}

// Urgentie 0 (net water gehad) → 1 (tijd, of te laat). -1 = geen timer ingesteld.
export function waterUrgentie(p: Plant, nu: number = Date.now()): number {
  if (!p.water_interval_dagen || p.water_interval_dagen <= 0) return -1
  const basis = p.laatst_water ? new Date(p.laatst_water).getTime() : new Date(p.created_at).getTime()
  const intervalMs = p.water_interval_dagen * DAG
  if (intervalMs <= 0) return -1
  return Math.max(0, Math.min(1, (nu - basis) / intervalMs))
}

export function maxWaterUrgentie(plants: Plant[], nu: number = Date.now()): number {
  let m = 0
  for (const p of plants) {
    const u = waterUrgentie(p, nu)
    if (u > m) m = u
  }
  return m
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

// Vloeiende kleur van groen (rustig) via amber naar rood (actie nodig).
export function urgentieKleur(fractie: number): string {
  const groen = [90, 130, 71]
  const amber = [210, 140, 55]
  const rood = [194, 87, 54]
  const f = Math.max(0, Math.min(1, fractie))
  const [c1, c2, t] = f < 0.5 ? [groen, amber, f / 0.5] : [amber, rood, (f - 0.5) / 0.5]
  return `rgb(${lerp(c1[0], c2[0], t)}, ${lerp(c1[1], c2[1], t)}, ${lerp(c1[2], c2[2], t)})`
}
