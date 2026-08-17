import { apiRequest } from '@/lib/api-client'
import { createLifecycleClient } from '@/lib/lifecycle-client'

jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  apiRequest: jest.fn(),
}))

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>

interface TestRecord {
  id: string
  name: string
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createLifecycleClient', () => {
  it('lists by unwrapping the configured list key', async () => {
    const client = createLifecycleClient<TestRecord>({
      basePath: '/api/widgets',
      itemKey: 'widget',
      listKey: 'widgets',
    })

    mockedApiRequest.mockResolvedValue({
      widgets: [{ id: 'w1', name: 'one' }],
    })

    const widgets = await client.list()

    expect(widgets).toEqual([{ id: 'w1', name: 'one' }])
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/widgets', { method: 'GET' })
  })

  it('lists with a query string when query params are provided', async () => {
    const client = createLifecycleClient<TestRecord>({
      basePath: '/api/widgets',
      itemKey: 'widget',
      listKey: 'widgets',
    })

    mockedApiRequest.mockResolvedValue({ widgets: [] })

    await client.list({ status: 'active', memberId: 'm-1', empty: null })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/api/widgets?status=active&memberId=m-1',
      { method: 'GET' }
    )
  })

  it('returns the whole envelope from list when no list key is configured', async () => {
    const client = createLifecycleClient<TestRecord>({
      basePath: '/api/widgets',
      itemKey: 'widget',
    })

    const envelope = { widgets: [{ id: 'w1', name: 'one' }], total: 1 }
    mockedApiRequest.mockResolvedValue(envelope)

    await expect(client.list()).resolves.toEqual(envelope)
  })

  it('gets by id and unwraps the item key', async () => {
    const client = createLifecycleClient<TestRecord>({
      basePath: '/api/widgets',
      itemKey: 'widget',
    })

    mockedApiRequest.mockResolvedValue({ widget: { id: 'w1', name: 'one' } })

    const widget = await client.get('w1')

    expect(widget).toEqual({ id: 'w1', name: 'one' })
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/widgets/w1', { method: 'GET' })
  })

  it('creates by POSTing a JSON body and unwraps the item key', async () => {
    const client = createLifecycleClient<TestRecord>({
      basePath: '/api/widgets',
      itemKey: 'widget',
    })

    mockedApiRequest.mockResolvedValue({ success: true, widget: { id: 'w1', name: 'one' } })

    const widget = await client.create({ name: 'one' })

    expect(widget).toEqual({ id: 'w1', name: 'one' })
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/widgets', {
      method: 'POST',
      body: JSON.stringify({ name: 'one' }),
    })
  })

  it('returns the whole envelope from create when no item key is configured', async () => {
    const client = createLifecycleClient<TestRecord>({
      basePath: '/api/widgets',
      listKey: 'widgets',
    })

    const envelope = { success: true, widget: { id: 'w1', name: 'one' }, message: 'done' }
    mockedApiRequest.mockResolvedValue(envelope)

    await expect(client.create({ name: 'one' })).resolves.toEqual(envelope)
  })

  it('updates with PATCH by default and unwraps the item key', async () => {
    const client = createLifecycleClient<TestRecord>({
      basePath: '/api/widgets',
      itemKey: 'widget',
    })

    mockedApiRequest.mockResolvedValue({ widget: { id: 'w1', name: 'two' } })

    const widget = await client.update('w1', { name: 'two' })

    expect(widget).toEqual({ id: 'w1', name: 'two' })
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/widgets/w1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'two' }),
    })
  })

  it('updates with PUT when configured', async () => {
    const client = createLifecycleClient<TestRecord>({
      basePath: '/api/widgets',
      itemKey: 'widget',
      updateMethod: 'PUT',
    })

    mockedApiRequest.mockResolvedValue({ widget: { id: 'w1', name: 'two' } })

    await client.update('w1', { name: 'two' })

    expect(mockedApiRequest).toHaveBeenCalledWith('/api/widgets/w1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'two' }),
    })
  })

  it('removes with DELETE and resolves void', async () => {
    const client = createLifecycleClient<TestRecord>({
      basePath: '/api/widgets',
      itemKey: 'widget',
    })

    mockedApiRequest.mockResolvedValue({ success: true })

    await expect(client.remove('w1')).resolves.toBeUndefined()
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/widgets/w1', { method: 'DELETE' })
  })

  it('omits the body for actions without a payload', async () => {
    const client = createLifecycleClient<TestRecord>({
      basePath: '/api/widgets',
      itemKey: 'widget',
    })

    mockedApiRequest.mockResolvedValue({ success: true })

    await client.action('/w1/toggle', 'PATCH')

    expect(mockedApiRequest).toHaveBeenCalledWith('/api/widgets/w1/toggle', { method: 'PATCH' })
  })

  it('actions POST a body and honour an explicit unwrap key', async () => {
    const client = createLifecycleClient<TestRecord>({
      basePath: '/api/widgets',
      itemKey: 'widget',
    })

    mockedApiRequest.mockResolvedValue({ widget: { id: 'w1', name: 'three' } })
    await client.action('/w1/update', 'POST', { name: 'three' })
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/widgets/w1/update', {
      method: 'POST',
      body: JSON.stringify({ name: 'three' }),
    })

    mockedApiRequest.mockResolvedValue({ templates: [{ id: 't1', name: 'tmpl' }] })
    const templates = await client.action<TestRecord[]>('/templates', 'GET', undefined, 'templates')
    expect(templates).toEqual([{ id: 't1', name: 'tmpl' }])
  })

  it('actions return the whole envelope by default and support GET with a query string', async () => {
    const client = createLifecycleClient<TestRecord>({
      basePath: '/api/widgets',
      itemKey: 'widget',
    })

    const envelope = { success: true, total: 2 }
    mockedApiRequest.mockResolvedValue(envelope)

    const result = await client.action('/w1/history', 'GET', undefined, undefined, {
      limit: 10,
      archived: null,
    })

    expect(result).toEqual(envelope)
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/widgets/w1/history?limit=10', {
      method: 'GET',
    })
  })
})
