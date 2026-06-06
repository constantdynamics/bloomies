import { createClient } from '@supabase/supabase-js'

// De Supabase-URL en anon (publishable) key mogen publiek in de frontend staan.
// Ze worden als build-time env meegegeven (zie .github/workflows/deploy.yml).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Geeft een duidelijke melding tijdens ontwikkeling i.p.v. een cryptische fout.
  console.error(
    'Supabase-config ontbreekt. Zet VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: { persistSession: false },
})

// Eén gedeelde tuin — geen login nodig.
export const GARDEN_ID = 'hof-van-luuk-en-marieke'

// Functions-basis-URL voor het aanroepen van de Edge Functions.
export const FUNCTIONS_URL = `${supabaseUrl ?? ''}/functions/v1`
export const ANON_KEY = supabaseAnonKey ?? ''
