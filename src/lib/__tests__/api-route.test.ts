import { describe, expect, it, jest } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { routeHandler, readJsonBody } from '@/lib/api-route'
import { LifecycleError } from '@/lib/data/lifecycle-core'
import { logger } from '@/lib/logger'

describe('routeHandler', () => {
  it('returns handler JSON result with default 200 status', async () => {
    const route = routeHandler(async () => ({ ok: true }))
    const response = await route() as NextResponse
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('applies successStatus when provided', async () => {
    const route = routeHandler(async () => ({ created: true }), { successStatus: 201 })
    const response = await route() as NextResponse
    expect(response.status).toBe(201)
  })

  it('passes through a NextResponse returned by the handler unchanged', async () => {
    const nextResponse = NextResponse.json({ custom: true }, { status: 202 })
    const route = routeHandler(async () => nextResponse)
    const response = await route() as NextResponse
    expect(response).toBe(nextResponse)
    expect(response.status).toBe(202)
  })

  it('maps a LifecycleError to { error, details } with its status', async () => {
    const route = routeHandler(async () => {
      throw new LifecycleError(404, 'Not found', { id: 'x' })
    })
    const response = await route() as NextResponse
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found', details: { id: 'x' } })
  })

  it('omits details when the LifecycleError has none', async () => {
    const route = routeHandler(async () => {
      throw new LifecycleError(403, 'Forbidden')
    })
    const response = await route() as NextResponse
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Forbidden' })
  })

  it('returns 500 with errorMessage for unknown errors', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    try {
      const route = routeHandler(async () => {
        throw new Error('boom')
      }, { errorMessage: 'Something broke' })
      const response = await route() as NextResponse
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Something broke' })
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('defaults errorMessage to internal server error', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    try {
      const route = routeHandler(async () => {
        throw new Error('boom')
      })
      const response = await route() as NextResponse
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Internal server error' })
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('injects a default request and context when not provided', async () => {
    let capturedRequest: NextRequest | undefined
    let capturedContext: unknown
    const route = routeHandler(async (request, context) => {
      capturedRequest = request
      capturedContext = context
      return { ok: true }
    })
    await route()
    expect(capturedRequest).toBeInstanceOf(NextRequest)
    expect(capturedRequest!.url).toBe('http://localhost/')
    expect(capturedContext).toHaveProperty('params')
    await expect((capturedContext as { params: Promise<unknown> }).params).resolves.toEqual({})
  })
})

describe('readJsonBody', () => {
  it('parses a valid JSON body', async () => {
    const request = new NextRequest('http://localhost/', {
      method: 'POST',
      body: JSON.stringify({ name: 'rover' }),
    })
    const body = await readJsonBody<{ name: string }>(request)
    expect(body).toEqual({ name: 'rover' })
  })

  it('throws a 400 LifecycleError for malformed JSON', async () => {
    const request = new NextRequest('http://localhost/', {
      method: 'POST',
      body: '{this is not json',
    })
    await expect(readJsonBody(request)).rejects.toMatchObject({
      status: 400,
      message: 'Invalid JSON',
    })
  })
})