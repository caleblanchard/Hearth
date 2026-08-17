import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { getWeatherForFamily } from '@/lib/data/weather'
import {
  createMockSupabaseClient,
  mockSupabaseRpc,
  type MockSupabaseClient,
} from '@/lib/test-utils/supabase-mock'

const currentWeather = {
  main: { temp: 72.5, feels_like: 71, temp_min: 65, temp_max: 75 },
  weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
}

const forecastList = (times: Array<{ hoursFromNow: number; temp: number; tempMin: number; tempMax: number }>) =>
  times.map((t, i) => {
    const d = new Date(Date.now() + t.hoursFromNow * 3600 * 1000)
    d.setHours(12, 0, 0, 0)
    return {
      dt: Math.floor(d.getTime() / 1000),
      main: { temp: t.temp, temp_min: t.tempMin, temp_max: t.tempMax },
      weather: [{ main: 'Rain', description: 'light rain', icon: '10d' }],
    }
  })

const atNoonLocal = (daysFromNow: number): number => {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(12, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('getWeatherForFamily', () => {
  let client: MockSupabaseClient
  let fetchMock: jest.Mock<any>

  beforeEach(() => {
    client = createMockSupabaseClient()
    jest.restoreAllMocks()
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('fetches the family weather config via the get_family_weather_config RPC', async () => {
    mockSupabaseRpc(client, 'get_family_weather_config', [
      {
        id: 'family-1',
        name: 'Smith Family',
        location: 'Denver',
        latitude: 39.7392,
        longitude: -104.9903,
      },
    ])
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(currentWeather) })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            list: [
              ...forecastList([{ hoursFromNow: 2, temp: 72, tempMin: 65, tempMax: 75 }]),
              {
                dt: atNoonLocal(1),
                main: { temp: 60, temp_min: 50, temp_max: 62 },
                weather: [{ main: 'Rain', description: 'light rain', icon: '10d' }],
              },
              {
                dt: atNoonLocal(2),
                main: { temp: 58, temp_min: 48, temp_max: 60 },
                weather: [{ main: 'Rain', description: 'light rain', icon: '10d' }],
              },
            ],
          }),
      })

    const result = await getWeatherForFamily('family-1', { client: client as never })

    expect(client.rpc).toHaveBeenCalledWith('get_family_weather_config', { p_family_id: 'family-1' })
    expect(client.from).not.toHaveBeenCalledWith(
      'families',
      expect.anything()
    )
    expect(client.from).not.toHaveBeenCalled()
    expect(result.location).toBe('Denver')
    expect(result.current.temp).toBe(73)
    expect(result.today.high).toBe(72)
    expect(result.forecast).toHaveLength(2)
  })

  it('throws Family location not configured when the family has no coordinates', async () => {
    mockSupabaseRpc(client, 'get_family_weather_config', [
      {
        id: 'family-1',
        name: 'Smith Family',
        location: 'Denver',
        latitude: null,
        longitude: null,
      },
    ])

    await expect(getWeatherForFamily('family-1', { client: client as never })).rejects.toThrow(
      'Family location not configured'
    )
  })

  it('throws Family location not configured when RLS/ownership yields no row', async () => {
    mockSupabaseRpc(client, 'get_family_weather_config', [])

    await expect(getWeatherForFamily('family-1', { client: client as never })).rejects.toThrow(
      'Family location not configured'
    )
  })

  it('throws No weather data available when the forecast list is empty', async () => {
    mockSupabaseRpc(client, 'get_family_weather_config', [
      {
        id: 'family-1',
        name: 'Smith Family',
        location: 'Denver',
        latitude: 39.7392,
        longitude: -104.9903,
      },
    ])
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(currentWeather) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ list: [] }) })

    await expect(getWeatherForFamily('family-1', { client: client as never })).rejects.toThrow(
      'No weather data available'
    )
  })

  it('throws Family location not configured when the family row has empty latitude/longitude', async () => {
    mockSupabaseRpc(client, 'get_family_weather_config', [
      {
        id: 'family-1',
        name: 'Smith Family',
        location: 'Denver',
        latitude: 0,
        longitude: 0,
      },
    ])

    await expect(getWeatherForFamily('family-1', { client: client as never })).rejects.toThrow(
      'Family location not configured'
    )
    expect(client.rpc).toHaveBeenCalled()
  })
})