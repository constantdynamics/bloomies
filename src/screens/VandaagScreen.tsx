import { useEffect, useMemo, useState } from 'react'
import { useGarden } from '../lib/GardenContext'
import { AddPlantSheet } from '../components/AddPlantSheet'
import { PhotoUploader } from '../components/PhotoUploader'
import { Sheet, Spinner, Chip, domeinInfo } from '../components/ui'
import {
  updateSuggestion,
  addTasks,
  updateTask,
  updateGarden,
  addPhoto,
  listPhotos,
} from '../lib/db'
import { uploadFoto } from '../lib/storage'
import { getLocation, geocode, weerSamenvatting } from '../lib/weather'
import { timingStatus, timingLabel, seizoenEmoji, datumNL } from '../lib/season'
import type { VerkleindeFoto } from '../lib/image'
import type { Suggestion, Task } from '../lib/types'

type Tab = 'vandaag' | 'planten' | 'plan' | 'voorraad' | 'vogels'

function begroeting(): string {
  const u = new Date().getHours()
  if (u < 6) return 'Nog wakker'
  if (u < 12) return 'Goedemorgen'
  if (u < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

export function VandaagScreen({ onTab, onGoeroe }: { onTab: (t: Tab) => void; onGoeroe: () => void }) {
  const { garden, plants, tasks, suggestions, seizoen, weather, ervaring } = useGarden()
  const [addOpen, setAddOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const leeg = plants.length === 0 && tasks.length === 0

  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl text-bark-800">
            {begroeting()}, Luuk & Marieke {seizoenEmoji(seizoen)}
          </h2>
          <p className="text-bark-400 text-sm">{datumNL()}</p>
        </div>
        <button className="btn-ghost rounded-full h-10 w-10 p-0 text-xl" onClick={() => setSettingsOpen(true)} aria-label="Instellingen">
          ⚙️
        </button>
      </div>

      <WeerKaart onSettings={() => setSettingsOpen(true)} />

      {leeg && (
        <div className="card p-5 mt-3 bg-leaf-50 border-leaf-100">
          <h3 className="font-display text-xl text-leaf-700 mb-1">Welkom in je hof 🌿</h3>
          <p className="text-bark-600 text-sm leading-relaxed mb-3">
            Bloomies begint helemaal leeg — bij jouw tuin. Maak een paar foto's van je planten en tuin,
            of praat met de goeroe over je dromen voor het komende jaar. Daarna maak ik een persoonlijk plan.
          </p>
          <div className="flex flex-col gap-2">
            <button className="btn-primary" onClick={() => setAddOpen(true)}>
              📷 Voeg je eerste plant toe
            </button>
            <button className="btn-secondary" onClick={onGoeroe}>
              🌱 Praat met de goeroe
            </button>
          </div>
        </div>
      )}

      {/* Snelle acties */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <SnelAct emoji="📷" label="Plant + foto" onClick={() => setAddOpen(true)} />
        <SnelAct emoji="🌱" label="Goeroe" onClick={onGoeroe} />
        <SnelAct emoji="🗓️" label="Mijn plan" onClick={() => onTab('plan')} />
      </div>

      <VandaagTaken tasks={tasks} onTab={onTab} />

      {garden?.suggesties_aan && <SuggestieBlok suggestions={suggestions} />}

      {plants.length > 0 && <EvaluatieKaart />}

      {/* Ervaringsniveau (meegroeiende interface) */}
      <div className="card p-3.5 mt-3 flex items-center gap-3">
        <span className="text-2xl">🌟</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-bark-700">Niveau {ervaring.niveau}: {ervaring.titel}</p>
          <div className="h-2 bg-cream-200 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-leaf-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, (ervaring.punten / (ervaring.volgende === Infinity ? ervaring.punten || 1 : ervaring.volgende)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <AddPlantSheet open={addOpen} onClose={() => setAddOpen(false)} />
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

function SnelAct({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card p-3 flex flex-col items-center gap-1 active:scale-95 transition">
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs font-semibold text-bark-600 text-center leading-tight">{label}</span>
    </button>
  )
}

function WeerKaart({ onSettings }: { onSettings: () => void }) {
  const { weather, garden, seizoen } = useGarden()
  if (!weather) {
    return (
      <button onClick={onSettings} className="card p-3.5 mt-3 w-full text-left flex items-center gap-3 active:scale-[0.99]">
        <span className="text-2xl">📍</span>
        <div>
          <p className="text-sm font-semibold text-bark-700">Stel je locatie in</p>
          <p className="text-xs text-bark-400">Voor weer en betere timing-adviezen</p>
        </div>
      </button>
    )
  }
  return (
    <div className="card p-3.5 mt-3 flex items-center gap-3">
      <span className="text-3xl">{weather.emoji}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-bark-700">
          {weather.temperatuur}°C · {weather.beschrijving}
        </p>
        <p className="text-xs text-bark-400">
          {garden?.locatie_naam || 'Jouw tuin'} · {seizoen} · wind {weather.windkmh} km/u
        </p>
      </div>
    </div>
  )
}

function VandaagTaken({ tasks, onTab }: { tasks: Task[]; onTab: (t: Tab) => void }) {
  const { refreshTasks } = useGarden()
  const lijst = useMemo(() => {
    const rang = (t: Task) => {
      const s = timingStatus(t)
      return s === 'ideaal' ? 0 : s === 'goed' ? 1 : s === 'neutraal' ? 2 : 3
    }
    return tasks.filter((t) => t.status === 'open').sort((a, b) => rang(a) - rang(b)).slice(0, 4)
  }, [tasks])

  if (tasks.length === 0) return null

  async function af(t: Task) {
    await updateTask(t.id, { status: 'gedaan', afgerond_op: new Date().toISOString() })
    await refreshTasks()
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-lg text-bark-700">Goed om nu te doen</h3>
        <button className="text-sm text-leaf-600 font-semibold" onClick={() => onTab('plan')}>
          Alles →
        </button>
      </div>
      {lijst.length === 0 ? (
        <p className="text-bark-400 text-sm">Alles afgevinkt — heerlijk! 🌼</p>
      ) : (
        <div className="flex flex-col gap-2">
          {lijst.map((t) => {
            const tl = timingLabel(timingStatus(t))
            const dom = domeinInfo(t.domein)
            return (
              <div key={t.id} className="card p-3 flex items-center gap-3">
                <button onClick={() => af(t)} className="h-6 w-6 rounded-lg border-2 border-bark-300 shrink-0" aria-label="Afvinken" />
                <div className="flex-1 min-w-0">
                  <p className="text-bark-800 font-medium leading-tight line-clamp-1">{t.titel}</p>
                  <div className="flex gap-1.5 mt-1">
                    <Chip klasse={dom.klasse}>{dom.emoji} {dom.label}</Chip>
                    <Chip klasse={tl.klasse}>{tl.label}</Chip>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SuggestieBlok({ suggestions }: { suggestions: Suggestion[] }) {
  const { refreshSuggestions, refreshTasks, meld } = useGarden()
  const open = suggestions.filter((s) => s.status === 'voorgesteld')
  if (open.length === 0) return null

  async function keur(s: Suggestion, akkoord: boolean) {
    if (akkoord) {
      await addTasks([
        {
          titel: s.titel,
          domein: (s.domein as any) || 'tuin',
          beschrijving: s.inhoud || null,
          categorie: 'optioneel',
          instructies: [],
          benodigdheden: [],
          status: 'open',
        },
      ])
      await updateSuggestion(s.id, { status: 'goedgekeurd' })
      await Promise.all([refreshSuggestions(), refreshTasks()])
      meld('Toegevoegd aan je plan ✓')
    } else {
      await updateSuggestion(s.id, { status: 'afgekeurd' })
      await refreshSuggestions()
    }
  }

  return (
    <div className="mt-4">
      <h3 className="font-display text-lg text-bark-700 mb-2">💡 Ideeën voor jouw tuin</h3>
      <div className="flex flex-col gap-2">
        {open.map((s) => (
          <div key={s.id} className="card p-3.5">
            <p className="font-semibold text-bark-800">{s.titel}</p>
            {s.inhoud && <p className="text-bark-500 text-sm mt-0.5 leading-relaxed">{s.inhoud}</p>}
            <div className="flex gap-2 mt-2.5">
              <button className="btn-primary text-sm py-1.5 px-3" onClick={() => keur(s, true)}>
                Goed idee
              </button>
              <button className="btn-ghost text-sm py-1.5" onClick={() => keur(s, false)}>
                Niet nodig
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EvaluatieKaart() {
  const { meld } = useGarden()
  const [recentEval, setRecentEval] = useState<boolean | null>(null)
  const [bezig, setBezig] = useState(false)

  useEffect(() => {
    listPhotos().then((fs) => {
      const evals = fs.filter((f) => f.type === 'evaluatie')
      const laatste = evals[0]
      if (!laatste) return setRecentEval(false)
      const dagen = (Date.now() - new Date(laatste.created_at).getTime()) / 86400000
      setRecentEval(dagen < 14)
    })
  }, [])

  if (recentEval !== false) return null

  async function foto(f: VerkleindeFoto) {
    setBezig(true)
    try {
      const url = await uploadFoto(f.blob, 'evaluatie')
      await addPhoto({ url, type: 'evaluatie', notitie: 'Tuin-overzicht' })
      setRecentEval(true)
      meld('Mooie voortgang! Bewaard 📸')
    } catch (e: any) {
      meld(e?.message || 'Upload mislukt')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="card p-4 mt-4 bg-bloom-50 border-bloom-100">
      <h3 className="font-display text-lg text-bloom-700">📸 Hoe staat de tuin ervoor?</h3>
      <p className="text-bark-600 text-sm mt-0.5 mb-3">
        Maak af en toe een overzichtsfoto. Zo zien we samen de vooruitgang en kan ik je plan bijstellen.
      </p>
      {bezig ? <Spinner klein /> : <PhotoUploader onFoto={foto} label="📸 Voortgangsfoto maken" variant="accent" />}
    </div>
  )
}

function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { garden, setGarden, laadWeer, meld } = useGarden()
  const [plaats, setPlaats] = useState(garden?.locatie_naam ?? '')
  const [notities, setNotities] = useState(garden?.klimaatnotities ?? '')
  const [bezigLoc, setBezigLoc] = useState(false)
  const [suggAan, setSuggAan] = useState(garden?.suggesties_aan ?? true)

  async function gebruikLocatie() {
    setBezigLoc(true)
    try {
      const { lat, lon } = await getLocation()
      const g = await updateGarden({ locatie_lat: lat, locatie_lon: lon })
      setGarden(g)
      await laadWeer(lat, lon)
      meld('Locatie ingesteld 📍')
    } catch {
      meld('Kon locatie niet ophalen. Vul een plaatsnaam in.')
    } finally {
      setBezigLoc(false)
    }
  }

  async function zoekPlaats() {
    if (!plaats.trim()) return
    setBezigLoc(true)
    try {
      const res = await geocode(plaats.trim())
      if (!res) {
        meld('Plaats niet gevonden.')
        return
      }
      const g = await updateGarden({ locatie_lat: res.lat, locatie_lon: res.lon, locatie_naam: res.label })
      setGarden(g)
      await laadWeer(res.lat, res.lon)
      meld('Locatie ingesteld 📍')
    } finally {
      setBezigLoc(false)
    }
  }

  async function bewaarRest() {
    const g = await updateGarden({ klimaatnotities: notities.trim() || null, suggesties_aan: suggAan })
    setGarden(g)
    meld('Opgeslagen ✓')
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title="Instellingen">
      <div className="flex flex-col gap-5">
        <div>
          <label className="label">Locatie (voor weer & timing)</label>
          <div className="flex gap-2">
            <input className="input" value={plaats} onChange={(e) => setPlaats(e.target.value)} placeholder="bv. Utrecht" />
            <button className="btn-secondary" onClick={zoekPlaats} disabled={bezigLoc}>
              Zoek
            </button>
          </div>
          <button className="btn-ghost text-sm mt-2" onClick={gebruikLocatie} disabled={bezigLoc}>
            {bezigLoc ? <Spinner klein /> : '📍 Gebruik mijn huidige locatie'}
          </button>
        </div>

        <label className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-bark-700">Suggesties van de goeroe</p>
            <p className="text-xs text-bark-400">Tips en ideeën voor jouw tuin</p>
          </div>
          <button
            onClick={() => setSuggAan((v) => !v)}
            className={`w-12 h-7 rounded-full transition relative shrink-0 ${suggAan ? 'bg-leaf-500' : 'bg-bark-200'}`}
          >
            <span className={`absolute top-1 h-5 w-5 bg-white rounded-full transition-all ${suggAan ? 'left-6' : 'left-1'}`} />
          </button>
        </label>

        <div>
          <label className="label">Klimaat / tuinnotities (optioneel)</label>
          <textarea
            className="input min-h-[70px]"
            value={notities}
            onChange={(e) => setNotities(e.target.value)}
            placeholder="bv. schaduwrijke achtertuin, kleigrond, beschut"
          />
        </div>

        <button className="btn-primary" onClick={bewaarRest}>
          Opslaan
        </button>
      </div>
    </Sheet>
  )
}
