import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type InventoryItem = Database['public']['Tables']['inventory_items']['Row']
type InventoryItemInsert = Database['public']['Tables']['inventory_items']['Insert']
type InventoryItemUpdate = Database['public']['Tables']['inventory_items']['Update']

/**
 * ============================================
 * INVENTORY ITEMS
 * ============================================
 */

/**
 * Get inventory items for a family
 */
export async function getInventoryItems(
  familyId: string,
  options?: {
    category?: string
    location?: string
    lowStock?: boolean
  }
) {
  const supabase = await createClient()

  let query = supabase
    .from('inventory_items')
    .select('*')
    .eq('family_id', familyId)

  if (options?.category) {
    query = query.eq('category', options.category as any)
  }

  if (options?.location) {
    query = query.eq('location', options.location as any)
  }

  query = query.order('name')

  const { data, error } = await query

  if (error) throw error
  
  let items = data || []
  
  // Filter for low stock if requested
  if (options?.lowStock) {
    items = items.filter(item => item.low_stock_threshold != null && item.current_quantity <= item.low_stock_threshold)
  }
  
  return items
}

/**
 * Get low stock items
 */
export async function getLowStockItems(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('family_id', familyId)
    .order('name')

  if (error) throw error
  
  // Filter items where current_quantity <= reorder_threshold
  const lowStockItems = (data || []).filter(
    item => item.low_stock_threshold != null && item.current_quantity <= item.low_stock_threshold
  )
  
  return lowStockItems
}

/**
 * Create inventory item
 */
export async function createInventoryItem(
  item: InventoryItemInsert
): Promise<InventoryItem> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_items')
    .insert(item)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update inventory item
 */
export async function updateInventoryItem(
  itemId: string,
  updates: InventoryItemUpdate
): Promise<InventoryItem> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete inventory item
 */
export async function deleteInventoryItem(itemId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
}

/**
 * Adjust inventory quantity
 */
export async function adjustInventoryQuantity(
  itemId: string,
  quantityChange: number,
  reason?: string
): Promise<InventoryItem> {
  const supabase = await createClient()

  // First get the current item
  const { data: item } = await supabase
    .from('inventory_items')
    .select('current_quantity')
    .eq('id', itemId)
    .single()

  if (!item) throw new Error('Item not found')

  const newQuantity = item.current_quantity + quantityChange

  const { data, error } = await supabase
    .from('inventory_items')
    .update({
      current_quantity: newQuantity,
      last_restocked_at: quantityChange > 0 ? new Date().toISOString() : undefined,
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get inventory by category
 */
export async function getInventoryByCategory(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name, category, current_quantity')
    .eq('family_id', familyId)
    .order('category')
    .order('name')

  if (error) throw error

  // Group by category
  const grouped = (data || []).reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof data>)

  return grouped
}

/**
 * Get expiring inventory items
 */
export async function getExpiringInventoryItems(familyId: string, days = 7) {
  const supabase = await createClient()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() + days)

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('family_id', familyId)
    .not('expires_at', 'is', null)
    .lte('expires_at', cutoffDate.toISOString())
    .order('expires_at', { ascending: true })

  if (error) throw error
  return data || []
}
