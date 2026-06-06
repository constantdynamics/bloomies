// Bloomies — claude-identify
// Plantherkenning + gezondheids-/ziektedetectie via Claude vision.
// Bij onzekerheid: vraag om een betere foto, gok niet.
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

const SYSTEM = `Je bent een deskundige plantexpert voor Bloomies. Je analyseert een foto van een plant
(kamerplant, tuinplant, boom of zaailing) en geeft een nauwkeurige beoordeling in het Nederlands.

Belangrijk: GOK NOOIT. Als je het niet met redelijke zekerheid kunt bepalen, zet "betere_foto_nodig"
op true en leg in "foto_instructie" precies uit wat je nodig hebt (bijv. een scherpe close-up van een
blad, de bloem of de stengel, of een overzichtsfoto).

Antwoord ALLEEN met geldig JSON, zonder uitleg eromheen en zonder markdown:
{
  "herkend": true,
  "naam": "Nederlandse naam (zet 'waarschijnlijk' ervoor bij twijfel)",
  "soort": "wetenschappelijke naam en/of cultivar indien mogelijk",
  "type": "kamerplant|tuin|boom|zaad",
  "zekerheid": "hoog|gemiddeld|laag",
  "gezondheid": "korte beoordeling van de algemene gezondheid",
  "problemen": ["zichtbare ziektes, plagen of stress, bv. gele bladeren, schimmel, droogte"],
  "betere_foto_nodig": false,
  "foto_instructie": "",
  "verzorging_kort": "1-2 concrete verzorgingstips"
}`

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

  const imageBase64: string = payload?.image ?? ''
  const mediaType: string = payload?.media_type ?? 'image/jpeg'
  const hint: string = payload?.naam_hint ?? ''
  if (!imageBase64) return json({ error: 'bad_request', message: 'Geen afbeelding meegegeven.' }, 400)

  const userContent: any[] = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
    {
      type: 'text',
      text:
        'Welke plant is dit? Bepaal soort/cultivar waar mogelijk, beoordeel de gezondheid en let op ziektes/plagen. ' +
        (hint ? `De gebruiker denkt dat het mogelijk is: "${hint}". ` : '') +
        'Wees eerlijk over je zekerheid en vraag om een betere foto als dat nodig is.',
    },
  ]

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
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: userContent }],
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
    return json(
      {
        herkend: false,
        naam: '',
        zekerheid: 'laag',
        betere_foto_nodig: true,
        foto_instructie: 'Ik kon de foto niet goed analyseren. Probeer een scherpe, goed belichte close-up.',
        problemen: [],
        verzorging_kort: '',
      },
      200,
    )
  }

  return json(parsed)
})
