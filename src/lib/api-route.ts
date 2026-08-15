import { NextRequest, NextResponse } from 'next/server'
import { isLifecycleError, LifecycleError } from '@/lib/data/lifecycle-core'
import { logger } from '@/lib/logger'

export interface RouteContext {
  params: Promise<Record<string, string>>
}

type RouteHandler = (
  request: NextRequest,
  context: RouteContext
) => Promise<NextResponse | unknown> | NextResponse | unknown

function isNextResponse(value: unknown): value is NextResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status: unknown }).status === 'number' &&
    'headers' in value &&
    typeof (value as { headers: unknown }).headers === 'object'
  )
}

/**
 * Wrap a lifecycle API route with the uniform error mapping:
 * `LifecycleError` (any error carrying a numeric `status`) becomes the JSON
 * `{ error, details? }` response with that status; anything else is logged and
 * returned as a 500 with `options.errorMessage`.
 */
export function routeHandler(
  handler: RouteHandler,
  options: { errorMessage?: string; successStatus?: number } = {}
): (request?: NextRequest, context?: RouteContext) => Promise<NextResponse> {
  return async function route(
    request?: NextRequest,
    context?: RouteContext
  ): Promise<NextResponse> {
    try {
      const result = await handler(
        request ?? new NextRequest('http://localhost/'),
        context ?? { params: Promise.resolve({}) }
      )
      if (isNextResponse(result)) {
        return result
      }
      return NextResponse.json(result, options.successStatus ? { status: options.successStatus } : undefined)
    } catch (error) {
      if (isLifecycleError(error)) {
        return NextResponse.json(
          {
            error: error.message,
            ...(error.details !== undefined ? { details: error.details } : {}),
          },
          { status: error.status }
        )
      }

      logger.error('API error:', error)
      return NextResponse.json(
        { error: options.errorMessage ?? 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Read a JSON request body or throw a 400 `LifecycleError` on malformed JSON.
 */
export async function readJsonBody<T = Record<string, unknown>>(
  request: NextRequest
): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new LifecycleError(400, 'Invalid JSON')
  }
}