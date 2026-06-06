import { useState } from 'react'
import { useGarden } from '../lib/GardenContext'
import { Chip, EmptyState } from '../components/ui'
import { updateBirdAction } from '../lib/db'
import { inBroedseizoen, seizoenEmoji } from '../lib/season'
import type { BirdAction, Seizoen } from '../lib/types'

const VOLGORDE: Seizoen[] = ['lente', 'zomer', 'herfst', 'winter']
const LABEL: Record<Seizoen, string> = { lente: 'Lente', zomer: 'Zomer', herfst: 'Herfst', winter: 'Winter' }

export function VogelsScreen() {
  const { birds, seizoen, weather, refreshBirds } = useGarden()
  const [openSeizoen, setOpenSeizoen] = useState<Seizoen | null>(null)
  const broed = inBroedseizoen()

  async function toggle(b: BirdAction) {
    await updateBirdAction(b.id, { gedaan: !b.gedaan })
    await refreshBirds()
  }

  const perSeizoen = (s: Seizoen) => birds.filter((b) => b.seizoen === s)
  const andere = VOLGORDE.filter((s) => s !== seizoen)

  return (
    <div className="py-3">
      <h2 className="font-display text-2xl text-bark-800 mb-1">Vogels</h2>
      <p className="text-bark-400 text-sm mb-3">Kleine moeite, groot plezier — het hele jaar door.</p>

      {broed && (
        <div className="card p-3.5 mb-3 bg-bloom-50 border-bloom-100">
          <p className="text-bloom-700 text-sm font-semibold">🐣 Broedseizoen (half maart – juli)</p>
          <p className="text-bloom-700/90 text-sm mt-0.5">
            Snoei nu geen dichte hagen of struiken — daar zitten waarschijnlijk nesten. Wacht tot na juli.
          </p>
        </div>
      )}

      {weather?.vorst && (
        <div className="card p-3.5 mb-3 bg-leaf-50 border-leaf-100">
          <p className="text-leaf-700 text-sm font-semibold">❄️ Het vriest ({weather.temperatuur}°C)</p>
          <p className="text-leaf-700/90 text-sm mt-0.5">
            Voer extra (vetrijk) en houd het drinkwater ijsvrij — vogels hebben je nu hard nodig.
          </p>
        </div>
      )}

      {birds.length === 0 ? (
        <div className="card">
          <EmptyState emoji="🐦" titel="Nog geen vogeladvies" tekst="Ververs of laad de pagina opnieuw om de seizoensadviezen te zien." />
        </div>
      ) : (
        <>
          <SeizoenBlok
            seizoen={seizoen}
            acties={perSeizoen(seizoen)}
            huidig
            open
            onToggle={toggle}
            onKlik={() => {}}
          />

          <h3 className="font-display text-bark-500 text-sm mt-5 mb-2">Andere seizoenen</h3>
          <div className="flex flex-col gap-2">
            {andere.map((s) => (
              <SeizoenBlok
                key={s}
                seizoen={s}
                acties={perSeizoen(s)}
                open={openSeizoen === s}
                onToggle={toggle}
                onKlik={() => setOpenSeizoen((cur) => (cur === s ? null : s))}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SeizoenBlok({
  seizoen,
  acties,
  huidig = false,
  open,
  onToggle,
  onKlik,
}: {
  seizoen: Seizoen
  acties: BirdAction[]
  huidig?: boolean
  open: boolean
  onToggle: (b: BirdAction) => void
  onKlik: () => void
}) {
  const gedaan = acties.filter((a) => a.gedaan).length
  return (
    <div className={`card overflow-hidden ${huidig ? 'border-leaf-200' : ''}`}>
      <button
        onClick={onKlik}
        disabled={huidig}
        className={`w-full flex items-center justify-between px-4 py-3 ${huidig ? 'bg-leaf-50' : ''}`}
      >
        <span className="flex items-center gap-2 font-display text-lg text-bark-700">
          {seizoenEmoji(seizoen)} {LABEL[seizoen]}
          {huidig && <Chip klasse="bg-leaf-100 text-leaf-700">nu</Chip>}
        </span>
        <span className="text-bark-400 text-sm">
          {gedaan}/{acties.length}
          {!huidig && <span className="ml-2">{open ? '▲' : '▼'}</span>}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {acties.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <button
                onClick={() => onToggle(a)}
                className={`mt-0.5 h-5 w-5 rounded-md border-2 shrink-0 flex items-center justify-center text-xs ${
                  a.gedaan ? 'bg-leaf-500 border-leaf-500 text-white' : 'border-bark-300'
                }`}
              >
                {a.gedaan && '✓'}
              </button>
              <div className="flex-1">
                <p className={`text-bark-800 text-sm font-medium ${a.gedaan ? 'line-through text-bark-400' : ''}`}>{a.actie}</p>
                {a.toelichting && <p className="text-bark-500 text-xs leading-relaxed mt-0.5">{a.toelichting}</p>}
              </div>
            </div>
          ))}
          {acties.length === 0 && <p className="text-bark-400 text-sm">Geen adviezen voor dit seizoen.</p>}
        </div>
      )}
    </div>
  )
}
