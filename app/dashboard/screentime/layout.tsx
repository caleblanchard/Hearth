import { requireModule } from '@/lib/module-protection';

export default async function ScreenTimeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('SCREEN_TIME');
  return <>{children}</>;
}
