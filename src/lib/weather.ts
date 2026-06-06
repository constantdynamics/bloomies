// Weer via Open-Meteo (gratis, geen sleutel, CORS-vriendelijk → werkt op GitHub Pages).

export interface WeatherNow {
  temperatuur: number
  windkmh: number
  code: number
  beschrijving: string
  emoji: string
  vorst: boolean
  hitte: boolean
}

const WMO: Record<number, { tekst: string; emoji: string }> = {
  0: { tekst: 'Helder', emoji: '☀️' },
  1: { tekst: 'Overwegend helder', emoji: '🌤️' },
  2: { tekst: 'Half bewolkt', emoji: '⛅' },
  3: { tekst: 'Bewolkt', emoji: '☁️' },
  45: { tekst: 'Mistig', emoji: '🌫️' },
  48: { tekst: 'IJzelmist', emoji: '🌫️' },
  51: { tekst: 'Lichte motregen', emoji: '🌦️' },
  53: { tekst: 'Motregen', emoji: '🌦️' },
  55: { tekst: 'Dichte motregen', emoji: '🌧️' },
  56: { tekst: 'IJzel-motregen', emoji: '🌧️' },
  57: { tekst: 'IJzel-motregen', emoji: '🌧️' },
  61: { tekst: 'Lichte regen', emoji: '🌦️' },
  63: { tekst: 'Regen', emoji: '🌧️' },
  65: { tekst: 'Zware regen', emoji: '🌧️' },
  66: { tekst: 'IJzel', emoji: '🌧️' },
  67: { tekst: 'IJzel', emoji: '🌧️' },
  71: { tekst: 'Lichte sneeuw', emoji: '🌨️' },
  73: { tekst: 'Sneeuw', emoji: '🌨️' },
  75: { tekst: 'Zware sneeuw', emoji: '❄️' },
  77: { tekst: 'Sneeuwkorrels', emoji: '🌨️' },
  80: { tekst: 'Lichte buien', emoji: '🌦️' },
  81: { tekst: 'Buien', emoji: '🌧️' },
  82: { tekst: 'Zware buien', emoji: '⛈️' },
  85: { tekst: 'Sneeuwbuien', emoji: '🌨️' },
  86: { tekst: 'Sneeuwbuien', emoji: '❄️' },
  95: { tekst: 'Onweer', emoji: '⛈️' },
  96: { tekst: 'Onweer met hagel', emoji: '⛈️' },
  99: { tekst: 'Zwaar onweer', emoji: '⛈️' },
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherNow | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`
    const resp = await fetch(url)
    if (!resp.ok) return null
    const data = await resp.json()
    const c = data?.current
    if (!c) return null
    const code = c.weather_code ?? 0
    const info = WMO[code] ?? { tekst: 'Onbekend', emoji: '🌡️' }
    const temp = Math.round(c.temperature_2m)
    return {
      temperatuur: temp,
      windkmh: Math.round(c.wind_speed_10m ?? 0),
      code,
      beschrijving: info.tekst,
      emoji: info.emoji,
      vorst: temp <= 2,
      hitte: temp >= 28,
    }
  } catch {
    return null
  }
}

export function weerSamenvatting(w: WeatherNow): string {
  return `${w.beschrijving}, ${w.temperatuur}°C, wind ${w.windkmh} km/u`
}

export function getLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocatie niet beschikbaar'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    )
  })
}

// Forward-geocoding via Open-Meteo (plaatsnaam → coördinaten), gratis en zonder sleutel.
export async function geocode(naam: string): Promise<{ lat: number; lon: number; label: string } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(naam)}&count=1&language=nl&format=json`
    const resp = await fetch(url)
    if (!resp.ok) return null
    const data = await resp.json()
    const r = data?.results?.[0]
    if (!r) return null
    const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ')
    return { lat: r.latitude, lon: r.longitude, label }
  } catch {
    return null
  }
}
