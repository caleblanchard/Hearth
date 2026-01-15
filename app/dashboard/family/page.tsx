'use client';

import { useEffect, useState } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useCurrentMember } from '@/hooks/useCurrentMember';
import { useActiveFamily } from '@/contexts/ActiveFamilyContext';
import { useFamilyFetch } from '@/hooks/useFamilyFetch';
import { format } from 'date-fns';
import { Modal, ConfirmModal, AlertModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

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

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
];

interface FamilyMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  birthDate?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  inviteStatus?: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  inviteSentAt?: string;
  inviteExpiresAt?: string;
}

interface Family {
  id: string;
  name: string;
  timezone: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  settings: {
    currency: string;
    weekStartDay: string;
  };
  members: FamilyMember[];
}

export default function FamilyPage() {
  const { user } = useSupabaseSession();
  const { isParent, loading: memberLoading } = useCurrentMember();
  const { activeFamilyId } = useActiveFamily();
  const familyFetch = useFamilyFetch();
  const { showToast } = useToast();
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSettings, setEditingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [familySettings, setFamilySettings] = useState({
    name: '',
    timezone: 'America/New_York',
    currency: 'USD',
    weekStartDay: 'SUNDAY',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  // Geocoding state
  const [geocodingMethod, setGeocodingMethod] = useState<'zip' | 'city'>('zip');
  const [zipCode, setZipCode] = useState('');
  const [cityName, setCityName] = useState('');
  const [country, setCountry] = useState('US');
  const [lookingUp, setLookingUp] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [addMemberModal, setAddMemberModal] = useState(false);
  const [editMemberModal, setEditMemberModal] = useState<FamilyMember | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'CHILD',
    birthDate: '',
    pin: '',
    avatarUrl: '',
    allowedModules: [] as string[],
  });

  const [resendingInvite, setResendingInvite] = useState<string | null>(null);

  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [memberModules, setMemberModules] = useState<Record<string, string[]>>({});

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
    if (!activeFamilyId) return;
    
    try {
      // Use /api/family-data instead of /api/family due to Next.js routing bug
      // Pass active family ID as query param
      const response = await fetch(`/api/family-data?familyId=${activeFamilyId}`);
      if (response.ok) {
        const data = await response.json();
        setFamily(data.family);
        setFamilySettings({
          name: data.family.name,
          timezone: data.family.timezone,
          currency: data.family.settings.currency,
          weekStartDay: data.family.settings.weekStartDay,
          location: data.family.location || '',
          latitude: data.family.latitude || null,
          longitude: data.family.longitude || null,
        });
      }
    } catch (error) {
      console.error('Failed to fetch family:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnabledModules = async () => {
    try {
      const response = await fetch('/api/settings/modules/enabled');
      if (response.ok) {
        const data = await response.json();
        setEnabledModules(data.enabledModules || []);
      }
    } catch (error) {
      console.error('Failed to fetch enabled modules:', error);
    }
  };

  const fetchMemberModules = async (memberId: string) => {
    try {
      const response = await fetch(`/api/family/members/${memberId}/modules`);
      if (response.ok) {
        const data = await response.json();
        setMemberModules(prev => ({
          ...prev,
          [memberId]: data.allowedModules || [],
        }));
      }
    } catch (error) {
      console.error('Failed to fetch member modules:', error);
    }
  };

  useEffect(() => {
    if (activeFamilyId) {
      fetchFamily();
      fetchEnabledModules();
    }
  }, [activeFamilyId]);

  useEffect(() => {
    // Fetch modules for member when editing
    if (editMemberModal && editMemberModal.role === 'CHILD') {
      fetchMemberModules(editMemberModal.id);
    }
  }, [editMemberModal]);

  const handleGeocodeLookup = async () => {
    setLookingUp(true);
    setGeocodeResults([]);
    
    try {
      const params = new URLSearchParams();
      if (geocodingMethod === 'zip') {
        if (!zipCode.trim()) {
          showToast('error', 'Please enter a zip code');
          setLookingUp(false);
          return;
        }
        params.append('zip', zipCode.trim());
        params.append('country', country);
      } else {
        if (!cityName.trim()) {
          showToast('error', 'Please enter a city name');
          setLookingUp(false);
          return;
        }
        params.append('city', cityName.trim());
        params.append('country', country);
      }

      const response = await fetch(`/api/geocoding?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        showToast('error', data.error || 'Failed to look up location');
        setLookingUp(false);
        return;
      }

      // Handle zip code result (single location)
      if (geocodingMethod === 'zip') {
        setFamilySettings({
          ...familySettings,
          location: `${data.name}, ${data.state || data.country}`,
          latitude: data.lat,
          longitude: data.lon,
        });
        showToast('success', `Found ${data.name}! ✓`);
      } else {
        // Handle city name results (array of matches)
        if (data.results.length === 1) {
          const result = data.results[0];
          setFamilySettings({
            ...familySettings,
            location: `${result.name}, ${result.state || result.country}`,
            latitude: result.lat,
            longitude: result.lon,
          });
          showToast('success', `Found ${result.name}! ✓`);
        } else {
          // Multiple matches - show user choice
          setGeocodeResults(data.results);
          showToast('info', `Found ${data.results.length} locations - please choose one`);
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      showToast('error', 'Failed to look up location');
    } finally {
      setLookingUp(false);
    }
  };

  const handleSelectGeocodeResult = (result: any) => {
    setFamilySettings({
      ...familySettings,
      location: `${result.name}, ${result.state || result.country}`,
      latitude: result.lat,
      longitude: result.lon,
    });
    setGeocodeResults([]);
    showToast('success', `Location set to ${result.name}! ✓`);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      // Use /api/family-data instead of /api/family due to Next.js routing bug
      const response = await fetch('/api/family-data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: familySettings.name,
          timezone: familySettings.timezone,
          currency: familySettings.currency,
          weekStartDay: familySettings.weekStartDay,
          location: familySettings.location || null,
          latitude: familySettings.latitude || null,
          longitude: familySettings.longitude || null,
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

    if (newMember.role === 'CHILD' && newMember.allowedModules.length === 0) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please select at least one module for the child to access',
      });
      return;
    }

    setSavingMember(true);
    try {
      // Use different API endpoints for parents (invite) vs children (direct create)
      if (newMember.role === 'PARENT') {
        // Send invitation to parent
        const response = await fetch('/api/family/members/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newMember.name,
            email: newMember.email,
            birthDate: newMember.birthDate || undefined,
            avatarUrl: newMember.avatarUrl || undefined,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setAlertModal({
            isOpen: true,
            type: 'success',
            title: 'Invitation Sent!',
            message: data.message || `An invitation has been sent to ${newMember.email}. They will receive an email to set up their account.`,
          });
          setAddMemberModal(false);
          setNewMember({
            name: '',
            email: '',
            role: 'CHILD',
            birthDate: '',
            pin: '',
            avatarUrl: '',
            allowedModules: [],
          });
          await fetchFamily();
        } else {
          setAlertModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: data.error || 'Failed to send invitation',
          });
        }
      } else {
        // Create child account directly
        const response = await fetch('/api/family/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newMember,
            allowedModules: newMember.allowedModules,
          }),
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
            pin: '',
            avatarUrl: '',
            allowedModules: [],
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

  const handleResendInvite = async (member: FamilyMember) => {
    setResendingInvite(member.id);
    try {
      const response = await fetch('/api/family/members/invite/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', `Invitation resent to ${member.email}`);
        await fetchFamily();
      } else {
        showToast('error', data.error || 'Failed to resend invitation');
      }
    } catch (error) {
      showToast('error', 'Failed to resend invitation');
    } finally {
      setResendingInvite(null);
    }
  };

  const handleCancelInvite = async (member: FamilyMember) => {
    if (!confirm(`Cancel the invitation for ${member.name}?`)) return;

    try {
      const response = await fetch(`/api/family/members/${member.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', 'Invitation cancelled');
        await fetchFamily();
      } else {
        showToast('error', data.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      showToast('error', 'Failed to cancel invitation');
    }
  };

  const handleUpdateMember = async () => {
    if (!editMemberModal) return;

    if (editMemberModal.role === 'CHILD' && (memberModules[editMemberModal.id] || []).length === 0) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please select at least one module for the child to access',
      });
      return;
    }

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
          // Only send allowedModules for children
          allowedModules: editMemberModal.role === 'CHILD' 
            ? (memberModules[editMemberModal.id] || [])
            : undefined,
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700"></div>
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
  if (!isParent) {
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
                className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors"
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
              
              {/* Location Settings for Weather */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Location (for Weather Widget)
                </h3>
                <div className="space-y-4">
                  
                  {/* Geocoding Method Selector */}
                  <div className="flex gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setGeocodingMethod('zip')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        geocodingMethod === 'zip'
                          ? 'bg-ember-700 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      Zip/Postal Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeocodingMethod('city')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        geocodingMethod === 'city'
                          ? 'bg-ember-700 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      City Name
                    </button>
                  </div>

                  {/* Zip Code Input */}
                  {geocodingMethod === 'zip' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Zip/Postal Code
                        </label>
                        <input
                          type="text"
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleGeocodeLookup()}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., 90210 or SW1A 1AA"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Country
                        </label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* City Name Input */}
                  {geocodingMethod === 'city' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          City Name
                        </label>
                        <input
                          type="text"
                          value={cityName}
                          onChange={(e) => setCityName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleGeocodeLookup()}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., London or New York"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Country
                        </label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Look Up Button */}
                  <div>
                    <button
                      type="button"
                      onClick={handleGeocodeLookup}
                      disabled={lookingUp}
                      className="px-6 py-2 bg-ember-700 hover:bg-ember-500 disabled:bg-ember-400 text-white font-semibold rounded-lg transition-colors"
                    >
                      {lookingUp ? 'Looking up...' : 'Look Up Coordinates'}
                    </button>
                  </div>

                  {/* Multiple Results Selection */}
                  {geocodeResults.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                        Multiple locations found - please choose one:
                      </p>
                      <div className="space-y-2">
                        {geocodeResults.map((result, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectGeocodeResult(result)}
                            className="w-full text-left px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors"
                          >
                            <span className="font-medium text-gray-900 dark:text-white">
                              {result.name}
                            </span>
                            {result.state && (
                              <span className="text-gray-600 dark:text-gray-400">, {result.state}</span>
                            )}
                            <span className="text-gray-600 dark:text-gray-400"> ({result.country})</span>
                            <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">
                              {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Current Location Display */}
                  {familySettings.latitude && familySettings.longitude && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <p className="text-sm font-medium text-green-900 dark:text-green-200">
                        ✓ Location set: {familySettings.location}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        Coordinates: {familySettings.latitude.toFixed(4)}, {familySettings.longitude.toFixed(4)}
                      </p>
                    </div>
                  )}

                  {/* Advanced Manual Entry */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm text-ember-700 dark:text-ember-500 hover:underline"
                    >
                      {showAdvanced ? '▼ Hide' : '▶'} Advanced: Manual Coordinate Entry
                    </button>
                    {showAdvanced && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Location Name
                          </label>
                          <input
                            type="text"
                            value={familySettings.location}
                            onChange={(e) => setFamilySettings({ ...familySettings, location: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            placeholder="e.g., New York, NY"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Latitude
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={familySettings.latitude ?? ''}
                              onChange={(e) => setFamilySettings({ 
                                ...familySettings, 
                                latitude: e.target.value ? parseFloat(e.target.value) : null 
                              })}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                              placeholder="e.g., 40.7128"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Longitude
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={familySettings.longitude ?? ''}
                              onChange={(e) => setFamilySettings({ 
                                ...familySettings, 
                                longitude: e.target.value ? parseFloat(e.target.value) : null 
                              })}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                              placeholder="e.g., -74.0060"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

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
                      location: family.location || '',
                      latitude: family.latitude || null,
                      longitude: family.longitude || null,
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
              {family.location && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Location</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{family.location}</p>
                </div>
              )}
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
                  member.inviteStatus === 'PENDING'
                    ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10'
                    : member.isActive
                      ? 'border-gray-200 dark:border-gray-700'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold ${
                      member.inviteStatus === 'PENDING' ? 'bg-yellow-500' : 'bg-ember-700'
                    }`}>
                      {member.inviteStatus === 'PENDING' ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {member.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          member.role === 'PARENT'
                            ? 'bg-ember-300 text-ember-700 dark:bg-slate-900 dark:text-ember-300'
                            : 'bg-info/20 text-info dark:bg-info/30 dark:text-info'
                        }`}>
                          {member.role}
                        </span>
                        {member.inviteStatus === 'PENDING' && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
                            PENDING INVITE
                          </span>
                        )}
                        {!member.isActive && member.inviteStatus !== 'PENDING' && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      {member.email && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{member.email}</p>
                      )}
                      {member.inviteStatus === 'PENDING' && member.inviteSentAt && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          Invitation sent {format(new Date(member.inviteSentAt), 'MMM d, yyyy')}
                        </p>
                      )}
                      {member.birthDate && member.inviteStatus !== 'PENDING' && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Born: {format(new Date(member.birthDate.split('T')[0]), 'MMMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {member.inviteStatus === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleResendInvite(member)}
                          disabled={resendingInvite === member.id}
                          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          {resendingInvite === member.id ? 'Sending...' : 'Resend Invite'}
                        </button>
                        <button
                          onClick={() => handleCancelInvite(member)}
                          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditMemberModal(member)}
                          className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white text-sm font-semibold rounded-lg transition-colors"
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
                      </>
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
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  An invitation email will be sent to this person. They will set their own password when they accept the invitation.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="they@example.com"
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
          {newMember.role === 'CHILD' && enabledModules.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Module Access *
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Select which modules this child can access. Only modules enabled at the family level are available.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                {enabledModules.map((moduleId) => (
                  <label
                    key={moduleId}
                    className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={newMember.allowedModules.includes(moduleId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewMember({
                            ...newMember,
                            allowedModules: [...newMember.allowedModules, moduleId],
                          });
                        } else {
                          setNewMember({
                            ...newMember,
                            allowedModules: newMember.allowedModules.filter(m => m !== moduleId),
                          });
                        }
                      }}
                      className="rounded border-gray-300 text-ember-700 focus:ring-ember-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {moduleId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
              {newMember.allowedModules.length === 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Please select at least one module
                </p>
              )}
            </div>
          )}
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
            {editMemberModal.role === 'CHILD' && enabledModules.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Module Access *
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Select which modules this child can access. Only modules enabled at the family level are available.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                  {enabledModules.map((moduleId) => (
                    <label
                      key={moduleId}
                      className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(memberModules[editMemberModal.id] || []).includes(moduleId)}
                        onChange={(e) => {
                          const currentModules = memberModules[editMemberModal.id] || [];
                          if (e.target.checked) {
                            setMemberModules({
                              ...memberModules,
                              [editMemberModal.id]: [...currentModules, moduleId],
                            });
                          } else {
                            setMemberModules({
                              ...memberModules,
                              [editMemberModal.id]: currentModules.filter(m => m !== moduleId),
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-ember-700 focus:ring-ember-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {moduleId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </label>
                  ))}
                </div>
                {(memberModules[editMemberModal.id] || []).length === 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Please select at least one module
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleUpdateMember}
              disabled={savingMember}
              className="px-6 py-2 bg-ember-700 hover:bg-ember-500 disabled:bg-ember-300 text-white font-semibold rounded-lg transition-colors"
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
