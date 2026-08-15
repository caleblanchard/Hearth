export const DASHBOARD_WIDGET_KINDS = [
  'transport',
  'medication',
  'maintenance',
  'inventory',
  'weather',
] as const

export type DashboardWidgetKind = (typeof DASHBOARD_WIDGET_KINDS)[number]

export interface TransportSchedule {
  id: string
  time: string
  type: string
  member: {
    id: string
    name: string
  }
  location: {
    id: string
    name: string
    address: string
  }
  driver: {
    id: string
    name: string
    phone: string
    relationship: string
  } | null
  carpool: {
    id: string
    name: string
  } | null
}

export interface MedicationWidgetItem {
  id: string
  medicationName: string
  activeIngredient: string | null
  minIntervalHours: number
  maxDosesPerDay: number | null
  lastDoseAt: string | null
  nextDoseAvailableAt: string | null
  notifyWhenReady: boolean
  member: {
    id: string
    name: string
  }
  doses: unknown[]
}

export interface MaintenanceWidgetItem {
  id: string
  title: string
  description: string | null
  category: string
  nextDueAt: string | null
  lastCompletedAt: string | null
  intervalDays: number | null
  assignedTo: string | null
}

export interface InventoryWidgetItem {
  id: string
  name: string
  category: string
  currentQuantity: number
  lowStockThreshold: number
  unit: string | null
  location: string | null
}

export interface WeatherForecastDay {
  date: string
  high: number
  low: number
  condition: string
  description: string
  icon: string
}

export interface WeatherWidgetData {
  location: string
  current: {
    temp: number
    feelsLike: number
    condition: string
    description: string
    icon: string
  }
  today: {
    high: number
    low: number
  }
  forecast: WeatherForecastDay[]
}

export interface DashboardWidgetDataMap {
  transport: { schedules: TransportSchedule[] }
  medication: { medications: MedicationWidgetItem[] }
  maintenance: { items: MaintenanceWidgetItem[] }
  inventory: { items: InventoryWidgetItem[] }
  weather: WeatherWidgetData
}

export type DashboardWidgetState = 'ready' | 'unavailable'

export interface DashboardWidgetReadyResult<
  K extends DashboardWidgetKind = DashboardWidgetKind,
> {
  kind: K
  state: 'ready'
  data: DashboardWidgetDataMap[K]
}

export interface DashboardWidgetUnavailableResult<
  K extends DashboardWidgetKind = DashboardWidgetKind,
> {
  kind: K
  state: 'unavailable'
  error: string
}

export type DashboardWidgetResult<K extends DashboardWidgetKind = DashboardWidgetKind> =
  | DashboardWidgetReadyResult<K>
  | DashboardWidgetUnavailableResult<K>

export type DashboardWidgetResults = Partial<{
  [K in DashboardWidgetKind]: DashboardWidgetResult<K>
}>

export interface DashboardWidgetIssue {
  kind: DashboardWidgetKind
  message: string
}

export interface DashboardWidgetCollection {
  capturedAt: string
  partial: boolean
  requested: DashboardWidgetKind[]
  widgets: DashboardWidgetResults
  issues: DashboardWidgetIssue[]
}

export function isDashboardWidgetKind(value: string): value is DashboardWidgetKind {
  return DASHBOARD_WIDGET_KINDS.includes(value as DashboardWidgetKind)
}
