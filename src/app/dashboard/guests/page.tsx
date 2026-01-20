import GuestManagement from './GuestManagement';

export default function GuestsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Guest Access
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create temporary access invites for family helpers like babysitters, grandparents, or caregivers
        </p>
      </div>

      <GuestManagement />
    </div>
  );
}
