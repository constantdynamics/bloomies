import type { ReactNode } from 'react'

export function Spinner({ klein = false }: { klein?: boolean }) {
  const size = klein ? 'h-4 w-4 border-2' : 'h-8 w-8 border-[3px]'
  return (
    <span
      className={`inline-block ${size} rounded-full border-leaf-200 border-t-leaf-500 animate-spin`}
      aria-label="Bezig…"
    />
  )
}

export function LaadScherm({ tekst = 'Even de tuin wakker maken…' }: { tekst?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-bark-500">
      <span className="text-4xl animate-bounce">🌱</span>
      <Spinner />
      <p className="font-display text-lg">{tekst}</p>
    </div>
  )
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-bark-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-cream-50 rounded-t-4xl sm:rounded-4xl shadow-soft border border-cream-200 max-h-[90vh] overflow-y-auto animate-bloom-in safe-bottom">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 pt-5 pb-3 bg-cream-50/95 backdrop-blur">
          <h2 className="font-display text-xl text-bark-800">{title}</h2>
          <button onClick={onClose} className="btn-ghost rounded-full h-9 w-9 p-0 text-xl" aria-label="Sluiten">
            ✕
          </button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({
  emoji,
  titel,
  tekst,
  actie,
}: {
  emoji: string
  titel: string
  tekst?: string
  actie?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
      <span className="text-5xl">{emoji}</span>
      <h3 className="font-display text-xl text-bark-700">{titel}</h3>
      {tekst && <p className="text-bark-500 max-w-xs leading-relaxed">{tekst}</p>}
      {actie && <div className="mt-2">{actie}</div>}
    </div>
  )
}

export function Chip({
  children,
  klasse = 'bg-cream-200 text-bark-600',
}: {
  children: ReactNode
  klasse?: string
}) {
  return <span className={`chip ${klasse}`}>{children}</span>
}

export interface SegmentOptie {
  value: string
  label: string
}

export function Segment({
  opties,
  value,
  onChange,
}: {
  opties: SegmentOptie[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-cream-200 p-1">
      {opties.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
            value === o.value ? 'bg-white text-leaf-700 shadow-sm' : 'text-bark-500 hover:text-bark-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function domeinInfo(domein: string): { emoji: string; label: string; klasse: string } {
  switch (domein) {
    case 'kamerplant':
      return { emoji: '🪴', label: 'Kamerplant', klasse: 'bg-leaf-100 text-leaf-700' }
    case 'tuin':
      return { emoji: '🌿', label: 'Tuin', klasse: 'bg-leaf-100 text-leaf-700' }
    case 'boom':
      return { emoji: '🌳', label: 'Boom', klasse: 'bg-leaf-100 text-leaf-700' }
    case 'zaad':
      return { emoji: '🌱', label: 'Zaad', klasse: 'bg-cream-200 text-bark-600' }
    case 'vogels':
      return { emoji: '🐦', label: 'Vogels', klasse: 'bg-bloom-100 text-bloom-700' }
    default:
      return { emoji: '🌼', label: 'Algemeen', klasse: 'bg-cream-200 text-bark-600' }
  }
}
