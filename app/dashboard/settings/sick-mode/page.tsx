import SickModeSettings from '@/components/sick-mode/SickModeSettings';

export default function SickModeSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Sick Mode Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure how Hearth adjusts when a family member is sick
        </p>
      </div>
      
      <SickModeSettings />
    </div>
  );
}
