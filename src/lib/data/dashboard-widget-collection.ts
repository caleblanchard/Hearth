import { getLowStockItems } from '@/lib/data/inventory'
import { getUpcomingMaintenanceItems } from '@/lib/data/maintenance'
import { getMedications } from '@/lib/data/medications'
import { getTodaysTransportSchedules } from '@/lib/data/transport'
import { getWeatherForFamily } from '@/lib/data/weather'
import type {
  DashboardWidgetCollection,
  DashboardWidgetDataMap,
  DashboardWidgetIssue,
  DashboardWidgetKind,
  DashboardWidgetResult,
  InventoryWidgetItem,
  MaintenanceWidgetItem,
  MedicationWidgetItem,
  TransportSchedule,
} from '@/types/dashboard-widget-collection'

export interface DashboardWidgetViewerContext {
  familyId: string
  memberId?: string
  useServiceClient?: boolean
}

type DashboardWidgetLoader<K extends DashboardWidgetKind = DashboardWidgetKind> = (
  viewer: DashboardWidgetViewerContext
) => Promise<DashboardWidgetDataMap[K]>

const WIDGET_LOADERS: {
  [K in DashboardWidgetKind]: DashboardWidgetLoader<K>
} = {
  transport: async (viewer) => {
    const schedules = await getTodaysTransportSchedules(viewer.familyId, viewer.memberId)
    const mappedSchedules: TransportSchedule[] = schedules.map((schedule: any) => ({
      id: schedule.id,
      time: schedule.time,
      type: schedule.type,
      member: {
        id: schedule.member?.id ?? schedule.member_id,
        name: schedule.member?.name ?? 'Unknown member',
      },
      location: {
        id: schedule.location?.id ?? schedule.location_id ?? 'unknown-location',
        name: schedule.location?.name ?? 'Unknown location',
        address: schedule.location?.address ?? '',
      },
      driver: schedule.driver
        ? {
            id: schedule.driver.id,
            name: schedule.driver.name,
            phone: schedule.driver.phone,
            relationship: schedule.driver.relationship,
          }
        : null,
      carpool: schedule.carpool
        ? {
            id: schedule.carpool.id,
            name: schedule.carpool.name,
          }
        : null,
    }))

    return { schedules: mappedSchedules }
  },
  medication: async (viewer) => {
    const medications = await getMedications(viewer.familyId, viewer.memberId)
    const mappedMedications: MedicationWidgetItem[] = medications.map((medication: any) => ({
      id: medication.id,
      medicationName:
        medication.medicationName ?? medication.medication_name ?? 'Unknown medication',
      activeIngredient:
        medication.activeIngredient ?? medication.active_ingredient ?? null,
      minIntervalHours:
        medication.minIntervalHours ?? medication.min_interval_hours ?? 0,
      maxDosesPerDay:
        medication.maxDosesPerDay ?? medication.max_doses_per_day ?? null,
      lastDoseAt: medication.lastDoseAt ?? medication.last_dose_at ?? null,
      nextDoseAvailableAt:
        medication.nextDoseAvailableAt ?? medication.next_dose_available_at ?? null,
      notifyWhenReady:
        medication.notifyWhenReady ?? medication.notify_when_ready ?? false,
      member: {
        id: medication.member?.id ?? medication.member_id,
        name: medication.member?.name ?? 'Unknown member',
      },
      doses: medication.doses ?? [],
    }))

    return { medications: mappedMedications }
  },
  maintenance: async (viewer) => {
    const items = await getUpcomingMaintenanceItems(viewer.familyId, 7)
    const mappedItems: MaintenanceWidgetItem[] = items.map((item: any) => ({
      id: item.id,
      title: item.name,
      description: item.description,
      category: item.category,
      nextDueAt: item.next_due_at,
      lastCompletedAt: item.last_completed_at,
      intervalDays: null,
      assignedTo: null,
    }))

    return { items: mappedItems }
  },
  inventory: async (viewer) => {
    const items = await getLowStockItems(viewer.familyId)
    const mappedItems: InventoryWidgetItem[] = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      currentQuantity: item.current_quantity,
      lowStockThreshold: item.low_stock_threshold,
      unit: item.unit,
      location: item.location,
    }))

    return { items: mappedItems }
  },
  weather: async (viewer) =>
    getWeatherForFamily(viewer.familyId, {
      useServiceClient: viewer.useServiceClient,
    }),
}

async function safeWidget<K extends DashboardWidgetKind>(
  kind: K,
  viewer: DashboardWidgetViewerContext
): Promise<{
  result: DashboardWidgetResult<K>
  issue?: DashboardWidgetIssue
}> {
  try {
    const data = await WIDGET_LOADERS[kind](viewer)
    return {
      result: {
        kind,
        state: 'ready',
        data,
      },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load widget data'

    return {
      result: {
        kind,
        state: 'unavailable',
        error: message,
      },
      issue: {
        kind,
        message,
      },
    }
  }
}

export async function buildDashboardWidgetCollection(
  viewer: DashboardWidgetViewerContext,
  requested: DashboardWidgetKind[]
): Promise<DashboardWidgetCollection> {
  const results = await Promise.all(
    requested.map(async (kind) => {
      const { result, issue } = await safeWidget(kind, viewer)
      return { kind, result, issue }
    })
  )

  const widgets: DashboardWidgetCollection['widgets'] = {}
  for (const entry of results) {
    ;(widgets as Record<string, DashboardWidgetResult>)[entry.kind] = entry.result
  }

  const issues = results.flatMap((entry) => (entry.issue ? [entry.issue] : []))

  return {
    capturedAt: new Date().toISOString(),
    partial: issues.length > 0,
    requested,
    widgets,
    issues,
  }
}
