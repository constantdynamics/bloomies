import { useEffect, useState } from 'react'
import { useGarden } from '../lib/GardenContext'
import { AddPlantSheet } from '../components/AddPlantSheet'
import { Sheet, Segment, EmptyState, Spinner, Chip, domeinInfo } from '../components/ui'
import { PhotoUploader } from '../components/PhotoUploader'
import { updatePlant, deletePlant, addPhoto, listPhotos } from '../lib/db'
import { uploadFoto } from '../lib/storage'
import type { Plant, Photo, PlantType } from '../lib/types'
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
            tekst="Begin met een foto van je tuin of een kamerplant. Ik herken de soort en kijk meteen naar de gezondheid."
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
          {zichtbaar.map((p) => (
            <button
              key={p.id}
              onClick={() => setDetail(p)}
              className="card overflow-hidden text-left active:scale-[0.98] transition"
            >
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
                  {p.status ? (
                    <Chip klasse="bg-bloom-100 text-bloom-700">⚠️ aandacht</Chip>
                  ) : p.gezondheid ? (
                    <Chip klasse="bg-leaf-100 text-leaf-700">gezond</Chip>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <AddPlantSheet open={addOpen} onClose={() => setAddOpen(false)} />
      {detail && <PlantDetail plant={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function PlantDetail({ plant, onClose }: { plant: Plant; onClose: () => void }) {
  const { refreshPlants, meld } = useGarden()
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

  useEffect(() => {
    listPhotos().then((alle) => setFotos(alle.filter((f) => f.plant_id === plant.id)))
  }, [plant.id])

  async function opslaan() {
    setBewaren(true)
    try {
      await updatePlant(plant.id, {
        naam: form.naam.trim(),
        soort: form.soort.trim() || null,
        type: form.type,
        locatie_in_tuin: form.locatie.trim() || null,
        gezondheid: form.gezondheid.trim() || null,
        notitie: form.notitie.trim() || null,
      })
      await refreshPlants()
      meld('Plant bijgewerkt 🌿')
      onClose()
    } catch (e: any) {
      meld(e?.message || 'Opslaan mislukt')
    } finally {
      setBewaren(false)
    }
  }

  async function verwijder() {
    if (!confirm(`"${plant.naam}" verwijderen?`)) return
    try {
      await deletePlant(plant.id)
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
      const nieuw = await addPhoto({ plant_id: plant.id, url, type: 'evaluatie', notitie: form.naam })
      setFotos((prev) => [nieuw, ...prev])
      if (!plant.foto_url) await updatePlant(plant.id, { foto_url: url })
      await refreshPlants()
      meld('Voortgangsfoto opgeslagen 📸')
    } catch (e: any) {
      meld(e?.message || 'Upload mislukt')
    } finally {
      setUploaden(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={plant.naam}>
      {plant.foto_url && (
        <img src={plant.foto_url} alt={plant.naam} className="w-full h-48 object-cover rounded-2xl border border-cream-200 mb-3" />
      )}

      {plant.herkend_door_ai && (
        <p className="text-xs text-bark-400 mb-3">🌱 Herkend met hulp van de goeroe{plant.zekerheid ? ` · zekerheid ${plant.zekerheid}` : ''}</p>
      )}

      <div className="flex flex-col gap-3">
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
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-lg text-bark-700">Voortgang</h3>
          <PhotoUploader onFoto={voortgangsfoto} label="📸 Foto" variant="secondary" />
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

      <div className="flex gap-2 mt-6">
        <button className="btn-primary flex-1" onClick={opslaan} disabled={bewaren}>
          {bewaren ? <Spinner klein /> : 'Opslaan'}
        </button>
        <button className="btn-ghost text-bloom-600" onClick={verwijder}>
          Verwijderen
        </button>
      </div>
    </Sheet>
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
