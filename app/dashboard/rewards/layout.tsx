import { requireModule } from '@/lib/module-protection';

export default async function RewardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('CREDITS');
  return <>{children}</>;
}
