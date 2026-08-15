
import { insertAuditLog, LifecycleError, requireParentContext } from '@/lib/data/lifecycle-core'
import {
  createProject,
  createProjectFromTemplate,
  deleteProject,
  getProject,
  getProjects,
  getProjectTemplates,
  updateProject,
} from '@/lib/data/projects'
import { sanitizeString } from '@/lib/input-sanitization'
import type {
  ProjectLifecycleRecord,
  ProjectLifecycleTaskRecord,
  ProjectLifecycleTemplateRecord,
} from '@/types/project-lifecycle'

const VALID_LIST_STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']
const VALID_UPDATE_STATUSES = ['ACTIVE', 'COMPLETED', 'ON_HOLD', 'ARCHIVED', 'PLANNED']

function normalizeTask(task: Record<string, unknown>): ProjectLifecycleTaskRecord {
  return {
    ...task,
    id: String(task.id),
    name: String(task.name ?? ''),
    status: String(task.status ?? ''),
    description: (task.description as string | null | undefined) ?? null,
    dueDate: (task.due_date as string | null | undefined) ?? (task.dueDate as string | null | undefined) ?? null,
    startDate:
      (task.start_date as string | null | undefined) ??
      (task.startDate as string | null | undefined) ??
      null,
    estimatedHours:
      (task.estimated_hours as number | null | undefined) ??
      (task.estimatedHours as number | null | undefined) ??
      null,
    actualHours:
      (task.actual_hours as number | null | undefined) ??
      (task.actualHours as number | null | undefined) ??
      null,
    sortOrder:
      (task.sort_order as number | null | undefined) ??
      (task.sortOrder as number | null | undefined) ??
      null,
    assignee: (task.assignee as ProjectLifecycleTaskRecord['assignee']) ?? null,
    _count: task._count as ProjectLifecycleTaskRecord['_count'],
  }
}

function normalizeProject(project: Record<string, unknown>): ProjectLifecycleRecord {
  return {
    ...project,
    id: String(project.id),
    familyId: String(project.family_id ?? project.familyId ?? ''),
    name: String(project.name ?? ''),
    description: (project.description as string | null | undefined) ?? null,
    status: String(project.status ?? ''),
    startDate:
      (project.start_date as string | null | undefined) ??
      (project.startDate as string | null | undefined) ??
      null,
    dueDate:
      (project.due_date as string | null | undefined) ??
      (project.dueDate as string | null | undefined) ??
      null,
    budget: (project.budget as number | null | undefined) ?? null,
    notes: (project.notes as string | null | undefined) ?? null,
    createdAt:
      (project.created_at as string | null | undefined) ??
      (project.createdAt as string | null | undefined) ??
      null,
    updatedAt:
      (project.updated_at as string | null | undefined) ??
      (project.updatedAt as string | null | undefined) ??
      null,
    creator: (project.creator as ProjectLifecycleRecord['creator']) ?? null,
    tasks: Array.isArray(project.tasks)
      ? project.tasks.map((task) => normalizeTask(task as Record<string, unknown>))
      : undefined,
    _count: project._count as ProjectLifecycleRecord['_count'],
  }
}

async function readProjectForFamily(projectId: string, familyId: string) {
  const project = await getProject(projectId)
  if (!project || (project as { family_id?: string }).family_id !== familyId) {
    throw new LifecycleError(404, 'Project not found')
  }

  return project
}

export async function getProjectLifecycleProjects(query: { status?: string | null }) {
  const { familyId } = await requireParentContext('Only parents can manage projects')
  const status = query.status ?? null

  if (status && !VALID_LIST_STATUSES.includes(status)) {
    throw new LifecycleError(400, 'Invalid status')
  }

  const projects = await getProjects(familyId, status ? { status } : undefined)
  return projects.map((project) => normalizeProject(project as Record<string, unknown>))
}

export async function createProjectLifecycleProject(body: Record<string, unknown>) {
  const { familyId, memberId } = await requireParentContext('Only parents can create projects')
  const rawName = typeof body.name === 'string' ? body.name : ''

  const sanitizedName = sanitizeString(rawName)
  if (!sanitizedName || sanitizedName.trim().length === 0) {
    throw new LifecycleError(400, 'Name is required')
  }

  const description =
    typeof body.description === 'string' ? sanitizeString(body.description) : null
  const startDate = typeof body.startDate === 'string' ? body.startDate : null
  const endDate =
    typeof body.endDate === 'string'
      ? body.endDate
      : typeof body.dueDate === 'string'
        ? body.dueDate
        : null
  const status = typeof body.status === 'string' ? body.status : 'ACTIVE'
  const budget = typeof body.budget === 'number' ? body.budget : null

  if (status && !VALID_LIST_STATUSES.includes(status)) {
    throw new LifecycleError(400, 'Invalid status')
  }

  if (budget !== null && budget < 0) {
    throw new LifecycleError(400, 'Budget must be a positive number')
  }

  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end <= start) {
      throw new LifecycleError(400, 'Due date must be after start date')
    }
  }

  const project = await createProject({
    family_id: familyId,
    name: sanitizedName,
    description,
    start_date: startDate ? new Date(startDate).toISOString() : null,
    due_date: endDate ? new Date(endDate).toISOString() : null,
    budget,
    created_by_id: memberId,
    status: status as 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED',
  })

  await insertAuditLog({
    familyId,
    memberId,
    action: 'PROJECT_CREATED',
    entityType: 'PROJECT',
    entityId: project.id,
    metadata: {
      name: sanitizedName,
      projectId: project.id,
      status,
    },
  })

  return normalizeProject(project as Record<string, unknown>)
}

export async function getProjectLifecycleProject(projectId: string) {
  const { familyId } = await requireParentContext('Only parents can manage projects')
  const project = await readProjectForFamily(projectId, familyId)
  return normalizeProject(project as Record<string, unknown>)
}

export async function updateProjectLifecycleProject(
  projectId: string,
  body: Record<string, unknown>
) {
  const { familyId, memberId } = await requireParentContext('Only parents can manage projects')
  const existing = await readProjectForFamily(projectId, familyId)
  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      throw new LifecycleError(400, 'Name cannot be empty')
    }
    updates.name = body.name.trim()
  }

  if (body.description !== undefined) updates.description = body.description

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !VALID_UPDATE_STATUSES.includes(body.status)) {
      throw new LifecycleError(400, 'Invalid status')
    }
    updates.status = body.status
  }

  if (body.budget !== undefined) {
    if (typeof body.budget !== 'number' || body.budget < 0) {
      throw new LifecycleError(400, 'Budget must be a positive number')
    }
    updates.budget = body.budget
  }

  if (body.startDate !== undefined) updates.start_date = body.startDate
  if (body.dueDate !== undefined) updates.due_date = body.dueDate
  if (body.notes !== undefined) updates.notes = body.notes

  const startDate =
    (updates.start_date as string | undefined) ??
    ((existing as { start_date?: string | null }).start_date ?? undefined)
  const dueDate =
    (updates.due_date as string | undefined) ??
    ((existing as { due_date?: string | null }).due_date ?? undefined)

  if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
    throw new LifecycleError(400, 'Due date must be after start date')
  }

  const project = await updateProject(projectId, updates)
  await insertAuditLog({
    familyId,
    memberId,
    action: 'PROJECT_UPDATED',
    entityType: 'PROJECT',
    entityId: projectId,
    metadata: {
      projectId,
      updates,
    },
  })

  return normalizeProject(project as Record<string, unknown>)
}

export async function deleteProjectLifecycleProject(projectId: string) {
  const { familyId, memberId } = await requireParentContext('Only parents can manage projects')
  const existing = await readProjectForFamily(projectId, familyId)
  await deleteProject(projectId)

  await insertAuditLog({
    familyId,
    memberId,
    action: 'PROJECT_DELETED',
    entityType: 'PROJECT',
    entityId: projectId,
    metadata: {
      projectId,
      name: (existing as { name?: string | null }).name ?? null,
    },
  })
}

export async function getProjectLifecycleTemplates() {
  const { familyId } = await requireParentContext('Only parents can manage projects')
  const templates = await getProjectTemplates(familyId)
  return templates as ProjectLifecycleTemplateRecord[]
}

export async function createProjectLifecycleProjectFromTemplate(
  body: Record<string, unknown>
) {
  const { familyId, memberId } = await requireParentContext('Only parents can manage projects')
  const templateId = typeof body.templateId === 'string' ? body.templateId : null
  const customizations =
    body.customizations && typeof body.customizations === 'object'
      ? (body.customizations as Record<string, unknown>)
      : {}
  const name =
    typeof body.name === 'string'
      ? body.name
      : typeof customizations.name === 'string'
        ? customizations.name
        : undefined
  const budget =
    typeof body.budget === 'number'
      ? body.budget
      : typeof customizations.budget === 'number'
        ? customizations.budget
        : undefined
  const startDate =
    typeof body.startDate === 'string'
      ? body.startDate
      : typeof customizations.startDate === 'string'
        ? customizations.startDate
        : undefined
  const description =
    typeof body.description === 'string'
      ? body.description
      : typeof customizations.description === 'string'
        ? customizations.description
        : undefined

  if (!templateId) {
    throw new LifecycleError(400, 'Template ID is required')
  }

  try {
    const project = await createProjectFromTemplate(templateId, {
      familyId,
      memberId,
      title: name ?? '',
      budget,
      startDate,
      description,
    })

    await insertAuditLog({
      familyId,
      memberId,
      action: 'PROJECT_CREATED',
      entityType: 'PROJECT',
      entityId: project.id,
      metadata: {
        projectId: project.id,
        templateId,
        name,
      },
    })

    return normalizeProject(project as Record<string, unknown>)
  } catch (error) {
    if (error instanceof Error && error.message === 'Template not found') {
      throw new LifecycleError(404, 'Template not found')
    }

    throw error
  }
}
