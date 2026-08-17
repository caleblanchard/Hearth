import { createLifecycleClient } from '@/lib/lifecycle-client'
import type {
  CreateDocumentLifecycleInput,
  DocumentLifecycleRecord,
} from '@/types/document-lifecycle'

const documentsClient = createLifecycleClient<DocumentLifecycleRecord>({
  basePath: '/api/documents',
  itemKey: 'document',
  listKey: 'documents',
})

export function fetchDocumentLifecycleDocumentsClient(
  category?: string,
): Promise<DocumentLifecycleRecord[]> {
  return documentsClient.list(category && category !== 'all' ? { category } : undefined)
}

export function fetchDocumentLifecycleExpiringDocumentsClient(
  days = 90,
): Promise<DocumentLifecycleRecord[]> {
  return documentsClient.action<DocumentLifecycleRecord[]>('/expiring', 'GET', undefined, 'documents', {
    days,
  })
}

export function createDocumentLifecycleDocumentClient(
  input: CreateDocumentLifecycleInput,
): Promise<DocumentLifecycleRecord> {
  return documentsClient.create(input)
}
