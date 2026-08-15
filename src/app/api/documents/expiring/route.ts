import { NextRequest } from 'next/server';
import { getDocumentLifecycleExpiringDocuments } from '@/lib/data/document-lifecycle';
import { routeHandler } from '@/lib/api-route';

export const dynamic = 'force-dynamic';

export const GET = routeHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const documents = await getDocumentLifecycleExpiringDocuments({
    days: searchParams.get('days'),
  });
  return { documents };
}, { errorMessage: 'Failed to fetch expiring documents' });