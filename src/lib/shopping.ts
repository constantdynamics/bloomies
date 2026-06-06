import { addShopping } from './db'
import type { Task, InventoryItem, ShoppingItem } from './types'

export function normaliseer(s: string): string {
  return s.trim().toLowerCase()
}

export function gokCategorie(naam: string): string {
  const n = naam.toLowerCase()
  if (/(pinda|vetbol|vogel|nestkast|strooivoer)/.test(n)) return 'vogels'
  if (/(zaad|zaden|bol|bollen|stek)/.test(n)) return 'zaden'
  if (/(mest|compost|voeding|potgrond|aarde|kalk|turf)/.test(n)) return 'meststoffen'
  if (/(schep|spade|snoei|hark|gieter|handschoen|emmer|kruiwagen|tang|mes|touw|gaas|paal)/.test(n))
    return 'gereedschap'
  return 'overig'
}

// Leidt de boodschappenlijst af: benodigd voor (open) taken minus wat in huis is,
// zonder dubbele items. Geeft het aantal toegevoegde items terug.
export async function ververBoodschappen(
  tasks: Task[],
  inventory: InventoryItem[],
  bestaand: ShoppingItem[],
): Promise<number> {
  const nodig = new Map<string, string>()
  for (const t of tasks) {
    if (t.status === 'gedaan') continue
    for (const b of t.benodigdheden || []) {
      const n = normaliseer(b)
      if (n) nodig.set(n, b.trim())
    }
  }
  for (const i of inventory) if (i.in_huis) nodig.delete(normaliseer(i.naam))
  const aanwezig = new Set(bestaand.map((s) => normaliseer(s.naam)))

  let toegevoegd = 0
  for (const [n, orig] of nodig) {
    if (aanwezig.has(n)) continue
    await addShopping({ naam: orig, categorie: gokCategorie(orig), status: 'nodig' })
    toegevoegd++
  }
  return toegevoegd
}
