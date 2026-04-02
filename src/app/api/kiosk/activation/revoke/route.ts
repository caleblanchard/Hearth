import { NextRequest, NextResponse } from 'next/server';
import { createClient, isParentInFamily } from '@/lib/supabase/server';
import { revokeDeviceSecret } from '@/lib/kiosk-auth';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { deviceSecretId, familyId } = body;
  if (!deviceSecretId || !familyId) {
    return NextResponse.json({ error: 'deviceSecretId and familyId required' }, { status: 400 });
  }

  const isParent = await isParentInFamily(familyId);
  if (!isParent)
    return NextResponse.json({ error: 'Only parents can revoke devices' }, { status: 403 });

  await revokeDeviceSecret(deviceSecretId);
  return NextResponse.json({ success: true });
}
