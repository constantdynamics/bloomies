// Datamodellen voor Bloomies (komen overeen met de bloom_* tabellen in Supabase).

export type PlantType = 'kamerplant' | 'tuin' | 'boom' | 'zaad'
export type TaskDomein = 'kamerplant' | 'tuin' | 'vogels' | 'algemeen'
export type TaskStatus = 'open' | 'gedaan'
export type Seizoen = 'lente' | 'zomer' | 'herfst' | 'winter'
export type SuggestieStatus = 'voorgesteld' | 'goedgekeurd' | 'afgekeurd'
export type ShoppingStatus = 'nodig' | 'gekocht' | 'thuis'
export type InventoryCategorie = 'gereedschap' | 'zaden' | 'meststoffen' | 'vogels' | 'overig'

export interface Garden {
  id: string
  naam: string
  locatie_lat: number | null
  locatie_lon: number | null
  locatie_naam: string | null
  klimaatnotities: string | null
  briefing_voltooid: boolean
  suggesties_aan: boolean
  ervaringsniveau: number
  laatste_analyse: string | null
  plan_bijgewerkt_op: string | null
  created_at: string
  updated_at: string
}

export interface Plant {
  id: string
  garden_id: string
  type: PlantType
  naam: string
  soort: string | null
  locatie_in_tuin: string | null
  status: string | null
  gezondheid: string | null
  foto_url: string | null
  herkend_door_ai: boolean
  zekerheid: string | null
  notitie: string | null
  water_interval_dagen: number | null
  laatst_water: string | null
  verzorging: Verzorging | null
  created_at: string
}

export interface Verzorging {
  ideale_temperatuur?: string
  luchtvochtigheid?: string
  licht?: string
  standplaats?: string
  water_frequentie_dagen?: number
  water_toelichting?: string
  winter?: string
  zomer?: string
  plek_check?: string
  basis?: string[]
  extra_verwennen?: string[]
  veelgemaakte_fouten?: string[]
}

export interface Task {
  id: string
  garden_id: string
  titel: string
  domein: TaskDomein
  beschrijving: string | null
  instructies: string[]
  benodigdheden: string[]
  ideale_periode: string | null
  goede_periode: string | null
  niet_doen_periode: string | null
  geschatte_tijd: string | null
  categorie: string | null
  prioriteit: string | null
  status: TaskStatus
  gepland_voor: string | null
  afgerond_op: string | null
  created_at: string
}

export interface InventoryItem {
  id: string
  garden_id: string
  naam: string
  categorie: string
  in_huis: boolean
  houdbaar_tot: string | null
  notitie: string | null
  created_at: string
}

export interface ShoppingItem {
  id: string
  garden_id: string
  naam: string
  categorie: string
  status: ShoppingStatus
  created_at: string
}

export interface BriefingMessage {
  id: string
  garden_id: string
  rol: 'user' | 'assistant'
  inhoud: string
  foto_ref: string | null
  meta: any | null
  created_at: string
}

export interface Photo {
  id: string
  garden_id: string
  plant_id: string | null
  url: string
  type: 'begin' | 'evaluatie'
  notitie: string | null
  created_at: string
}

export interface Suggestion {
  id: string
  garden_id: string
  titel: string
  inhoud: string | null
  domein: string | null
  status: SuggestieStatus
  created_at: string
}

export interface BirdAction {
  id: string
  garden_id: string
  seizoen: Seizoen
  actie: string
  toelichting: string | null
  gedaan: boolean
  created_at: string
}

// ---- Antwoorden van de Edge Functions (AI) ----

export interface IdentifyResult {
  herkend?: boolean
  naam?: string
  soort?: string
  type?: PlantType
  zekerheid?: 'hoog' | 'gemiddeld' | 'laag'
  gezondheid?: string
  problemen?: string[]
  betere_foto_nodig?: boolean
  foto_instructie?: string
  verzorging_kort?: string
}

export interface ChatResult {
  bericht: string
  keuzes: string[]
  foto_focus: { plant?: string; vraag?: string } | null
  klaar: boolean
  samenvatting: string
}

export interface PlanTask {
  titel: string
  domein?: TaskDomein
  beschrijving?: string
  instructies?: string[]
  benodigdheden?: string[]
  ideale_periode?: string
  goede_periode?: string
  niet_doen_periode?: string
  geschatte_tijd?: string
  categorie?: string
  prioriteit?: string
}

export interface PlanResult {
  analyse: string
  taken: PlanTask[]
  suggesties: { titel: string; inhoud?: string; domein?: string }[]
  vogelacties: { seizoen: Seizoen; actie: string; toelichting?: string }[]
}
