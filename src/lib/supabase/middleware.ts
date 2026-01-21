import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from './service'
import { hashSecret } from '@/lib/kiosk-auth'

async function isKioskChild(request: NextRequest) {
  const token = request.headers.get('x-kiosk-child')
  if (!token) return false

  const supabase = await createServiceClient()
  const tokenHash = hashSecret(token)

  const { data } = await supabase
    .from('kiosk_child_sessions')
    .select('id,expires_at,ended_at')
    .eq('session_token_hash', tokenHash)
    .is('ended_at', null)
    .maybeSingle()

  if (!data) return false
  const expiresAt = new Date(data.expires_at)
  return expiresAt.getTime() > Date.now()
}

/**
 * Update the session in middleware
 * This ensures the user's session is kept fresh across requests
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // IMPORTANT: Use getUser() not getSession() for security
  // getUser() validates the token with Supabase Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const kioskChild = user ? false : await isKioskChild(request)

  // Protected routes - redirect to signin if not authenticated or kiosk
  if (!user && !kioskChild && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Redirect authenticated users (including kiosk child) away from auth pages
  if ((user || kioskChild) && request.nextUrl.pathname.startsWith('/auth/signin')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If kiosk child, attach a header so downstream RSC routes can read the family from cookies/localStorage via FetchInterceptor
  if (kioskChild) {
    response.headers.set('x-kiosk-child', request.headers.get('x-kiosk-child') || '')
    const familyId = request.headers.get('x-active-family-id')
    if (familyId) response.headers.set('x-active-family-id', familyId)
  }

  return response
}
