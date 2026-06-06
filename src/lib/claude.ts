import { FUNCTIONS_URL, ANON_KEY } from './supabase'

// Standaardmodel. Wijzigbaar door de Edge Function-env CLAUDE_MODEL te zetten,
// of hier. We gebruiken het model dat met de bestaande sleutel werkt.
export const CLAUDE_MODEL = 'claude-sonnet-4-5'

export class ApiError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

export interface ClaudeBody {
  model?: string
  max_tokens: number
  system?: string
  messages: any[]
}

// Roept Claude aan via de veilige Supabase-proxy (de sleutel blijft server-side).
export async function callClaude(body: ClaudeBody): Promise<any> {
  let resp: Response
  try {
    resp = await fetch(`${FUNCTIONS_URL}/claude-proxy`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ model: CLAUDE_MODEL, ...body }),
    })
  } catch {
    throw new ApiError('Geen verbinding met de server. Controleer je internet.', 'network')
  }

  let data: any = null
  try {
    data = await resp.json()
  } catch {
    /* leeg laten */
  }

  if (!resp.ok) {
    const code: string | undefined = data?.error?.type
    let msg: string | undefined = data?.error?.message
    if (code === 'authentication_error')
      msg = 'De Claude-sleutel (ANTHROPIC_API_KEY) klopt niet. Controleer hem in Supabase → Edge Functions → Secrets.'
    else if (code === 'not_found_error') msg = 'Het Claude-model is niet beschikbaar voor deze sleutel.'
    else if (code === 'permission_error') msg = 'Deze Claude-sleutel heeft geen toegang of onvoldoende credits.'
    else if (code === 'rate_limit_error') msg = 'Even te druk bij Claude. Probeer het zo nog eens.'
    else if (code === 'missing_key') msg = data?.error?.message
    throw new ApiError(msg || `Serverfout (${resp.status})`, code)
  }
  return data
}

// Haalt alle tekst uit een Claude-antwoord.
export function tekstUit(msg: any): string {
  return (msg?.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim()
}

// Haalt het JSON-object uit een Claude-antwoord (strikt: eerste { t/m laatste }).
export function jsonUit(msg: any): any {
  const t = tekstUit(msg)
  const a = t.indexOf('{')
  const b = t.lastIndexOf('}')
  const slice = a !== -1 && b !== -1 && b > a ? t.slice(a, b + 1) : t
  return JSON.parse(slice)
}
