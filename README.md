# 🌿 Bloomies — Het hof van Luuk en Marieke

Een warme, persoonlijke tuin- en plantverzorgings-app, als digitaal trouwcadeau voor Luuk en Marieke.
Bloomies begeleidt drie domeinen in één samenhangend seizoensplan:

1. **Kamerplanten** (binnen)
2. **Tuinvegetatie** (van zaadje tot bloem tot boom — moestuin + siertuin)
3. **Vogels per seizoen** (voeren, water, nestkasten, niet snoeien in de broedtijd)

Volledig in het Nederlands, mobiel-first, installeerbaar als app (PWA), geen inlog. Eén gedeelde tuin.

---

## ✨ Wat kan het?

- **Onboarding** — een warm welkom van 6 schermen dat uitlegt hoe de app werkt.
- **Plantherkenning** — maak een foto; Claude (vision) herkent soort/cultivar en kijkt naar gezondheid,
  ziektes en plagen. Bij twijfel vraagt hij om een betere foto in plaats van te gokken.
- **Verzorgingsprofiel per plant** — ideale temperatuur, luchtvochtigheid, licht, de beste plek
  (met plek-check), binnen/buiten in winter & zomer, de basis én extra tips om hem te laten uitgroeien
  tot een koeiedikke joekel, plus de veelgemaakte fouten. Wordt automatisch opgehaald bij een nieuwe plant.
- **Water-herinneringen** — per plant een aftellende timer; vink af zodra je water hebt gegeven. Met
  meldingen krijg je een seintje wanneer een plant dorst heeft.
- **Briefinggesprek** — een enthousiaste "tuingoeroe" stelt vragen over je doelen. Praat via **typen**,
  **meerkeuze** of **spraak** (spraak-naar-tekst én voorlezen, via de browser).
- **Jaarplan & taken** — een volledig, seizoensgericht plan met afvinkbare taken, stap-voor-stap
  instructies en timing-advies (ideale / goede / niet-doen-periode).
- **Inventaris & boodschappen** — de boodschappenlijst wordt automatisch afgeleid (nodig voor taken − in huis).
- **Vogels per seizoen** — vaste seizoensadviezen, broedseizoen-waarschuwing en weer-gekoppelde tips.
- **Weer** — via Open-Meteo (gratis, geen sleutel) op basis van je locatie.
- **Evaluatie-check-ins** — af en toe een voortgangsfoto voor een mooie before/after.

---

## 🏗️ Architectuur

GitHub Pages host alleen statische bestanden, dus de Claude-sleutel staat **nooit** in de frontend.

```
GitHub Pages (frontend: Vite + React + TypeScript + Tailwind, PWA)
        │  HTTPS fetch (met publieke anon key)
        ▼
Supabase Edge Function "claude-proxy"  ──►  Claude API
        │   (sleutel = secret ANTHROPIC_API_KEY, blijft server-side)
        ▼
Supabase Postgres (data)  +  Supabase Storage (foto's, bucket "bloomies-photos")
```

- **claude-proxy** is een kleine, veilige doorgeefluik-functie: hij houdt alleen de sleutel vast en
  stuurt het verzoek door naar Claude. Alle prompts en logica staan in de frontend (`src/lib/api.ts`),
  zodat aanpassen makkelijk is — zonder de functie opnieuw te hoeven deployen.
- **Model:** `claude-sonnet-4-5` (vision + chat). Te wijzigen via de Edge Function-env `CLAUDE_MODEL`.
- **Project:** Supabase `wmdopfocqufsquzvemka` (gedeeld met een andere app; alle Bloomies-tabellen
  hebben de prefix `bloom_` en een eigen storage-bucket, dus geen botsing).

---

## 🔑 Instellingen

### 1. Claude API-sleutel — waarschijnlijk al klaar ✅

De sleutel staat als Supabase-secret `ANTHROPIC_API_KEY` en wordt gedeeld met de bestaande app in
hetzelfde project. Je hoeft hier normaal **niets** voor te doen.

Krijg je in de app toch een melding dat de sleutel niet klopt of ontbreekt, (her)zet hem dan:

- **Dashboard:** Supabase-project → **Project Settings → Edge Functions → Secrets** → secret
  `ANTHROPIC_API_KEY` met waarde `sk-ant-...`.
- **CLI:** `supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref wmdopfocqufsquzvemka`

### 2. GitHub Pages

De workflow probeert Pages automatisch in te schakelen. Lukt dat niet, ga dan naar
**Settings → Pages → Build and deployment → Source: GitHub Actions**.

Live-URL: **https://constantdynamics.github.io/bloomies/**

### 3. Op je telefoon zetten (optioneel)

Open de live-URL in Chrome/Safari → menu → **Toevoegen aan startscherm**. Dan opent Bloomies als app
en werken de water-meldingen het best.

---

## 🌱 Zo gebruik je het

1. Bij de eerste keer zie je de **introductie** (later terug te zien via ⚙️ Instellingen).
2. **Stel je locatie in** (⚙️) voor weer en betere timing.
3. **Voeg planten toe** via 📷 — Bloomies herkent ze, maakt automatisch een verzorgingsprofiel en
   zet een water-herinnering klaar.
4. **Zet meldingen aan** (⚙️) zodat je een seintje krijgt bij dorst.
5. **Praat met de goeroe** (🌱) over je wensen en laat het **jaarplan** maken (tab Plan).
6. **Vink taken en water af**, vul je **voorraad**, bekijk de **vogels** per seizoen, en maak af en toe
   een **voortgangsfoto**.

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
`bloom_photos`, `bloom_suggestions`, `bloom_bird_actions`.

Row Level Security staat aan; anonieme toegang is bewust toegestaan op uitsluitend de `bloom_`-tabellen
(privégebruik). De storage-bucket `bloomies-photos` is publiek leesbaar.

## 🧩 Edge Function

`claude-proxy` — veilige proxy naar `https://api.anthropic.com/v1/messages`, leest de sleutel uit
`ANTHROPIC_API_KEY`. (De oudere, specifieke functies `analyze-meal` / `recipe-scrape` in dit project
horen bij een andere app en blijven ongemoeid.)
