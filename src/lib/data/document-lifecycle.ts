import {
  writeAuditLog,
  LifecycleError,
  pickKey,
  requireParentContext,
  requireViewerContext,
} from '@/lib/data/lifecycle-core'
import {
  createDocument,
  deleteDocument,
  getDocument,
  getDocuments,
  getExpiringDocuments,
  updateDocument,
} from '@/lib/data/documents'
import type { DocumentLifecycleRecord } from '@/types/document-lifecycle'

const VALID_CATEGORIES = [
  'IDENTITY',
  'MEDICAL',
  'FINANCIAL',
  'HOUSEHOLD',
  'EDUCATION',
  'LEGAL',
  'PETS',
  'OTHER',
] as const

function normalizeDocument(document: Record<string, unknown>): DocumentLifecycleRecord {
  const rawAccessList = pickKey(document, 'accessList', 'access_list')
  const accessList = Array.isArray(rawAccessList) ? (rawAccessList as string[]) : []

  return {
    id: String(document.id),
    name: String(document.name ?? ''),
    category: String(document.category ?? ''),
    fileSize: Number(pickKey(document, 'fileSize', 'file_size') ?? 0),
    mimeType: String(pickKey(document, 'mimeType', 'mime_type') ?? ''),
    documentNumber:
      (pickKey(document, 'documentNumber', 'document_number') as string | null | undefined) ?? null,
    issuedDate:
      (pickKey(document, 'issuedDate', 'issued_date') as string | null | undefined) ?? null,
    expiresAt:
      (pickKey(document, 'expiresAt', 'expires_at') as string | null | undefined) ?? null,
    tags: Array.isArray(document.tags) ? (document.tags as string[]) : [],
    notes: (document.notes as string | null | undefined) ?? null,
    createdAt: (pickKey(document, 'createdAt', 'created_at') as string | null | undefined) ?? null,
    familyId: String(pickKey(document, 'familyId', 'family_id') ?? ''),
    uploadedBy:
      (pickKey(document, 'uploadedBy', 'uploaded_by') as string | null | undefined) ?? null,
    accessList,
    uploader: document.uploader as DocumentLifecycleRecord['uploader'],
  }
}

export async function getDocumentLifecycleDocuments(query: { category?: string | null }) {
  const { familyId } = await requireViewerContext()
  const category = query.category
  const documents = await getDocuments(familyId, category ? { category } : undefined)
  return documents.map((document) => normalizeDocument(document as Record<string, unknown>))
}

export async function createDocumentLifecycleDocument(body: Record<string, unknown>) {
  const { familyId, memberId } = await requireViewerContext()
  const { name, category, fileUrl, fileSize, mimeType, documentNumber, issuedDate, expiresAt, tags, notes, accessList } =
    body

  if (!name || !category || !fileUrl || !fileSize || !mimeType) {
    throw new LifecycleError(
      400,
      'Name, category, fileUrl, fileSize, and mimeType are required'
    )
  }

  if (!VALID_CATEGORIES.includes(String(category) as (typeof VALID_CATEGORIES)[number])) {
    throw new LifecycleError(
      400,
      `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
    )
  }

  const resolvedAccessList =
    Array.isArray(accessList) && accessList.length > 0 ? accessList : [memberId]

  const document = await createDocument({
    family_id: familyId,
    name: String(name),
    category: String(category) as (typeof VALID_CATEGORIES)[number],
    file_url: String(fileUrl),
    file_size: Number(fileSize),
    mime_type: String(mimeType),
    document_number: typeof documentNumber === 'string' ? documentNumber : null,
    issued_date: typeof issuedDate === 'string' ? new Date(issuedDate).toISOString() : null,
    expires_at: typeof expiresAt === 'string' ? new Date(expiresAt).toISOString() : null,
    tags: Array.isArray(tags) ? tags : null,
    notes: typeof notes === 'string' ? notes : null,
    uploaded_by: memberId,
    access_list: resolvedAccessList,
  })

  await writeAuditLog({
    familyId,
    memberId,
    action: 'DOCUMENT_UPLOADED',
    entityType: 'DOCUMENT',
    entityId: document.id,
    metadata: { documentId: document.id, name: String(name), category: String(category) },
  })

  return normalizeDocument(document as Record<string, unknown>)
}

export async function getDocumentLifecycleDocument(documentId: string) {
  const { familyId } = await requireViewerContext()
  const document = await getDocument(documentId)
  if (!document) {
    throw new LifecycleError(404, 'Document not found')
  }
  if ((document as { family_id?: string }).family_id !== familyId) {
    throw new LifecycleError(403, 'Access denied')
  }
  return normalizeDocument(document as Record<string, unknown>)
}

export async function updateDocumentLifecycleDocument(documentId: string, body: Record<string, unknown>) {
  const { familyId } = await requireParentContext('Only parents can update documents')

  const existing = await getDocument(documentId)
  if (!existing || (existing as { family_id?: string }).family_id !== familyId) {
    throw new LifecycleError(404, 'Document not found')
  }

  const document = await updateDocument(documentId, body)
  return normalizeDocument(document as Record<string, unknown>)
}

export async function deleteDocumentLifecycleDocument(documentId: string) {
  const { familyId } = await requireParentContext('Only parents can delete documents')

  const existing = await getDocument(documentId)
  if (!existing || (existing as { family_id?: string }).family_id !== familyId) {
    throw new LifecycleError(404, 'Document not found')
  }

  await deleteDocument(documentId)
}

export async function getDocumentLifecycleExpiringDocuments(query: { days?: string | null }) {
  const { familyId } = await requireViewerContext()
  const days = parseInt(query.days || '90', 10)
  const documents = await getExpiringDocuments(familyId, Number.isNaN(days) ? 90 : days)
  return documents.map((document) => normalizeDocument(document as Record<string, unknown>))
}
