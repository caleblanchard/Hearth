export type DashboardSnapshotCardKind =
  | 'chores'
  | 'screentime'
  | 'credits'
  | 'shopping'
  | 'todos'
  | 'calendar'
  | 'projects'

export type DashboardSnapshotTone = 'neutral' | 'good' | 'warning' | 'alert'

export interface DashboardSnapshotBadge {
  label: string
  tone: DashboardSnapshotTone
}

export interface DashboardSnapshotSummaryRow {
  label: string
  value: string
}

export interface DashboardSnapshotPreviewItem {
  id: string
  primary: string
  secondary?: string
  meta?: string
  tone?: DashboardSnapshotTone
  href?: string
  progress?: number
}

export interface DashboardSnapshotCard {
  kind: DashboardSnapshotCardKind
  title: string
  href: string
  state: 'ready' | 'empty' | 'unavailable'
  badge?: DashboardSnapshotBadge
  summary: DashboardSnapshotSummaryRow[]
  preview: DashboardSnapshotPreviewItem[]
  moreCount: number
  emptyMessage?: string
  unavailableMessage?: string
}

export interface DashboardSnapshotIssue {
  kind: DashboardSnapshotCardKind
  code: 'source-unavailable' | 'restricted' | 'not-configured' | 'degraded'
  detail?: string
}

export interface DashboardSnapshot {
  capturedAt: string
  partial: boolean
  viewer: {
    memberId: string | null
    role: 'PARENT' | 'CHILD' | 'GUEST'
    access: 'full' | 'guest' | 'kiosk'
  }
  cards: DashboardSnapshotCard[]
  issues: DashboardSnapshotIssue[]
}
