import { requireModule } from '@/lib/module-protection';

export default async function CommunicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('COMMUNICATION');
  return <>{children}</>;
}
