'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Modal, ConfirmModal, AlertModal } from '@/components/ui/Modal';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Pacific/Honolulu',
  'America/Anchorage',
];

const WEEK_START_DAYS = ['SUNDAY', 'MONDAY'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

interface FamilyMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  birthDate?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}

interface Family {
  id: string;
  name: string;
  timezone: string;
  settings: {
    currency: string;
    weekStartDay: string;
  };
  members: FamilyMember[];
}

export default function FamilyPage() {
  const { data: session } = useSession();
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSettings, setEditingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [familySettings, setFamilySettings] = useState({
    name: '',
    timezone: 'America/New_York',
    currency: 'USD',
    weekStartDay: 'SUNDAY',
  });

  const [addMemberModal, setAddMemberModal] = useState(false);
  const [editMemberModal, setEditMemberModal] = useState<FamilyMember | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'CHILD',
    birthDate: '',
    password: '',
    pin: '',
    avatarUrl: '',
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    memberId: string;
    memberName: string;
    action: 'deactivate' | 'reactivate';
  }>({ isOpen: false, memberId: '', memberName: '', action: 'deactivate' });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const fetchFamily = async () => {
    try {
      const response = await fetch('/api/family');
      if (response.ok) {
        const data = await response.json();
        setFamily(data.family);
        setFamilySettings({
          name: data.family.name,
          timezone: data.family.timezone,
          currency: data.family.settings.currency,
          weekStartDay: data.family.settings.weekStartDay,
        });
      }
    } catch (error) {
      console.error('Failed to fetch family:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamily();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch('/api/family', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: familySettings.name,
          timezone: familySettings.timezone,
          settings: {
            currency: familySettings.currency,
            weekStartDay: familySettings.weekStartDay,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: 'Family settings updated successfully',
        });
        setEditingSettings(false);
        await fetchFamily();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update settings',
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update settings',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.name.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter a name',
      });
      return;
    }

    if (newMember.role === 'PARENT') {
      if (!newMember.email.trim()) {
        setAlertModal({
          isOpen: true,
          type: 'warning',
          title: 'Missing Information',
          message: 'Email is required for parent accounts',
        });
        return;
      }
      if (!newMember.password.trim()) {
        setAlertModal({
          isOpen: true,
          type: 'warning',
          title: 'Missing Information',
          message: 'Password is required for parent accounts',
        });
        return;
      }
    }

    if (newMember.role === 'CHILD' && !newMember.pin.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'PIN is required for child accounts',
      });
      return;
    }

    setSavingMember(true);
    try {
      const response = await fetch('/api/family/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: 'Family member added successfully',
        });
        setAddMemberModal(false);
        setNewMember({
          name: '',
          email: '',
          role: 'CHILD',
          birthDate: '',
          password: '',
          pin: '',
          avatarUrl: '',
        });
        await fetchFamily();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to add family member',
        });
      }
    } catch (error) {
      console.error('Error adding member:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to add family member',
      });
    } finally {
      setSavingMember(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!editMemberModal) return;

    setSavingMember(true);
    try {
      const response = await fetch(`/api/family/members/${editMemberModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editMemberModal.name,
          email: editMemberModal.email,
          birthDate: editMemberModal.birthDate,
          avatarUrl: editMemberModal.avatarUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: 'Family member updated successfully',
        });
        setEditMemberModal(null);
        await fetchFamily();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update family member',
        });
      }
    } catch (error) {
      console.error('Error updating member:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update family member',
      });
    } finally {
      setSavingMember(false);
    }
  };

  const handleToggleActive = async () => {
    const { memberId, action } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });

    try {
      if (action === 'deactivate') {
        const response = await fetch(`/api/family/members/${memberId}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (response.ok) {
          setAlertModal({
            isOpen: true,
            type: 'success',
            title: 'Success!',
            message: 'Family member deactivated successfully',
          });
          await fetchFamily();
        } else {
          setAlertModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: data.error || 'Failed to deactivate family member',
          });
        }
      } else {
        const response = await fetch(`/api/family/members/${memberId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        });

        const data = await response.json();

        if (response.ok) {
          setAlertModal({
            isOpen: true,
            type: 'success',
            title: 'Success!',
            message: 'Family member reactivated successfully',
          });
          await fetchFamily();
        } else {
          setAlertModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: data.error || 'Failed to reactivate family member',
          });
        }
      }
    } catch (error) {
      console.error('Error toggling member status:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update family member',
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900 p-6 rounded-lg">
            <p className="text-red-800 dark:text-red-200">Failed to load family information</p>
          </div>
        </div>
      </div>
    );
  }

  // Only parents can access this page
  if (session?.user?.role !== 'PARENT') {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-yellow-50 dark:bg-yellow-900 p-6 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200">
              Only parents can manage family settings
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Family Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your family settings and members
          </p>
        </div>

        {/* Family Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Family Settings
            </h2>
            {!editingSettings && (
              <button
                onClick={() => setEditingSettings(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                Edit Settings
              </button>
            )}
          </div>

          {editingSettings ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Family Name
                </label>
                <input
                  type="text"
                  value={familySettings.name}
                  onChange={(e) => setFamilySettings({ ...familySettings, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select
                    value={familySettings.timezone}
                    onChange={(e) => setFamilySettings({ ...familySettings, timezone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Currency
                  </label>
                  <select
                    value={familySettings.currency}
                    onChange={(e) => setFamilySettings({ ...familySettings, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Week Starts On
                  </label>
                  <select
                    value={familySettings.weekStartDay}
                    onChange={(e) => setFamilySettings({ ...familySettings, weekStartDay: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    {WEEK_START_DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
                >
                  {savingSettings ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditingSettings(false);
                    setFamilySettings({
                      name: family.name,
                      timezone: family.timezone,
                      currency: family.settings.currency,
                      weekStartDay: family.settings.weekStartDay,
                    });
                  }}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Family Name</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{family.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Timezone</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{family.timezone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Currency</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{family.settings.currency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Week Starts On</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{family.settings.weekStartDay}</p>
              </div>
            </div>
          )}
        </div>

        {/* Family Members */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Family Members ({family.members.length})
            </h2>
            <button
              onClick={() => setAddMemberModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              + Add Member
            </button>
          </div>

          <div className="space-y-4">
            {family.members.map((member) => (
              <div
                key={member.id}
                className={`p-4 rounded-lg border ${
                  member.isActive
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {member.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          member.role === 'PARENT'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {member.role}
                        </span>
                        {!member.isActive && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      {member.email && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{member.email}</p>
                      )}
                      {member.birthDate && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Born: {new Date(member.birthDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditMemberModal(member)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    {member.isActive ? (
                      <button
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            memberId: member.id,
                            memberName: member.name,
                            action: 'deactivate',
                          })
                        }
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            memberId: member.id,
                            memberName: member.name,
                            action: 'reactivate',
                          })
                        }
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={addMemberModal}
        onClose={() => setAddMemberModal(false)}
        title="Add Family Member"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role *
            </label>
            <select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="CHILD">Child</option>
              <option value="PARENT">Parent</option>
            </select>
          </div>
          {newMember.role === 'PARENT' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={newMember.password}
                  onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                  placeholder="Required for parent sign-in"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </>
          )}
          {newMember.role === 'CHILD' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                PIN (4 digits) *
              </label>
              <input
                type="text"
                value={newMember.pin}
                onChange={(e) => setNewMember({ ...newMember, pin: e.target.value })}
                maxLength={4}
                placeholder="1234"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Birth Date (optional)
            </label>
            <input
              type="date"
              value={newMember.birthDate}
              onChange={(e) => setNewMember({ ...newMember, birthDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Avatar URL (optional)
            </label>
            <input
              type="text"
              value={newMember.avatarUrl}
              onChange={(e) => setNewMember({ ...newMember, avatarUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleAddMember}
            disabled={savingMember}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
          >
            {savingMember ? 'Adding...' : 'Add Member'}
          </button>
          <button
            onClick={() => setAddMemberModal(false)}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Edit Member Modal */}
      {editMemberModal && (
        <Modal
          isOpen={!!editMemberModal}
          onClose={() => setEditMemberModal(null)}
          title="Edit Family Member"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={editMemberModal.name}
                onChange={(e) => setEditMemberModal({ ...editMemberModal, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            {editMemberModal.role === 'PARENT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editMemberModal.email || ''}
                  onChange={(e) => setEditMemberModal({ ...editMemberModal, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Birth Date
              </label>
              <input
                type="date"
                value={editMemberModal.birthDate ? editMemberModal.birthDate.split('T')[0] : ''}
                onChange={(e) => setEditMemberModal({ ...editMemberModal, birthDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Avatar URL
              </label>
              <input
                type="text"
                value={editMemberModal.avatarUrl || ''}
                onChange={(e) => setEditMemberModal({ ...editMemberModal, avatarUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleUpdateMember}
              disabled={savingMember}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
            >
              {savingMember ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => setEditMemberModal(null)}
              className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleToggleActive}
        title={confirmModal.action === 'deactivate' ? 'Deactivate Member' : 'Reactivate Member'}
        message={
          confirmModal.action === 'deactivate'
            ? `Deactivate ${confirmModal.memberName}? They will no longer be able to sign in.`
            : `Reactivate ${confirmModal.memberName}? They will be able to sign in again.`
        }
        confirmText={confirmModal.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        cancelText="Cancel"
        confirmColor={confirmModal.action === 'deactivate' ? 'red' : 'green'}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
