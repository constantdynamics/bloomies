import { useEffect, useMemo, useRef, useState } from 'react'
import { useGarden } from '../lib/GardenContext'
import { praatMetGoeroe } from '../lib/api'
import { addBriefingMessage, listBriefing, clearBriefing, updateGarden } from '../lib/db'
import { genereerEnBewaarPlan } from '../lib/plan'
import {
  sttBeschikbaar,
  ttsBeschikbaar,
  maakLuisteraar,
  spreek,
  stopSpreken,
  type Luisteraar,
} from '../lib/speech'
import { Spinner, Segment } from '../components/ui'
import { AddPlantSheet } from '../components/AddPlantSheet'
import { weerSamenvatting } from '../lib/weather'
import type { BriefingMessage } from '../lib/types'

export function BriefingScreen({ onClose, onNaarPlan }: { onClose: () => void; onNaarPlan: () => void }) {
  const g = useGarden()
  const { garden, plants, seizoen, weather } = g
  const [messages, setMessages] = useState<BriefingMessage[]>([])
  const [initLaden, setInitLaden] = useState(true)
  const [denkt, setDenkt] = useState(false)
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'typen' | 'meerkeuze'>('typen')
  const [spraakUit, setSpraakUit] = useState(false)
  const [luisteren, setLuisteren] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [planBezig, setPlanBezig] = useState(false)
  const [plantOpen, setPlantOpen] = useState(false)

  const bodemRef = useRef<HTMLDivElement>(null)
  const gestart = useRef(false)
  const luisteraar = useRef<Luisteraar | null>(null)

  const photos = useMemo(
    () =>
      plants
        .filter((p) => p.foto_url)
        .slice(0, 6)
        .map((p) => ({ url: p.foto_url as string, label: p.naam })),
    [plants],
  )

  const context = useMemo(
    () => ({
      naam: garden?.naam,
      locatie_naam: garden?.locatie_naam ?? '',
      seizoen,
      weer: weather ? weerSamenvatting(weather) : '',
      aantal_foto: photos.length,
      plants: plants.slice(0, 30).map((p) => ({
        naam: p.naam,
        soort: p.soort,
        type: p.type,
        locatie_in_tuin: p.locatie_in_tuin,
        gezondheid: p.gezondheid,
      })),
    }),
    [garden, plants, seizoen, weather, photos.length],
  )

  // Berichten laden + zo nodig het gesprek openen.
  useEffect(() => {
    if (gestart.current) return
    gestart.current = true
    ;(async () => {
      try {
        const bestaande = await listBriefing()
        setMessages(bestaande)
        if (bestaande.length === 0) {
          await vraagGoeroe([])
        }
      } catch (e: any) {
        setFout(e?.message || 'Kon het gesprek niet laden.')
      } finally {
        setInitLaden(false)
      }
    })()
    return () => stopSpreken()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bodemRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, denkt])

  async function vraagGoeroe(history: BriefingMessage[]) {
    setDenkt(true)
    setFout(null)
    try {
      const res = await praatMetGoeroe(
        history.map((m) => ({ rol: m.rol, inhoud: m.inhoud })),
        context,
        photos,
      )
      const opgeslagen = await addBriefingMessage('assistant', res.bericht, {
        keuzes: res.keuzes,
        foto_focus: res.foto_focus,
        klaar: res.klaar,
        samenvatting: res.samenvatting,
      })
      setMessages((m) => [...m, opgeslagen])
      if (spraakUit) spreek(res.bericht)
    } catch (e: any) {
      setFout(e?.message || 'De goeroe gaf geen antwoord. Probeer het nog eens.')
    } finally {
      setDenkt(false)
    }
  }

  async function stuur(tekst: string) {
    const t = tekst.trim()
    if (!t || denkt) return
    setInput('')
    try {
      const userMsg = await addBriefingMessage('user', t)
      const nieuw = [...messages, userMsg]
      setMessages(nieuw)
      await vraagGoeroe(nieuw)
    } catch (e: any) {
      setFout(e?.message || 'Versturen mislukt.')
    }
  }

  function toggleLuisteren() {
    if (!sttBeschikbaar()) {
      setFout('Spraakinvoer wordt niet ondersteund in deze browser. Probeer Chrome.')
      return
    }
    if (luisteren) {
      luisteraar.current?.stop()
      setLuisteren(false)
      return
    }
    luisteraar.current = maakLuisteraar({
      onResultaat: (tekst) => {
        setLuisteren(false)
        stuur(tekst)
      },
      onEinde: () => setLuisteren(false),
      onFout: () => setLuisteren(false),
    })
    luisteraar.current?.start()
    setLuisteren(true)
  }

  function toggleSpraakUit() {
    setSpraakUit((v) => {
      if (v) stopSpreken()
      return !v
    })
  }

  async function maakPlan() {
    setPlanBezig(true)
    try {
      const g2 = await genereerEnBewaarPlan({
        garden,
        plants,
        inventory: g.inventory,
        birds: g.birds,
        seizoen,
        weather,
        vervang: true,
      })
      const g3 = await updateGarden({ briefing_voltooid: true })
      g.setGarden({ ...g2, briefing_voltooid: g3.briefing_voltooid })
      await Promise.all([g.refreshTasks(), g.refreshSuggestions(), g.refreshBirds(), g.refreshShopping()])
      onNaarPlan()
    } catch (e: any) {
      setFout(e?.message || 'Het plan maken lukte niet.')
    } finally {
      setPlanBezig(false)
    }
  }

  async function opnieuw() {
    if (!confirm('Het gesprek opnieuw beginnen? De huidige briefing wordt gewist.')) return
    stopSpreken()
    await clearBriefing()
    setMessages([])
    gestart.current = false
    setInitLaden(true)
    // herstart
    try {
      await vraagGoeroe([])
    } finally {
      setInitLaden(false)
      gestart.current = true
    }
  }

  const laatsteAssistant = [...messages].reverse().find((m) => m.rol === 'assistant')
  const keuzes: string[] = laatsteAssistant?.meta?.keuzes ?? []
  const klaar = !!laatsteAssistant?.meta?.klaar

  return (
    <div className="min-h-screen flex flex-col bg-cream-100">
      <header className="sticky top-0 z-20 bg-cream-100/95 backdrop-blur border-b border-cream-200 safe-top">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button className="btn-ghost rounded-full h-9 w-9 p-0 text-lg" onClick={onClose} aria-label="Terug">
            ←
          </button>
          <div className="flex-1">
            <h1 className="font-display text-xl text-leaf-700 leading-tight">De goeroe 🌱</h1>
            <p className="text-[11px] text-bark-400 -mt-0.5">Vertel over je tuindromen</p>
          </div>
          {ttsBeschikbaar() && (
            <button
              onClick={toggleSpraakUit}
              className={`btn-ghost rounded-full h-9 w-9 p-0 text-lg ${spraakUit ? 'text-leaf-600' : 'text-bark-300'}`}
              title="Voorlezen aan/uit"
            >
              {spraakUit ? '🔊' : '🔈'}
            </button>
          )}
          <button onClick={opnieuw} className="btn-ghost rounded-full h-9 w-9 p-0 text-base" title="Opnieuw beginnen">
            ↺
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 overflow-y-auto">
        {initLaden ? (
          <div className="flex flex-col items-center gap-3 py-16 text-bark-400">
            <span className="text-4xl animate-bounce">🌱</span>
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <Bubble key={m.id} msg={m} plants={plants} onSpeak={() => spreek(m.inhoud)} />
            ))}
            {denkt && (
              <div className="self-start flex items-center gap-2 text-bark-400 text-sm px-2">
                <Spinner klein /> de goeroe denkt na…
              </div>
            )}
            {fout && (
              <div className="card p-3 bg-bloom-50 border-bloom-100 text-bloom-700 text-sm">
                {fout}
              </div>
            )}
            <div ref={bodemRef} />
          </div>
        )}
      </main>

      <div className="sticky bottom-0 z-20 bg-cream-50/95 backdrop-blur border-t border-cream-200 safe-bottom">
        <div className="max-w-2xl mx-auto px-4 py-3 flex flex-col gap-2">
          {klaar && (
            <button className="btn-accent w-full" onClick={maakPlan} disabled={planBezig}>
              {planBezig ? (
                <>
                  <Spinner klein /> Je jaarplan groeit…
                </>
              ) : (
                '🌻 Maak mijn jaarplan'
              )}
            </button>
          )}

          <div className="flex items-center justify-between gap-2">
            <Segment
              opties={[
                { value: 'typen', label: '⌨️ Typen' },
                { value: 'meerkeuze', label: '☑️ Keuzes' },
              ]}
              value={mode}
              onChange={(v) => setMode(v as 'typen' | 'meerkeuze')}
            />
            <div className="flex gap-1">
              <button className="btn-ghost text-sm py-1.5" onClick={() => stuur('Ik sla deze vraag liever over.')} disabled={denkt}>
                Sla over
              </button>
            </div>
          </div>

          {mode === 'meerkeuze' && keuzes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {keuzes.map((k, i) => (
                <button key={i} className="btn-secondary text-sm py-2" onClick={() => stuur(k)} disabled={denkt}>
                  {k}
                </button>
              ))}
              <button className="btn-ghost text-sm py-2" onClick={() => setMode('typen')}>
                Iets anders…
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <button
                onClick={() => setPlantOpen(true)}
                className="btn-secondary h-11 w-11 p-0 text-lg shrink-0"
                title="Foto van een plant toevoegen"
              >
                📷
              </button>
              {sttBeschikbaar() && (
                <button
                  onClick={toggleLuisteren}
                  className={`h-11 w-11 p-0 text-lg shrink-0 rounded-2xl ${
                    luisteren ? 'bg-bloom-400 text-white animate-pulse' : 'btn-secondary'
                  }`}
                  title="Spreek je antwoord"
                >
                  🎤
                </button>
              )}
              <textarea
                className="input flex-1 min-h-[44px] max-h-32 py-2.5 resize-none"
                placeholder={luisteren ? 'Luisteren…' : 'Typ je antwoord…'}
                value={input}
                rows={1}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    stuur(input)
                  }
                }}
              />
              <button className="btn-primary h-11 w-11 p-0 text-lg shrink-0" onClick={() => stuur(input)} disabled={denkt || !input.trim()}>
                ➤
              </button>
            </div>
          )}

          {mode === 'meerkeuze' && keuzes.length === 0 && (
            <p className="text-bark-400 text-sm text-center">De goeroe stelde een open vraag — typ of spreek je antwoord.</p>
          )}
        </div>
      </div>

      <AddPlantSheet open={plantOpen} onClose={() => setPlantOpen(false)} onAdded={() => g.refreshPlants()} />
    </div>
  )
}

function Bubble({
  msg,
  plants,
  onSpeak,
}: {
  msg: BriefingMessage
  plants: { naam: string; foto_url: string | null }[]
  onSpeak: () => void
}) {
  const isGoeroe = msg.rol === 'assistant'
  const focusNaam: string | undefined = msg.meta?.foto_focus?.plant
  const focusPlant = focusNaam
    ? plants.find((p) => p.foto_url && p.naam.toLowerCase().includes(focusNaam.toLowerCase()))
    : undefined

  if (isGoeroe) {
    return (
      <div className="self-start max-w-[85%] animate-bloom-in">
        <div className="flex items-end gap-2">
          <span className="text-2xl shrink-0">🌱</span>
          <button onClick={onSpeak} className="text-left bg-leaf-50 border border-leaf-100 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-bark-700 leading-relaxed">
            {msg.inhoud}
          </button>
        </div>
        {focusPlant?.foto_url && (
          <div className="ml-9 mt-1.5">
            <img
              src={focusPlant.foto_url}
              alt={focusPlant.naam}
              className="h-24 w-24 object-cover rounded-xl border-2 border-bloom-300"
            />
            <p className="text-[10px] text-bark-400 mt-0.5">over: {focusPlant.naam}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="self-end max-w-[85%] animate-bloom-in">
      <div className="bg-bloom-400 text-white rounded-2xl rounded-br-md px-3.5 py-2.5 leading-relaxed">{msg.inhoud}</div>
    </div>
  )
}
