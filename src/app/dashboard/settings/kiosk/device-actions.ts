import { headers } from 'next/headers'

export async function revokeDevice(deviceId: string) {
  await fetch('/api/kiosk/activation/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  })
}
