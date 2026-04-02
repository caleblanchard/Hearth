import { Metadata } from 'next';
import KioskLayout from '@/components/kiosk/KioskLayout';
import KioskDashboard from '@/components/kiosk/KioskDashboard';

export const metadata: Metadata = {
  title: 'Family Kiosk | Household ERP',
  description: 'Family kiosk dashboard for quick access to household information',
};

export default async function KioskPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <KioskLayout>
        <KioskDashboard />
      </KioskLayout>
    </div>
  );
}
