export interface BudgetLifecycleMemberSummary {
  id: string
  name: string
  role?: string | null
}

export interface BudgetLifecyclePeriodRecord {
  id: string
  periodKey: string
  periodStart?: string | null
  periodEnd?: string | null
  spent: number
  createdAt?: string | null
}

export interface BudgetLifecycleRecord {
  id: string
  memberId: string
  category: string
  limitAmount: number
  period: string
  resetDay?: number
  isActive: boolean
  createdAt?: string | null
  updatedAt?: string | null
  member: BudgetLifecycleMemberSummary | null
  periods: BudgetLifecyclePeriodRecord[]
}

export interface CreateBudgetLifecycleInput {
  memberId: string
  category: string
  limitAmount: number
  period: string
  resetDay?: number
  isActive?: boolean
}
