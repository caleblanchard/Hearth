import { createLifecycleClient } from '@/lib/lifecycle-client'
import type {
  CreateProjectFromTemplateInput,
  CreateProjectLifecycleInput,
  ProjectLifecycleRecord,
  ProjectLifecycleTemplateRecord,
  UpdateProjectLifecycleInput,
} from '@/types/project-lifecycle'

const projectsClient = createLifecycleClient<ProjectLifecycleRecord>({
  basePath: '/api/projects',
  itemKey: 'project',
  listKey: 'projects',
})

const templatesClient = createLifecycleClient<ProjectLifecycleRecord>({
  basePath: '/api/projects/templates',
  itemKey: 'project',
})

export function fetchProjectLifecycleProjectsClient(
  status?: string,
): Promise<ProjectLifecycleRecord[]> {
  return projectsClient.list(status && status !== 'all' ? { status } : undefined)
}

export function fetchProjectLifecycleProjectClient(projectId: string): Promise<ProjectLifecycleRecord> {
  return projectsClient.get(projectId)
}

export function createProjectLifecycleProjectClient(
  input: CreateProjectLifecycleInput,
): Promise<ProjectLifecycleRecord> {
  return projectsClient.create(input)
}

export function updateProjectLifecycleProjectClient(
  projectId: string,
  input: UpdateProjectLifecycleInput,
): Promise<ProjectLifecycleRecord> {
  return projectsClient.update(projectId, input)
}

export function deleteProjectLifecycleProjectClient(projectId: string): Promise<void> {
  return projectsClient.remove(projectId)
}

export function fetchProjectLifecycleTemplatesClient(): Promise<ProjectLifecycleTemplateRecord[]> {
  return templatesClient.action<ProjectLifecycleTemplateRecord[]>('', 'GET', undefined, 'templates')
}

export function createProjectLifecycleProjectFromTemplateClient(
  input: CreateProjectFromTemplateInput,
): Promise<ProjectLifecycleRecord> {
  return templatesClient.create(input)
}
