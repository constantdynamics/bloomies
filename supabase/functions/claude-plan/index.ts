// Bloomies — claude-plan
// Genereert een grondige analyse + volledig jaarplan (taken, suggesties, vogelacties)
// op basis van de tuincontext, briefing, seizoen en weer. Strikt JSON terug.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-sonnet-4-6'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  })
}

function getKey(): string {
  return Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('CLAUDE_API_KEY') ?? ''
}

function extractJson(text: string): any {
  let t = (text ?? '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1)
  return JSON.parse(t)
}

function buildContext(payload: any): string {
  const ctx = payload?.context ?? {}
  const plants = Array.isArray(payload?.plants) ? payload.plants : []
  const inventory = Array.isArray(payload?.inventory) ? payload.inventory : []
  const briefing = Array.isArray(payload?.briefing) ? payload.briefing : []
  const lines: string[] = []
  lines.push(`Tuin: ${ctx?.naam ?? 'Het hof van Luuk en Marieke'}`)
  if (ctx?.locatie_naam) lines.push(`Locatie: ${ctx.locatie_naam}`)
  lines.push(`Land/klimaat: Nederland (gematigd zeeklimaat)`)
  if (ctx?.seizoen) lines.push(`Huidig seizoen: ${ctx.seizoen}`)
  if (ctx?.datum) lines.push(`Datum: ${ctx.datum}`)
  if (ctx?.weer) lines.push(`Weer: ${ctx.weer}`)
  if (ctx?.klimaatnotities) lines.push(`Klimaatnotities: ${ctx.klimaatnotities}`)

  lines.push('')
  if (plants.length) {
    lines.push(`Planten in de tuin (${plants.length}):`)
    for (const p of plants.slice(0, 60)) {
      lines.push(
        `- ${p.naam ?? 'onbekend'}${p.soort ? ` (${p.soort})` : ''}${p.type ? ` [${p.type}]` : ''}` +
          `${p.locatie_in_tuin ? `, plek: ${p.locatie_in_tuin}` : ''}` +
          `${p.gezondheid ? `, gezondheid: ${p.gezondheid}` : ''}`,
      )
    }
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
    for (const m of briefing.slice(-40)) {
      const who = m?.rol === 'assistant' ? 'Goeroe' : 'Luuk/Marieke'
      lines.push(`${who}: ${String(m?.inhoud ?? '').slice(0, 500)}`)
    }
  }
  if (ctx?.samenvatting) {
    lines.push('')
    lines.push(`Samenvatting doelen: ${ctx.samenvatting}`)
  }
  return lines.join('\n')
}

const SYSTEM = `Je bent de tuingoeroe-planner van Bloomies — het hof van Luuk en Marieke.
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
- Maak 12 tot 20 taken, verspreid over de domeinen en over de categorieën (essentieel onderhoud,
  optionele verbeteringen, wekelijkse klussen van 1-2 uur, maandelijkse projecten, seizoenstaken, preventief).
- Geef per taak heldere, uitvoerbare stappen.
- Houd rekening met het broedseizoen: niet snoeien in dichte begroeiing van half maart t/m juli.
- Geef 3-6 suggesties die echt bij deze tuin en deze doelen passen.
- Wees concreet en haalbaar voor twee enthousiaste hobbytuiniers.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const apiKey = getKey()
  if (!apiKey) {
    return json(
      {
        error: 'missing_key',
        message:
          'De Claude API-sleutel (ANTHROPIC_API_KEY) is nog niet ingesteld in Supabase. Zet hem bij Edge Functions → Secrets.',
      },
      503,
    )
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'bad_request', message: 'Ongeldige JSON.' }, 400)
  }

  const userText =
    buildContext(payload) +
    '\n\nMaak nu de analyse en het volledige jaarplan volgens het gevraagde JSON-formaat.'

  let resp: Response
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        system: SYSTEM,
        messages: [{ role: 'user', content: userText }],
      }),
    })
  } catch (e) {
    return json({ error: 'network', message: 'Kon Claude niet bereiken.', detail: String(e) }, 502)
  }

  if (!resp.ok) {
    const detail = await resp.text()
    return json({ error: 'claude_error', message: 'Claude gaf een foutmelding.', detail }, 502)
  }

  const data = await resp.json()
  const text = (data?.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim()

  let parsed: any
  try {
    parsed = extractJson(text)
  } catch {
    return json({ error: 'parse_error', message: 'Kon het plan niet verwerken. Probeer het nog eens.', raw: text.slice(0, 4000) }, 502)
  }

  if (!Array.isArray(parsed.taken)) parsed.taken = []
  if (!Array.isArray(parsed.suggesties)) parsed.suggesties = []
  if (!Array.isArray(parsed.vogelacties)) parsed.vogelacties = []
  if (typeof parsed.analyse !== 'string') parsed.analyse = String(parsed.analyse ?? '')

  return json(parsed)
})
