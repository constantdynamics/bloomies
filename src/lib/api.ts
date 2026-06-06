import { FUNCTIONS_URL, ANON_KEY } from './supabase'
import type { ChatResult, IdentifyResult, PlanResult, BriefingMessage } from './types'

export class ApiError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

async function callFn<T>(naam: string, body: unknown): Promise<T> {
  let resp: Response
  try {
    resp = await fetch(`${FUNCTIONS_URL}/${naam}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new ApiError('Geen verbinding met de server. Controleer je internet.', 'network')
  }

  let data: any = null
  try {
    data = await resp.json()
  } catch {
    /* leeg laten */
  }

  if (!resp.ok) {
    const msg = data?.message || data?.error || `Serverfout (${resp.status})`
    throw new ApiError(msg, data?.error)
  }
  return data as T
}

export function herkenPlant(
  base64: string,
  mediaType: string,
  naamHint?: string,
): Promise<IdentifyResult> {
  return callFn<IdentifyResult>('claude-identify', {
    image: base64,
    media_type: mediaType,
    naam_hint: naamHint ?? '',
  })
}

export function praatMetGoeroe(
  messages: Pick<BriefingMessage, 'rol' | 'inhoud'>[],
  context: Record<string, unknown>,
  photos: { url: string; label?: string }[] = [],
): Promise<ChatResult> {
  return callFn<ChatResult>('claude-chat', { messages, context, photos })
}

export function genereerPlan(payload: {
  context: Record<string, unknown>
  plants: unknown[]
  inventory: unknown[]
  briefing: Pick<BriefingMessage, 'rol' | 'inhoud'>[]
}): Promise<PlanResult> {
  return callFn<PlanResult>('claude-plan', payload)
}
