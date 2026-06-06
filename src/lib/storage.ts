import { supabase } from './supabase'

const BUCKET = 'bloomies-photos'

// Upload een (verkleinde) foto naar Supabase Storage en geef de publieke URL terug.
export async function uploadFoto(blob: Blob, prefix = 'foto'): Promise<string> {
  const naam = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(naam, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(naam)
  return data.publicUrl
}
