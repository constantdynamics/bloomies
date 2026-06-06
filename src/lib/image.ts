// Foto's client-side verkleinen/comprimeren vóór upload (canvas).
// Standaard: max 1600px lange zijde, JPEG kwaliteit ~0.8.

export interface VerkleindeFoto {
  blob: Blob
  base64: string // zonder data:-prefix (voor Claude vision)
  mediaType: string
  dataUrl: string // met data:-prefix (voor preview)
  breedte: number
  hoogte: number
}

export async function verkleinFoto(
  file: File | Blob,
  maxZijde = 1600,
  kwaliteit = 0.8,
): Promise<VerkleindeFoto> {
  const dataUrlOrig = await leesAlsDataUrl(file)
  const img = await laadAfbeelding(dataUrlOrig)

  let { width, height } = img
  if (width > maxZijde || height > maxZijde) {
    if (width >= height) {
      height = Math.round((height * maxZijde) / width)
      width = maxZijde
    } else {
      width = Math.round((width * maxZijde) / height)
      height = maxZijde
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas niet beschikbaar')
  ctx.drawImage(img, 0, 0, width, height)

  const mediaType = 'image/jpeg'
  const dataUrl = canvas.toDataURL(mediaType, kwaliteit)
  const base64 = dataUrl.split(',')[1] ?? ''
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Comprimeren mislukt'))), mediaType, kwaliteit),
  )

  return { blob, base64, mediaType, dataUrl, breedte: width, hoogte: height }
}

function leesAlsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function laadAfbeelding(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Kon afbeelding niet laden'))
    img.src = src
  })
}
