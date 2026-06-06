/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Web Speech API types (niet altijd standaard aanwezig in TS lib)
interface Window {
  SpeechRecognition: any
  webkitSpeechRecognition: any
}
