import { useEffect, useState } from 'react'
import { useGarden } from '../lib/GardenContext'
import { Chip, EmptyState, domeinInfo } from '../components/ui'
import { updatePlant, updateTask } from '../lib/db'
import { waterStatus, waterLabel, waterUrgentie, urgentieKleur } from '../lib/water'
import { timingStatus } from '../lib/season'
import type { Plant, Task } from '../lib/types'

export function TimersScreen() {
  const { plants, tasks, refreshPlants, refreshTasks, meld } = useGarden()
  // Elke minuut opnieuw renderen zodat de timers en kleuren live aflopen.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60000)
    return () => window.clearInterval(id)
  }, [])

  const metTimer = plants
    .filter((p) => p.water_interval_dagen && p.water_interval_dagen > 0)
    .map((p) => ({ p, ws: waterStatus(p), u: waterUrgentie(p) }))
    .sort((a, b) => b.u - a.u)
  const zonderTimer = plants.filter((p) => !p.water_interval_dagen || p.water_interval_dagen <= 0)
  const acties = tasks.filter((t) => t.status === 'open' && timingStatus(t) === 'ideaal').slice(0, 6)

  const maxU = metTimer.length ? metTimer[0].u : 0
  const status = maxU >= 0.85 ? 'Tijd voor actie' : maxU >= 0.5 ? 'Bijna tijd' : 'Alles rustig'

  async function gegeven(p: Plant) {
    await updatePlant(p.id, { laatst_water: new Date().toISOString() })
    await refreshPlants()
    meld(`${p.naam}: water gegeven 💧`)
  }
  async function stelIn(p: Plant, dagen: number) {
    await updatePlant(p.id, { water_interval_dagen: dagen, laatst_water: p.laatst_water ?? new Date().toISOString() })
    await refreshPlants()
    meld(`Herinnering ingesteld: elke ${dagen} dagen 💧`)
  }
  async function afvinken(t: Task) {
    await updateTask(t.id, { status: 'gedaan', afgerond_op: new Date().toISOString() })
    await refreshTasks()
  }

  return (
    <div className="py-3">
      <h2 className="font-display text-2xl text-bark-800">Timers & acties</h2>
      <div className="flex items-center gap-2 mt-1 mb-4">
        <span className="h-3 w-3 rounded-full transition-colors" style={{ backgroundColor: urgentieKleur(maxU) }} />
        <span className="text-sm font-semibold transition-colors" style={{ color: urgentieKleur(maxU) }}>
          {status}
        </span>
        <span className="text-xs text-bark-400">— het Timers-tabje kleurt mee</span>
      </div>

      {plants.length === 0 ? (
        <div className="card">
          <EmptyState
            emoji="⏳"
            titel="Nog geen timers"
            tekst="Voeg planten toe — dan kun je hier per plant een water-herinnering instellen die langzaam van groen naar rood loopt."
          />
        </div>
      ) : (
        <>
          {metTimer.length > 0 && (
            <div className="mb-5">
              <h3 className="font-display text-lg text-bark-700 mb-2">💧 Water</h3>
              <div className="flex flex-col gap-2">
                {metTimer.map(({ p, ws, u }) => (
                  <div key={p.id} className="card p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-bark-800 line-clamp-1">{p.naam}</p>
                        <p className="text-xs mt-0.5 font-semibold" style={{ color: urgentieKleur(u) }}>
                          {waterLabel(ws)}
                        </p>
                      </div>
                      <button className="btn-primary text-sm py-1.5 px-3" onClick={() => gegeven(p)}>
                        ✓ Gegeven
                      </button>
                    </div>
                    <div className="h-2 bg-cream-200 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.max(4, u * 100)}%`, backgroundColor: urgentieKleur(u) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {acties.length > 0 && (
            <div className="mb-5">
              <h3 className="font-display text-lg text-bark-700 mb-2">🌿 Goed om nu te doen</h3>
              <div className="flex flex-col gap-2">
                {acties.map((t) => (
                  <div key={t.id} className="card p-3 flex items-center gap-3">
                    <button
                      onClick={() => afvinken(t)}
                      className="h-6 w-6 rounded-lg border-2 border-bark-300 shrink-0"
                      aria-label="Afvinken"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-bark-800 font-medium line-clamp-1">{t.titel}</p>
                      <div className="mt-0.5">
                        <Chip klasse={domeinInfo(t.domein).klasse}>
                          {domeinInfo(t.domein).emoji} {domeinInfo(t.domein).label}
                        </Chip>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {zonderTimer.length > 0 && (
            <div>
              <h3 className="font-display text-lg text-bark-700 mb-2">Nog geen water-timer</h3>
              <p className="text-bark-400 text-sm mb-2">Stel snel in hoe vaak je water geeft (later aan te passen per plant).</p>
              <div className="flex flex-col gap-2">
                {zonderTimer.map((p) => (
                  <div key={p.id} className="card p-3 flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-bark-800 flex-1 min-w-[40%] line-clamp-1">{p.naam}</p>
                    {[3, 7, 14].map((d) => (
                      <button key={d} className="btn-secondary text-xs py-1 px-2.5" onClick={() => stelIn(p, d)}>
                        elke {d}d
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
