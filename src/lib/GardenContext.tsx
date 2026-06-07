import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as db from './db'
import { fetchWeather } from './weather'
import { getSeason } from './season'
import type {
  Garden,
  Plant,
  Task,
  InventoryItem,
  ShoppingItem,
  Suggestion,
  BirdAction,
  Seizoen,
} from './types'
import type { WeatherNow } from './weather'

interface Ervaring {
  niveau: number
  titel: string
  punten: number
  volgende: number
}

interface GardenState {
  laden: boolean
  garden: Garden | null
  plants: Plant[]
  tasks: Task[]
  inventory: InventoryItem[]
  shopping: ShoppingItem[]
  suggestions: Suggestion[]
  birds: BirdAction[]
  weather: WeatherNow | null
  seizoen: Seizoen
  ervaring: Ervaring
  melding: string | null
  intro: boolean

  meld: (tekst: string) => void
  setIntro: (v: boolean) => void
  bonTonen: boolean
  registreerEerstePlant: () => Promise<void>
  sluitBon: () => Promise<void>
  heropenBon: () => void
  setGarden: (g: Garden) => void
  refreshGarden: () => Promise<void>
  refreshPlants: () => Promise<void>
  refreshTasks: () => Promise<void>
  refreshInventory: () => Promise<void>
  refreshShopping: () => Promise<void>
  refreshSuggestions: () => Promise<void>
  refreshBirds: () => Promise<void>
  laadWeer: (lat: number, lon: number) => Promise<void>
}

const Ctx = createContext<GardenState | null>(null)

function berekenErvaring(plants: Plant[], tasks: Task[], garden: Garden | null): Ervaring {
  const gedaan = tasks.filter((t) => t.status === 'gedaan').length
  const punten = plants.length + gedaan + (garden?.briefing_voltooid ? 2 : 0)
  const drempels = [
    { niveau: 0, titel: 'Net begonnen', tot: 2 },
    { niveau: 1, titel: 'Eerste worteltjes', tot: 5 },
    { niveau: 2, titel: 'Op dreef', tot: 10 },
    { niveau: 3, titel: 'Groene vingers', tot: 20 },
    { niveau: 4, titel: 'Hovenier van het hof', tot: Infinity },
  ]
  const huidig = drempels.find((d) => punten < d.tot) ?? drempels[drempels.length - 1]
  return { niveau: huidig.niveau, titel: huidig.titel, punten, volgende: huidig.tot }
}

export function GardenProvider({ children }: { children: ReactNode }) {
  const [laden, setLaden] = useState(true)
  const [garden, setGardenState] = useState<Garden | null>(null)
  const [plants, setPlants] = useState<Plant[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [shopping, setShopping] = useState<ShoppingItem[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [birds, setBirds] = useState<BirdAction[]>([])
  const [weather, setWeather] = useState<WeatherNow | null>(null)
  const [melding, setMelding] = useState<string | null>(null)
  const meldTimer = useRef<number | null>(null)
  const [intro, setIntroState] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('bloomies_intro_v1')
    } catch {
      return false
    }
  })
  const setIntro = useCallback((v: boolean) => {
    setIntroState(v)
    try {
      if (!v) localStorage.setItem('bloomies_intro_v1', '1')
    } catch {
      /* niets */
    }
  }, [])

  const [bonTonen, setBonTonen] = useState(false)

  const seizoen = getSeason()

  const meld = useCallback((tekst: string) => {
    setMelding(tekst)
    if (meldTimer.current) window.clearTimeout(meldTimer.current)
    meldTimer.current = window.setTimeout(() => setMelding(null), 3500)
  }, [])

  const refreshGarden = useCallback(async () => {
    const g = await db.ensureGarden()
    setGardenState(g)
  }, [])
  const refreshPlants = useCallback(async () => setPlants(await db.listPlants()), [])
  const refreshTasks = useCallback(async () => setTasks(await db.listTasks()), [])
  const refreshInventory = useCallback(async () => setInventory(await db.listInventory()), [])
  const refreshShopping = useCallback(async () => setShopping(await db.listShopping()), [])
  const refreshSuggestions = useCallback(async () => setSuggestions(await db.listSuggestions()), [])
  const refreshBirds = useCallback(async () => setBirds(await db.listBirdActions()), [])

  const laadWeer = useCallback(async (lat: number, lon: number) => {
    const w = await fetchWeather(lat, lon)
    if (w) setWeather(w)
  }, [])

  const setGarden = useCallback((g: Garden) => setGardenState(g), [])

  // Easter egg: bij de allereerste plant verschijnt de €100-waardebon (eenmalig).
  const registreerEerstePlant = useCallback(async () => {
    if (garden && !garden.eerste_plant_op) {
      try {
        const g = await db.updateGarden({ eerste_plant_op: new Date().toISOString() })
        setGardenState(g)
      } catch {
        /* tonen gaat door, ook als opslaan even faalt */
      }
      setBonTonen(true)
    }
  }, [garden])

  const sluitBon = useCallback(async () => {
    setBonTonen(false)
    try {
      const g = await db.updateGarden({ bon_gezien_op: new Date().toISOString() })
      setGardenState(g)
    } catch {
      /* niets */
    }
  }, [])

  const heropenBon = useCallback(() => setBonTonen(true), [])

  useEffect(() => {
    let actief = true
    ;(async () => {
      try {
        const g = await db.ensureGarden()
        if (!actief) return
        setGardenState(g)
        const [p, t, inv, sh, su, bi] = await Promise.all([
          db.listPlants(),
          db.listTasks(),
          db.listInventory(),
          db.listShopping(),
          db.listSuggestions(),
          db.listBirdActions(),
        ])
        if (!actief) return
        setPlants(p)
        setTasks(t)
        setInventory(inv)
        setShopping(sh)
        setSuggestions(su)
        setBirds(bi)
        if (g.locatie_lat != null && g.locatie_lon != null) {
          fetchWeather(g.locatie_lat, g.locatie_lon).then((w) => actief && w && setWeather(w))
        }
      } catch (e) {
        console.error(e)
        if (actief) meld('Kon de gegevens niet laden. Ververs de pagina.')
      } finally {
        if (actief) setLaden(false)
      }
    })()
    return () => {
      actief = false
    }
  }, [meld])

  const ervaring = useMemo(() => berekenErvaring(plants, tasks, garden), [plants, tasks, garden])

  const value: GardenState = {
    laden,
    garden,
    plants,
    tasks,
    inventory,
    shopping,
    suggestions,
    birds,
    weather,
    seizoen,
    ervaring,
    melding,
    intro,
    meld,
    setIntro,
    bonTonen,
    registreerEerstePlant,
    sluitBon,
    heropenBon,
    setGarden,
    refreshGarden,
    refreshPlants,
    refreshTasks,
    refreshInventory,
    refreshShopping,
    refreshSuggestions,
    refreshBirds,
    laadWeer,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGarden(): GardenState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useGarden moet binnen GardenProvider gebruikt worden')
  return ctx
}
