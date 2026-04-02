-- Hearth Cloud Deployment Migration 00001
-- Core Schema: Enums, Families, Family Members, System Config
-- Generated from Prisma schema

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

-- Core enums
CREATE TYPE role AS ENUM ('PARENT', 'CHILD', 'GUEST');
CREATE TYPE module_id AS ENUM (
  'CHORES', 'SCREEN_TIME', 'CREDITS', 'SHOPPING', 'CALENDAR',
  'TODOS', 'ROUTINES', 'MEAL_PLANNING', 'RECIPES', 'INVENTORY',
  'HEALTH', 'PROJECTS', 'COMMUNICATION', 'TRANSPORT', 'PETS',
  'MAINTENANCE', 'DOCUMENTS', 'FINANCIAL', 'LEADERBOARD', 'RULES_ENGINE'
);

-- Chores enums
CREATE TYPE difficulty AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE assignment_type AS ENUM ('FIXED', 'ROTATING', 'OPT_IN');
CREATE TYPE frequency AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');
CREATE TYPE chore_status AS ENUM ('PENDING', 'COMPLETED', 'APPROVED', 'REJECTED', 'SKIPPED');

-- Screen time enums
CREATE TYPE rollover_type AS ENUM ('NONE', 'FULL', 'CAPPED');
CREATE TYPE reset_day AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');
CREATE TYPE screen_time_transaction_type AS ENUM ('ALLOCATION', 'EARNED', 'SPENT', 'ADJUSTMENT', 'ROLLOVER', 'GRACE_BORROWED', 'GRACE_REPAID');
CREATE TYPE device_type AS ENUM ('TV', 'TABLET', 'PHONE', 'COMPUTER', 'GAMING', 'OTHER');
CREATE TYPE screen_time_period AS ENUM ('DAILY', 'WEEKLY');
CREATE TYPE grace_repayment_mode AS ENUM ('DEDUCT_NEXT_WEEK', 'EARN_BACK', 'FORGIVE');
CREATE TYPE repayment_status AS ENUM ('PENDING', 'DEDUCTED', 'EARNED_BACK', 'FORGIVEN');

-- Credits enums
CREATE TYPE credit_transaction_type AS ENUM ('CHORE_REWARD', 'BONUS', 'SCREENTIME_PURCHASE', 'REWARD_REDEMPTION', 'ADJUSTMENT', 'TRANSFER');
CREATE TYPE spending_category AS ENUM ('REWARDS', 'SCREEN_TIME', 'SAVINGS', 'TRANSFER', 'OTHER');

-- Rewards enums
CREATE TYPE reward_category AS ENUM ('PRIVILEGE', 'ITEM', 'EXPERIENCE', 'SCREEN_TIME', 'OTHER');
CREATE TYPE reward_status AS ENUM ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK');
CREATE TYPE redemption_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');

-- Todo enums
CREATE TYPE todo_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE todo_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- Shopping enums
CREATE TYPE shopping_priority AS ENUM ('NORMAL', 'NEEDED_SOON', 'URGENT');
CREATE TYPE shopping_status AS ENUM ('PENDING', 'IN_CART', 'PURCHASED', 'REMOVED');

-- Calendar enums
CREATE TYPE event_type AS ENUM ('INTERNAL', 'GOOGLE', 'OUTLOOK', 'APPLE');
CREATE TYPE calendar_provider AS ENUM ('GOOGLE', 'OUTLOOK', 'APPLE');
CREATE TYPE sync_status AS ENUM ('ACTIVE', 'PAUSED', 'ERROR', 'DISCONNECTED');
CREATE TYPE sync_direction AS ENUM ('IMPORT', 'EXPORT', 'BOTH');

-- Guest enums
CREATE TYPE guest_access_level AS ENUM ('VIEW_ONLY', 'LIMITED', 'CAREGIVER');
CREATE TYPE invite_status AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- File enums
CREATE TYPE entity_type AS ENUM ('AVATAR', 'CHORE_PROOF', 'BOARD_IMAGE', 'PET_PHOTO', 'MAINTENANCE_PHOTO', 'DOCUMENT');
CREATE TYPE storage_provider AS ENUM ('LOCAL', 'S3', 'CLOUDFLARE');

-- Notification enums
CREATE TYPE notification_type AS ENUM (
  'CHORE_COMPLETED', 'CHORE_APPROVED', 'CHORE_REJECTED', 'CHORE_ASSIGNED',
  'REWARD_REQUESTED', 'REWARD_APPROVED', 'REWARD_REJECTED',
  'CREDITS_EARNED', 'CREDITS_SPENT', 'SCREENTIME_ADJUSTED', 'SCREENTIME_LOW',
  'TODO_ASSIGNED', 'SHOPPING_REQUEST', 'GENERAL',
  'LEFTOVER_EXPIRING', 'DOCUMENT_EXPIRING', 'MEDICATION_AVAILABLE',
  'ROUTINE_TIME', 'MAINTENANCE_DUE', 'PET_CARE_REMINDER',
  'CARPOOL_REMINDER', 'SAVINGS_GOAL_ACHIEVED', 'BUSY_DAY_ALERT', 'RULE_TRIGGERED'
);

-- Gamification enums
CREATE TYPE achievement_category AS ENUM ('CHORES', 'CREDITS', 'STREAKS', 'SOCIAL', 'SPECIAL');
CREATE TYPE badge_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');
CREATE TYPE streak_type AS ENUM ('DAILY_CHORES', 'WEEKLY_CHORES', 'PERFECT_WEEK', 'REWARD_SAVER');

-- Routine enums
CREATE TYPE routine_type AS ENUM ('MORNING', 'BEDTIME', 'HOMEWORK', 'AFTER_SCHOOL', 'CUSTOM');
CREATE TYPE post_type AS ENUM ('ANNOUNCEMENT', 'KUDOS', 'NOTE', 'PHOTO');

-- Meal enums
CREATE TYPE meal_type AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');
CREATE TYPE recipe_category AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'DESSERT', 'SNACK', 'SIDE', 'APPETIZER', 'DRINK');
CREATE TYPE dietary_tag AS ENUM (
  'VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE', 'NUT_FREE',
  'EGG_FREE', 'SOY_FREE', 'LOW_CARB', 'KETO', 'PALEO'
);

-- Pet enums
CREATE TYPE pet_species AS ENUM ('DOG', 'CAT', 'BIRD', 'FISH', 'HAMSTER', 'RABBIT', 'GUINEA_PIG', 'REPTILE', 'OTHER');

-- Inventory enums
CREATE TYPE inventory_category AS ENUM (
  'FOOD_PANTRY', 'FOOD_FRIDGE', 'FOOD_FREEZER', 'CLEANING',
  'TOILETRIES', 'PAPER_GOODS', 'MEDICINE', 'PET_SUPPLIES', 'OTHER'
);
CREATE TYPE inventory_location AS ENUM (
  'PANTRY', 'FRIDGE', 'FREEZER', 'BATHROOM', 'GARAGE',
  'LAUNDRY_ROOM', 'KITCHEN_CABINET', 'OTHER'
);

-- Maintenance enums
CREATE TYPE maintenance_category AS ENUM (
  'HVAC', 'PLUMBING', 'ELECTRICAL', 'EXTERIOR', 'INTERIOR',
  'LAWN_GARDEN', 'APPLIANCES', 'SAFETY', 'SEASONAL', 'OTHER'
);
CREATE TYPE season AS ENUM ('SPRING', 'SUMMER', 'FALL', 'WINTER');

-- Transport enums
CREATE TYPE transport_type AS ENUM ('PICKUP', 'DROPOFF');

-- Document enums
CREATE TYPE document_category AS ENUM (
  'IDENTITY', 'MEDICAL', 'FINANCIAL', 'HOUSEHOLD',
  'EDUCATION', 'LEGAL', 'PETS', 'OTHER'
);

-- Health enums
CREATE TYPE health_event_type AS ENUM ('ILLNESS', 'INJURY', 'DOCTOR_VISIT', 'WELLNESS_CHECK', 'VACCINATION', 'OTHER');
CREATE TYPE symptom_type AS ENUM (
  'FEVER', 'COUGH', 'SORE_THROAT', 'RUNNY_NOSE', 'HEADACHE',
  'STOMACH_ACHE', 'VOMITING', 'DIARRHEA', 'RASH', 'FATIGUE',
  'LOSS_OF_APPETITE', 'OTHER'
);
CREATE TYPE temp_method AS ENUM ('ORAL', 'RECTAL', 'ARMPIT', 'EAR', 'FOREHEAD');
CREATE TYPE sick_mode_trigger AS ENUM ('MANUAL', 'AUTO_FROM_HEALTH_EVENT');

-- Project enums
CREATE TYPE project_status AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
CREATE TYPE task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED');
CREATE TYPE dependency_type AS ENUM ('FINISH_TO_START', 'START_TO_START', 'BLOCKING');

-- Audit enums
CREATE TYPE audit_action AS ENUM (
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PIN_CHANGE', 'SESSION_EXPIRED',
  'MEMBER_ADDED', 'MEMBER_REMOVED', 'MEMBER_UPDATED', 'ROLE_CHANGED',
  'CHORE_COMPLETED', 'CHORE_APPROVED', 'CHORE_REJECTED', 'CHORE_ASSIGNED',
  'CREDITS_AWARDED', 'CREDITS_DEDUCTED', 'REWARD_REDEEMED', 'REWARD_APPROVED',
  'SCREENTIME_LOGGED', 'SCREENTIME_ADJUSTED', 'GRACE_PERIOD_USED',
  'SCREENTIME_TYPE_CREATED', 'SCREENTIME_TYPE_UPDATED', 'SCREENTIME_TYPE_ARCHIVED',
  'SCREENTIME_TYPE_DELETED', 'SCREENTIME_ALLOWANCE_UPDATED',
  'ROUTINE_CREATED', 'ROUTINE_UPDATED', 'ROUTINE_DELETED', 'ROUTINE_COMPLETED',
  'POST_CREATED', 'POST_UPDATED', 'POST_DELETED', 'POST_PINNED', 'POST_UNPINNED',
  'MEAL_PLAN_CREATED', 'MEAL_ENTRY_ADDED', 'MEAL_ENTRY_UPDATED', 'MEAL_ENTRY_DELETED',
  'LEFTOVER_LOGGED', 'LEFTOVER_MARKED_USED', 'LEFTOVER_MARKED_TOSSED',
  'RECIPE_CREATED', 'RECIPE_UPDATED', 'RECIPE_DELETED', 'RECIPE_RATED',
  'PET_ADDED', 'PET_UPDATED', 'PET_DELETED', 'PET_FED', 'PET_MEDICATION_GIVEN', 'PET_VET_VISIT_LOGGED', 'PET_WEIGHT_LOGGED',
  'INVENTORY_ITEM_ADDED', 'INVENTORY_ITEM_UPDATED', 'INVENTORY_ITEM_DELETED', 'INVENTORY_QUANTITY_ADJUSTED', 'INVENTORY_ITEM_RESTOCKED',
  'MAINTENANCE_ITEM_CREATED', 'MAINTENANCE_ITEM_UPDATED', 'MAINTENANCE_ITEM_DELETED', 'MAINTENANCE_TASK_COMPLETED',
  'GUEST_INVITE_CREATED', 'GUEST_INVITE_REVOKED', 'GUEST_SESSION_STARTED', 'GUEST_SESSION_ENDED', 'GUEST_ACCESS_DENIED',
  'KIOSK_SESSION_STARTED', 'KIOSK_SESSION_ENDED', 'KIOSK_MEMBER_SWITCHED', 'KIOSK_AUTO_LOCKED', 'KIOSK_SETTINGS_UPDATED',
  'TRANSPORT_SCHEDULE_CREATED', 'TRANSPORT_SCHEDULE_UPDATED', 'TRANSPORT_SCHEDULE_DELETED',
  'TRANSPORT_LOCATION_ADDED', 'TRANSPORT_DRIVER_ADDED', 'CARPOOL_GROUP_CREATED', 'CARPOOL_MEMBER_ADDED', 'TRANSPORT_CONFIRMED',
  'DOCUMENT_UPLOADED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'DOCUMENT_ACCESSED', 'DOCUMENT_SHARED', 'DOCUMENT_SHARE_ACCESSED',
  'MEDICATION_SAFETY_CREATED', 'MEDICATION_DOSE_LOGGED', 'MEDICATION_DOSE_OVERRIDE', 'MEDICATION_SAFETY_UPDATED', 'MEDICATION_SAFETY_DELETED',
  'HEALTH_EVENT_CREATED', 'HEALTH_EVENT_UPDATED', 'HEALTH_EVENT_ENDED', 'HEALTH_SYMPTOM_LOGGED', 'HEALTH_MEDICATION_GIVEN', 'TEMPERATURE_LOGGED', 'MEDICAL_PROFILE_UPDATED',
  'SICK_MODE_STARTED', 'SICK_MODE_ENDED', 'SICK_MODE_SETTINGS_UPDATED', 'SICK_MODE_AUTO_TRIGGERED',
  'SHOPPING_ITEM_ADDED', 'SHOPPING_ITEM_UPDATED', 'SHOPPING_ITEM_DELETED',
  'RULE_CREATED', 'RULE_UPDATED', 'RULE_DELETED', 'RULE_ENABLED', 'RULE_DISABLED', 'RULE_EXECUTED', 'RULE_TEST_RUN',
  'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED', 'PROJECT_STATUS_CHANGED',
  'PROJECT_TASK_CREATED', 'PROJECT_TASK_UPDATED', 'PROJECT_TASK_DELETED', 'PROJECT_TASK_STATUS_CHANGED',
  'PROJECT_DEPENDENCY_ADDED', 'PROJECT_DEPENDENCY_REMOVED',
  'SETTINGS_CHANGED', 'MODULE_ENABLED', 'MODULE_DISABLED',
  'RATE_LIMIT_HIT', 'AUTH_DENIED', 'SUSPICIOUS_ACTIVITY'
);
CREATE TYPE audit_result AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');

-- ============================================
-- CORE TABLES
-- ============================================

-- System Config (singleton)
CREATE TABLE system_config (
  id TEXT PRIMARY KEY DEFAULT 'system',
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  setup_completed_at TIMESTAMPTZ,
  setup_completed_by UUID,
  version TEXT NOT NULL DEFAULT '0.1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Families (Tenants)
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Family Members
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  -- Link to Supabase Auth (NULL for kiosk-only children)
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  email TEXT UNIQUE, -- Keep for migration, will be deprecated
  password_hash TEXT, -- Keep for migration, will be deprecated
  pin TEXT, -- Hashed, for kiosk mode
  role role NOT NULL,
  birth_date DATE,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,

  CONSTRAINT unique_auth_user_per_family UNIQUE (family_id, auth_user_id)
);

CREATE INDEX idx_family_members_family ON family_members(family_id);
CREATE INDEX idx_family_members_auth_user ON family_members(auth_user_id);
CREATE INDEX idx_family_members_email ON family_members(email);

-- Module Configuration
CREATE TABLE module_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  module_id module_id NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_family_module UNIQUE (family_id, module_id)
);

-- Member Module Access
CREATE TABLE member_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  module_id module_id NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_member_module UNIQUE (member_id, module_id)
);

-- Dashboard Layouts
CREATE TABLE dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES family_members(id) ON DELETE CASCADE,
  layout JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dashboard_layouts_member ON dashboard_layouts(member_id);

-- Kiosk Sessions
CREATE TABLE kiosk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL UNIQUE,
  session_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auto_lock_minutes INT NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kiosk_sessions_family ON kiosk_sessions(family_id);
CREATE INDEX idx_kiosk_sessions_device ON kiosk_sessions(device_id);
CREATE INDEX idx_kiosk_sessions_token ON kiosk_sessions(session_token);

-- Kiosk Settings
CREATE TABLE kiosk_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL UNIQUE REFERENCES families(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_lock_minutes INT NOT NULL DEFAULT 15,
  enabled_widgets TEXT[] DEFAULT ARRAY['chores', 'calendar', 'weather'],
  allow_guest_view BOOLEAN NOT NULL DEFAULT true,
  require_pin_for_switch BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to core tables
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_module_configurations_updated_at BEFORE UPDATE ON module_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_member_module_access_updated_at BEFORE UPDATE ON member_module_access FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboard_layouts_updated_at BEFORE UPDATE ON dashboard_layouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kiosk_sessions_updated_at BEFORE UPDATE ON kiosk_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kiosk_settings_updated_at BEFORE UPDATE ON kiosk_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
