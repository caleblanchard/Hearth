/**
 * Shared test data, URLs, and selectors for E2E tests.
 * Centralizes magic strings to make tests easier to maintain.
 */

// ── Test Users ──────────────────────────────────────────
export const TEST_PARENT = {
  email: 'sarah@example.com',
  password: 'password123',
  name: 'Sarah',
} as const;

// ── Routes ──────────────────────────────────────────────
export const ROUTES = {
  home: '/',
  signIn: '/auth/signin',
  signUp: '/auth/signup',
  onboarding: '/onboarding',
  dashboard: '/dashboard',
  chores: '/dashboard/chores',
  todos: '/dashboard/todos',
  shopping: '/dashboard/shopping',
  meals: '/dashboard/meals',
  recipes: '/dashboard/meals/recipes',
  newRecipe: '/dashboard/meals/recipes/new',
  communication: '/dashboard/communication',
  calendar: '/dashboard/calendar',
  family: '/dashboard/family',
  medications: '/dashboard/medications',
  health: '/dashboard/health',
  pets: '/dashboard/pets',
  inventory: '/dashboard/inventory',
  maintenance: '/dashboard/maintenance',
  transport: '/dashboard/transport',
  documents: '/dashboard/documents',
  leaderboard: '/dashboard/leaderboard',
  profile: '/dashboard/profile',
  settings: '/dashboard/settings',
  kiosk: '/kiosk',
  kioskSettings: '/dashboard/settings/kiosk',
  rules: '/dashboard/rules',
  reports: '/dashboard/reports',
  approvals: '/dashboard/approvals',
  rewards: '/dashboard/rewards',
  screentime: '/dashboard/screentime',
  financial: '/dashboard/financial',
} as const;

// ── Unique Test Data Generators ─────────────────────────
/** Generate a unique string to avoid test data collisions */
export function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Priority & Status Labels ────────────────────────────
export const PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export const SHOPPING_CATEGORIES = [
  'GROCERIES',
  'HOUSEHOLD',
  'PERSONAL_CARE',
  'HEALTH',
  'ELECTRONICS',
  'CLOTHING',
  'PETS',
  'OTHER',
] as const;
