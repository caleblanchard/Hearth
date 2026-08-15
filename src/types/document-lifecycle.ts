export interface DocumentLifecycleUploaderSummary {
  id: string
  name: string
}

export interface DocumentLifecycleRecord {
  id: string
  name: string
  category: string
  fileSize: number
  mimeType: string
  documentNumber: string | null
  issuedDate: string | null
  expiresAt: string | null
  tags: string[]
  notes: string | null
  createdAt: string | null
  familyId?: string
  uploadedBy?: string | null
  accessList?: string[]
  uploader?: DocumentLifecycleUploaderSummary
}

