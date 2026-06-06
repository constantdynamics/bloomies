# 🌿 Bloomies — Het hof van Luuk en Marieke

Een warme, persoonlijke tuin- en plantverzorgings-app voor Luuk en Marieke. Bloomies begeleidt
drie domeinen in één samenhangend seizoensplan:

1. **Kamerplanten** (binnen)
2. **Tuinvegetatie** (van zaadje tot bloem tot boom — moestuin + siertuin)
3. **Vogels per seizoen** (voeren, water, nestkasten, niet snoeien in de broedtijd)

Volledig in het Nederlands, mobiel-first, geen inlog. Eén gedeelde tuin.

---

## ✨ Wat kan het?

- **Plantherkenning** — maak een foto; Claude (vision) herkent soort/cultivar en kijkt naar
  gezondheid, ziektes en plagen. Bij twijfel vraagt hij om een betere foto in plaats van te gokken.
- **Briefinggesprek** — een enthousiaste "tuingoeroe" stelt vragen over je doelen. Praat via
  **typen**, **meerkeuze** of **spraak** (spraak-naar-tekst én voorlezen, via de browser).
- **Jaarplan & taken** — een volledig, seizoensgericht plan met afvinkbare taken, stap-voor-stap
  instructies, tijdsindicatie en timing-advies (ideale / goede / niet-doen-periode).
- **Inventaris & boodschappen** — leg vast wat je in huis hebt; de boodschappenlijst wordt
  automatisch afgeleid (benodigd voor taken − wat je al hebt).
- **Vogels per seizoen** — vaste seizoensadviezen, broedseizoen-waarschuwing en weer-gekoppelde tips
  (bijv. extra voeren bij vorst).
- **Weer** — via Open-Meteo (gratis, geen sleutel) op basis van je locatie.
- **Evaluatie-check-ins** — af en toe een voortgangsfoto voor een mooie before/after.
- **Meegroeiende interface** — een ervaringsniveau dat stijgt naarmate je meer doet.

---

## 🏗️ Architectuur

GitHub Pages host alleen statische bestanden, dus de Claude-sleutel staat **nooit** in de frontend.

```
GitHub Pages (frontend, statisch: Vite + React + TypeScript + Tailwind)
        │  HTTPS fetch (met publieke anon key)
        ▼
Supabase Edge Functions  ──►  Claude API   (ANTHROPIC_API_KEY = secret in Supabase)
        │
        ▼
Supabase Postgres (data)  +  Supabase Storage (foto's, bucket "bloomies-photos")
```

- **Frontend:** single-page app, statisch gebouwd met `vite build`. `base` staat op `/bloomies/`.
- **Supabase-project:** `wmdopfocqufsquzvemka` (gedeeld met een andere app; alle Bloomies-tabellen
  hebben de prefix `bloom_` en een eigen storage-bucket, dus geen botsing).
- **Edge Functions:** `claude-chat`, `claude-identify`, `claude-plan` — veilige proxy naar Claude.
- **Model:** standaard `claude-sonnet-4-6` (vision + chat). Te wijzigen via de env-variabele
  `CLAUDE_MODEL` op de Edge Functions, zonder code-aanpassing.

> Opmerking: de briefing noemde `claude-sonnet-4-20250514`, maar dat model wordt 15 juni 2026
> uitgefaseerd. Daarom gebruikt Bloomies `claude-sonnet-4-6` (actueel, ondersteunt vision, en
> goedkoper dan Opus).

---

## 🔑 Eenmalige instellingen

### 1. Claude API-sleutel als Supabase-secret (nodig voor de AI-functies)

**Dashboard:** open het Supabase-project → **Project Settings → Edge Functions → Secrets**
(of **Edge Functions → Secrets**) → **Add new secret**:

- Name: `ANTHROPIC_API_KEY`
- Value: jouw sleutel (`sk-ant-...`)

**Of via de CLI:**

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx --project-ref wmdopfocqufsquzvemka
```

Zolang de sleutel ontbreekt, geven de AI-functies een nette melding ("De Claude API-sleutel is nog
niet ingesteld"). De rest van de app (planten, taken, inventaris, vogels) werkt gewoon.

### 2. GitHub Pages aanzetten

De workflow probeert Pages automatisch in te schakelen. Lukt dat niet, ga dan naar
**Settings → Pages → Build and deployment → Source: GitHub Actions**.

De live-URL is dan: **https://constantdynamics.github.io/bloomies/**

---

## 🌱 Zo gebruik je het

1. **Begin leeg.** Open de app. Bij de eerste keer is alles leeg — bij jóuw tuin.
2. **Stel je locatie in** (tandwiel ⚙️ rechtsboven) voor weer en betere timing.
3. **Voeg planten toe** via 📷 — maak foto's van je tuin en kamerplanten. De goeroe herkent ze en
   kijkt naar de gezondheid. Bevestig of corrigeer de herkenning.
4. **Praat met de goeroe** (knop 🌱 Goeroe) over je wensen voor het komende jaar — typ, kies of spreek.
5. **Maak je jaarplan** — aan het eind van de briefing, of via het tabblad **Plan**. De goeroe maakt
   een grondige analyse + takenlijst.
6. **Vink taken af**, klap ze uit voor stappen, en zie per taak of het nú een goed moment is.
7. **Vul je voorraad** en laat de **boodschappenlijst** automatisch afleiden uit je taken.
8. **Vogels** — bekijk per seizoen wat je kunt doen.
9. **Voortgangsfoto's** — maak er af en toe één voor een before/after.

---

## 💻 Lokaal ontwikkelen

```bash
npm install
cp .env.example .env      # vul de anon key in
npm run dev               # start op http://localhost:5173/bloomies/
npm run build             # productie-build naar dist/
npm run typecheck         # TypeScript-controle
```

---

## 🗄️ Datamodel (Supabase, schema `public`, prefix `bloom_`)

| Tabel | Inhoud |
|---|---|
| `bloom_gardens` | de gedeelde tuin (locatie, instellingen, laatste analyse) |
| `bloom_plants` | planten (kamer/tuin/boom/zaad), herkenning, gezondheid, foto |
| `bloom_tasks` | taken met domein, stappen, benodigdheden, timing-advies, status |
| `bloom_inventory_items` | wat je in huis hebt (per categorie) |
| `bloom_shopping_items` | afgeleide boodschappenlijst |
| `bloom_briefing_messages` | het briefinggesprek |
| `bloom_photos` | begin- en evaluatiefoto's (before/after) |
| `bloom_suggestions` | goed/afkeurbare suggesties |
| `bloom_bird_actions` | vogeladviezen per seizoen |

Row Level Security staat aan; anonieme toegang is bewust toegestaan op uitsluitend de `bloom_`-tabellen
(privégebruik, eenvoud boven striktheid). De storage-bucket `bloomies-photos` is publiek leesbaar.

---

## 🧩 Edge Functions

| Functie | Doel |
|---|---|
| `claude-chat` | het briefinggesprek (tuingoeroe), geeft JSON met bericht + meerkeuze-opties |
| `claude-identify` | plantherkenning + gezondheid via Claude vision |
| `claude-plan` | genereert het volledige jaarplan (taken, suggesties, vogelacties) |

Alle drie lezen de sleutel uit `ANTHROPIC_API_KEY` (Supabase-secret) en gebruiken
`https://api.anthropic.com/v1/messages`.
