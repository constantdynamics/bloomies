import { useRef, useState } from 'react'
import { verkleinFoto, type VerkleindeFoto } from '../lib/image'
import { Spinner } from './ui'

// Knop die een foto laat kiezen/maken, hem client-side comprimeert en teruggeeft.
export function PhotoUploader({
  onFoto,
  label = '📷 Foto maken of kiezen',
  variant = 'primary',
}: {
  onFoto: (foto: VerkleindeFoto) => void
  label?: string
  variant?: 'primary' | 'secondary' | 'accent'
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [bezig, setBezig] = useState(false)

  const klasse =
    variant === 'secondary' ? 'btn-secondary' : variant === 'accent' ? 'btn-accent' : 'btn-primary'

  async function kies(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // zelfde bestand opnieuw kiezen mogelijk maken
    if (!file) return
    setBezig(true)
    try {
      const foto = await verkleinFoto(file)
      onFoto(foto)
    } catch (err) {
      console.error(err)
      alert('Kon de foto niet verwerken. Probeer een andere foto.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={kies}
      />
      <button className={klasse} disabled={bezig} onClick={() => inputRef.current?.click()}>
        {bezig ? (
          <>
            <Spinner klein /> Verwerken…
          </>
        ) : (
          label
        )}
      </button>
    </>
  )
}
