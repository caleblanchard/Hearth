/**
 * Centralized sick mode utilities
 * Handles sick mode checks and settings
 * 
 * MIGRATED TO SUPABASE - January 10, 2026
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Check if a specific family member has active sick mode
 */
export async function isMemberInSickMode(memberId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data: activeSickMode } = await supabase
    .from('sick_mode_instances')
    .select('id')
    .eq('member_id', memberId)
    .eq('is_active', true)
    .maybeSingle();

  return !!activeSickMode;
}

/**
 * Get active sick mode instance for a member
 */
export async function getActiveSickMode(memberId: string) {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('sick_mode_instances')
    .select(`
      *,
      member:family_members(
        id,
        name
      )
    `)
    .eq('member_id', memberId)
    .eq('is_active', true)
    .maybeSingle();

  return data;
}

/**
 * Get all active sick mode instances for a family
 */
export async function getFamilySickModes(familyId: string) {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('sick_mode_instances')
    .select(`
      *,
      member:family_members(
        id,
        name
      )
    `)
    .eq('family_id', familyId)
    .eq('is_active', true);

  return data || [];
}

/**
 * Get sick mode settings for a family (creates defaults if not exist)
 */
export async function getSickModeSettings(familyId: string) {
  const supabase = await createClient();
  
  let { data: settings } = await supabase
    .from('sick_mode_settings')
    .select('*')
    .eq('family_id', familyId)
    .maybeSingle();

  if (!settings) {
    const { data: newSettings } = await supabase
      .from('sick_mode_settings')
      .insert({ family_id: familyId })
      .select()
      .single();
    settings = newSettings;
  }

  return settings;
}

/**
 * Check if chores should be paused for a member
 */
export async function shouldPauseChores(memberId: string): Promise<boolean> {
  const sickMode = await getActiveSickMode(memberId);
  if (!sickMode) return false;

  const settings = await getSickModeSettings(sickMode.family_id);
  return settings?.pause_chores || false;
}

/**
 * Check if screen time tracking should be paused for a member
 */
export async function shouldPauseScreenTimeTracking(memberId: string): Promise<boolean> {
  const sickMode = await getActiveSickMode(memberId);
  if (!sickMode) return false;

  const settings = await getSickModeSettings(sickMode.family_id);
  return settings?.pause_screen_time_tracking || false;
}

/**
 * Get screen time bonus minutes for a member if in sick mode
 */
export async function getScreenTimeBonus(memberId: string): Promise<number> {
  const sickMode = await getActiveSickMode(memberId);
  if (!sickMode) return 0;

  const settings = await getSickModeSettings(sickMode.family_id);
  return settings?.screen_time_bonus || 0;
}

/**
 * Check if morning routine should be skipped for a member
 */
export async function shouldSkipMorningRoutine(memberId: string): Promise<boolean> {
  const sickMode = await getActiveSickMode(memberId);
  if (!sickMode) return false;

  const settings = await getSickModeSettings(sickMode.family_id);
  return settings?.skip_morning_routine || false;
}

/**
 * Check if bedtime routine should be skipped for a member
 */
export async function shouldSkipBedtimeRoutine(memberId: string): Promise<boolean> {
  const sickMode = await getActiveSickMode(memberId);
  if (!sickMode) return false;

  const settings = await getSickModeSettings(sickMode.family_id);
  return settings?.skip_bedtime_routine || false;
}

/**
 * Check if a specific routine type should be skipped
 */
export async function shouldSkipRoutine(
  memberId: string,
  routineType: 'MORNING' | 'BEDTIME' | 'HOMEWORK' | 'AFTER_SCHOOL' | 'CUSTOM'
): Promise<boolean> {
  if (routineType === 'MORNING') {
    return await shouldSkipMorningRoutine(memberId);
  }
  if (routineType === 'BEDTIME') {
    return await shouldSkipBedtimeRoutine(memberId);
  }
  // Other routine types are not skipped by sick mode
  return false;
}

/**
 * Check if non-essential notifications should be muted for a member
 */
export async function shouldMuteNonEssentialNotifications(memberId: string): Promise<boolean> {
  const sickMode = await getActiveSickMode(memberId);
  if (!sickMode) return false;

  const settings = await getSickModeSettings(sickMode.family_id);
  return settings?.mute_non_essential_notifs || false;
}
