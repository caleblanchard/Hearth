import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type TodoItem = Database['public']['Tables']['todo_items']['Row']
type TodoItemInsert = Database['public']['Tables']['todo_items']['Insert']
type TodoItemUpdate = Database['public']['Tables']['todo_items']['Update']

/**
 * ============================================
 * TODO ITEMS
 * ============================================
 */

/**
 * Get todo items for a family
 */
export async function getTodoItems(
  familyId: string,
  options?: {
    status?: 'pending' | 'completed' | 'all'
    assignedTo?: string
    priority?: string
  }
) {
  const supabase = await createClient()

  let query = supabase
    .from('todo_items')
    .select(`
      *,
      assigned:family_members!todo_items_assigned_to_fkey(id, name, avatar_url),
      creator:family_members!todo_items_created_by_fkey(id, name)
    `)
    .eq('family_id', familyId)

  // Filter by status
  if (options?.status === 'pending') {
    query = query.is('completed_at', null)
  } else if (options?.status === 'completed') {
    query = query.not('completed_at', 'is', null)
  }

  // Filter by assignee
  if (options?.assignedTo) {
    query = query.eq('assigned_to', options.assignedTo)
  }

  // Filter by priority
  if (options?.priority) {
    query = query.eq('priority', options.priority)
  }

  // Sort: priority first, then due date, then created date
  query = query.order('priority', { ascending: false })
  query = query.order('due_date', { ascending: true, nullsFirst: false })
  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Get a single todo item
 */
export async function getTodoItem(todoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('todo_items')
    .select(`
      *,
      assigned:family_members!todo_items_assigned_to_fkey(id, name, avatar_url, role),
      creator:family_members!todo_items_created_by_fkey(id, name, avatar_url)
    `)
    .eq('id', todoId)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a todo item
 */
export async function createTodoItem(todo: TodoItemInsert): Promise<TodoItem> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('todo_items')
    .insert(todo)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a todo item
 */
export async function updateTodoItem(
  todoId: string,
  updates: TodoItemUpdate
): Promise<TodoItem> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('todo_items')
    .update(updates)
    .eq('id', todoId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Mark todo as completed
 */
export async function completeTodoItem(todoId: string, completedBy: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('todo_items')
    .update({
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
    })
    .eq('id', todoId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Mark todo as incomplete (uncomplete)
 */
export async function uncompleteTodoItem(todoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('todo_items')
    .update({
      completed_at: null,
      completed_by: null,
    })
    .eq('id', todoId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a todo item
 */
export async function deleteTodoItem(todoId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('todo_items')
    .delete()
    .eq('id', todoId)

  if (error) throw error
}

/**
 * ============================================
 * TODO QUERIES
 * ============================================
 */

/**
 * Get overdue todos
 */
export async function getOverdueTodos(familyId: string) {
  const supabase = await createClient()

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('todo_items')
    .select(`
      *,
      assigned:family_members!todo_items_assigned_to_fkey(id, name, avatar_url)
    `)
    .eq('family_id', familyId)
    .is('completed_at', null)
    .not('due_date', 'is', null)
    .lt('due_date', now)
    .order('due_date', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get today's todos
 */
export async function getTodayTodos(familyId: string) {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('todo_items')
    .select(`
      *,
      assigned:family_members!todo_items_assigned_to_fkey(id, name, avatar_url)
    `)
    .eq('family_id', familyId)
    .is('completed_at', null)
    .gte('due_date', today.toISOString())
    .lt('due_date', tomorrow.toISOString())
    .order('priority', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get upcoming todos (next 7 days)
 */
export async function getUpcomingTodos(familyId: string, days = 7) {
  const supabase = await createClient()

  const now = new Date()
  const future = new Date()
  future.setDate(future.getDate() + days)

  const { data, error } = await supabase
    .from('todo_items')
    .select(`
      *,
      assigned:family_members!todo_items_assigned_to_fkey(id, name, avatar_url)
    `)
    .eq('family_id', familyId)
    .is('completed_at', null)
    .gte('due_date', now.toISOString())
    .lte('due_date', future.toISOString())
    .order('due_date', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get high priority todos
 */
export async function getHighPriorityTodos(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('todo_items')
    .select(`
      *,
      assigned:family_members!todo_items_assigned_to_fkey(id, name, avatar_url)
    `)
    .eq('family_id', familyId)
    .is('completed_at', null)
    .eq('priority', 'HIGH')
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data || []
}

/**
 * Get member's todos
 */
export async function getMemberTodos(memberId: string, includeCompleted = false) {
  const supabase = await createClient()

  let query = supabase
    .from('todo_items')
    .select('*')
    .eq('assigned_to', memberId)

  if (!includeCompleted) {
    query = query.is('completed_at', null)
  }

  query = query.order('priority', { ascending: false })
  query = query.order('due_date', { ascending: true, nullsFirst: false })

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * ============================================
 * TODO STATISTICS
 * ============================================
 */

/**
 * Get todo completion stats
 */
export async function getTodoStats(
  familyId: string,
  startDate?: string,
  endDate?: string
) {
  const supabase = await createClient()

  let query = supabase
    .from('todo_items')
    .select('id, completed_at, created_at')
    .eq('family_id', familyId)

  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  const { data, error } = await query

  if (error) throw error

  const todos = data || []
  const total = todos.length
  const completed = todos.filter(t => t.completed_at).length
  const pending = total - completed
  const completionRate = total > 0 ? (completed / total) * 100 : 0

  return {
    total,
    completed,
    pending,
    completionRate,
  }
}

/**
 * Get member todo completion stats
 */
export async function getMemberTodoStats(
  memberId: string,
  days = 7
) {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('todo_items')
    .select('id, completed_at')
    .eq('assigned_to', memberId)
    .gte('created_at', startDate.toISOString())

  if (error) throw error

  const todos = data || []
  const total = todos.length
  const completed = todos.filter(t => t.completed_at).length

  return {
    total,
    completed,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
  }
}
