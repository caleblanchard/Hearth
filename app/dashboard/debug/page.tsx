'use client';

import { useEffect, useState } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';

export default function DebugPage() {
  const { user, loading } = useSupabaseSession();
  const [familyData, setFamilyData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchFamily = async () => {
      try {
        const response = await fetch('/api/family');
        const data = await response.json();

        if (response.ok) {
          setFamilyData(data);
        } else {
          setError(data.error || 'Failed to fetch');
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    if (!loading && user) {
      fetchFamily();
    }
  }, [loading]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>

      <div className="space-y-6">
        {/* Session Info */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Session Status</h2>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm">
            {JSON.stringify({ status, session }, null, 2)}
          </pre>
        </div>

        {/* Family API Response */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Family API Response</h2>
          {error && (
            <div className="bg-red-100 text-red-800 p-4 rounded mb-4">
              Error: {error}
            </div>
          )}
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(familyData, null, 2)}
          </pre>
        </div>

        {/* Members Count */}
        {familyData?.family?.members && (
          <div className="bg-green-100 dark:bg-green-900 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Members Found</h2>
            <p className="text-2xl font-bold">{familyData.family.members.length}</p>
            <ul className="mt-4 space-y-2">
              {familyData.family.members.map((member: any) => (
                <li key={member.id} className="flex items-center gap-2">
                  <span className="font-medium">{member.name}</span>
                  <span className="text-sm text-gray-600">({member.role})</span>
                  {!member.isActive && (
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">INACTIVE</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
