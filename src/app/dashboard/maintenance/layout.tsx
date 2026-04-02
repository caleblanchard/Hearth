import { requireModule } from '@/lib/module-protection';

export default async function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('MAINTENANCE');
  return <>{children}</>;
}
