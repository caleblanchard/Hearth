import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type Project = Database['public']['Tables']['projects']['Row']
type ProjectInsert = Database['public']['Tables']['projects']['Insert']
type ProjectUpdate = Database['public']['Tables']['projects']['Update']
type ProjectTask = Database['public']['Tables']['project_tasks']['Row']
type ProjectTaskInsert = Database['public']['Tables']['project_tasks']['Insert']
type ProjectTaskUpdate = Database['public']['Tables']['project_tasks']['Update']

/**
 * ============================================
 * PROJECTS
 * ============================================
 */

/**
 * Get projects for a family
 */
export async function getProjects(
  familyId: string,
  options?: {
    status?: string
    category?: string
  }
) {
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select(`
      *,
      owner:family_members!projects_owner_id_fkey(id, name, avatar_url),
      tasks:project_tasks(id, title, status, due_date)
    `)
    .eq('family_id', familyId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.category) {
    query = query.eq('category', options.category)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Get a single project with tasks
 */
export async function getProject(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:family_members!projects_owner_id_fkey(id, name, avatar_url),
      tasks:project_tasks(
        *,
        assigned_to_member:family_members!project_tasks_assigned_to_fkey(id, name, avatar_url)
      )
    `)
    .eq('id', projectId)
    .order('sort_order', { foreignTable: 'tasks' })
    .single()

  if (error) throw error
  return data
}

/**
 * Create project
 */
export async function createProject(
  project: ProjectInsert
): Promise<Project> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update project
 */
export async function updateProject(
  projectId: string,
  updates: ProjectUpdate
): Promise<Project> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete project
 */
export async function deleteProject(projectId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) throw error
}

/**
 * ============================================
 * PROJECT TASKS
 * ============================================
 */

/**
 * Create project task
 */
export async function createProjectTask(
  task: ProjectTaskInsert
): Promise<ProjectTask> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_tasks')
    .insert(task)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update project task
 */
export async function updateProjectTask(
  taskId: string,
  updates: ProjectTaskUpdate
): Promise<ProjectTask> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete project task
 */
export async function deleteProjectTask(taskId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('project_tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error
}

/**
 * Get tasks for a project
 */
export async function getProjectTasks(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_tasks')
    .select(`
      *,
      assigned_to_member:family_members(id, name, avatar_url)
    `)
    .eq('project_id', projectId)
    .order('sort_order')

  if (error) throw error
  return data || []
}

/**
 * Get overdue project tasks
 */
export async function getOverdueProjectTasks(familyId: string) {
  const supabase = await createClient()

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('project_tasks')
    .select(`
      *,
      project:projects!inner(id, title, family_id)
    `)
    .eq('project.family_id', familyId)
    .neq('status', 'COMPLETED')
    .lte('due_date', now)
    .order('due_date', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Add task dependency
 */
export async function addTaskDependency(
  taskId: string,
  dependsOnTaskId: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_dependencies')
    .insert({
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove task dependency
 */
export async function removeTaskDependency(dependencyId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', dependencyId)

  if (error) throw error
}

/**
 * Get task dependencies
 */
export async function getTaskDependencies(taskId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_dependencies')
    .select('*')
    .eq('task_id', taskId)

  if (error) throw error
  return data || []
}

/**
 * Get a single project task
 */
export async function getProjectTask(taskId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (error) throw error
  return data
}

/**
 * Get project templates
 */
export async function getProjectTemplates(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_templates')
    .select('*')
    .eq('family_id', familyId)
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Create project from template
 */
export async function createProjectFromTemplate(
  templateId: string,
  projectData: {
    title: string
    description?: string
    familyId: string
  }
) {
  const supabase = await createClient()

  // Get template
  const { data: template } = await supabase
    .from('project_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (!template) throw new Error('Template not found')

  // Create project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      title: projectData.title,
      description: projectData.description || template.description,
      family_id: projectData.familyId,
      status: 'ACTIVE',
    })
    .select()
    .single()

  if (projectError) throw projectError

  return project
}
