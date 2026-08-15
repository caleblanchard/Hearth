import type { DocumentLifecycleRecord } from '@/types/document-lifecycle'
import { apiRequest } from '@/lib/api-client'

export async function fetchDocumentLifecycleDocumentsClient(category?: string) {
  const suffix = category && category !== 'all' ? `?category=${category}` : ''
  const data = await apiRequest<{ documents: DocumentLifecycleRecord[] }>(
    `/api/documents${suffix}`
  )
  return data.documents
}

export async function fetchDocumentLifecycleExpiringDocumentsClient(days = 90) {
  const data = await apiRequest<{ documents: DocumentLifecycleRecord[] }>(
    `/api/documents/expiring?days=${days}`
  )
  return data.documents
}

export async function createDocumentLifecycleDocumentClient(input: Record<string, unknown>) {
  const data = await apiRequest<{ success: true; document: DocumentLifecycleRecord }>(
    '/api/documents',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )
  return data.document
}
