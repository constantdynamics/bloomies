import {
  listBriefing,
  listTasks,
  listInventory,
  listShopping,
  deleteAllTasks,
  addTasks,
  addSuggestions,
  addBirdActions,
  updateGarden,
} from './db'
import { genereerPlan } from './api'
import { ververBoodschappen, normaliseer } from './shopping'
import { datumNL } from './season'
import { weerSamenvatting, type WeatherNow } from './weather'
import type { Garden, Plant, InventoryItem, BirdAction, Seizoen, Task, TaskDomein } from './types'

// Genereert het jaarplan via Claude en bewaart alles (taken, suggesties,
// vogelacties, analyse) + leidt de boodschappenlijst af. Geeft de bijgewerkte
// tuin terug zodat de aanroeper de state kan verversen.
export async function genereerEnBewaarPlan(opts: {
  garden: Garden | null
  plants: Plant[]
  inventory: InventoryItem[]
  birds: BirdAction[]
  seizoen: Seizoen
  weather: WeatherNow | null
  vervang?: boolean
}): Promise<Garden> {
  const { garden, plants, inventory, birds, seizoen, weather, vervang } = opts

  const briefing = await listBriefing()
  const laatsteSamenvatting =
    [...briefing].reverse().find((m) => m.rol === 'assistant' && m.meta?.samenvatting)?.meta?.samenvatting ?? ''

  const context = {
    naam: garden?.naam,
    locatie_naam: garden?.locatie_naam ?? '',
    klimaatnotities: garden?.klimaatnotities ?? '',
    seizoen,
    datum: datumNL(),
    weer: weather ? weerSamenvatting(weather) : '',
    samenvatting: laatsteSamenvatting,
  }

  const res = await genereerPlan({
    context,
    plants,
    inventory,
    briefing: briefing.map((m) => ({ rol: m.rol, inhoud: m.inhoud })),
  })

  if (vervang) await deleteAllTasks()

  const rows: Partial<Task>[] = (res.taken || []).map((t) => ({
    titel: t.titel,
    domein: (t.domein as TaskDomein) || 'tuin',
    beschrijving: t.beschrijving || null,
    instructies: Array.isArray(t.instructies) ? t.instructies : [],
    benodigdheden: Array.isArray(t.benodigdheden) ? t.benodigdheden : [],
    ideale_periode: t.ideale_periode || null,
    goede_periode: t.goede_periode || null,
    niet_doen_periode: t.niet_doen_periode || null,
    geschatte_tijd: t.geschatte_tijd || null,
    categorie: t.categorie || null,
    prioriteit: t.prioriteit || 'normaal',
    status: 'open',
  }))
  await addTasks(rows)

  if (garden?.suggesties_aan && res.suggesties?.length) {
    await addSuggestions(
      res.suggesties.map((s) => ({
        titel: s.titel,
        inhoud: s.inhoud || null,
        domein: s.domein || 'tuin',
        status: 'voorgesteld' as const,
      })),
    )
  }

  if (res.vogelacties?.length) {
    const bestaand = new Set(birds.map((b) => `${b.seizoen}|${normaliseer(b.actie)}`))
    const nieuw = res.vogelacties
      .filter((v) => v.actie && !bestaand.has(`${v.seizoen}|${normaliseer(v.actie)}`))
      .map((v) => ({ seizoen: v.seizoen, actie: v.actie, toelichting: v.toelichting || null }))
    if (nieuw.length) await addBirdActions(nieuw)
  }

  const g2 = await updateGarden({
    laatste_analyse: res.analyse || null,
    plan_bijgewerkt_op: new Date().toISOString(),
  })

  // Boodschappenlijst automatisch afleiden uit de nieuwe taken.
  const [verseTasks, verseInv, verseShop] = await Promise.all([listTasks(), listInventory(), listShopping()])
  await ververBoodschappen(verseTasks, verseInv, verseShop)

  return g2
}
