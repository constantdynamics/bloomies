// Bloomies — claude-chat
// Veilige proxy naar Claude voor het briefinggesprek (de "tuingoeroe").
// De Claude-sleutel staat als secret in Supabase en komt NOOIT in de frontend.
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

function buildContext(ctx: any): string {
  const lines: string[] = []
  lines.push('TUINCONTEXT (gebruik dit om gerichte vragen te stellen):')
  lines.push(`- Tuin: ${ctx?.naam ?? 'Het hof van Luuk en Marieke'}`)
  if (ctx?.locatie_naam) lines.push(`- Locatie: ${ctx.locatie_naam}`)
  if (ctx?.seizoen) lines.push(`- Huidig seizoen: ${ctx.seizoen}`)
  if (ctx?.weer) lines.push(`- Weer nu: ${ctx.weer}`)
  const plants = Array.isArray(ctx?.plants) ? ctx.plants : []
  if (plants.length) {
    lines.push(`- Bekende planten (${plants.length}):`)
    for (const p of plants.slice(0, 30)) {
      lines.push(
        `   • ${p.naam ?? 'onbekend'}${p.soort ? ` (${p.soort})` : ''}` +
          `${p.type ? ` — ${p.type}` : ''}${p.locatie_in_tuin ? `, plek: ${p.locatie_in_tuin}` : ''}` +
          `${p.gezondheid ? `, gezondheid: ${p.gezondheid}` : ''}`,
      )
    }
  } else {
    lines.push('- Er zijn nog geen planten vastgelegd. De tuin begint leeg.')
  }
  if (typeof ctx?.aantal_foto === 'number') lines.push(`- Aantal geüploade foto's: ${ctx.aantal_foto}`)
  return lines.join('\n')
}

const SYSTEM = `Je bent de enthousiaste tuingoeroe van Bloomies — het hof van Luuk en Marieke.
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

  const history = Array.isArray(payload?.messages) ? payload.messages : []
  const context = payload?.context ?? {}
  const photos = Array.isArray(payload?.photos) ? payload.photos.slice(0, 6) : []

  const firstContent: any[] = [{ type: 'text', text: buildContext(context) }]
  for (const p of photos) {
    if (p?.url) {
      firstContent.push({ type: 'text', text: `Foto — ${p.label ?? 'tuinfoto'}:` })
      firstContent.push({ type: 'image', source: { type: 'url', url: p.url } })
    }
  }
  if (history.length === 0) {
    firstContent.push({
      type: 'text',
      text: 'Begin nu het briefinggesprek met een warme opening en je eerste vraag.',
    })
  }

  const messages: any[] = [{ role: 'user', content: firstContent }]
  for (const m of history) {
    messages.push({
      role: m?.rol === 'assistant' ? 'assistant' : 'user',
      content: String(m?.inhoud ?? ''),
    })
  }

  let resp: Response
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: SYSTEM, messages }),
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
    parsed = { bericht: text || 'Sorry, ik raakte even de draad kwijt. Stel je vraag gerust opnieuw.', keuzes: [], foto_focus: null, klaar: false, samenvatting: '' }
  }
  if (typeof parsed.bericht !== 'string') parsed.bericht = String(parsed.bericht ?? '')
  if (!Array.isArray(parsed.keuzes)) parsed.keuzes = []
  if (typeof parsed.klaar !== 'boolean') parsed.klaar = false

  return json(parsed)
})
