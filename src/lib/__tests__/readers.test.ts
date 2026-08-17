import { describe, it, expect } from '@jest/globals'
import { pickDefined } from '@/lib/readers'

describe('pickDefined', () => {
  it('returns an object with the key set to the value when defined', () => {
    expect(pickDefined('name', 'Rivers')).toEqual({ name: 'Rivers' })
  })

  it('returns an empty object when the value is undefined', () => {
    expect(pickDefined('name', undefined)).toEqual({})
  })

  it('treats falsy-but-defined values as present', () => {
    expect(pickDefined('is_enabled', false)).toEqual({ is_enabled: false })
    expect(pickDefined('temperature_threshold', 0)).toEqual({ temperature_threshold: 0 })
  })

  it('composes via object spread to build patch payloads', () => {
    const updates = { name: 'Smith Family', timezone: undefined }
    const patch = {
      ...pickDefined('name', updates.name),
      ...pickDefined('timezone', updates.timezone),
    }
    expect(patch).toEqual({ name: 'Smith Family' })
  })

  it('composes via Object.assign to build patch payloads', () => {
    const updates = { latitude: 39.7, longitude: undefined }
    const patch = Object.assign(
      {},
      pickDefined('latitude', updates.latitude),
      pickDefined('longitude', updates.longitude)
    )
    expect(patch).toEqual({ latitude: 39.7 })
  })

  it('keeps the key as a literal type', () => {
    const result = pickDefined('auto_lock_minutes', 30)
    expect(result.auto_lock_minutes).toBe(30)
  })
})
