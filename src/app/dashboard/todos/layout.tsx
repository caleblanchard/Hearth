import { requireModule } from '@/lib/module-protection';

export default async function TodosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('TODOS');
  return <>{children}</>;
}
