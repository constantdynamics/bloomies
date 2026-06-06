import { useEffect, useState } from 'react'
import { useGarden } from '../lib/GardenContext'
import { AddPlantSheet } from '../components/AddPlantSheet'
import { Sheet, Segment, EmptyState, Spinner, Chip, domeinInfo } from '../components/ui'
import { PhotoUploader } from '../components/PhotoUploader'
import { updatePlant, deletePlant, addPhoto, listPhotos } from '../lib/db'
import { uploadFoto } from '../lib/storage'
import { haalVerzorging } from '../lib/api'
import { waterStatus, waterLabel, waterKleur, volgendeWaterDatum } from '../lib/water'
import type { Plant, Photo, PlantType, Verzorging } from '../lib/types'
import type { VerkleindeFoto } from '../lib/image'

const FILTERS = [
  { value: 'alles', label: 'Alles' },
  { value: 'kamerplant', label: '🪴 Kamer' },
  { value: 'tuin', label: '🌿 Tuin' },
  { value: 'boom', label: '🌳 Bomen' },
]

function plantEmoji(t: PlantType) {
  return { kamerplant: '🪴', tuin: '🌿', boom: '🌳', zaad: '🌱' }[t] ?? '🌼'
}

export function PlantenScreen() {
  const { plants } = useGarden()
  const [filter, setFilter] = useState('alles')
  const [addOpen, setAddOpen] = useState(false)
  const [detail, setDetail] = useState<Plant | null>(null)

  const zichtbaar = plants.filter((p) => filter === 'alles' || p.type === filter)

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-display text-2xl text-bark-800">Planten</h2>
        <button className="btn-primary text-sm py-2" onClick={() => setAddOpen(true)}>
          ＋ Toevoegen
        </button>
      </div>

      <div className="mb-4 overflow-x-auto -mx-1 px-1">
        <Segment opties={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {plants.length === 0 ? (
        <div className="card">
          <EmptyState
            emoji="🌱"
            titel="Nog geen planten"
            tekst="Begin met een foto van je tuin of een kamerplant. Ik herken de soort, kijk naar de gezondheid en maak meteen een verzorgingsprofiel."
            actie={
              <button className="btn-primary" onClick={() => setAddOpen(true)}>
                📷 Eerste plant toevoegen
              </button>
            }
          />
        </div>
      ) : zichtbaar.length === 0 ? (
        <p className="text-bark-400 text-center py-10">Geen planten in deze categorie.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {zichtbaar.map((p) => {
            const ws = waterStatus(p)
            return (
              <button key={p.id} onClick={() => setDetail(p)} className="card overflow-hidden text-left active:scale-[0.98] transition">
                <div className="h-28 bg-cream-200 flex items-center justify-center overflow-hidden">
                  {p.foto_url ? (
                    <img src={p.foto_url} alt={p.naam} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{plantEmoji(p.type)}</span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="font-semibold text-bark-800 leading-tight line-clamp-1">{p.naam}</p>
                  {p.soort && <p className="text-xs text-bark-400 italic line-clamp-1">{p.soort}</p>}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <Chip klasse={domeinInfo(p.type).klasse}>
                      {domeinInfo(p.type).emoji} {domeinInfo(p.type).label}
                    </Chip>
                    {ws.actief && ws.fase !== 'ok' && <Chip klasse={waterKleur(ws.fase)}>💧 {waterLabel(ws)}</Chip>}
                    {p.status ? <Chip klasse="bg-bloom-100 text-bloom-700">⚠️ aandacht</Chip> : null}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <AddPlantSheet open={addOpen} onClose={() => setAddOpen(false)} />
      {detail && <PlantDetail plant={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function PlantDetail({ plant, onClose }: { plant: Plant; onClose: () => void }) {
  const { refreshPlants, meld, seizoen } = useGarden()
  const [huidig, setHuidig] = useState<Plant>(plant)
  const [form, setForm] = useState({
    naam: plant.naam,
    soort: plant.soort ?? '',
    type: plant.type,
    locatie: plant.locatie_in_tuin ?? '',
    gezondheid: plant.gezondheid ?? '',
    notitie: plant.notitie ?? '',
  })
  const [fotos, setFotos] = useState<Photo[]>([])
  const [bewaren, setBewaren] = useState(false)
  const [uploaden, setUploaden] = useState(false)
  const [careBezig, setCareBezig] = useState(false)
  const [intervalDagen, setIntervalDagen] = useState(plant.water_interval_dagen ? String(plant.water_interval_dagen) : '')

  useEffect(() => {
    listPhotos().then((alle) => setFotos(alle.filter((f) => f.plant_id === plant.id)))
  }, [plant.id])

  async function patch(p: Partial<Plant>) {
    await updatePlant(huidig.id, p)
    setHuidig((h) => ({ ...h, ...p }))
    await refreshPlants()
  }

  async function opslaan() {
    setBewaren(true)
    try {
      await patch({
        naam: form.naam.trim(),
        soort: form.soort.trim() || null,
        type: form.type,
        locatie_in_tuin: form.locatie.trim() || null,
        gezondheid: form.gezondheid.trim() || null,
        notitie: form.notitie.trim() || null,
      })
      meld('Plant bijgewerkt 🌿')
      onClose()
    } catch (e: any) {
      meld(e?.message || 'Opslaan mislukt')
    } finally {
      setBewaren(false)
    }
  }

  async function verwijder() {
    if (!confirm(`"${huidig.naam}" verwijderen?`)) return
    try {
      await deletePlant(huidig.id)
      await refreshPlants()
      meld('Plant verwijderd')
      onClose()
    } catch (e: any) {
      meld(e?.message || 'Verwijderen mislukt')
    }
  }

  async function voortgangsfoto(f: VerkleindeFoto) {
    setUploaden(true)
    try {
      const url = await uploadFoto(f.blob, 'voortgang')
      const nieuw = await addPhoto({ plant_id: huidig.id, url, type: 'evaluatie', notitie: huidig.naam })
      setFotos((prev) => [nieuw, ...prev])
      if (!huidig.foto_url) await patch({ foto_url: url })
      meld('Voortgangsfoto opgeslagen 📸')
    } catch (e: any) {
      meld(e?.message || 'Upload mislukt')
    } finally {
      setUploaden(false)
    }
  }

  async function waterGegeven() {
    await patch({ laatst_water: new Date().toISOString() })
    meld('Genoteerd — water gegeven 💧')
  }

  async function bewaarInterval() {
    const n = parseInt(intervalDagen, 10)
    await patch({ water_interval_dagen: Number.isFinite(n) && n > 0 ? n : null, laatst_water: huidig.laatst_water ?? new Date().toISOString() })
    meld('Water-herinnering bijgewerkt 💧')
  }

  async function haalCare() {
    setCareBezig(true)
    try {
      const v = await haalVerzorging({ naam: huidig.naam, soort: huidig.soort, type: huidig.type, locatie_in_tuin: huidig.locatie_in_tuin, seizoen })
      const p: Partial<Plant> = { verzorging: v }
      if (!huidig.water_interval_dagen && typeof v.water_frequentie_dagen === 'number') {
        p.water_interval_dagen = v.water_frequentie_dagen
        p.laatst_water = new Date().toISOString()
        setIntervalDagen(String(v.water_frequentie_dagen))
      }
      await patch(p)
      meld('Verzorgingsprofiel klaar 🌿')
    } catch (e: any) {
      meld(e?.message || 'Profiel ophalen mislukt')
    } finally {
      setCareBezig(false)
    }
  }

  const ws = waterStatus(huidig)
  const volgende = volgendeWaterDatum(huidig)

  return (
    <Sheet open onClose={onClose} title={huidig.naam}>
      {huidig.foto_url && (
        <img src={huidig.foto_url} alt={huidig.naam} className="w-full h-48 object-cover rounded-2xl border border-cream-200 mb-3" />
      )}
      {huidig.herkend_door_ai && (
        <p className="text-xs text-bark-400 mb-3">🌱 Herkend met hulp van de goeroe{huidig.zekerheid ? ` · zekerheid ${huidig.zekerheid}` : ''}</p>
      )}

      {/* Water-herinnering */}
      <div className="card p-3.5 mb-4 bg-cream-50">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg text-bark-700">💧 Water</h3>
          {ws.actief && <Chip klasse={waterKleur(ws.fase)}>{waterLabel(ws)}</Chip>}
        </div>
        {ws.actief && volgende && (
          <p className="text-xs text-bark-400 mt-1">
            Volgende beurt: {volgende.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-bark-500">Elke</span>
          <input
            type="number"
            min={1}
            className="input w-20 py-1.5 text-center"
            value={intervalDagen}
            placeholder="—"
            onChange={(e) => setIntervalDagen(e.target.value)}
          />
          <span className="text-sm text-bark-500">dagen</span>
          <button className="btn-secondary text-sm py-1.5 px-3" onClick={bewaarInterval}>
            Opslaan
          </button>
        </div>
        <button className="btn-primary w-full mt-2.5" onClick={waterGegeven}>
          ✓ Net water gegeven
        </button>
      </div>

      {/* Verzorgingsprofiel */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-lg text-bark-700">🌿 Verzorging</h3>
          {huidig.verzorging && (
            <button className="btn-ghost text-xs" onClick={haalCare} disabled={careBezig}>
              {careBezig ? <Spinner klein /> : '⟳ Vernieuwen'}
            </button>
          )}
        </div>
        {huidig.verzorging ? (
          <VerzorgingKaart v={huidig.verzorging} />
        ) : (
          <div className="card p-4 text-center">
            <p className="text-bark-500 text-sm mb-3">Nog geen verzorgingsprofiel. Laat de goeroe temperatuur, luchtvochtigheid, de beste plek, winter/zomer en groeitips bepalen.</p>
            <button className="btn-primary" onClick={haalCare} disabled={careBezig}>
              {careBezig ? (
                <>
                  <Spinner klein /> Profiel maken…
                </>
              ) : (
                '🌿 Verzorgingsprofiel ophalen'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bewerken */}
      <details className="mb-4">
        <summary className="font-display text-lg text-bark-700 cursor-pointer">✏️ Gegevens bewerken</summary>
        <div className="flex flex-col gap-3 mt-3">
          <Veld label="Naam" value={form.naam} onChange={(v) => setForm({ ...form, naam: v })} />
          <Veld label="Soort / cultivar" value={form.soort} onChange={(v) => setForm({ ...form, soort: v })} />
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PlantType })}>
              <option value="kamerplant">Kamerplant</option>
              <option value="tuin">Tuinplant</option>
              <option value="boom">Boom/struik</option>
              <option value="zaad">Zaad/zaailing</option>
            </select>
          </div>
          <Veld label="Plek" value={form.locatie} onChange={(v) => setForm({ ...form, locatie: v })} />
          <Veld label="Gezondheid" value={form.gezondheid} onChange={(v) => setForm({ ...form, gezondheid: v })} />
          <div>
            <label className="label">Notitie</label>
            <textarea className="input min-h-[70px]" value={form.notitie} onChange={(e) => setForm({ ...form, notitie: e.target.value })} />
          </div>
          <button className="btn-primary" onClick={opslaan} disabled={bewaren}>
            {bewaren ? <Spinner klein /> : 'Opslaan'}
          </button>
        </div>
      </details>

      {/* Voortgang */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-lg text-bark-700">📸 Voortgang</h3>
          <PhotoUploader onFoto={voortgangsfoto} label="Foto" variant="secondary" />
        </div>
        {uploaden && (
          <p className="text-bark-400 text-sm flex items-center gap-2">
            <Spinner klein /> Uploaden…
          </p>
        )}
        {fotos.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {fotos.map((f) => (
              <div key={f.id} className="shrink-0">
                <img src={f.url} alt="voortgang" className="h-24 w-24 object-cover rounded-xl border border-cream-200" />
                <p className="text-[10px] text-bark-400 text-center mt-0.5">
                  {new Date(f.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-bark-400 text-sm">Nog geen voortgangsfoto's. Maak er af en toe één voor een mooie before/after.</p>
        )}
      </div>

      <button className="btn-ghost text-bloom-600 w-full mt-2" onClick={verwijder}>
        Plant verwijderen
      </button>
    </Sheet>
  )
}

function VerzorgingKaart({ v }: { v: Verzorging }) {
  const Feit = ({ emoji, label, waarde }: { emoji: string; label: string; waarde?: string }) =>
    waarde ? (
      <div className="flex gap-2 text-sm">
        <span>{emoji}</span>
        <span className="text-bark-500">
          <span className="font-semibold text-bark-700">{label}:</span> {waarde}
        </span>
      </div>
    ) : null

  const Lijst = ({ titel, emoji, items, klasse }: { titel: string; emoji: string; items?: string[]; klasse: string }) =>
    items && items.length ? (
      <div className={`rounded-2xl p-3 ${klasse}`}>
        <p className="font-semibold text-sm mb-1">{emoji} {titel}</p>
        <ul className="list-disc list-inside text-sm flex flex-col gap-0.5">
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </div>
    ) : null

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Feit emoji="🌡️" label="Temperatuur" waarde={v.ideale_temperatuur} />
        <Feit emoji="💨" label="Luchtvochtigheid" waarde={v.luchtvochtigheid} />
        <Feit emoji="☀️" label="Licht" waarde={v.licht} />
        <Feit emoji="📍" label="Standplaats" waarde={v.standplaats} />
        <Feit emoji="💧" label="Water" waarde={v.water_toelichting} />
        <Feit emoji="❄️" label="Winter" waarde={v.winter} />
        <Feit emoji="🌞" label="Zomer" waarde={v.zomer} />
      </div>

      {v.plek_check && (
        <div className="rounded-2xl bg-cream-100 border border-cream-200 p-3 text-sm">
          <span className="font-semibold text-bark-700">📐 Staat hij goed?</span> <span className="text-bark-600">{v.plek_check}</span>
        </div>
      )}

      <Lijst titel="Basis" emoji="✅" items={v.basis} klasse="bg-leaf-50 text-leaf-800" />
      <Lijst titel="Extra verwennen" emoji="💚" items={v.extra_verwennen} klasse="bg-cream-100 text-bark-700" />
      <Lijst titel="Veelgemaakte fouten" emoji="⚠️" items={v.veelgemaakte_fouten} klasse="bg-bloom-50 text-bloom-800" />
    </div>
  )
}

function Veld({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
