import { useState } from 'react'
import { Sheet, Spinner, Chip } from './ui'
import { PhotoUploader } from './PhotoUploader'
import { useGarden } from '../lib/GardenContext'
import { herkenPlant, haalVerzorging } from '../lib/api'
import { uploadFoto } from '../lib/storage'
import { addPlant, addPhoto, updatePlant } from '../lib/db'
import { getSeason } from '../lib/season'
import type { VerkleindeFoto } from '../lib/image'
import type { IdentifyResult, Plant, PlantType } from '../lib/types'

const TYPES: { v: PlantType; l: string }[] = [
  { v: 'kamerplant', l: 'Kamerplant' },
  { v: 'tuin', l: 'Tuinplant' },
  { v: 'boom', l: 'Boom/struik' },
  { v: 'zaad', l: 'Zaad/zaailing' },
]

const lege = { naam: '', soort: '', type: 'tuin' as PlantType, locatie: '', gezondheid: '', notitie: '' }

export function AddPlantSheet({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded?: (p: Plant) => void
}) {
  const { meld, refreshPlants } = useGarden()
  const [foto, setFoto] = useState<VerkleindeFoto | null>(null)
  const [herkenning, setHerkenning] = useState<IdentifyResult | null>(null)
  const [bezig, setBezig] = useState(false)
  const [opslaan, setOpslaan] = useState(false)
  const [handmatig, setHandmatig] = useState(false)
  const [form, setForm] = useState({ ...lege })
  const [fout, setFout] = useState<string | null>(null)

  function reset() {
    setFoto(null)
    setHerkenning(null)
    setHandmatig(false)
    setForm({ ...lege })
    setFout(null)
    setBezig(false)
    setOpslaan(false)
  }

  function sluit() {
    reset()
    onClose()
  }

  async function onFoto(f: VerkleindeFoto) {
    setFoto(f)
    setHerkenning(null)
    setFout(null)
    setBezig(true)
    try {
      const r = await herkenPlant(f.base64, f.mediaType, form.naam || undefined)
      setHerkenning(r)
      setForm((prev) => ({
        ...prev,
        naam: r.naam && !r.betere_foto_nodig ? r.naam : prev.naam,
        soort: r.soort || prev.soort,
        type: (r.type as PlantType) || prev.type,
        gezondheid: r.gezondheid || prev.gezondheid,
      }))
    } catch (e: any) {
      setFout(e?.message || 'Herkenning mislukt. Je kunt de plant ook handmatig invullen.')
    } finally {
      setBezig(false)
    }
  }

  async function bewaar() {
    if (!form.naam.trim()) {
      setFout('Geef de plant een naam (corrigeer gerust de herkenning).')
      return
    }
    setOpslaan(true)
    setFout(null)
    try {
      let url: string | null = null
      if (foto) url = await uploadFoto(foto.blob, 'planten')
      const plant = await addPlant({
        naam: form.naam.trim(),
        soort: form.soort.trim() || null,
        type: form.type,
        locatie_in_tuin: form.locatie.trim() || null,
        gezondheid: form.gezondheid.trim() || null,
        notitie: form.notitie.trim() || null,
        foto_url: url,
        herkend_door_ai: !!(herkenning && herkenning.herkend && !herkenning.betere_foto_nodig),
        zekerheid: herkenning?.zekerheid || null,
        status: herkenning?.problemen?.length ? herkenning.problemen.join('; ') : null,
      })
      if (foto && url) await addPhoto({ plant_id: plant.id, url, type: 'begin', notitie: form.naam.trim() })
      await refreshPlants()
      meld(`${plant.naam} toegevoegd 🌱`)
      onAdded?.(plant)
      // Achtergrond: verzorgingsprofiel + waterinterval ophalen (blokkeert niet).
      haalVerzorging({ naam: plant.naam, soort: plant.soort, type: plant.type, locatie_in_tuin: plant.locatie_in_tuin, seizoen: getSeason() })
        .then(async (v) => {
          await updatePlant(plant.id, {
            verzorging: v,
            water_interval_dagen: typeof v.water_frequentie_dagen === 'number' ? v.water_frequentie_dagen : null,
            laatst_water: new Date().toISOString(),
          })
          await refreshPlants()
        })
        .catch(() => {
          /* stil: profiel kan later handmatig opgehaald worden */
        })
      sluit()
    } catch (e: any) {
      setFout(e?.message || 'Opslaan mislukt.')
    } finally {
      setOpslaan(false)
    }
  }

  const zekerheidChip = (z?: string) => {
    if (z === 'hoog') return <Chip klasse="bg-leaf-100 text-leaf-700">Zeker</Chip>
    if (z === 'gemiddeld') return <Chip klasse="bg-cream-200 text-bark-600">Redelijk zeker</Chip>
    return <Chip klasse="bg-bloom-100 text-bloom-700">Onzeker</Chip>
  }

  return (
    <Sheet open={open} onClose={sluit} title="Plant toevoegen">
      {!foto && !handmatig && (
        <div className="flex flex-col gap-3 py-2">
          <p className="text-bark-500 text-sm leading-relaxed">
            Maak een foto van je plant — ik probeer de soort te herkennen en kijk meteen naar de
            gezondheid. Twijfel ik, dan vraag ik om een betere foto.
          </p>
          <PhotoUploader onFoto={onFoto} />
          <button className="btn-ghost" onClick={() => setHandmatig(true)}>
            Of voeg handmatig toe (zonder foto)
          </button>
        </div>
      )}

      {foto && (
        <div className="mb-4">
          <img src={foto.dataUrl} alt="Plant" className="w-full h-52 object-cover rounded-2xl border border-cream-200" />
          {bezig && (
            <div className="flex items-center gap-2 text-bark-500 mt-3">
              <Spinner klein /> De goeroe bekijkt je plant…
            </div>
          )}
          {herkenning && !bezig && (
            <div className="mt-3 rounded-2xl bg-cream-100 border border-cream-200 p-3 text-sm">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-display text-base text-bark-800">{herkenning.naam || 'Onbekend'}</span>
                {zekerheidChip(herkenning.zekerheid)}
              </div>
              {herkenning.soort && <p className="text-bark-500 italic">{herkenning.soort}</p>}
              {herkenning.gezondheid && <p className="text-bark-600 mt-1">🩺 {herkenning.gezondheid}</p>}
              {!!herkenning.problemen?.length && (
                <p className="text-bloom-700 mt-1">⚠️ {herkenning.problemen.join(', ')}</p>
              )}
              {herkenning.verzorging_kort && <p className="text-leaf-700 mt-1">💡 {herkenning.verzorging_kort}</p>}
              {herkenning.betere_foto_nodig && (
                <div className="mt-2 rounded-xl bg-bloom-50 border border-bloom-100 p-2 text-bloom-700">
                  📸 {herkenning.foto_instructie || 'Een scherpere foto helpt me dit zeker te weten.'}
                  <div className="mt-2">
                    <PhotoUploader onFoto={onFoto} label="Betere foto maken" variant="secondary" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(foto || handmatig) && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="label">Naam</label>
            <input
              className="input"
              value={form.naam}
              placeholder="bv. Hortensia"
              onChange={(e) => setForm({ ...form, naam: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Soort / cultivar (optioneel)</label>
            <input
              className="input"
              value={form.soort}
              placeholder="bv. Hydrangea macrophylla"
              onChange={(e) => setForm({ ...form, soort: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PlantType })}>
              {TYPES.map((t) => (
                <option key={t.v} value={t.v}>
                  {t.l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Plek in de tuin/huis (optioneel)</label>
            <input
              className="input"
              value={form.locatie}
              placeholder="bv. achterin links, of vensterbank keuken"
              onChange={(e) => setForm({ ...form, locatie: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Gezondheid / opmerking (optioneel)</label>
            <input
              className="input"
              value={form.gezondheid}
              placeholder="bv. ziet er gezond uit"
              onChange={(e) => setForm({ ...form, gezondheid: e.target.value })}
            />
          </div>

          {fout && <p className="text-bloom-700 text-sm">{fout}</p>}

          <div className="flex gap-2 pt-1">
            <button className="btn-primary flex-1" onClick={bewaar} disabled={opslaan}>
              {opslaan ? (
                <>
                  <Spinner klein /> Opslaan…
                </>
              ) : (
                'Plant opslaan'
              )}
            </button>
            <button className="btn-ghost" onClick={sluit}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
