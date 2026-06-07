import { useEffect, useState, type ReactNode } from 'react'
import { useGarden } from './lib/GardenContext'
import { LaadScherm } from './components/ui'
import { BonModal } from './components/BonModal'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { VandaagScreen } from './screens/VandaagScreen'
import { PlantenScreen } from './screens/PlantenScreen'
import { PlanScreen } from './screens/PlanScreen'
import { VoorraadScreen } from './screens/VoorraadScreen'
import { VogelsScreen } from './screens/VogelsScreen'
import { TimersScreen } from './screens/TimersScreen'
import { BriefingScreen } from './screens/BriefingScreen'
import { maxWaterUrgentie, urgentieKleur } from './lib/water'

type Tab = 'vandaag' | 'timers' | 'planten' | 'plan' | 'voorraad' | 'vogels'

const NAV: { id: Tab; emoji: string; label: string }[] = [
  { id: 'vandaag', emoji: '🏡', label: 'Vandaag' },
  { id: 'timers', emoji: '', label: 'Timers' },
  { id: 'planten', emoji: '🪴', label: 'Planten' },
  { id: 'plan', emoji: '🗓️', label: 'Plan' },
  { id: 'voorraad', emoji: '🧺', label: 'Voorraad' },
  { id: 'vogels', emoji: '🐦', label: 'Vogels' },
]

export default function App() {
  const { laden, melding, intro, setIntro, plants, bonTonen, sluitBon, garden, heropenBon } = useGarden()
  const [tab, setTab] = useState<Tab>('vandaag')
  const [briefingOpen, setBriefingOpen] = useState(false)
  // Elke minuut tikken zodat de Timers-tab-kleur live meeloopt.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60000)
    return () => window.clearInterval(id)
  }, [])

  const urgentie = maxWaterUrgentie(plants)

  let view: ReactNode
  if (intro) {
    view = <OnboardingScreen onKlaar={() => setIntro(false)} />
  } else if (laden) {
    view = (
      <div className="min-h-screen bg-cream-100">
        <Header onGoeroe={() => setBriefingOpen(true)} />
        <LaadScherm />
      </div>
    )
  } else if (briefingOpen) {
    view = (
      <BriefingScreen
        onClose={() => setBriefingOpen(false)}
        onNaarPlan={() => {
          setBriefingOpen(false)
          setTab('plan')
        }}
      />
    )
  } else {
    view = (
      <div className="min-h-screen flex flex-col bg-cream-100">
        {garden?.eerste_plant_op && (
          <button
            onClick={heropenBon}
            className="w-full bg-gradient-to-r from-bloom-400 via-bloom-300 to-leaf-500 text-white text-center py-2.5 px-4 shadow-soft active:scale-[0.99]"
          >
            <p className="font-display text-lg font-bold tracking-wide leading-tight">🎁 CADEAUBON VAN €100 UNLOCKED! 🎉</p>
            <p className="text-[11px] opacity-90 leading-tight">tik om de bon te bekijken</p>
          </button>
        )}
        <Header onGoeroe={() => setBriefingOpen(true)} />

        <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-28 pt-2">
          {tab === 'vandaag' && <VandaagScreen onTab={(t) => setTab(t)} onGoeroe={() => setBriefingOpen(true)} />}
          {tab === 'timers' && <TimersScreen />}
          {tab === 'planten' && <PlantenScreen />}
          {tab === 'plan' && <PlanScreen onGoeroe={() => setBriefingOpen(true)} />}
          {tab === 'voorraad' && <VoorraadScreen />}
          {tab === 'vogels' && <VogelsScreen />}
        </main>

        <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-cream-200 bg-cream-50/95 backdrop-blur safe-bottom">
          <div className="max-w-2xl mx-auto grid grid-cols-6">
            {NAV.map((n) => {
              const actief = tab === n.id
              if (n.id === 'timers') {
                const kleur = actief ? undefined : urgentieKleur(urgentie)
                const hoog = urgentie >= 0.85 && !actief
                return (
                  <button
                    key={n.id}
                    onClick={() => setTab(n.id)}
                    className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
                      actief ? 'text-leaf-600' : ''
                    } ${hoog ? 'animate-pulse' : ''}`}
                    style={!actief ? { color: kleur } : undefined}
                  >
                    <Druppel className={`h-[22px] w-[22px] transition ${actief ? 'scale-110' : ''}`} />
                    {n.label}
                  </button>
                )
              }
              return (
                <button
                  key={n.id}
                  onClick={() => setTab(n.id)}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
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

  return (
    <>
      {view}
      {bonTonen && <BonModal onClose={sluitBon} />}
    </>
  )
}

function Druppel({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.2c-.34 0-.66.17-.85.46C9.7 4.86 5 11 5 14.8A7 7 0 0 0 19 15c0-3.8-4.7-9.94-6.15-12.34A1 1 0 0 0 12 2.2z"
      />
    </svg>
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
          🌱 Kaat
        </button>
      </div>
    </header>
  )
}
