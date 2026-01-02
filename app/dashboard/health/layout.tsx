import { requireModule } from '@/lib/module-protection';

export default async function HealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if Health module is enabled, return 404 if not
  await requireModule('HEALTH');

  return <>{children}</>;
}
