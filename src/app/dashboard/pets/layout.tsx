import { requireModule } from '@/lib/module-protection';

export default async function PetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('PETS');
  return <>{children}</>;
}
