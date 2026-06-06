import { useEffect, useState } from 'react'
import { useGarden } from './lib/GardenContext'
import { LaadScherm } from './components/ui'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { VandaagScreen } from './screens/VandaagScreen'
import { PlantenScreen } from './screens/PlantenScreen'
import { PlanScreen } from './screens/PlanScreen'
import { VoorraadScreen } from './screens/VoorraadScreen'
import { VogelsScreen } from './screens/VogelsScreen'
import { BriefingScreen } from './screens/BriefingScreen'
import { waterStatus, volgendeWaterDatum } from './lib/water'
import { toonMelding, notificatieStatus } from './lib/notify'

type Tab = 'vandaag' | 'planten' | 'plan' | 'voorraad' | 'vogels'

const NAV: { id: Tab; emoji: string; label: string }[] = [
  { id: 'vandaag', emoji: '🏡', label: 'Vandaag' },
  { id: 'planten', emoji: '🪴', label: 'Planten' },
  { id: 'plan', emoji: '🗓️', label: 'Plan' },
  { id: 'voorraad', emoji: '🧺', label: 'Voorraad' },
  { id: 'vogels', emoji: '🐦', label: 'Vogels' },
]

export default function App() {
  const { laden, melding, intro, setIntro, plants } = useGarden()
  const [tab, setTab] = useState<Tab>('vandaag')
  const [briefingOpen, setBriefingOpen] = useState(false)

  // Water-meldingen (werkt zolang de app open is, ook op een achtergrond-tab).
  useEffect(() => {
    if (!plants.length) return
    function check() {
      if (notificatieStatus() !== 'granted') return
      const due = plants.filter((p) => p.water_interval_dagen && waterStatus(p).due)
      if (!due.length) return
      let map: Record<string, string> = {}
      try {
        map = JSON.parse(localStorage.getItem('bloomies_waternotif') || '{}')
      } catch {
        /* niets */
      }
      const nieuw = due.filter((p) => {
        const d = volgendeWaterDatum(p)?.toDateString()
        return d && map[p.id] !== d
      })
      if (!nieuw.length) return
      for (const p of nieuw) {
        const d = volgendeWaterDatum(p)?.toDateString()
        if (d) map[p.id] = d
      }
      try {
        localStorage.setItem('bloomies_waternotif', JSON.stringify(map))
      } catch {
        /* niets */
      }
      if (nieuw.length === 1) toonMelding('Tijd om water te geven 💧', `${nieuw[0].naam} heeft dorst.`, 'bloom-water')
      else toonMelding('Tijd om water te geven 💧', `${nieuw.length} planten hebben dorst.`, 'bloom-water')
    }
    check()
    const id = window.setInterval(check, 3600000)
    const vis = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [plants])

  if (intro) return <OnboardingScreen onKlaar={() => setIntro(false)} />

  if (laden) {
    return (
      <div className="min-h-screen bg-cream-100">
        <Header onGoeroe={() => setBriefingOpen(true)} />
        <LaadScherm />
      </div>
    )
  }

  if (briefingOpen) {
    return (
      <BriefingScreen
        onClose={() => setBriefingOpen(false)}
        onNaarPlan={() => {
          setBriefingOpen(false)
          setTab('plan')
        }}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream-100">
      <Header onGoeroe={() => setBriefingOpen(true)} />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-28 pt-2">
        {tab === 'vandaag' && <VandaagScreen onTab={(t) => setTab(t)} onGoeroe={() => setBriefingOpen(true)} />}
        {tab === 'planten' && <PlantenScreen />}
        {tab === 'plan' && <PlanScreen onGoeroe={() => setBriefingOpen(true)} />}
        {tab === 'voorraad' && <VoorraadScreen />}
        {tab === 'vogels' && <VogelsScreen />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-cream-200 bg-cream-50/95 backdrop-blur safe-bottom">
        <div className="max-w-2xl mx-auto grid grid-cols-5">
          {NAV.map((n) => {
            const actief = tab === n.id
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${
                  actief ? 'text-leaf-600' : 'text-bark-400'
                }`}
              >
                <span className={`text-xl transition ${actief ? 'scale-110' : ''}`}>{n.emoji}</span>
                {n.label}
              </button>
            )
          })}
        </div>
      </nav>

      {melding && (
        <div className="fixed bottom-24 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
          <div className="bg-bark-800 text-cream-50 px-4 py-2.5 rounded-2xl shadow-soft text-sm font-medium animate-bloom-in max-w-sm text-center">
            {melding}
          </div>
        </div>
      )}
    </div>
  )
}

function Header({ onGoeroe }: { onGoeroe: () => void }) {
  return (
    <header className="sticky top-0 z-20 bg-cream-100/90 backdrop-blur border-b border-cream-200 safe-top">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-3xl">🌿</span>
          <div className="leading-tight">
            <h1 className="font-display text-2xl text-leaf-700">Bloomies</h1>
            <p className="text-[11px] text-bark-400 -mt-0.5 italic">Het hof van Luuk en Marieke</p>
          </div>
        </div>
        <button onClick={onGoeroe} className="btn-secondary text-sm py-2 px-3.5">
          🌱 Goeroe
        </button>
      </div>
    </header>
  )
}
