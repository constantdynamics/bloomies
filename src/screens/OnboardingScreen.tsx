import { useState } from 'react'

interface Slide {
  emoji: string
  titel: string
  tekst: string
  bg: string
}

const SLIDES: Slide[] = [
  {
    emoji: '💍🎉',
    titel: 'Van harte gefeliciteerd, lieve Luuk en Marieke!',
    tekst:
      'Gefeliciteerd met jullie trouwdag. Als grapje hebben we een klein digitaal cadeautje gemaakt: een app helemaal voor jullie tweeën. 💚',
    bg: 'from-bloom-50 to-cream-100',
  },
  {
    emoji: '🦜🌿',
    titel: 'Waarom deze app?',
    tekst:
      'Omdat Luuk zich altijd vol verbazing vergaapt aan die enorme strelitzia. Met Bloomies kunnen jullie nu zélf je planten verwennen — zodat ze uitgroeien tot koeiedikke joekels.',
    bg: 'from-leaf-50 to-cream-100',
  },
  {
    emoji: '📷',
    titel: 'Herken & verzorg elke plant',
    tekst:
      'Maak een foto en Bloomies herkent de plant en kijkt naar de gezondheid. Per plant krijg je verzorging op maat: licht, water, temperatuur, luchtvochtigheid en de beste plek — binnen of buiten.',
    bg: 'from-cream-100 to-leaf-50',
  },
  {
    emoji: '🗓️',
    titel: 'Een plan voor het hele jaar',
    tekst:
      'Kaat de Groenfanaat, jouw goeroe voor al het groen in de tuin, maakt samen met jullie een jaarplan vol afvinkbare taken — voor kamerplanten, de tuin (van zaadje tot boom) én de vogels per seizoen.',
    bg: 'from-leaf-50 to-cream-100',
  },
  {
    emoji: '💧',
    titel: 'Nooit meer vergeten water te geven',
    tekst:
      'Stel per plant een water-herinnering in en vink hem af als je water hebt gegeven. In het Timers-tabje tellen al je planten af — het tabje kleurt langzaam van groen naar rood zodra het tijd is voor actie.',
    bg: 'from-cream-100 to-bloom-50',
  },
  {
    emoji: '🌷',
    titel: 'Zo beginnen jullie',
    tekst:
      'Voeg je eerste plant toe met een foto, of tik op “Kaat” om te vertellen over jullie tuindromen. Daarna rolt het plan er vanzelf uit. Heel veel tuinplezier samen! 🌻',
    bg: 'from-leaf-50 to-bloom-50',
  },
]

export function OnboardingScreen({ onKlaar }: { onKlaar: () => void }) {
  const [i, setI] = useState(0)
  const slide = SLIDES[i]
  const laatste = i === SLIDES.length - 1

  return (
    <div className={`fixed inset-0 z-[60] bg-gradient-to-b ${slide.bg} flex flex-col safe-top safe-bottom`}>
      <div className="flex justify-between items-center px-5 py-3">
        <span className="font-display text-lg text-leaf-700">Bloomies 🌿</span>
        {!laatste && (
          <button className="text-bark-400 text-sm font-semibold" onClick={onKlaar}>
            Overslaan
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-7">
        <div className="text-6xl mb-6 animate-bloom-in" key={i}>
          {slide.emoji}
        </div>
        <h1 className="font-display text-3xl text-bark-800 leading-tight mb-4 max-w-md">{slide.titel}</h1>
        <p className="text-bark-600 leading-relaxed max-w-sm text-lg">{slide.tekst}</p>
      </div>

      <div className="px-7 pb-6">
        <div className="flex justify-center gap-2 mb-5">
          {SLIDES.map((_, idx) => (
            <span
              key={idx}
              className={`h-2 rounded-full transition-all ${idx === i ? 'w-6 bg-leaf-500' : 'w-2 bg-bark-200'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          {i > 0 && (
            <button className="btn-ghost" onClick={() => setI((v) => v - 1)}>
              Terug
            </button>
          )}
          <button
            className="btn-primary flex-1 text-base py-3"
            onClick={() => (laatste ? onKlaar() : setI((v) => v + 1))}
          >
            {laatste ? '🌱 Aan de slag' : 'Verder'}
          </button>
        </div>
      </div>
    </div>
  )
}
