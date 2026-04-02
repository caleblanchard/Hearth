import { useState, useEffect, useCallback } from 'react'

export interface KioskMember {
  id: string
  name: string
  role?: string
  avatarUrl?: string
}

const DEVICE_KEY = 'kioskDeviceSecret'
const CHILD_KEY = 'kioskChildToken'

interface KioskSessionState {
  deviceSecret: string | null
  childToken: string | null
  isLocked: boolean
  currentMember: KioskMember | null
  autoLockMinutes: number
  allowedModules: string[]
  lastActivityAt?: string
}

interface UseKioskSessionReturn extends KioskSessionState {
  activateDevice: (code: string, deviceId: string) => Promise<void>
  unlock: (member: KioskMember, pin: string) => Promise<void>
  logoutChild: () => Promise<void>
  clearDevice: () => void
  heartbeat: () => Promise<void>
}

export function useKioskSession(): UseKioskSessionReturn {
  const [state, setState] = useState<KioskSessionState>({
    deviceSecret: null,
    childToken: null,
    isLocked: true,
    currentMember: null,
    autoLockMinutes: 15,
    allowedModules: [],
  })

  useEffect(() => {
    const storedDevice = typeof window !== 'undefined' ? localStorage.getItem(DEVICE_KEY) : null
    const storedChild = typeof window !== 'undefined' ? localStorage.getItem(CHILD_KEY) : null
    setState((prev) => ({
      ...prev,
      deviceSecret: storedDevice,
      childToken: storedChild,
      isLocked: !storedChild,
    }))
  }, [])

  const clearDevice = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEVICE_KEY)
      localStorage.removeItem(CHILD_KEY)
    }
    setState({
      deviceSecret: null,
      childToken: null,
      isLocked: true,
      currentMember: null,
      autoLockMinutes: 15,
      allowedModules: [],
    })
  }, [])

  const activateDevice = useCallback(async (code: string, deviceId: string) => {
    const response = await fetch('/api/kiosk/activation/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceId }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to activate device')
    }
    const data = await response.json()
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEVICE_KEY, data.deviceSecret)
      document.cookie = `kiosk_device_secret=${data.deviceSecret}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
    }
    setState((prev) => ({
      ...prev,
      deviceSecret: data.deviceSecret,
      isLocked: true,
    }))
  }, [])

  const unlock = useCallback(
    async (member: KioskMember, pin: string) => {
      if (!state.deviceSecret) throw new Error('Device not activated')
      const response = await fetch('/api/kiosk/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kiosk-Device': state.deviceSecret,
        },
        body: JSON.stringify({ memberId: member.id, pin }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to unlock')
      }
      const data = await response.json()
      if (typeof window !== 'undefined') {
        localStorage.setItem(CHILD_KEY, data.token)
        document.cookie = `kiosk_child_token=${data.token}; path=/; max-age=900; samesite=lax`
      }
      setState((prev) => ({
        ...prev,
        childToken: data.token,
        isLocked: false,
        currentMember: member,
      }))
      // Redirect to full app
      if (typeof window !== 'undefined') {
        if (process.env.NODE_ENV === 'test') {
          ;(window as any).__KIOSK_REDIRECT__ = '/dashboard'
        } else {
          window.location.href = '/dashboard'
        }
      }
    },
    [state.deviceSecret]
  )

  const logoutChild = useCallback(async () => {
    if (!state.childToken) return
    await fetch('/api/kiosk/logout', {
      method: 'POST',
      headers: { 'X-Kiosk-Child': state.childToken },
    })
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CHILD_KEY)
      document.cookie = 'kiosk_child_token=; path=/; max-age=0; samesite=lax'
    }
    setState((prev) => ({
      ...prev,
      childToken: null,
      isLocked: true,
      currentMember: null,
    }))
    // After child logout, stay in kiosk and return to dashboard
    if (typeof window !== 'undefined') {
      window.location.href = '/kiosk';
    }
  }, [state.childToken])

  const heartbeat = useCallback(async () => {
    if (!state.childToken) return
    await fetch('/api/kiosk/session/heartbeat', {
      method: 'POST',
      headers: { 'X-Kiosk-Child': state.childToken },
    })
  }, [state.childToken])

  return {
    ...state,
    activateDevice,
    unlock,
    logoutChild,
    clearDevice,
    heartbeat,
  }
}
