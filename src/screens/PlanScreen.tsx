import { useMemo, useState } from 'react'
import { useGarden } from '../lib/GardenContext'
import { Sheet, Segment, EmptyState, Spinner, Chip, domeinInfo } from '../components/ui'
import { addTasks, updateTask } from '../lib/db'
import { genereerEnBewaarPlan } from '../lib/plan'
import { timingStatus, timingLabel } from '../lib/season'
import type { Task, TaskDomein } from '../lib/types'

const DOMEINEN = [
  { value: 'alles', label: 'Alles' },
  { value: 'tuin', label: '🌿 Tuin' },
  { value: 'kamerplant', label: '🪴 Kamer' },
  { value: 'vogels', label: '🐦 Vogels' },
  { value: 'algemeen', label: '🌼 Overig' },
]
const STATUSSEN = [
  { value: 'open', label: 'Te doen' },
  { value: 'gedaan', label: 'Gedaan' },
  { value: 'alles', label: 'Alles' },
]

export function PlanScreen({ onGoeroe }: { onGoeroe: () => void }) {
  const g = useGarden()
  const { tasks, garden, plants, inventory, meld, seizoen, weather } = g
  const [domein, setDomein] = useState('alles')
  const [status, setStatus] = useState('open')
  const [bezig, setBezig] = useState(false)
  const [analyseOpen, setAnalyseOpen] = useState(false)
  const [eigenOpen, setEigenOpen] = useState(false)

  const zichtbaar = useMemo(() => {
    return tasks
      .filter((t) => domein === 'alles' || t.domein === domein)
      .filter((t) => status === 'alles' || t.status === status)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1
        const prio = (p?: string | null) => (p === 'hoog' ? 0 : p === 'laag' ? 2 : 1)
        return prio(a.prioriteit) - prio(b.prioriteit)
      })
  }, [tasks, domein, status])

  const open = tasks.filter((t) => t.status === 'open').length
  const gedaan = tasks.filter((t) => t.status === 'gedaan').length

  async function genereer(vervang: boolean) {
    if (vervang && !confirm('Je huidige taken worden vervangen door een vers jaarplan. Doorgaan?')) return
    setBezig(true)
    try {
      const g2 = await genereerEnBewaarPlan({
        garden,
        plants,
        inventory,
        birds: g.birds,
        seizoen,
        weather,
        vervang,
      })
      g.setGarden(g2)
      await Promise.all([g.refreshTasks(), g.refreshSuggestions(), g.refreshBirds(), g.refreshShopping()])
      meld('Jouw jaarplan staat klaar! 🌻')
    } catch (e: any) {
      meld(e?.message || 'Het plan maken lukte niet. Probeer het nog eens.')
    } finally {
      setBezig(false)
    }
  }

  async function toggle(t: Task) {
    const nieuw = t.status === 'open' ? 'gedaan' : 'open'
    await updateTask(t.id, { status: nieuw, afgerond_op: nieuw === 'gedaan' ? new Date().toISOString() : null })
    await g.refreshTasks()
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="font-display text-2xl text-bark-800">Taken & plan</h2>
        {tasks.length > 0 && (
          <button className="btn-ghost text-sm" onClick={() => genereer(true)} disabled={bezig}>
            ⟳ Vernieuwen
          </button>
        )}
      </div>

      {tasks.length > 0 && (
        <p className="text-bark-400 text-sm mb-3">
          {open} te doen · {gedaan} gedaan
          {garden?.plan_bijgewerkt_op && (
            <> · plan van {new Date(garden.plan_bijgewerkt_op).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</>
          )}
        </p>
      )}

      {tasks.length === 0 ? (
        <div className="card">
          {bezig ? (
            <div className="py-14 flex flex-col items-center">
              <EmptyState emoji="🌻" titel="De goeroe maakt je jaarplan…" tekst="Even geduld — dit duurt een paar tellen." />
              <Spinner />
            </div>
          ) : (
            <EmptyState
              emoji="🗓️"
              titel="Nog geen plan"
              tekst="Laat de goeroe een volledig jaarplan maken op basis van je planten, doelen en het seizoen. Een briefinggesprek maakt het plan persoonlijker."
              actie={
                <div className="flex flex-col gap-2">
                  <button className="btn-primary" onClick={() => genereer(false)}>
                    🌻 Genereer mijn jaarplan
                  </button>
                  <button className="btn-ghost" onClick={onGoeroe}>
                    Eerst praten met de goeroe
                  </button>
                </div>
              }
            />
          )}
        </div>
      ) : (
        <>
          {garden?.laatste_analyse && (
            <div className="card p-4 mb-3 bg-leaf-50 border-leaf-100">
              <button className="w-full flex items-center justify-between text-left" onClick={() => setAnalyseOpen((o) => !o)}>
                <span className="font-display text-lg text-leaf-700">🌱 Analyse van de goeroe</span>
                <span className="text-leaf-600">{analyseOpen ? '▲' : '▼'}</span>
              </button>
              {analyseOpen && (
                <p className="text-bark-600 text-sm leading-relaxed mt-2 whitespace-pre-wrap">{garden.laatste_analyse}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 mb-4">
            <div className="overflow-x-auto -mx-1 px-1">
              <Segment opties={DOMEINEN} value={domein} onChange={setDomein} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Segment opties={STATUSSEN} value={status} onChange={setStatus} />
              <button className="btn-ghost text-sm" onClick={() => setEigenOpen(true)}>
                ＋ Eigen taak
              </button>
            </div>
          </div>

          {zichtbaar.length === 0 ? (
            <p className="text-bark-400 text-center py-8">Geen taken in deze selectie.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {zichtbaar.map((t) => (
                <TaskCard key={t.id} task={t} onToggle={() => toggle(t)} />
              ))}
            </div>
          )}
        </>
      )}

      {eigenOpen && <EigenTaakSheet onClose={() => setEigenOpen(false)} />}
    </div>
  )
}

function TaskCard({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const [open, setOpen] = useState(false)
  const dom = domeinInfo(task.domein)
  const t = timingLabel(timingStatus(task))
  const gedaan = task.status === 'gedaan'

  return (
    <div className={`card p-3.5 ${gedaan ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`mt-0.5 h-6 w-6 shrink-0 rounded-lg border-2 flex items-center justify-center transition ${
            gedaan ? 'bg-leaf-500 border-leaf-500 text-white' : 'border-bark-300'
          }`}
          aria-label={gedaan ? 'Markeer als te doen' : 'Markeer als gedaan'}
        >
          {gedaan && '✓'}
        </button>
        <button className="flex-1 text-left" onClick={() => setOpen((o) => !o)}>
          <p className={`font-semibold text-bark-800 ${gedaan ? 'line-through' : ''}`}>{task.titel}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Chip klasse={dom.klasse}>{dom.emoji} {dom.label}</Chip>
            {!gedaan && <Chip klasse={t.klasse}>{t.label}</Chip>}
            {task.geschatte_tijd && <Chip klasse="bg-cream-200 text-bark-500">⏱ {task.geschatte_tijd}</Chip>}
            {task.categorie && <Chip klasse="bg-cream-200 text-bark-500">{task.categorie}</Chip>}
          </div>
        </button>
      </div>

      {open && (
        <div className="mt-3 pl-9 text-sm text-bark-600 flex flex-col gap-2">
          {task.beschrijving && <p className="leading-relaxed">{task.beschrijving}</p>}
          {task.instructies?.length > 0 && (
            <ol className="list-decimal list-inside flex flex-col gap-1">
              {task.instructies.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
          {task.benodigdheden?.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-bark-400">Nodig:</span>
              {task.benodigdheden.map((b, i) => (
                <Chip key={i} klasse="bg-bloom-50 text-bloom-700">{b}</Chip>
              ))}
            </div>
          )}
          <div className="text-xs text-bark-400 flex flex-col gap-0.5 mt-1">
            {task.ideale_periode && <span>🟢 Ideaal: {task.ideale_periode}</span>}
            {task.goede_periode && <span>🟡 Goed: {task.goede_periode}</span>}
            {task.niet_doen_periode && <span>🔴 Liever niet: {task.niet_doen_periode}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function EigenTaakSheet({ onClose }: { onClose: () => void }) {
  const { refreshTasks, meld } = useGarden()
  const [form, setForm] = useState({ titel: '', domein: 'tuin' as TaskDomein, beschrijving: '', tijd: '' })
  const [bezig, setBezig] = useState(false)

  async function bewaar() {
    if (!form.titel.trim()) return
    setBezig(true)
    try {
      await addTasks([
        {
          titel: form.titel.trim(),
          domein: form.domein,
          beschrijving: form.beschrijving.trim() || null,
          geschatte_tijd: form.tijd.trim() || null,
          instructies: [],
          benodigdheden: [],
          categorie: 'eigen',
          status: 'open',
        },
      ])
      await refreshTasks()
      meld('Taak toegevoegd ✓')
      onClose()
    } catch (e: any) {
      meld(e?.message || 'Opslaan mislukt')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Eigen taak">
      <div className="flex flex-col gap-3">
        <div>
          <label className="label">Titel</label>
          <input className="input" value={form.titel} onChange={(e) => setForm({ ...form, titel: e.target.value })} placeholder="bv. Rozen snoeien" />
        </div>
        <div>
          <label className="label">Domein</label>
          <select className="input" value={form.domein} onChange={(e) => setForm({ ...form, domein: e.target.value as TaskDomein })}>
            <option value="tuin">Tuin</option>
            <option value="kamerplant">Kamerplant</option>
            <option value="vogels">Vogels</option>
            <option value="algemeen">Algemeen</option>
          </select>
        </div>
        <div>
          <label className="label">Beschrijving (optioneel)</label>
          <textarea className="input min-h-[70px]" value={form.beschrijving} onChange={(e) => setForm({ ...form, beschrijving: e.target.value })} />
        </div>
        <div>
          <label className="label">Geschatte tijd (optioneel)</label>
          <input className="input" value={form.tijd} onChange={(e) => setForm({ ...form, tijd: e.target.value })} placeholder="bv. 20 min" />
        </div>
        <button className="btn-primary" onClick={bewaar} disabled={bezig}>
          {bezig ? <Spinner klein /> : 'Taak opslaan'}
        </button>
      </div>
    </Sheet>
  )
}
