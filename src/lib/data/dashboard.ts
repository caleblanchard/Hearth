import { createClient } from '@/lib/supabase/server'

export const AVAILABLE_WIDGETS = [
  { id: 'weather', moduleId: null, defaultSize: 'small' },
  { id: 'calendar', moduleId: 'CALENDAR', defaultSize: 'large' },
  { id: 'chores', moduleId: 'CHORES', defaultSize: 'medium' },
  { id: 'todos', moduleId: 'TODOS', defaultSize: 'medium' },
  { id: 'shopping', moduleId: 'SHOPPING', defaultSize: 'medium' },
  { id: 'meals', moduleId: 'MEAL_PLANNING', defaultSize: 'medium' },
  { id: 'inventory', moduleId: 'INVENTORY', defaultSize: 'medium' },
  { id: 'finance', moduleId: 'FINANCIAL', defaultSize: 'medium' },
  { id: 'screentime', moduleId: 'SCREEN_TIME', defaultSize: 'small' },
];

/**
 * Get enabled modules for the current user's family
 */
async function getEnabledModules(supabase: any) {
  // Get user's family ID first
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: member } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('auth_user_id', user.id)
    .single();

  if (!member) return [];

  const { data: configs } = await supabase
    .from('module_configurations')
    .select('module_id')
    .eq('family_id', member.family_id)
    .eq('is_enabled', true);

  return (configs || []).map((c: any) => c.module_id);
}

/**
 * Get dashboard layout for a member
 */
export async function getDashboardLayout(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dashboard_layouts')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle()

  if (error) throw error

  // If no layout exists, generate default based on enabled modules
  if (!data) {
    const enabledModules = await getEnabledModules(supabase);
    
    const availableWidgets = AVAILABLE_WIDGETS.filter(w => !w.moduleId || enabledModules.includes(w.moduleId));
    const defaultWidgets = availableWidgets.map((w, index) => ({
        id: w.id,
        size: w.defaultSize,
        order: index,
        enabled: true
      }));

    return {
      member_id: memberId,
      layout: { widgets: defaultWidgets },
      widgets: defaultWidgets, // Legacy support
      availableWidgets,
    }
  }

  // Fetch available widgets for existing layout too
  const enabledModules = await getEnabledModules(supabase);
  const availableWidgets = AVAILABLE_WIDGETS.filter(w => !w.moduleId || enabledModules.includes(w.moduleId));

  return {
    ...data,
    availableWidgets,
  }
}

/**
 * Update dashboard layout for a member
 */
export async function updateDashboardLayout(
  memberId: string,
  updates: {
    layout?: any
    widgets?: any[]
  }
) {
  const supabase = await createClient()

  // Validation
  const widgets = updates.widgets || (updates.layout?.widgets) || [];
  
  // 1. Validate widget IDs
  const invalidWidgets = widgets.filter((w: any) => !AVAILABLE_WIDGETS.find(aw => aw.id === w.id));
  if (invalidWidgets.length > 0) {
    throw new Error(`Invalid widget IDs: ${invalidWidgets.map((w: any) => w.id).join(', ')}`);
  }

  // 2. Validate modules
  const enabledModules = await getEnabledModules(supabase);
  const unavailableWidgets = widgets.filter((w: any) => {
    const def = AVAILABLE_WIDGETS.find(aw => aw.id === w.id);
    return def?.moduleId && !enabledModules.includes(def.moduleId);
  });

  if (unavailableWidgets.length > 0) {
    throw new Error(`Widgets not available (module disabled): ${unavailableWidgets.map((w: any) => w.id).join(', ')}`);
  }

  const { data, error } = await supabase
    .from('dashboard_layouts')
    .upsert({
      member_id: memberId,
      layout: updates.layout || { widgets },
      widgets: widgets, // Keep for backward compatibility/redundancy if needed
      updated_at: new Date().toISOString(),
    }, { onConflict: 'member_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Reset dashboard layout to default
 */
export async function resetDashboardLayout(memberId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('dashboard_layouts')
    .delete()
    .eq('member_id', memberId)

  if (error) throw error
  
  // Return the default layout by calling getDashboardLayout
  // Since we deleted the record, getDashboardLayout will generate the default one
  return getDashboardLayout(memberId)
}
