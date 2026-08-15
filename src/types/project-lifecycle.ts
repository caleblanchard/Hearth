export interface ProjectLifecycleCreatorSummary {
  id: string
  name: string
  avatarUrl?: string | null
}

export interface ProjectLifecycleTaskRecord {
  id: string
  name: string
  description?: string | null
  status: string
  dueDate: string | null
  startDate?: string | null
  estimatedHours?: number | null
  actualHours?: number | null
  sortOrder?: number | null
  assignee?: {
    id: string
    name: string
  } | null
  _count?: {
    dependencies?: number
    dependents?: number
  }
}

export interface ProjectLifecycleRecord {
  id: string
  familyId: string
  name: string
  description: string | null
  status: string
  startDate: string | null
  dueDate: string | null
  budget: number | null
  notes?: string | null
  createdAt: string | null
  updatedAt?: string | null
  creator?: ProjectLifecycleCreatorSummary | null
  tasks?: ProjectLifecycleTaskRecord[]
  _count?: {
    tasks?: number
  }
}

export interface ProjectLifecycleTemplateTaskRecord {
  name: string
  description?: string | null
  estimatedHours?: number | null
}

export interface ProjectLifecycleTemplateRecord {
  id: string
  name: string
  description: string
  category: string
  estimatedDays: number
  suggestedBudget: number
  tasks: ProjectLifecycleTemplateTaskRecord[]
}

