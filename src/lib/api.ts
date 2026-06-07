import { callClaude, jsonUit, tekstUit, ApiError } from './claude'
import type { ChatResult, IdentifyResult, PlanResult, BriefingMessage, Verzorging } from './types'

export { ApiError }

// ---------------- Plantherkenning ----------------
const SYSTEM_IDENTIFY = `Je bent Kaat de Groenfanaat, een deskundige plantexpert voor Bloomies. Je analyseert een foto van een plant
(kamerplant, tuinplant, boom of zaailing) en geeft een nauwkeurige beoordeling in het Nederlands.

Werkwijze: kijk EERST zorgvuldig naar de zichtbare kenmerken — bladvorm, bladstand en nervatuur,
eventuele bloem of vrucht, de groeiwijze, en de omgeving (pot binnen of plant buiten in de tuin).
Bepaal de soort pas als die kenmerken er echt bij passen. Verzin NOOIT een plant die niet op de foto staat,
en laat je niet leiden door een eventuele hint als die niet klopt met wat je ziet.

GOK NIET. Twijfel je tussen soorten, of zijn de kenmerken niet duidelijk te zien, zet dan "zekerheid" op
"laag" en zet "betere_foto_nodig" op true, met in "foto_instructie" precies wat je nodig hebt (bijv. een
scherpe close-up van een blad of de bloem).

Antwoord ALLEEN met geldig JSON, zonder uitleg eromheen en zonder markdown:
{
  "herkend": true,
  "naam": "Nederlandse naam (zet 'waarschijnlijk' ervoor bij twijfel)",
  "soort": "wetenschappelijke naam en/of cultivar indien mogelijk",
  "type": "kamerplant|tuin|boom|zaad",
  "zekerheid": "hoog|gemiddeld|laag",
  "gezondheid": "korte beoordeling van de algemene gezondheid",
  "problemen": ["zichtbare ziektes, plagen of stress"],
  "betere_foto_nodig": false,
  "foto_instructie": "",
  "verzorging_kort": "1-2 concrete verzorgingstips"
}`

export async function herkenPlant(base64: string, mediaType: string, naamHint?: string): Promise<IdentifyResult> {
  const msg = await callClaude({
    max_tokens: 1500,
    system: SYSTEM_IDENTIFY,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text:
              'Welke plant is dit? Bepaal soort/cultivar waar mogelijk, beoordeel de gezondheid en let op ziektes/plagen. ' +
              (naamHint ? `De gebruiker denkt dat het mogelijk is: "${naamHint}". ` : '') +
              'Wees eerlijk over je zekerheid en vraag om een betere foto als dat nodig is.',
          },
        ],
      },
    ],
  })
  try {
    return jsonUit(msg) as IdentifyResult
  } catch {
    return {
      herkend: false,
      naam: '',
      zekerheid: 'laag',
      betere_foto_nodig: true,
      foto_instructie: 'Ik kon de foto niet goed analyseren. Probeer een scherpe, goed belichte close-up.',
      problemen: [],
      verzorging_kort: '',
    }
  }
}

// ---------------- Briefinggesprek ----------------
const SYSTEM_CHAT = `Je bent Kaat de Groenfanaat, de enthousiaste tuingoeroe van Bloomies — het hof van Luuk en Marieke.
Je stelt jezelf in je eerste bericht kort voor als Kaat.
Je bent warm, kundig, aanmoedigend en altijd concreet. Je voert een kort briefinggesprek
om de tuindoelen voor het komende jaar te leren kennen (kamerplanten, tuin van zaadje tot boom,
en vogels per seizoen). Je praat Nederlands.

Regels:
- Stel ÉÉN vraag tegelijk, kort en warm. Geen lange lappen tekst.
- Verwijs naar de foto's of bekende planten als dat je vraag scherper maakt.
- Wees nieuwsgierig naar wat Luuk en Marieke willen: meer bloei, moestuin, vogels lokken, een boom, rust, etc.
- Herken wanneer je genoeg weet om een goed jaarplan te maken en zet dan "klaar" op true.
- Als de gebruiker een vraag overslaat of wil stoppen, respecteer dat en rond netjes af.

BELANGRIJK — je antwoord is ALTIJD geldig JSON, zonder uitleg eromheen en zonder markdown:
{
  "bericht": "warme, korte tekst met één vraag of opmerking",
  "keuzes": ["kort antwoord 1", "kort antwoord 2"],
  "foto_focus": null,
  "klaar": false,
  "samenvatting": ""
}
- "keuzes": 2 tot 4 handige meerkeuze-antwoorden die bij je vraag passen, of [] bij een open vraag.
- "foto_focus": {"plant":"naam","vraag":"..."} als je vraag over een specifieke plant/foto gaat, anders null.
- "klaar": true zodra je genoeg weet voor een jaarplan.
- "samenvatting": bij klaar=true een korte samenvatting van de doelen, anders "".`

function chatContext(ctx: any): string {
  const lines: string[] = ['TUINCONTEXT (gebruik dit om gerichte vragen te stellen):']
  lines.push(`- Tuin: ${ctx?.naam ?? 'Het hof van Luuk en Marieke'}`)
  if (ctx?.locatie_naam) lines.push(`- Locatie: ${ctx.locatie_naam}`)
  if (ctx?.seizoen) lines.push(`- Huidig seizoen: ${ctx.seizoen}`)
  if (ctx?.weer) lines.push(`- Weer nu: ${ctx.weer}`)
  const plants = Array.isArray(ctx?.plants) ? ctx.plants : []
  if (plants.length) {
    lines.push(`- Bekende planten (${plants.length}):`)
    for (const p of plants.slice(0, 30))
      lines.push(`   • ${p.naam ?? 'onbekend'}${p.soort ? ` (${p.soort})` : ''}${p.type ? ` — ${p.type}` : ''}${p.locatie_in_tuin ? `, plek: ${p.locatie_in_tuin}` : ''}${p.gezondheid ? `, gezondheid: ${p.gezondheid}` : ''}`)
  } else {
    lines.push('- Er zijn nog geen planten vastgelegd. De tuin begint leeg.')
  }
  if (typeof ctx?.aantal_foto === 'number') lines.push(`- Aantal geüploade foto's: ${ctx.aantal_foto}`)
  return lines.join('\n')
}

export async function praatMetGoeroe(
  messages: Pick<BriefingMessage, 'rol' | 'inhoud'>[],
  context: Record<string, unknown>,
  photos: { url: string; label?: string }[] = [],
): Promise<ChatResult> {
  const firstContent: any[] = [{ type: 'text', text: chatContext(context) }]
  for (const p of photos.slice(0, 6)) {
    if (p?.url) {
      firstContent.push({ type: 'text', text: `Foto — ${p.label ?? 'tuinfoto'}:` })
      firstContent.push({ type: 'image', source: { type: 'url', url: p.url } })
    }
  }
  if (messages.length === 0)
    firstContent.push({ type: 'text', text: 'Begin nu het briefinggesprek met een warme opening en je eerste vraag.' })

  const claudeMessages: any[] = [{ role: 'user', content: firstContent }]
  for (const m of messages)
    claudeMessages.push({ role: m.rol === 'assistant' ? 'assistant' : 'user', content: String(m.inhoud ?? '') })

  const msg = await callClaude({ max_tokens: 1500, system: SYSTEM_CHAT, messages: claudeMessages })
  let parsed: any
  try {
    parsed = jsonUit(msg)
  } catch {
    parsed = { bericht: tekstUit(msg) || 'Sorry, ik raakte even de draad kwijt. Stel je vraag gerust opnieuw.' }
  }
  return {
    bericht: typeof parsed.bericht === 'string' ? parsed.bericht : String(parsed.bericht ?? ''),
    keuzes: Array.isArray(parsed.keuzes) ? parsed.keuzes : [],
    foto_focus: parsed.foto_focus ?? null,
    klaar: !!parsed.klaar,
    samenvatting: parsed.samenvatting ?? '',
  }
}

// ---------------- Jaarplan ----------------
const SYSTEM_PLAN = `Je bent Kaat de Groenfanaat, de tuingoeroe-planner van Bloomies — het hof van Luuk en Marieke.
Je maakt op basis van de tuincontext een grondige analyse én een volledig, praktisch jaarplan
voor de komende 12 maanden, afgestemd op het Nederlandse klimaat, het huidige seizoen en het weer.
Je praat Nederlands, warm maar concreet.

Antwoord ALLEEN met geldig JSON, zonder uitleg eromheen en zonder markdown:
{
  "analyse": "grondige maar leesbare analyse van de tuin, de kansen en de aanpak",
  "taken": [
    {
      "titel": "korte titel",
      "domein": "kamerplant|tuin|vogels|algemeen",
      "beschrijving": "wat en waarom",
      "instructies": ["stap 1", "stap 2", "stap 3"],
      "benodigdheden": ["benodigd item"],
      "ideale_periode": "bv. maart-april",
      "goede_periode": "bv. maart-mei",
      "niet_doen_periode": "bv. tijdens vorst",
      "geschatte_tijd": "bv. 30 min",
      "categorie": "essentieel|optioneel|wekelijks|maandelijks|seizoen|preventief",
      "prioriteit": "hoog|normaal|laag"
    }
  ],
  "suggesties": [ {"titel": "...", "inhoud": "concrete suggestie passend bij déze tuin", "domein": "kamerplant|tuin|vogels"} ],
  "vogelacties": [ {"seizoen": "lente|zomer|herfst|winter", "actie": "...", "toelichting": "..."} ]
}

Eisen:
- Maak 12 tot 20 taken, verspreid over de domeinen en categorieën (essentieel onderhoud, optionele
  verbeteringen, wekelijkse klussen van 1-2 uur, maandelijkse projecten, seizoenstaken, preventief).
- Geef per taak heldere, uitvoerbare stappen.
- Houd rekening met het broedseizoen: niet snoeien in dichte begroeiing van half maart t/m juli.
- Geef 3-6 suggesties die echt bij deze tuin en deze doelen passen.
- Wees concreet en haalbaar voor twee enthousiaste hobbytuiniers.`

function planContext(payload: any): string {
  const ctx = payload?.context ?? {}
  const plants = Array.isArray(payload?.plants) ? payload.plants : []
  const inventory = Array.isArray(payload?.inventory) ? payload.inventory : []
  const briefing = Array.isArray(payload?.briefing) ? payload.briefing : []
  const lines: string[] = []
  lines.push(`Tuin: ${ctx?.naam ?? 'Het hof van Luuk en Marieke'}`)
  if (ctx?.locatie_naam) lines.push(`Locatie: ${ctx.locatie_naam}`)
  lines.push('Land/klimaat: Nederland (gematigd zeeklimaat)')
  if (ctx?.seizoen) lines.push(`Huidig seizoen: ${ctx.seizoen}`)
  if (ctx?.datum) lines.push(`Datum: ${ctx.datum}`)
  if (ctx?.weer) lines.push(`Weer: ${ctx.weer}`)
  if (ctx?.klimaatnotities) lines.push(`Klimaatnotities: ${ctx.klimaatnotities}`)
  lines.push('')
  if (plants.length) {
    lines.push(`Planten in de tuin (${plants.length}):`)
    for (const p of plants.slice(0, 60))
      lines.push(`- ${p.naam ?? 'onbekend'}${p.soort ? ` (${p.soort})` : ''}${p.type ? ` [${p.type}]` : ''}${p.locatie_in_tuin ? `, plek: ${p.locatie_in_tuin}` : ''}${p.gezondheid ? `, gezondheid: ${p.gezondheid}` : ''}`)
  } else {
    lines.push('Planten: nog geen vastgelegd — geef een goede startaanpak voor een nieuwe tuin.')
  }
  lines.push('')
  if (inventory.length) {
    lines.push('Wat al in huis is (gebruik dit, vermijd dubbele aankopen):')
    for (const i of inventory.slice(0, 60)) lines.push(`- ${i.naam}${i.categorie ? ` (${i.categorie})` : ''}`)
  } else {
    lines.push('Inventaris: nog leeg.')
  }
  lines.push('')
  if (briefing.length) {
    lines.push('Briefinggesprek (doelen en wensen):')
    for (const m of briefing.slice(-40)) lines.push(`${m?.rol === 'assistant' ? 'Kaat' : 'Luuk/Marieke'}: ${String(m?.inhoud ?? '').slice(0, 500)}`)
  }
  if (ctx?.samenvatting) {
    lines.push('')
    lines.push(`Samenvatting doelen: ${ctx.samenvatting}`)
  }
  return lines.join('\n')
}

export async function genereerPlan(payload: {
  context: Record<string, unknown>
  plants: unknown[]
  inventory: unknown[]
  briefing: Pick<BriefingMessage, 'rol' | 'inhoud'>[]
}): Promise<PlanResult> {
  const msg = await callClaude({
    max_tokens: 8000,
    system: SYSTEM_PLAN,
    messages: [
      {
        role: 'user',
        content: planContext(payload) + '\n\nMaak nu de analyse en het volledige jaarplan volgens het gevraagde JSON-formaat.',
      },
    ],
  })
  let parsed: any
  try {
    parsed = jsonUit(msg)
  } catch {
    throw new ApiError('Kon het plan niet verwerken. Probeer het nog eens.', 'parse_error')
  }
  return {
    analyse: typeof parsed.analyse === 'string' ? parsed.analyse : String(parsed.analyse ?? ''),
    taken: Array.isArray(parsed.taken) ? parsed.taken : [],
    suggesties: Array.isArray(parsed.suggesties) ? parsed.suggesties : [],
    vogelacties: Array.isArray(parsed.vogelacties) ? parsed.vogelacties : [],
  }
}

// ---------------- Verzorgingsprofiel per plant ----------------
const SYSTEM_CARE = `Je bent Kaat de Groenfanaat, de plantverzorgings-expert van Bloomies. Je maakt een helder, praktisch verzorgingsprofiel
voor één specifieke plant, in het Nederlands, afgestemd op het Nederlandse klimaat. Concreet en haalbaar
voor twee enthousiaste hobbytuiniers die hun planten willen laten uitgroeien tot grote, gezonde exemplaren.

Antwoord ALLEEN met geldig JSON, zonder uitleg eromheen en zonder markdown:
{
  "ideale_temperatuur": "bv. 18-24°C",
  "luchtvochtigheid": "bv. gemiddeld tot hoog (50-70%)",
  "licht": "bv. veel helder indirect licht",
  "standplaats": "ideale standplaats kort beschreven",
  "water_frequentie_dagen": 7,
  "water_toelichting": "hoe en wanneer water geven",
  "winter": "wat te doen in de winter: binnen of buiten, temperatuur, water minderen, etc.",
  "zomer": "wat te doen in de zomer: binnen of buiten, schaduw, vaker water, etc.",
  "plek_check": "beoordeel of de opgegeven plek geschikt is en geef advies (of het beste type plek)",
  "basis": ["3-5 punten basisverzorging die het minimum vormen"],
  "extra_verwennen": ["3-5 concrete tips om de plant extra te laten groeien/bloeien"],
  "veelgemaakte_fouten": ["3-5 veelgemaakte fouten bij déze plant en hoe je ze voorkomt"]
}

"water_frequentie_dagen" is een geheel getal: het gemiddelde aantal dagen tussen twee keer water geven
in het huidige seizoen (gebruik je kennis van de soort; bij twijfel een veilige schatting).`

export async function haalVerzorging(input: {
  naam: string
  soort?: string | null
  type?: string | null
  locatie_in_tuin?: string | null
  seizoen?: string
}): Promise<Verzorging> {
  const beschrijving = [
    `Plant: ${input.naam}`,
    input.soort ? `Soort/cultivar: ${input.soort}` : '',
    input.type ? `Type: ${input.type}` : '',
    input.locatie_in_tuin ? `Huidige plek: ${input.locatie_in_tuin}` : 'Huidige plek: onbekend',
    input.seizoen ? `Huidig seizoen: ${input.seizoen}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const msg = await callClaude({
    max_tokens: 1800,
    system: SYSTEM_CARE,
    messages: [{ role: 'user', content: `Maak een verzorgingsprofiel voor deze plant:\n${beschrijving}` }],
  })
  try {
    return jsonUit(msg) as Verzorging
  } catch {
    throw new ApiError('Kon het verzorgingsprofiel niet verwerken. Probeer het nog eens.', 'parse_error')
  }
}
