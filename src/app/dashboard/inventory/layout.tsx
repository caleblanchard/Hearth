import { requireModule } from '@/lib/module-protection';

export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('INVENTORY');
  return <>{children}</>;
}
