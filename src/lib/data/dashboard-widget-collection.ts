import {
  pickKey,
  readBoolean,
  readNullableNumber,
  readNullableString,
  readNumber,
  readObject,
  readString,
} from '@/lib/readers'
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
}

export function normalizeTransportSchedule(
  schedule: Record<string, unknown>
): TransportSchedule {
  const member = readObject(schedule.member)
  const location = readObject(schedule.location)
  const driver = readObject(schedule.driver)
  const carpool = readObject(schedule.carpool)

  return {
    id: readString(schedule.id),
    time: readString(schedule.time),
    type: readString(schedule.type),
    member: {
      id: readString(member.id ?? pickKey(schedule, 'memberId', 'member_id')),
      name: readString(member.name, 'Unknown member'),
    },
    location: {
      id: readString(
        location.id ?? pickKey(schedule, 'locationId', 'location_id'),
        'unknown-location'
      ),
      name: readString(location.name, 'Unknown location'),
      address: readString(location.address),
    },
    driver: driver && Object.keys(driver).length > 0
      ? {
          id: readString(driver.id),
          name: readString(driver.name),
          phone: readString(driver.phone),
          relationship: readString(driver.relationship),
        }
      : null,
    carpool: carpool && Object.keys(carpool).length > 0
      ? {
          id: readString(carpool.id),
          name: readString(carpool.name),
        }
      : null,
  }
}

export function normalizeMedicationWidgetItem(
  medication: Record<string, unknown>
): MedicationWidgetItem {
  const member = readObject(medication.member)

  return {
    id: readString(medication.id),
    medicationName: readString(
      pickKey(medication, 'medicationName', 'medication_name'),
      'Unknown medication'
    ),
    activeIngredient: readString(
      pickKey(medication, 'activeIngredient', 'active_ingredient')
    ) || null,
    minIntervalHours: readNumber(
      pickKey(medication, 'minIntervalHours', 'min_interval_hours')
    ),
    maxDosesPerDay: readNullableNumber(
      pickKey(medication, 'maxDosesPerDay', 'max_doses_per_day')
    ),
    lastDoseAt: readNullableString(
      pickKey(medication, 'lastDoseAt', 'last_dose_at')
    ),
    nextDoseAvailableAt: readNullableString(
      pickKey(medication, 'nextDoseAvailableAt', 'next_dose_available_at')
    ),
    notifyWhenReady: readBoolean(
      pickKey(medication, 'notifyWhenReady', 'notify_when_ready')
    ),
    member: {
      id: readString(member.id ?? pickKey(medication, 'memberId', 'member_id')),
      name: readString(member.name, 'Unknown member'),
    },
    doses: Array.isArray(medication.doses) ? medication.doses : [],
  }
}

export function normalizeMaintenanceWidgetItem(
  item: Record<string, unknown>
): MaintenanceWidgetItem {
  return {
    id: readString(item.id),
    title: readString(item.name),
    description: readString(item.description) || null,
    category: readString(item.category),
    nextDueAt: readString(item.next_due_at) || null,
    lastCompletedAt: readString(item.last_completed_at) || null,
    intervalDays: null,
    assignedTo: null,
  }
}

export function normalizeInventoryWidgetItem(
  item: Record<string, unknown>
): InventoryWidgetItem {
  return {
    id: readString(item.id),
    name: readString(item.name),
    category: readString(item.category),
    currentQuantity: readNumber(item.current_quantity),
    lowStockThreshold: readNumber(item.low_stock_threshold),
    unit: readString(item.unit) || null,
    location: readString(item.location) || null,
  }
}

type DashboardWidgetLoader<K extends DashboardWidgetKind = DashboardWidgetKind> = (
  viewer: DashboardWidgetViewerContext
) => Promise<DashboardWidgetDataMap[K]>

const WIDGET_LOADERS: {
  [K in DashboardWidgetKind]: DashboardWidgetLoader<K>
} = {
  transport: async (viewer) => {
    const schedules = await getTodaysTransportSchedules(viewer.familyId, viewer.memberId)
    const mappedSchedules: TransportSchedule[] = schedules.map((schedule) =>
      normalizeTransportSchedule(schedule as unknown as Record<string, unknown>)
    )

    return { schedules: mappedSchedules }
  },
  medication: async (viewer) => {
    const medications = await getMedications(viewer.familyId, viewer.memberId)
    const mappedMedications: MedicationWidgetItem[] = medications.map((medication) =>
      normalizeMedicationWidgetItem(medication as unknown as Record<string, unknown>)
    )

    return { medications: mappedMedications }
  },
  maintenance: async (viewer) => {
    const items = await getUpcomingMaintenanceItems(viewer.familyId, 7)
    const mappedItems: MaintenanceWidgetItem[] = items.map((item) =>
      normalizeMaintenanceWidgetItem(item as unknown as Record<string, unknown>)
    )

    return { items: mappedItems }
  },
  inventory: async (viewer) => {
    const items = await getLowStockItems(viewer.familyId)
    const mappedItems: InventoryWidgetItem[] = items.map((item) =>
      normalizeInventoryWidgetItem(item as unknown as Record<string, unknown>)
    )

    return { items: mappedItems }
  },
  weather: async (viewer) => getWeatherForFamily(viewer.familyId),
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
