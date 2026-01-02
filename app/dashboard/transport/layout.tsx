import { requireModule } from '@/lib/module-protection';

export default async function TransportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('TRANSPORT');
  return <>{children}</>;
}
