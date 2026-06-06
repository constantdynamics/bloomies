import { useState } from 'react'
import { useGarden } from '../lib/GardenContext'
import { Sheet, Segment, EmptyState, Spinner, Chip } from '../components/ui'
import {
  addInventory,
  updateInventory,
  deleteInventory,
  updateShopping,
  deleteShopping,
  addShopping,
} from '../lib/db'
import { ververBoodschappen, gokCategorie } from '../lib/shopping'
import type { InventoryItem, ShoppingItem } from '../lib/types'

const CATS = [
  { v: 'gereedschap', l: '🧰 Gereedschap' },
  { v: 'zaden', l: '🌱 Zaden/planten' },
  { v: 'meststoffen', l: '🌿 Meststoffen' },
  { v: 'vogels', l: '🐦 Vogels' },
  { v: 'overig', l: '📦 Overig' },
]
function catLabel(v: string) {
  return CATS.find((c) => c.v === v)?.l ?? '📦 Overig'
}

export function VoorraadScreen() {
  const [tab, setTab] = useState('voorraad')
  return (
    <div className="py-3">
      <h2 className="font-display text-2xl text-bark-800 mb-3">Voorraad & boodschappen</h2>
      <div className="mb-4">
        <Segment
          opties={[
            { value: 'voorraad', label: '🧺 In huis' },
            { value: 'boodschappen', label: '🛒 Boodschappen' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'voorraad' ? <Voorraad /> : <Boodschappen />}
    </div>
  )
}

function Voorraad() {
  const { inventory, refreshInventory, meld } = useGarden()
  const [open, setOpen] = useState(false)

  const groepen = CATS.map((c) => ({
    cat: c,
    items: inventory.filter((i) => (i.categorie || 'overig') === c.v),
  })).filter((g) => g.items.length)

  async function toggle(item: InventoryItem) {
    await updateInventory(item.id, { in_huis: !item.in_huis })
    await refreshInventory()
  }
  async function verwijder(item: InventoryItem) {
    await deleteInventory(item.id)
    await refreshInventory()
    meld('Verwijderd')
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button className="btn-primary text-sm py-2" onClick={() => setOpen(true)}>
          ＋ Toevoegen
        </button>
      </div>

      {inventory.length === 0 ? (
        <div className="card">
          <EmptyState
            emoji="🧺"
            titel="Voorraad is leeg"
            tekst="Voeg toe wat je in huis hebt — gereedschap, zaden, meststoffen, vogelvoer. Zo blijft je boodschappenlijst kloppend."
            actie={
              <button className="btn-primary" onClick={() => setOpen(true)}>
                ＋ Eerste item
              </button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groepen.map((g) => (
            <div key={g.cat.v}>
              <h3 className="font-display text-bark-500 text-sm mb-1.5">{g.cat.l}</h3>
              <div className="flex flex-col gap-1.5">
                {g.items.map((i) => (
                  <div key={i.id} className="card p-3 flex items-center gap-3">
                    <button
                      onClick={() => toggle(i)}
                      className={`h-5 w-5 rounded-md border-2 shrink-0 flex items-center justify-center ${
                        i.in_huis ? 'bg-leaf-500 border-leaf-500 text-white text-xs' : 'border-bark-300'
                      }`}
                      title={i.in_huis ? 'In huis' : 'Op'}
                    >
                      {i.in_huis && '✓'}
                    </button>
                    <div className="flex-1">
                      <p className={`text-bark-800 ${!i.in_huis ? 'text-bark-400 line-through' : ''}`}>{i.naam}</p>
                      {i.houdbaar_tot && (
                        <p className="text-xs text-bark-400">houdbaar t/m {new Date(i.houdbaar_tot).toLocaleDateString('nl-NL')}</p>
                      )}
                    </div>
                    <button className="text-bark-300 hover:text-bloom-600 px-1" onClick={() => verwijder(i)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <VoorraadSheet onClose={() => setOpen(false)} />}
    </div>
  )
}

function VoorraadSheet({ onClose }: { onClose: () => void }) {
  const { refreshInventory, meld } = useGarden()
  const [form, setForm] = useState({ naam: '', categorie: 'overig', houdbaar: '' })
  const [bezig, setBezig] = useState(false)

  async function bewaar() {
    if (!form.naam.trim()) return
    setBezig(true)
    try {
      await addInventory({
        naam: form.naam.trim(),
        categorie: form.categorie,
        in_huis: true,
        houdbaar_tot: form.houdbaar || null,
      })
      await refreshInventory()
      meld('Toegevoegd 🧺')
      onClose()
    } catch (e: any) {
      meld(e?.message || 'Opslaan mislukt')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Voorraad toevoegen">
      <div className="flex flex-col gap-3">
        <div>
          <label className="label">Wat heb je?</label>
          <input
            className="input"
            value={form.naam}
            onChange={(e) => setForm({ ...form, naam: e.target.value, categorie: gokCategorie(e.target.value) })}
            placeholder="bv. potgrond, snoeischaar, vetbollen"
          />
        </div>
        <div>
          <label className="label">Categorie</label>
          <select className="input" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
            {CATS.map((c) => (
              <option key={c.v} value={c.v}>
                {c.l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Houdbaar tot (optioneel)</label>
          <input type="date" className="input" value={form.houdbaar} onChange={(e) => setForm({ ...form, houdbaar: e.target.value })} />
        </div>
        <button className="btn-primary" onClick={bewaar} disabled={bezig}>
          {bezig ? <Spinner klein /> : 'Opslaan'}
        </button>
      </div>
    </Sheet>
  )
}

function Boodschappen() {
  const { shopping, tasks, inventory, refreshShopping, refreshInventory, meld } = useGarden()
  const [bezig, setBezig] = useState(false)
  const [open, setOpen] = useState(false)

  async function ververs() {
    setBezig(true)
    try {
      const n = await ververBoodschappen(tasks, inventory, shopping)
      await refreshShopping()
      meld(n > 0 ? `${n} item${n === 1 ? '' : 's'} toegevoegd 🛒` : 'Lijst is al up-to-date ✓')
    } catch (e: any) {
      meld(e?.message || 'Verversen mislukt')
    } finally {
      setBezig(false)
    }
  }

  async function toggle(item: ShoppingItem) {
    await updateShopping(item.id, { status: item.status === 'gekocht' ? 'nodig' : 'gekocht' })
    await refreshShopping()
  }
  async function naarVoorraad(item: ShoppingItem) {
    await addInventory({ naam: item.naam, categorie: item.categorie, in_huis: true })
    await deleteShopping(item.id)
    await Promise.all([refreshShopping(), refreshInventory()])
    meld('Naar voorraad verplaatst 🧺')
  }
  async function verwijder(item: ShoppingItem) {
    await deleteShopping(item.id)
    await refreshShopping()
  }

  const nodig = shopping.filter((s) => s.status !== 'gekocht')
  const gekocht = shopping.filter((s) => s.status === 'gekocht')

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button className="btn-secondary text-sm py-2 flex-1" onClick={ververs} disabled={bezig}>
          {bezig ? <Spinner klein /> : '⟳ Afleiden uit taken'}
        </button>
        <button className="btn-primary text-sm py-2" onClick={() => setOpen(true)}>
          ＋
        </button>
      </div>

      {shopping.length === 0 ? (
        <div className="card">
          <EmptyState
            emoji="🛒"
            titel="Boodschappenlijst is leeg"
            tekst="Druk op ‘Afleiden uit taken’ — dan zet ik wat je nodig hebt voor je taken op de lijst, minus wat al in huis is."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {nodig.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {nodig.map((s) => (
                <BoodschapRij key={s.id} item={s} onToggle={() => toggle(s)} onVoorraad={() => naarVoorraad(s)} onWeg={() => verwijder(s)} />
              ))}
            </div>
          )}
          {gekocht.length > 0 && (
            <div>
              <h3 className="font-display text-bark-400 text-sm mb-1.5">Gekocht</h3>
              <div className="flex flex-col gap-1.5">
                {gekocht.map((s) => (
                  <BoodschapRij key={s.id} item={s} onToggle={() => toggle(s)} onVoorraad={() => naarVoorraad(s)} onWeg={() => verwijder(s)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {open && <BoodschapSheet onClose={() => setOpen(false)} />}
    </div>
  )
}

function BoodschapRij({
  item,
  onToggle,
  onVoorraad,
  onWeg,
}: {
  item: ShoppingItem
  onToggle: () => void
  onVoorraad: () => void
  onWeg: () => void
}) {
  const gekocht = item.status === 'gekocht'
  return (
    <div className="card p-3 flex items-center gap-3">
      <button
        onClick={onToggle}
        className={`h-5 w-5 rounded-md border-2 shrink-0 flex items-center justify-center text-xs ${
          gekocht ? 'bg-leaf-500 border-leaf-500 text-white' : 'border-bark-300'
        }`}
      >
        {gekocht && '✓'}
      </button>
      <div className="flex-1">
        <p className={`text-bark-800 ${gekocht ? 'line-through text-bark-400' : ''}`}>{item.naam}</p>
      </div>
      <button className="text-sm text-leaf-600 hover:text-leaf-700 px-1" title="Heb ik thuis → voorraad" onClick={onVoorraad}>
        🧺
      </button>
      <button className="text-bark-300 hover:text-bloom-600 px-1" onClick={onWeg}>
        ✕
      </button>
    </div>
  )
}

function BoodschapSheet({ onClose }: { onClose: () => void }) {
  const { refreshShopping, meld } = useGarden()
  const [naam, setNaam] = useState('')
  const [bezig, setBezig] = useState(false)
  async function bewaar() {
    if (!naam.trim()) return
    setBezig(true)
    try {
      await addShopping({ naam: naam.trim(), categorie: gokCategorie(naam), status: 'nodig' })
      await refreshShopping()
      meld('Op de lijst gezet 🛒')
      onClose()
    } catch (e: any) {
      meld(e?.message || 'Opslaan mislukt')
    } finally {
      setBezig(false)
    }
  }
  return (
    <Sheet open onClose={onClose} title="Boodschap toevoegen">
      <div className="flex flex-col gap-3">
        <input className="input" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="bv. tuinaarde" autoFocus />
        <button className="btn-primary" onClick={bewaar} disabled={bezig}>
          {bezig ? <Spinner klein /> : 'Toevoegen'}
        </button>
      </div>
    </Sheet>
  )
}
