import { requireModule } from '@/lib/module-protection';

export default async function ChoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('CHORES');
  return <>{children}</>;
}
