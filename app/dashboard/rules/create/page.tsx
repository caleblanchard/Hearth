'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const TRIGGER_TYPES = [
  { value: 'chore_completed', label: 'Chore Completed' },
  { value: 'chore_streak', label: 'Chore Streak' },
  { value: 'screentime_low', label: 'Screen Time Low' },
  { value: 'inventory_low', label: 'Inventory Low' },
  { value: 'calendar_busy', label: 'Calendar Busy' },
  { value: 'medication_given', label: 'Medication Given' },
  { value: 'routine_completed', label: 'Routine Completed' },
  { value: 'time_based', label: 'Time Based' },
];

const ACTION_TYPES = [
  { value: 'award_credits', label: 'Award Credits' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'add_shopping_item', label: 'Add Shopping Item' },
  { value: 'create_todo', label: 'Create Todo' },
  { value: 'lock_medication', label: 'Lock Medication' },
  { value: 'suggest_meal', label: 'Suggest Meal' },
  { value: 'reduce_chores', label: 'Reduce Chores' },
  { value: 'adjust_screentime', label: 'Adjust Screen Time' },
];

interface ChoreDefinition {
  id: string;
  name: string;
}

interface Medication {
  id: string;
  medicationName: string;
  member: { id: string; name: string };
}

interface Routine {
  id: string;
  name: string;
  type: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
}

interface FamilyMember {
  id: string;
  name: string;
  role: string;
}

function CreateRuleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({});
  const [actions, setActions] = useState<Array<{ type: string; config: Record<string, any> }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateLoaded, setTemplateLoaded] = useState(false);
  
  // Dropdown data
  const [choreDefinitions, setChoreDefinitions] = useState<ChoreDefinition[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoadingDropdowns(true);
      try {
        // Fetch all data in parallel
        const [choresRes, medicationsRes, routinesRes, inventoryRes, familyRes] = await Promise.all([
          fetch('/api/chores').catch(() => null),
          fetch('/api/medications').catch(() => null),
          fetch('/api/routines').catch(() => null),
          fetch('/api/inventory').catch(() => null),
          fetch('/api/family').catch(() => null),
        ]);

        if (choresRes?.ok) {
          const data = await choresRes.json();
          // Handle paginated response structure
          const choresArray = data.data || data.chores || [];
          setChoreDefinitions(Array.isArray(choresArray) ? choresArray : []);
        }

        if (medicationsRes?.ok) {
          const data = await medicationsRes.json();
          setMedications(data.medications || []);
        }

        if (routinesRes?.ok) {
          const data = await routinesRes.json();
          // Handle paginated response structure
          const routinesArray = data.data || data.routines || [];
          setRoutines(Array.isArray(routinesArray) ? routinesArray : []);
        }

        if (inventoryRes?.ok) {
          const data = await inventoryRes.json();
          setInventoryItems(data.items || []);
        }

        if (familyRes?.ok) {
          const data = await familyRes.json();
          setFamilyMembers(data.family?.members || []);
        }
      } catch (err) {
        console.error('Error fetching dropdown data:', err);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchDropdownData();
  }, []);

  // Load template data from URL if present
  useEffect(() => {
    if (templateLoaded) return;
    
    try {
      const templateParam = searchParams?.get('template');
      if (templateParam) {
        const templateData = JSON.parse(decodeURIComponent(templateParam));
        
        // Populate form with template data
        if (templateData.name) setName(templateData.name);
        if (templateData.description) setDescription(templateData.description);
        
        if (templateData.trigger) {
          setTriggerType(templateData.trigger.type || '');
          setTriggerConfig(templateData.trigger.config || {});
        }
        
        if (templateData.actions && Array.isArray(templateData.actions)) {
          setActions(templateData.actions.map((action: any) => ({
            type: action.type || '',
            config: action.config || {},
          })));
        }
        
        setTemplateLoaded(true);
        
        // Clean up URL by removing template parameter
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    } catch (err) {
      console.error('Failed to parse template data:', err);
      setError('Failed to load template data');
      setTemplateLoaded(true); // Mark as loaded to prevent retry
    }
  }, [searchParams, templateLoaded]);

  const handleAddAction = () => {
    setActions([...actions, { type: '', config: {} }]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleActionTypeChange = (index: number, type: string) => {
    const newActions = [...actions];
    newActions[index] = { type, config: {} };
    setActions(newActions);
  };

  const handleActionConfigChange = (index: number, key: string, value: any) => {
    const newActions = [...actions];
    if (!newActions[index]) return;
    if (!newActions[index].config) {
      newActions[index].config = {};
    }
    newActions[index].config[key] = value;
    setActions(newActions);
  };

  const handleTriggerConfigChange = (key: string, value: any) => {
    setTriggerConfig({ ...triggerConfig, [key]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!triggerType) {
      setError('Trigger type is required');
      return;
    }

    if (actions.length === 0) {
      setError('At least one action is required');
      return;
    }

    if (actions.some(a => !a.type)) {
      setError('All actions must have a type selected');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          trigger: {
            type: triggerType,
            config: triggerConfig,
          },
          actions: actions.map(a => ({
            type: a.type,
            config: a.config,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create rule');
      }

      router.push('/dashboard/rules');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setLoading(false);
    }
  };

  const renderTriggerConfig = () => {
    switch (triggerType) {
      case 'chore_completed':
        return (
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={triggerConfig.anyChore === true}
                  onChange={(e) => handleTriggerConfigChange('anyChore', e.target.checked ? true : undefined)}
                  className="w-4 h-4 text-ember-600 border-slate-300 rounded focus:ring-ember-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Match any chore completion
                </span>
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-6">
                If checked, this rule will trigger for any chore completion. Leave unchecked to specify a particular chore.
              </p>
            </div>
            
            {!triggerConfig.anyChore && (
              <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                <div>
                  <label htmlFor="chore-completed-definition-id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Chore Definition (optional)
                  </label>
                  <select
                    id="chore-completed-definition-id"
                    value={triggerConfig.choreDefinitionId || ''}
                    onChange={(e) => handleTriggerConfigChange('choreDefinitionId', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                    disabled={loadingDropdowns}
                  >
                    <option value="">Select a chore definition...</option>
                    {choreDefinitions.map((chore) => (
                      <option key={chore.id} value={chore.id}>
                        {chore.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select a chore definition to trigger when any instance of that chore type is completed.
                  </p>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> You must either check "Match any chore" above, or select a chore definition above.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'chore_streak':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="chore-streak-days" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Number of Days
              </label>
              <input
                id="chore-streak-days"
                type="number"
                min="1"
                value={triggerConfig.days || ''}
                onChange={(e) => handleTriggerConfigChange('days', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                placeholder="e.g., 7"
              />
            </div>
          </div>
        );

      case 'screentime_low':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="screentime-threshold" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Threshold (minutes)
              </label>
              <input
                id="screentime-threshold"
                type="number"
                min="1"
                value={triggerConfig.thresholdMinutes || ''}
                onChange={(e) => handleTriggerConfigChange('thresholdMinutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                placeholder="e.g., 30"
              />
            </div>
          </div>
        );

      case 'calendar_busy':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Event Count
              </label>
              <input
                type="number"
                min="1"
                value={triggerConfig.eventCount || ''}
                onChange={(e) => handleTriggerConfigChange('eventCount', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                placeholder="e.g., 3"
              />
            </div>
          </div>
        );

      case 'inventory_low':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="inventory-low-threshold" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Threshold Percentage
              </label>
              <input
                id="inventory-low-threshold"
                type="number"
                min="1"
                max="100"
                value={triggerConfig.thresholdPercentage || ''}
                onChange={(e) => handleTriggerConfigChange('thresholdPercentage', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                placeholder="e.g., 20 (default: 20%)"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Alert when inventory drops below this percentage (default: 20%)
              </p>
            </div>
            <div>
              <label htmlFor="inventory-low-item-id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Specific Item (optional)
              </label>
              <select
                id="inventory-low-item-id"
                value={triggerConfig.itemId || ''}
                onChange={(e) => handleTriggerConfigChange('itemId', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                disabled={loadingDropdowns}
              >
                <option value="">Select an item (or leave empty to monitor all items)...</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Leave empty to monitor all items, or select a particular item
              </p>
            </div>
            <div>
              <label htmlFor="inventory-low-category" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category (optional)
              </label>
              <input
                id="inventory-low-category"
                type="text"
                value={triggerConfig.category || ''}
                onChange={(e) => handleTriggerConfigChange('category', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                placeholder="e.g., Groceries, Cleaning Supplies"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Monitor items in a specific category
              </p>
            </div>
          </div>
        );

      case 'medication_given':
        return (
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={triggerConfig.anyMedication === true}
                  onChange={(e) => handleTriggerConfigChange('anyMedication', e.target.checked ? true : undefined)}
                  className="w-4 h-4 text-ember-600 border-slate-300 rounded focus:ring-ember-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Match any medication
                </span>
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-6">
                If checked, this rule will trigger for any medication administration. Leave unchecked to specify a particular medication.
              </p>
            </div>
            
            {!triggerConfig.anyMedication && (
              <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                <div>
                  <label htmlFor="medication-given-medication-id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Medication (optional)
                  </label>
                  <select
                    id="medication-given-medication-id"
                    value={triggerConfig.medicationId || ''}
                    onChange={(e) => handleTriggerConfigChange('medicationId', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                    disabled={loadingDropdowns}
                  >
                    <option value="">Select a medication...</option>
                    {medications.map((med) => (
                      <option key={med.id} value={med.id}>
                        {med.medicationName} ({med.member.name})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select a specific medication to trigger only when that medication is given.
                  </p>
                </div>
                
                <div>
                  <label htmlFor="medication-given-member-id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Family Member (optional)
                  </label>
                  <select
                    id="medication-given-member-id"
                    value={triggerConfig.memberId || ''}
                    onChange={(e) => handleTriggerConfigChange('memberId', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                    disabled={loadingDropdowns}
                  >
                    <option value="">Select a family member...</option>
                    {familyMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select a specific family member to trigger only when medication is given to that member.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'routine_completed':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="routine-completed-routine-id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Routine (optional)
              </label>
              <select
                id="routine-completed-routine-id"
                value={triggerConfig.routineId || ''}
                onChange={(e) => handleTriggerConfigChange('routineId', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                disabled={loadingDropdowns}
              >
                <option value="">Select a routine (or leave empty to match any routine)...</option>
                {routines.map((routine) => (
                  <option key={routine.id} value={routine.id}>
                    {routine.name} ({routine.type})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select a specific routine to trigger only when that routine is completed. Leave empty to match any routine.
              </p>
            </div>
            <div>
              <label htmlFor="routine-completed-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Routine Type (optional)
              </label>
              <select
                id="routine-completed-type"
                value={triggerConfig.routineType || ''}
                onChange={(e) => handleTriggerConfigChange('routineType', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
              >
                <option value="">Select a routine type...</option>
                <option value="MORNING">MORNING</option>
                <option value="BEDTIME">BEDTIME</option>
                <option value="HOMEWORK">HOMEWORK</option>
                <option value="AFTER_SCHOOL">AFTER_SCHOOL</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select a routine type to trigger only when routines of that type are completed.
              </p>
            </div>
          </div>
        );

      case 'time_based':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="time-based-cron" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cron Expression
              </label>
              <input
                id="time-based-cron"
                type="text"
                value={triggerConfig.cron || ''}
                onChange={(e) => handleTriggerConfigChange('cron', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                placeholder="e.g., 0 9 * * 0 (Every Sunday at 9 AM)"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Format: minute hour day month dayOfWeek
              </p>
            </div>
            <div>
              <label htmlFor="time-based-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <input
                id="time-based-description"
                type="text"
                value={triggerConfig.description || ''}
                onChange={(e) => handleTriggerConfigChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                placeholder="e.g., Every Sunday at 9 AM"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Select a trigger type to configure
          </div>
        );
    }
  };

  const renderActionConfig = (action: { type: string; config: Record<string, any> }, index: number) => {
    switch (action.type) {
      case 'award_credits':
        return (
          <div className="space-y-3">
            <div>
              <label htmlFor={`award-credits-amount-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                id={`award-credits-amount-${index}`}
                type="number"
                min="1"
                max="1000"
                value={action.config.amount || ''}
                onChange={(e) => handleActionConfigChange(index, 'amount', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                placeholder="e.g., 10"
              />
            </div>
            <div>
              <label htmlFor={`award-credits-reason-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <input
                id={`award-credits-reason-${index}`}
                type="text"
                value={action.config.reason || ''}
                onChange={(e) => handleActionConfigChange(index, 'reason', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                placeholder="e.g., Streak bonus"
              />
            </div>
          </div>
        );

      case 'send_notification':
        const recipients = Array.isArray(action.config?.recipients) ? action.config.recipients : [];
        
        const handleRecipientToggle = (recipient: string) => {
          const currentRecipients = [...recipients];
          const recipientIndex = currentRecipients.indexOf(recipient);
          
          if (recipientIndex > -1) {
            currentRecipients.splice(recipientIndex, 1);
          } else {
            currentRecipients.push(recipient);
          }
          
          handleActionConfigChange(index, 'recipients', currentRecipients);
        };
        
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Recipients *
              </label>
              <div className="space-y-2">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={recipients.includes('all')}
                      onChange={() => handleRecipientToggle('all')}
                      className="w-4 h-4 text-ember-600 border-slate-300 rounded focus:ring-ember-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">All family members</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={recipients.includes('parents')}
                      onChange={() => handleRecipientToggle('parents')}
                      className="w-4 h-4 text-ember-600 border-slate-300 rounded focus:ring-ember-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">All parents</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={recipients.includes('child')}
                      onChange={() => handleRecipientToggle('child')}
                      className="w-4 h-4 text-ember-600 border-slate-300 rounded focus:ring-ember-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Child who triggered the rule</span>
                  </label>
                </div>
                
                {familyMembers.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Or select specific members:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {familyMembers.map((member) => (
                        <label key={member.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={recipients.includes(member.id)}
                            onChange={() => handleRecipientToggle(member.id)}
                            className="w-4 h-4 text-ember-600 border-slate-300 rounded focus:ring-ember-500"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {member.name} ({member.role})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select who should receive this notification. You can choose special groups or specific family members.
              </p>
            </div>
            <div>
              <label htmlFor={`send-notification-title-${index}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Title *
              </label>
              <input
                id={`send-notification-title-${index}`}
                type="text"
                value={action.config.title || ''}
                onChange={(e) => handleActionConfigChange(index, 'title', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                placeholder="e.g., Alert"
              />
            </div>
            <div>
              <label htmlFor={`send-notification-message-${index}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Message *
              </label>
              <textarea
                id={`send-notification-message-${index}`}
                value={action.config.message || ''}
                onChange={(e) => handleActionConfigChange(index, 'message', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                rows={3}
                placeholder="e.g., Important notification"
              />
            </div>
            <div>
              <label htmlFor={`send-notification-action-url-${index}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Action URL (optional)
              </label>
              <input
                id={`send-notification-action-url-${index}`}
                type="text"
                value={action.config.actionUrl || ''}
                onChange={(e) => handleActionConfigChange(index, 'actionUrl', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                placeholder="e.g., /dashboard/chores"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Optional deep link URL that will open when the notification is clicked
              </p>
            </div>
          </div>
        );

      case 'adjust_screentime':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount (minutes, use negative to subtract)
              </label>
              <input
                type="number"
                min="-120"
                max="120"
                value={action.config.amountMinutes || ''}
                onChange={(e) => handleActionConfigChange(index, 'amountMinutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                placeholder="e.g., 30 or -15"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Select an action type to configure
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-canvas-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard/rules" className="text-ember-700 dark:text-ember-400 hover:text-ember-500 dark:hover:text-ember-300 text-sm mb-2 inline-block">
            ← Back to Rules
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create Automation Rule</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Define triggers and actions for automated household management</p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6 text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                  placeholder="e.g., Weekly Allowance"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                  rows={3}
                  placeholder="e.g., Award weekly allowance every Sunday"
                />
              </div>
            </div>
          </div>

          {/* Trigger */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Trigger</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="trigger-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Trigger Type *
                </label>
                <select
                  id="trigger-type"
                  value={triggerType}
                  onChange={(e) => {
                    setTriggerType(e.target.value);
                    setTriggerConfig({});
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                  required
                  aria-label="Trigger Type"
                >
                  <option value="">Select a trigger...</option>
                  {TRIGGER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              {triggerType && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Trigger Configuration</h3>
                  {renderTriggerConfig()}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Actions</h2>
              <button
                type="button"
                onClick={handleAddAction}
                className="px-3 py-1 bg-ember-700 text-white text-sm rounded-md hover:bg-ember-500"
                disabled={actions.length >= 5}
              >
                Add Action
              </button>
            </div>

            {actions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No actions added yet. Click "Add Action" to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {actions.map((action, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700">Action {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => handleRemoveAction(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label htmlFor={`action-type-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Action Type
                        </label>
                        <select
                          id={`action-type-${index}`}
                          value={action.type}
                          onChange={(e) => handleActionTypeChange(index, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ember-500"
                          aria-label="Action Type"
                        >
                          <option value="">Select an action...</option>
                          {ACTION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {action.type && (
                        <div className="border-t border-gray-200 pt-3">
                          {renderActionConfig(action, index)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/dashboard/rules"
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateRulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <CreateRuleContent />
    </Suspense>
  );
}
