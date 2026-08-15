import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'
import type { WeatherWidgetData } from '@/types/dashboard-widget-collection'

export async function getWeatherForFamily(
  familyId: string,
  options: { useServiceClient?: boolean } = {}
): Promise<WeatherWidgetData> {
  const supabase = options.useServiceClient
    ? createServiceClient()
    : await createClient()

  const { data: family } = await supabase
    .from('families')
    .select('id, name, location, latitude, longitude')
    .eq('id', familyId)
    .single()

  if (!family || !family.latitude || !family.longitude) {
    throw new Error('Family location not configured')
  }

  const apiKey = process.env.WEATHER_API_KEY
  if (!apiKey) {
    throw new Error('Weather API not configured')
  }

  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${family.latitude}&lon=${family.longitude}&appid=${apiKey}&units=imperial`
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${family.latitude}&lon=${family.longitude}&appid=${apiKey}&units=imperial`

  const currentResponse = await fetch(currentUrl)
  if (!currentResponse.ok) {
    logger.error('Weather API error', { status: currentResponse.status })
    throw new Error('Failed to fetch weather data')
  }

  const forecastResponse = await fetch(forecastUrl)
  if (!forecastResponse.ok) {
    logger.error('Weather API error', { status: forecastResponse.status })
    throw new Error('Failed to fetch weather data')
  }

  const currentData = await currentResponse.json()
  const forecastData = await forecastResponse.json()
  const list = forecastData.list || []

  if (list.length === 0) {
    throw new Error('No weather data available')
  }

  const today = new Date().toDateString()
  const todayForecasts = list.filter((item: any) => {
    const itemDate = new Date(item.dt * 1000).toDateString()
    return itemDate === today
  })
  const todayTemps = todayForecasts.map((forecast: any) => forecast.main.temp)
  const todayHigh =
    todayTemps.length > 0
      ? Math.round(Math.max(...todayTemps))
      : Math.round(currentData.main.temp_max)
  const todayLow =
    todayTemps.length > 0
      ? Math.round(Math.min(...todayTemps))
      : Math.round(currentData.main.temp_min)

  const dailyForecasts: WeatherWidgetData['forecast'] = []
  const processedDates = new Set<string>()

  for (const item of list) {
    const itemDate = new Date(item.dt * 1000)
    const dateString = itemDate.toDateString()

    if (dateString === today || processedDates.has(dateString)) {
      continue
    }

    const hour = itemDate.getHours()
    if (hour >= 11 && hour <= 13) {
      dailyForecasts.push({
        date: itemDate.toISOString(),
        high: Math.round(item.main.temp_max),
        low: Math.round(item.main.temp_min),
        condition: item.weather[0].main,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
      })
      processedDates.add(dateString)

      if (dailyForecasts.length >= 3) {
        break
      }
    }
  }

  return {
    location: family.location ?? 'Unknown location',
    current: {
      temp: Math.round(currentData.main.temp),
      feelsLike: Math.round(currentData.main.feels_like),
      condition: currentData.weather[0].main,
      description: currentData.weather[0].description,
      icon: currentData.weather[0].icon,
    },
    today: {
      high: todayHigh,
      low: todayLow,
    },
    forecast: dailyForecasts,
  }
}
