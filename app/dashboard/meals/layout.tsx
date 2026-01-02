import { requireModule } from '@/lib/module-protection';

export default async function MealsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('MEAL_PLANNING');
  return <>{children}</>;
}
