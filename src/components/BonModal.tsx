// Easter egg: feestelijke €100-waardebon bij de allereerste plant.
// Bevat geen echte bon-code — die wordt los toegestuurd.

const CONFETTI = ['🎉', '🎊', '🌿', '💚', '🌷', '✨', '🍃', '🌻']

export function BonModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-5 bg-bark-900/60 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="confetti absolute text-2xl"
            style={{
              left: `${(i * 47) % 100}%`,
              animationDelay: `${(i % 7) * 0.35}s`,
              animationDuration: `${3 + (i % 4)}s`,
            }}
          >
            {CONFETTI[i % CONFETTI.length]}
          </span>
        ))}
      </div>

      <div className="relative card max-w-sm w-full p-6 text-center animate-bloom-in bg-cream-50">
        <div className="text-5xl mb-1">🎁</div>
        <h2 className="font-display text-2xl text-leaf-700">Verrassing! 🎉</h2>
        <p className="text-bark-600 mt-2 leading-relaxed">
          Voor jullie <strong>allereerste plant</strong> krijgen jullie een echte
        </p>
        <div className="my-3 rounded-3xl bg-leaf-500 text-white py-4 shadow-soft">
          <p className="font-display text-5xl leading-none">€100</p>
          <p className="text-sm font-semibold mt-1.5">waardebon voor het tuincentrum</p>
        </div>
        <p className="text-bark-500 text-sm leading-relaxed">
          Geen grapje 💚 — de bon komt naar jullie toe. Ga lekker samen nieuwe groene maatjes uitzoeken!
        </p>
        <button className="btn-primary w-full mt-5" onClick={onClose}>
          Joepie! 🌱
        </button>
      </div>
    </div>
  )
}
