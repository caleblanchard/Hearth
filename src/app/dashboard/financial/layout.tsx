import { requireModule } from '@/lib/module-protection';

export default async function FinancialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('FINANCIAL');
  return <>{children}</>;
}
