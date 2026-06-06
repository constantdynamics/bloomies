// Bloomies — claude-proxy
// Eén kleine, veilige proxy naar de Claude API. Houdt uitsluitend de sleutel
// vast (Supabase-secret ANTHROPIC_API_KEY) en stuurt het verzoek door.
// Alle prompts en logica staan in de frontend (niet geheim), zodat aanpassen
// makkelijk is zonder de functie opnieuw te hoeven deployen.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })
}
function getKey(): string {
  return Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('CLAUDE_API_KEY') ?? ''
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return res({ error: { type: 'method', message: 'Gebruik POST.' } }, 405)

  const apiKey = getKey()
  if (!apiKey) return res({ error: { type: 'missing_key', message: 'De Claude API-sleutel (ANTHROPIC_API_KEY) is nog niet ingesteld in Supabase.' } }, 503)

  let body: any
  try { body = await req.json() } catch { return res({ error: { type: 'bad_request', message: 'Ongeldige JSON.' } }, 400) }
  if (!body || !Array.isArray(body.messages)) return res({ error: { type: 'bad_request', message: 'Veld messages ontbreekt.' } }, 400)

  const safe = {
    model: typeof body.model === 'string' ? body.model : 'claude-sonnet-4-5',
    max_tokens: Math.min(Number(body.max_tokens) || 1024, 8192),
    system: body.system,
    messages: body.messages,
  }

  let resp: Response
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(safe),
    })
  } catch (_e) {
    return res({ error: { type: 'network', message: 'Kon Claude niet bereiken.' } }, 502)
  }

  const text = await resp.text()
  return new Response(text, { status: resp.status, headers: { ...cors, 'content-type': 'application/json' } })
})
