import { requireModule } from '@/lib/module-protection';

export default async function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule('LEADERBOARD');
  return <>{children}</>;
}
