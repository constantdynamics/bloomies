# 🌿 Bloomies — Het hof van Luuk en Marieke

Een warme, persoonlijke tuin- en plantverzorgings-app, als digitaal trouwcadeau voor Luuk en Marieke.
Met **Kaat de Groenfanaat** als enthousiaste tuingoeroe. Drie domeinen in één seizoensplan:

1. **Kamerplanten** (binnen)
2. **Tuinvegetatie** (van zaadje tot bloem tot boom)
3. **Vogels per seizoen**

Volledig in het Nederlands, mobiel-first, installeerbaar als app (PWA), geen inlog. Eén gedeelde tuin.

---

## ✨ Wat kan het?

- **Onboarding** — een warm welkom van 6 schermen (met jullie trouwfelicitatie).
- **Plantherkenning** — foto maken; de AI herkent soort/cultivar en kijkt naar gezondheid en plagen.
- **Verzorgingsprofiel per plant** — temperatuur, luchtvochtigheid, licht, plek-check, binnen/buiten in
  winter & zomer, de basis, extra groeitips én veelgemaakte fouten. Automatisch bij een nieuwe plant.
- **Groeigalerij per plant** — foto's chronologisch van “begin” tot “nu”, tikbaar voor groot beeld.
- **Timers-tab** — per plant een aftellende water-timer; het **tabje kleurt langzaam van groen naar rood**
  zodra het tijd is voor actie. Afvinken met één tik. (Geen afhankelijkheid van browser-meldingen.)
- **Kaat de Groenfanaat** — briefinggesprek via typen, meerkeuze of spraak (incl. voorlezen).
- **Jaarplan & taken** — volledig seizoensplan met afvinkbare taken, stappen en timing-advies.
- **Inventaris & boodschappen** — boodschappenlijst automatisch afgeleid uit je taken.
- **Vogels per seizoen** — seizoensadviezen, broedseizoen-waarschuwing en weer-gekoppelde tips.
- **Weer** — via Open-Meteo (gratis, geen sleutel).

---

## 🏗️ Architectuur

GitHub Pages host alleen statische bestanden, dus de AI-sleutel staat **nooit** in de frontend.

```
GitHub Pages (Vite + React + TypeScript + Tailwind, PWA)
        │  HTTPS fetch (publieke anon key)
        ▼
Supabase Edge Function "claude-proxy"  ──►  Gemini (gratis)  óf  Claude (betaald)
        │   (AI-sleutel = secret, blijft server-side)
        ▼
Supabase Postgres (data)  +  Storage (foto's, bucket "bloomies-photos")
```

De proxy is provider-onafhankelijk: hij praat met **Google Gemini** (gratis tier) of **Anthropic Claude**,
afhankelijk van welke secret is gezet. De prompts staan in de frontend (`src/lib/api.ts`).

---

## 🔑 AI-sleutel instellen

Je hebt één AI-sleutel nodig. Kies één van twee — de proxy detecteert hem automatisch.

### Optie A — Gratis: Google Gemini (aanbevolen voor dit cadeau)

1. Ga naar **https://aistudio.google.com/apikey** en log in met een Google-account.
2. Klik **Create API key** → kopieer de sleutel (begint met `AIza...`). Gratis, geen creditcard.
3. Zet hem in Supabase: project → **Project Settings → Edge Functions → Secrets** → nieuwe secret
   `GEMINI_API_KEY` met die waarde. Klaar — de app werkt nu gratis.

> Goed om te weten: de gratis Gemini-tier kent ruime limieten (genoeg voor twee mensen) en gebruikt
> invoer mogelijk om Google's modellen te verbeteren. Voor een tuin-app is dat doorgaans prima.

### Optie B — Betaald: Anthropic Claude (iets hogere kwaliteit)

Zet wat tegoed op de Anthropic-account (Console → Plans & Billing) en zorg dat de secret
`ANTHROPIC_API_KEY` is gezet. Wil je Claude forceren terwijl er ook een Gemini-sleutel staat? Zet dan
de secret `AI_PROVIDER=claude`.

> Model wijzigen kan via env: `GEMINI_MODEL` (bv. `gemini-2.0-flash`) of `CLAUDE_MODEL`.

### GitHub Pages

De workflow schakelt Pages automatisch in. Anders: **Settings → Pages → Source: GitHub Actions**.
Live-URL: **https://constantdynamics.github.io/bloomies/**

### Op je telefoon (optioneel)

Open de live-URL → browsermenu → **Toevoegen aan startscherm**. Dan opent Bloomies als app.

---

## 💻 Lokaal ontwikkelen

```bash
npm install
cp .env.example .env      # vul de anon key in
npm run dev               # http://localhost:5173/bloomies/
npm run build             # productie-build naar dist/
npm run typecheck         # TypeScript-controle
```

---

## 🗄️ Datamodel (Supabase, schema `public`, prefix `bloom_`)

`bloom_gardens`, `bloom_plants` (incl. `verzorging` json, `water_interval_dagen`, `laatst_water`),
`bloom_tasks`, `bloom_inventory_items`, `bloom_shopping_items`, `bloom_briefing_messages`,
`bloom_photos`, `bloom_suggestions`, `bloom_bird_actions`. RLS staat aan (anonieme toegang op alleen de
`bloom_`-tabellen). Storage-bucket `bloomies-photos` is publiek leesbaar.

## 🧩 Edge Function

`claude-proxy` — provider-onafhankelijke AI-proxy (Gemini of Claude), leest de sleutel uit een secret.
De functies `analyze-meal` / `recipe-scrape` in dit project horen bij een andere app en blijven ongemoeid.
