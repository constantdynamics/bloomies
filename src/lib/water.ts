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
