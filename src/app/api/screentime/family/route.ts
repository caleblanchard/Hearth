import { routeHandler } from '@/lib/api-route';
import { getScreenTimeLifecycleFamilyOverview } from '@/lib/data/screen-time-lifecycle';

export const GET = routeHandler(async () => {
  const overview = await getScreenTimeLifecycleFamilyOverview();
  return { overview };
}, { errorMessage: 'Failed to get overview' });
