import { requireModule } from '@/lib/module-protection';

export default async function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('CALENDAR');
  return <>{children}</>;
}
