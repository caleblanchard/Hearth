import { requireModule } from '@/lib/module-protection';

export default async function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('DOCUMENTS');
  return <>{children}</>;
}
