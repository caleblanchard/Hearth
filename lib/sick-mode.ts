import prisma from '@/lib/prisma';

/**
 * Check if a specific family member has active sick mode
 */
export async function isMemberInSickMode(memberId: string): Promise<boolean> {
  const activeSickMode = await prisma.sickModeInstance.findFirst({
    where: {
      memberId,
      isActive: true,
    },
  });

  return !!activeSickMode;
}

/**
 * Get active sick mode instance for a member
 */
export async function getActiveSickMode(memberId: string) {
  return await prisma.sickModeInstance.findFirst({
    where: {
      memberId,
      isActive: true,
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Get all active sick mode instances for a family
 */
export async function getFamilySickModes(familyId: string) {
  return await prisma.sickModeInstance.findMany({
    where: {
      familyId,
      isActive: true,
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Get sick mode settings for a family (creates defaults if not exist)
 */
export async function getSickModeSettings(familyId: string) {
  let settings = await prisma.sickModeSettings.findUnique({
    where: { familyId },
  });

  if (!settings) {
    settings = await prisma.sickModeSettings.create({
      data: { familyId },
    });
  }

  return settings;
}

/**
 * Check if chores should be paused for a member
 */
export async function shouldPauseChores(memberId: string): Promise<boolean> {
  const sickMode = await getActiveSickMode(memberId);
  if (!sickMode) return false;

  const settings = await getSickModeSettings(sickMode.familyId);
  return settings.pauseChores;
}

/**
 * Check if screen time tracking should be paused for a member
 */
export async function shouldPauseScreenTimeTracking(memberId: string): Promise<boolean> {
  const sickMode = await getActiveSickMode(memberId);
  if (!sickMode) return false;

  const settings = await getSickModeSettings(sickMode.familyId);
  return settings.pauseScreenTimeTracking;
}

/**
 * Get screen time bonus minutes for a member if in sick mode
 */
export async function getScreenTimeBonus(memberId: string): Promise<number> {
  const sickMode = await getActiveSickMode(memberId);
  if (!sickMode) return 0;

  const settings = await getSickModeSettings(sickMode.familyId);
  return settings.screenTimeBonus;
}

/**
 * Check if morning routine should be skipped for a member
 */
export async function shouldSkipMorningRoutine(memberId: string): Promise<boolean> {
  const sickMode = await getActiveSickMode(memberId);
  if (!sickMode) return false;

  const settings = await getSickModeSettings(sickMode.familyId);
  return settings.skipMorningRoutine;
}

/**
 * Check if bedtime routine should be skipped for a member
 */
export async function shouldSkipBedtimeRoutine(memberId: string): Promise<boolean> {
  const sickMode = await getActiveSickMode(memberId);
  if (!sickMode) return false;

  const settings = await getSickModeSettings(sickMode.familyId);
  return settings.skipBedtimeRoutine;
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

  const settings = await getSickModeSettings(sickMode.familyId);
  return settings.muteNonEssentialNotifs;
}
