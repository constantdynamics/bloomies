// Bloomies — AI-proxy (slug: claude-proxy)
// Houdt de AI-sleutel server-side. Werkt met Google Gemini (gratis) of Anthropic
// Claude (betaald). Bij overbelasting/quota probeert hij meerdere Gemini-modellen
// en een tweede ronde na een korte pauze.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })
}
const geminiKey = () => Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('GOOGLE_API_KEY') ?? ''
const anthropicKey = () => Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('CLAUDE_API_KEY') ?? ''
const CLAUDE_MODEL = 'claude-sonnet-4-5'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return res({ error: { type: 'method', message: 'Gebruik POST.' } }, 405)

  let body: any
  try {
    body = await req.json()
  } catch {
    return res({ error: { type: 'bad_request', message: 'Ongeldige JSON.' } }, 400)
  }
  if (!body || !Array.isArray(body.messages)) return res({ error: { type: 'bad_request', message: 'Veld messages ontbreekt.' } }, 400)

  const gk = geminiKey()
  const ak = anthropicKey()
  const forced = (Deno.env.get('AI_PROVIDER') ?? '').toLowerCase()

  if (forced === 'claude' && ak) return await viaClaude(body, ak)
  if (forced === 'gemini' && gk) return await viaGemini(body, gk)
  if (gk) return await viaGemini(body, gk)
  if (ak) return await viaClaude(body, ak)
  return res({ error: { type: 'missing_key', message: 'Er is nog geen AI-sleutel ingesteld. Zet GEMINI_API_KEY (gratis) of ANTHROPIC_API_KEY in Supabase, bij Edge Functions, Secrets.' } }, 503)
})

async function viaClaude(body: any, apiKey: string): Promise<Response> {
  const safe = {
    model: typeof body.model === 'string' ? body.model : CLAUDE_MODEL,
    max_tokens: Math.min(Number(body.max_tokens) || 1024, 8192),
    system: body.system,
    messages: body.messages,
  }
  for (let poging = 0; poging < 2; poging++) {
    let r: Response
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(safe),
      })
    } catch (_e) {
      return res({ error: { type: 'network', message: 'Kon Claude niet bereiken.' } }, 502)
    }
    if ((r.status === 429 || r.status === 500 || r.status === 503 || r.status === 529) && poging === 0) {
      await new Promise((ok) => setTimeout(ok, 1200))
      continue
    }
    const text = await r.text()
    return new Response(text, { status: r.status, headers: { ...cors, 'content-type': 'application/json' } })
  }
  return res({ error: { type: 'overloaded', message: 'Kaat is het heel even te druk. Probeer het over een halve minuut nog eens.' } }, 502)
}

async function viaGemini(body: any, apiKey: string): Promise<Response> {
  const contents: any[] = []
  for (const m of body.messages) {
    const parts = await blocksToParts(m.content)
    if (!parts.length) continue
    const role = m.role === 'assistant' ? 'model' : 'user'
    const last = contents[contents.length - 1]
    if (last && last.role === role) last.parts.push(...parts)
    else contents.push({ role, parts })
  }
  const payload: any = {
    contents,
    generationConfig: { maxOutputTokens: Math.min(Number(body.max_tokens) || 1024, 8192) },
  }
  if (typeof body.system === 'string' && body.system.trim()) {
    payload.systemInstruction = { parts: [{ text: body.system }] }
  }

  const envModel = Deno.env.get('GEMINI_MODEL') ?? ''
  const modellen = envModel ? [envModel] : ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite']

  let laatsteStatus = 0
  let laatsteMsg = ''
  for (let ronde = 0; ronde < 2; ronde++) {
    for (const model of modellen) {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey
      let r: Response
      try {
        r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      } catch (_e) {
        return res({ error: { type: 'network', message: 'Kon Gemini niet bereiken.' } }, 502)
      }
      const data = await r.json().catch(() => null)
      if (r.ok) {
        const parts = data?.candidates?.[0]?.content?.parts ?? []
        const text = parts.filter((p: any) => typeof p.text === 'string').map((p: any) => p.text).join('')
        return res({ content: [{ type: 'text', text }] }, 200)
      }
      laatsteStatus = r.status
      laatsteMsg = data?.error?.message || ''
      if (r.status === 429 || r.status === 500 || r.status === 503) continue
      return res({ error: { type: 'gemini_error', message: 'AI (Gemini): ' + (laatsteMsg || 'foutmelding.') } }, 502)
    }
    if (ronde === 0) await new Promise((ok) => setTimeout(ok, 1200))
  }

  const msg = laatsteStatus === 429
    ? 'AI (Gemini): deze sleutel heeft geen gratis quota (Google meldt limiet 0). Probeer een sleutel van een ander Google-account, of gebruik Claude met een klein tegoed.'
    : 'Kaat is het heel even te druk (Google is overbelast). Probeer het over een halve minuut nog eens.'
  return res({ error: { type: 'gemini_error', message: msg } }, 502)
}

async function blocksToParts(content: any): Promise<any[]> {
  if (typeof content === 'string') return content ? [{ text: content }] : []
  if (!Array.isArray(content)) return []
  const parts: any[] = []
  for (const b of content) {
    if (b?.type === 'text' && b.text) parts.push({ text: b.text })
    else if (b?.type === 'image' && b.source) {
      if (b.source.type === 'base64' && b.source.data) {
        parts.push({ inlineData: { mimeType: b.source.media_type || 'image/jpeg', data: b.source.data } })
      } else if (b.source.type === 'url' && b.source.url) {
        const inline = await urlToInline(b.source.url)
        if (inline) parts.push({ inlineData: inline })
      }
    }
  }
  return parts
}

async function urlToInline(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || 'image/jpeg'
    const buf = new Uint8Array(await r.arrayBuffer())
    let bin = ''
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
    return { mimeType: ct, data: btoa(bin) }
  } catch {
    return null
  }
}
