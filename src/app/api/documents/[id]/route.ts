import { NextRequest, NextResponse } from 'next/server';
import {
  deleteDocumentLifecycleDocument,
  getDocumentLifecycleDocument,
  updateDocumentLifecycleDocument,
} from '@/lib/data/document-lifecycle';
import { readJsonBody, routeHandler } from '@/lib/api-route';
import type { RouteContext } from '@/lib/api-route';

export const GET = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    const document = await getDocumentLifecycleDocument(id);
    return { document };
  },
  { errorMessage: 'Failed to fetch document' }
);

export const PATCH = routeHandler(
  async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    const body = await readJsonBody<Record<string, unknown>>(request);
    const document = await updateDocumentLifecycleDocument(id, body);
    return {
      success: true,
      document,
      message: 'Document updated successfully',
    };
  },
  { errorMessage: 'Failed to update document' }
);

export const DELETE = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    await deleteDocumentLifecycleDocument(id);
    return {
      success: true,
      message: 'Document deleted successfully',
    };
  },
  { errorMessage: 'Failed to delete document' }
);