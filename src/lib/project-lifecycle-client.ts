import type { ProjectLifecycleRecord, ProjectLifecycleTemplateRecord } from '@/types/project-lifecycle'
import { apiRequest, buildQueryString } from '@/lib/api-client'

export async function fetchProjectLifecycleProjectsClient(status?: string) {
  const suffix = buildQueryString({ status: status && status !== 'all' ? status : null })
  const data = await apiRequest<{
    projects?: ProjectLifecycleRecord[]
    data?: ProjectLifecycleRecord[]
  }>(`/api/projects${suffix}`)
  return Array.isArray(data.data) ? data.data : data.projects ?? []
}

export async function fetchProjectLifecycleProjectClient(projectId: string) {
  const data = await apiRequest<{ project: ProjectLifecycleRecord }>(`/api/projects/${projectId}`)
  return data.project
}

export async function createProjectLifecycleProjectClient(input: Record<string, unknown>) {
  const data = await apiRequest<{ project: ProjectLifecycleRecord }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.project
}

export async function updateProjectLifecycleProjectClient(
  projectId: string,
  input: Record<string, unknown>
) {
  const data = await apiRequest<{ project: ProjectLifecycleRecord }>(`/api/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return data.project
}

export async function deleteProjectLifecycleProjectClient(projectId: string) {
  await apiRequest<{ success: true }>(`/api/projects/${projectId}`, {
    method: 'DELETE',
  })
}

export async function fetchProjectLifecycleTemplatesClient() {
  const data = await apiRequest<{ templates: ProjectLifecycleTemplateRecord[] }>(
    '/api/projects/templates'
  )
  return data.templates
}

export async function createProjectLifecycleProjectFromTemplateClient(input: Record<string, unknown>) {
  const data = await apiRequest<{ project: ProjectLifecycleRecord }>('/api/projects/templates', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.project
}
