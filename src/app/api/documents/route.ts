import { NextRequest, NextResponse } from 'next/server';
import {
  createDocumentLifecycleDocument,
  getDocumentLifecycleDocuments,
} from '@/lib/data/document-lifecycle';
import { readJsonBody, routeHandler } from '@/lib/api-route';

export const GET = routeHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const documents = await getDocumentLifecycleDocuments({
    category: searchParams.get('category'),
  });
  return { documents };
}, { errorMessage: 'Failed to fetch documents' });

export const POST = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<Record<string, unknown>>(request);
  const document = await createDocumentLifecycleDocument(body);
  return NextResponse.json(
    {
      success: true,
      document,
      message: 'Document uploaded successfully',
    },
    { status: 201 }
  );
}, { errorMessage: 'Failed to create document' });