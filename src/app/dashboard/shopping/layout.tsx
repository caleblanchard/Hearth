import { requireModule } from '@/lib/module-protection';

export default async function ShoppingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('SHOPPING');
  return <>{children}</>;
}
