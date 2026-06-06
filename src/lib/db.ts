import { supabase, GARDEN_ID } from './supabase'
import type {
  Garden,
  Plant,
  Task,
  InventoryItem,
  ShoppingItem,
  BriefingMessage,
  Photo,
  Suggestion,
  BirdAction,
} from './types'

// ---------- Tuin ----------
export async function ensureGarden(): Promise<Garden> {
  const { data } = await supabase.from('bloom_gardens').select('*').eq('id', GARDEN_ID).maybeSingle()
  if (data) return data as Garden
  const { data: created, error } = await supabase
    .from('bloom_gardens')
    .insert({ id: GARDEN_ID })
    .select()
    .single()
  if (error) throw error
  return created as Garden
}

export async function updateGarden(patch: Partial<Garden>): Promise<Garden> {
  const { data, error } = await supabase
    .from('bloom_gardens')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', GARDEN_ID)
    .select()
    .single()
  if (error) throw error
  return data as Garden
}

// ---------- Planten ----------
export async function listPlants(): Promise<Plant[]> {
  const { data, error } = await supabase
    .from('bloom_plants')
    .select('*')
    .eq('garden_id', GARDEN_ID)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Plant[]
}

export async function addPlant(p: Partial<Plant>): Promise<Plant> {
  const { data, error } = await supabase
    .from('bloom_plants')
    .insert({ ...p, garden_id: GARDEN_ID })
    .select()
    .single()
  if (error) throw error
  return data as Plant
}

export async function updatePlant(id: string, patch: Partial<Plant>): Promise<void> {
  const { error } = await supabase.from('bloom_plants').update(patch).eq('id', id)
  if (error) throw error
}

export async function deletePlant(id: string): Promise<void> {
  const { error } = await supabase.from('bloom_plants').delete().eq('id', id)
  if (error) throw error
}

// ---------- Taken ----------
export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('bloom_tasks')
    .select('*')
    .eq('garden_id', GARDEN_ID)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Task[]
}

export async function addTasks(taken: Partial<Task>[]): Promise<void> {
  if (!taken.length) return
  const rows = taken.map((t) => ({ ...t, garden_id: GARDEN_ID }))
  const { error } = await supabase.from('bloom_tasks').insert(rows)
  if (error) throw error
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const { error } = await supabase.from('bloom_tasks').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('bloom_tasks').delete().eq('id', id)
  if (error) throw error
}

export async function deleteAllTasks(): Promise<void> {
  const { error } = await supabase.from('bloom_tasks').delete().eq('garden_id', GARDEN_ID)
  if (error) throw error
}

// ---------- Inventaris ----------
export async function listInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('bloom_inventory_items')
    .select('*')
    .eq('garden_id', GARDEN_ID)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as InventoryItem[]
}

export async function addInventory(item: Partial<InventoryItem>): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('bloom_inventory_items')
    .insert({ ...item, garden_id: GARDEN_ID })
    .select()
    .single()
  if (error) throw error
  return data as InventoryItem
}

export async function updateInventory(id: string, patch: Partial<InventoryItem>): Promise<void> {
  const { error } = await supabase.from('bloom_inventory_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteInventory(id: string): Promise<void> {
  const { error } = await supabase.from('bloom_inventory_items').delete().eq('id', id)
  if (error) throw error
}

// ---------- Boodschappen ----------
export async function listShopping(): Promise<ShoppingItem[]> {
  const { data, error } = await supabase
    .from('bloom_shopping_items')
    .select('*')
    .eq('garden_id', GARDEN_ID)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ShoppingItem[]
}

export async function addShopping(item: Partial<ShoppingItem>): Promise<ShoppingItem> {
  const { data, error } = await supabase
    .from('bloom_shopping_items')
    .insert({ ...item, garden_id: GARDEN_ID })
    .select()
    .single()
  if (error) throw error
  return data as ShoppingItem
}

export async function updateShopping(id: string, patch: Partial<ShoppingItem>): Promise<void> {
  const { error } = await supabase.from('bloom_shopping_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteShopping(id: string): Promise<void> {
  const { error } = await supabase.from('bloom_shopping_items').delete().eq('id', id)
  if (error) throw error
}

// ---------- Suggesties ----------
export async function listSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from('bloom_suggestions')
    .select('*')
    .eq('garden_id', GARDEN_ID)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Suggestion[]
}

export async function addSuggestions(items: Partial<Suggestion>[]): Promise<void> {
  if (!items.length) return
  const rows = items.map((s) => ({ ...s, garden_id: GARDEN_ID }))
  const { error } = await supabase.from('bloom_suggestions').insert(rows)
  if (error) throw error
}

export async function updateSuggestion(id: string, patch: Partial<Suggestion>): Promise<void> {
  const { error } = await supabase.from('bloom_suggestions').update(patch).eq('id', id)
  if (error) throw error
}

// ---------- Vogelacties ----------
export async function listBirdActions(): Promise<BirdAction[]> {
  const { data, error } = await supabase
    .from('bloom_bird_actions')
    .select('*')
    .eq('garden_id', GARDEN_ID)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as BirdAction[]
}

export async function addBirdActions(items: Partial<BirdAction>[]): Promise<void> {
  if (!items.length) return
  const rows = items.map((b) => ({ ...b, garden_id: GARDEN_ID }))
  const { error } = await supabase.from('bloom_bird_actions').insert(rows)
  if (error) throw error
}

export async function updateBirdAction(id: string, patch: Partial<BirdAction>): Promise<void> {
  const { error } = await supabase.from('bloom_bird_actions').update(patch).eq('id', id)
  if (error) throw error
}

// ---------- Briefing ----------
export async function listBriefing(): Promise<BriefingMessage[]> {
  const { data, error } = await supabase
    .from('bloom_briefing_messages')
    .select('*')
    .eq('garden_id', GARDEN_ID)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as BriefingMessage[]
}

export async function addBriefingMessage(
  rol: 'user' | 'assistant',
  inhoud: string,
  meta?: any,
): Promise<BriefingMessage> {
  const { data, error } = await supabase
    .from('bloom_briefing_messages')
    .insert({ garden_id: GARDEN_ID, rol, inhoud, meta: meta ?? null })
    .select()
    .single()
  if (error) throw error
  return data as BriefingMessage
}

export async function clearBriefing(): Promise<void> {
  const { error } = await supabase.from('bloom_briefing_messages').delete().eq('garden_id', GARDEN_ID)
  if (error) throw error
}

// ---------- Foto's ----------
export async function listPhotos(): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('bloom_photos')
    .select('*')
    .eq('garden_id', GARDEN_ID)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Photo[]
}

export async function addPhoto(p: Partial<Photo>): Promise<Photo> {
  const { data, error } = await supabase
    .from('bloom_photos')
    .insert({ ...p, garden_id: GARDEN_ID })
    .select()
    .single()
  if (error) throw error
  return data as Photo
}
