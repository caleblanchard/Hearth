import { describe, it, expect } from '@jest/globals'
import {
  normalizeTransportSchedule,
  normalizeMedicationWidgetItem,
  normalizeMaintenanceWidgetItem,
  normalizeInventoryWidgetItem,
} from '@/lib/data/dashboard-widget-collection'

describe('normalizeTransportSchedule', () => {
  it('maps a row with nested member/location into a TransportSchedule', () => {
    const result = normalizeTransportSchedule({
      id: 'sched-1',
      time: '08:30',
      type: 'school',
      member: { id: 'member-1', name: 'Alex' },
      location: { id: 'loc-1', name: 'Lincoln Middle', address: '100 Main St' },
      driver: { id: 'd-1', name: 'Mom', phone: '555', relationship: 'Parent' },
      carpool: { id: 'c-1', name: 'Neighbors' },
    })

    expect(result).toEqual({
      id: 'sched-1',
      time: '08:30',
      type: 'school',
      member: { id: 'member-1', name: 'Alex' },
      location: {
        id: 'loc-1',
        name: 'Lincoln Middle',
        address: '100 Main St',
      },
      driver: { id: 'd-1', name: 'Mom', phone: '555', relationship: 'Parent' },
      carpool: { id: 'c-1', name: 'Neighbors' },
    })
  })

  it('falls back to flattened snake_case fields and nulls', () => {
    const result = normalizeTransportSchedule({
      id: 'sched-2',
      time: '15:00',
      type: 'sports',
      member_id: 'member-2',
      location_id: 'loc-2',
    })

    expect(result).toEqual({
      id: 'sched-2',
      time: '15:00',
      type: 'sports',
      member: { id: 'member-2', name: 'Unknown member' },
      location: {
        id: 'loc-2',
        name: 'Unknown location',
        address: '',
      },
      driver: null,
      carpool: null,
    })
  })
})

describe('normalizeMedicationWidgetItem', () => {
  it('maps a camelCase aliased row into a MedicationWidgetItem', () => {
    const result = normalizeMedicationWidgetItem({
      id: 'med-1',
      medicationName: 'Amoxicillin',
      activeIngredient: 'amox',
      minIntervalHours: 8,
      maxDosesPerDay: 3,
      lastDoseAt: '2026-01-01T08:00:00.000Z',
      nextDoseAvailableAt: '2026-01-01T16:00:00.000Z',
      notifyWhenReady: true,
      member: { id: 'member-1', name: 'Alex' },
      doses: [{ id: 'dose-1' }],
    })

    expect(result).toEqual({
      id: 'med-1',
      medicationName: 'Amoxicillin',
      activeIngredient: 'amox',
      minIntervalHours: 8,
      maxDosesPerDay: 3,
      lastDoseAt: '2026-01-01T08:00:00.000Z',
      nextDoseAvailableAt: '2026-01-01T16:00:00.000Z',
      notifyWhenReady: true,
      member: { id: 'member-1', name: 'Alex' },
      doses: [{ id: 'dose-1' }],
    })
  })

  it('falls back to defaults when fields are missing', () => {
    const result = normalizeMedicationWidgetItem({
      id: 'med-2',
      medication_name: 'Ibuprofen',
      min_interval_hours: 6,
      member_id: 'member-2',
    })

    expect(result).toEqual({
      id: 'med-2',
      medicationName: 'Ibuprofen',
      activeIngredient: null,
      minIntervalHours: 6,
      maxDosesPerDay: null,
      lastDoseAt: null,
      nextDoseAvailableAt: null,
      notifyWhenReady: false,
      member: { id: 'member-2', name: 'Unknown member' },
      doses: [],
    })
  })
})

describe('normalizeMaintenanceWidgetItem', () => {
  it('maps a maintenance row into a MaintenanceWidgetItem', () => {
    const result = normalizeMaintenanceWidgetItem({
      id: 'maint-1',
      name: 'Replace air filter',
      description: 'HVAC filter',
      category: 'HVAC',
      next_due_at: '2026-02-01T00:00:00.000Z',
      last_completed_at: '2025-12-01T00:00:00.000Z',
    })

    expect(result).toEqual({
      id: 'maint-1',
      title: 'Replace air filter',
      description: 'HVAC filter',
      category: 'HVAC',
      nextDueAt: '2026-02-01T00:00:00.000Z',
      lastCompletedAt: '2025-12-01T00:00:00.000Z',
      intervalDays: null,
      assignedTo: null,
    })
  })
})

describe('normalizeInventoryWidgetItem', () => {
  it('maps an inventory row into an InventoryWidgetItem', () => {
    const result = normalizeInventoryWidgetItem({
      id: 'inv-1',
      name: 'Milk',
      category: 'Dairy',
      current_quantity: 1,
      low_stock_threshold: 2,
      unit: 'gal',
      location: 'Fridge',
    })

    expect(result).toEqual({
      id: 'inv-1',
      name: 'Milk',
      category: 'Dairy',
      currentQuantity: 1,
      lowStockThreshold: 2,
      unit: 'gal',
      location: 'Fridge',
    })
  })
})
