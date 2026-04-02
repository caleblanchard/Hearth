-- Hearth Cloud Deployment Migration 00002
-- Module Tables: All feature-specific tables
-- Generated from Prisma schema

-- ============================================
-- CHORES MODULE
-- ============================================

CREATE TABLE chore_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  estimated_minutes INT NOT NULL,
  difficulty difficulty NOT NULL,
  credit_value INT NOT NULL DEFAULT 0,
  minimum_age INT,
  icon_name TEXT NOT NULL DEFAULT 'task',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chore_definitions_family_active ON chore_definitions(family_id, is_active);

CREATE TABLE chore_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_definition_id UUID NOT NULL REFERENCES chore_definitions(id) ON DELETE CASCADE,
  assignment_type assignment_type NOT NULL,
  frequency frequency NOT NULL,
  custom_cron TEXT,
  day_of_week INT,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  requires_photo BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chore_schedules_definition_active ON chore_schedules(chore_definition_id, is_active);

CREATE TABLE chore_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_schedule_id UUID NOT NULL REFERENCES chore_schedules(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  rotation_order INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chore_assignments_schedule_member ON chore_assignments(chore_schedule_id, member_id);

CREATE TABLE chore_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_schedule_id UUID NOT NULL REFERENCES chore_schedules(id) ON DELETE CASCADE,
  assigned_to_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ NOT NULL,
  status chore_status NOT NULL DEFAULT 'PENDING',
  completed_at TIMESTAMPTZ,
  completed_by_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  photo_url TEXT,
  notes TEXT,
  credits_awarded INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chore_instances_schedule_due_status ON chore_instances(chore_schedule_id, due_date, status);
CREATE INDEX idx_chore_instances_assigned_due ON chore_instances(assigned_to_id, due_date);

-- ============================================
-- SCREEN TIME MODULE
-- ============================================

CREATE TABLE screen_time_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES family_members(id) ON DELETE CASCADE,
  weekly_allocation_minutes INT NOT NULL,
  reset_day reset_day NOT NULL DEFAULT 'SUNDAY',
  rollover_type rollover_type NOT NULL DEFAULT 'NONE',
  rollover_cap_minutes INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_screen_time_settings_member ON screen_time_settings(member_id);

CREATE TABLE screen_time_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES family_members(id) ON DELETE CASCADE,
  current_balance_minutes INT NOT NULL,
  week_start_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_screen_time_balances_member_week ON screen_time_balances(member_id, week_start_date);

CREATE TABLE screen_time_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_screen_time_types_family_active ON screen_time_types(family_id, is_active, is_archived);

CREATE TABLE screen_time_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  screen_time_type_id UUID NOT NULL REFERENCES screen_time_types(id) ON DELETE CASCADE,
  allowance_minutes INT NOT NULL,
  period screen_time_period NOT NULL DEFAULT 'WEEKLY',
  rollover_enabled BOOLEAN NOT NULL DEFAULT false,
  rollover_cap_minutes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_member_screen_time_type UNIQUE (member_id, screen_time_type_id)
);

CREATE INDEX idx_screen_time_allowances_member ON screen_time_allowances(member_id);
CREATE INDEX idx_screen_time_allowances_type ON screen_time_allowances(screen_time_type_id);

CREATE TABLE screen_time_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  type screen_time_transaction_type NOT NULL,
  amount_minutes INT NOT NULL,
  balance_after INT NOT NULL,
  device_type device_type,
  screen_time_type_id UUID REFERENCES screen_time_types(id) ON DELETE SET NULL,
  reason TEXT,
  related_chore_instance_id UUID,
  created_by_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  notes TEXT,
  was_override BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_screen_time_transactions_member_created ON screen_time_transactions(member_id, created_at);
CREATE INDEX idx_screen_time_transactions_type ON screen_time_transactions(screen_time_type_id);

CREATE TABLE screen_time_grace_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES family_members(id) ON DELETE CASCADE,
  grace_period_minutes INT NOT NULL DEFAULT 15,
  max_grace_per_day INT NOT NULL DEFAULT 1,
  max_grace_per_week INT NOT NULL DEFAULT 3,
  grace_repayment_mode grace_repayment_mode NOT NULL DEFAULT 'DEDUCT_NEXT_WEEK',
  low_balance_warning_minutes INT NOT NULL DEFAULT 10,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_screen_time_grace_settings_member ON screen_time_grace_settings(member_id);

CREATE TABLE grace_period_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  minutes_granted INT NOT NULL,
  reason TEXT,
  approved_by_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  repayment_status repayment_status NOT NULL DEFAULT 'PENDING',
  repaid_at TIMESTAMPTZ,
  related_transaction_id UUID
);

CREATE INDEX idx_grace_period_logs_member_requested ON grace_period_logs(member_id, requested_at);

-- ============================================
-- CREDITS MODULE
-- ============================================

CREATE TABLE credit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES family_members(id) ON DELETE CASCADE,
  current_balance INT NOT NULL DEFAULT 0,
  lifetime_earned INT NOT NULL DEFAULT 0,
  lifetime_spent INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_balances_member ON credit_balances(member_id);

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  type credit_transaction_type NOT NULL,
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  reason TEXT,
  category spending_category NOT NULL DEFAULT 'OTHER',
  related_chore_instance_id UUID,
  adjusted_by_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_transactions_member_created ON credit_transactions(member_id, created_at);
CREATE INDEX idx_credit_transactions_member_type_category ON credit_transactions(member_id, created_at, type, category);

-- ============================================
-- REWARDS MODULE
-- ============================================

CREATE TABLE reward_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category reward_category NOT NULL DEFAULT 'OTHER',
  cost_credits INT NOT NULL,
  quantity INT,
  image_url TEXT,
  status reward_status NOT NULL DEFAULT 'ACTIVE',
  created_by_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reward_items_family_status ON reward_items(family_id, status);

CREATE TABLE reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES reward_items(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  credit_transaction_id UUID UNIQUE,
  status redemption_status NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejected_by_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reward_redemptions_member_status ON reward_redemptions(member_id, status);
CREATE INDEX idx_reward_redemptions_status_requested ON reward_redemptions(status, requested_at);

-- ============================================
-- TODO MODULE
-- ============================================

CREATE TABLE todo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  assigned_to_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  priority todo_priority NOT NULL DEFAULT 'MEDIUM',
  category TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  status todo_status NOT NULL DEFAULT 'PENDING',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_todo_items_family_status_due ON todo_items(family_id, status, due_date);
CREATE INDEX idx_todo_items_assigned ON todo_items(assigned_to_id);

-- ============================================
-- SHOPPING MODULE
-- ============================================

CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopping_lists_family_active ON shopping_lists(family_id, is_active);

CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit TEXT,
  category TEXT,
  priority shopping_priority NOT NULL DEFAULT 'NORMAL',
  status shopping_status NOT NULL DEFAULT 'PENDING',
  requested_by_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  added_by_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  purchased_by_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ,
  project_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopping_items_list_status ON shopping_items(list_id, status);
CREATE INDEX idx_shopping_items_project ON shopping_items(project_id);

-- ============================================
-- CALENDAR MODULE
-- ============================================

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  event_type event_type NOT NULL DEFAULT 'INTERNAL',
  external_id TEXT,
  color TEXT,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  project_id UUID,
  created_by_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  calendar_connection_id UUID,
  external_subscription_id UUID,
  google_event_id TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_hash TEXT
);

CREATE INDEX idx_calendar_events_family_time ON calendar_events(family_id, start_time, end_time);
CREATE INDEX idx_calendar_events_project ON calendar_events(project_id);
CREATE INDEX idx_calendar_events_google_id ON calendar_events(google_event_id);
CREATE INDEX idx_calendar_events_connection ON calendar_events(calendar_connection_id);
CREATE INDEX idx_calendar_events_subscription ON calendar_events(external_subscription_id);
CREATE INDEX idx_calendar_events_sync_hash ON calendar_events(sync_hash);

CREATE TABLE calendar_event_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_event_member UNIQUE (event_id, member_id)
);

CREATE INDEX idx_calendar_event_assignments_member ON calendar_event_assignments(member_id);

-- Calendar Connections (OAuth)
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  provider calendar_provider NOT NULL DEFAULT 'GOOGLE',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  google_calendar_id TEXT,
  google_email TEXT,
  sync_token TEXT,
  last_sync_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  sync_status sync_status NOT NULL DEFAULT 'ACTIVE',
  sync_error TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  import_from_google BOOLEAN NOT NULL DEFAULT true,
  export_to_google BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_member_provider UNIQUE (member_id, provider)
);

CREATE INDEX idx_calendar_connections_member ON calendar_connections(member_id);
CREATE INDEX idx_calendar_connections_family ON calendar_connections(family_id);
CREATE INDEX idx_calendar_connections_status_next ON calendar_connections(sync_status, next_sync_at);

CREATE TABLE external_calendar_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#9CA3AF',
  last_sync_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  sync_status sync_status NOT NULL DEFAULT 'ACTIVE',
  sync_error TEXT,
  etag TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  refresh_interval INT NOT NULL DEFAULT 1440,
  created_by_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_external_calendar_subscriptions_family ON external_calendar_subscriptions(family_id);
CREATE INDEX idx_external_calendar_subscriptions_active_next ON external_calendar_subscriptions(is_active, next_sync_at);

CREATE TABLE calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE SET NULL,
  external_subscription_id UUID REFERENCES external_calendar_subscriptions(id) ON DELETE SET NULL,
  sync_direction sync_direction NOT NULL,
  status TEXT NOT NULL,
  events_added INT NOT NULL DEFAULT 0,
  events_updated INT NOT NULL DEFAULT 0,
  events_deleted INT NOT NULL DEFAULT 0,
  events_skipped INT NOT NULL DEFAULT 0,
  error_message TEXT,
  duration INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_sync_logs_family_created ON calendar_sync_logs(family_id, created_at);
CREATE INDEX idx_calendar_sync_logs_connection ON calendar_sync_logs(calendar_connection_id);
CREATE INDEX idx_calendar_sync_logs_subscription ON calendar_sync_logs(external_subscription_id);

-- ============================================
-- GUEST ACCESS MODULE
-- ============================================

CREATE TABLE guest_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  invited_by_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  access_level guest_access_level NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  invite_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INT NOT NULL DEFAULT 1,
  use_count INT NOT NULL DEFAULT 0,
  status invite_status NOT NULL DEFAULT 'PENDING',
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_guest_invites_family_status ON guest_invites(family_id, status);
CREATE INDEX idx_guest_invites_code ON guest_invites(invite_code);
CREATE INDEX idx_guest_invites_token ON guest_invites(invite_token);

CREATE TABLE guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_invite_id UUID NOT NULL REFERENCES guest_invites(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_guest_sessions_invite ON guest_sessions(guest_invite_id);
CREATE INDEX idx_guest_sessions_token ON guest_sessions(session_token);

-- ============================================
-- FILE STORAGE MODULE
-- ============================================

CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  uploaded_by_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  entity_id TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_provider storage_provider NOT NULL DEFAULT 'LOCAL',
  mime_type TEXT NOT NULL,
  file_size_bytes INT NOT NULL,
  thumbnail_path TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_file_uploads_family_entity ON file_uploads(family_id, entity_type, entity_id);

-- ============================================
-- AUDIT LOGGING MODULE
-- ============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  session_id TEXT,
  action audit_action NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  previous_value JSONB,
  new_value JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  result audit_result NOT NULL DEFAULT 'SUCCESS',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_audit_logs_family_action_created ON audit_logs(family_id, action, created_at);
CREATE INDEX idx_audit_logs_member_created ON audit_logs(member_id, created_at);

-- ============================================
-- NOTIFICATIONS MODULE
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, is_read, created_at);

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES family_members(id) ON DELETE CASCADE,
  enabled_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  leftover_expiring_hours INT NOT NULL DEFAULT 24,
  document_expiring_days INT NOT NULL DEFAULT 90,
  carpool_reminder_minutes INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- GAMIFICATION MODULE
-- ============================================

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category achievement_category NOT NULL,
  tier badge_tier NOT NULL DEFAULT 'BRONZE',
  icon_name TEXT NOT NULL,
  requirement INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_achievements_category_tier ON achievements(category, tier);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress INT NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_completed ON user_achievements(user_id, is_completed);

CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  type streak_type NOT NULL,
  current_count INT NOT NULL DEFAULT 0,
  longest_count INT NOT NULL DEFAULT 0,
  last_activity_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  frozen_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_streak UNIQUE (user_id, type)
);

CREATE INDEX idx_streaks_user_active ON streaks(user_id, is_active);

CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  period_key TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  rank INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_period UNIQUE (user_id, period, period_key)
);

CREATE INDEX idx_leaderboard_entries_family_period_score ON leaderboard_entries(family_id, period, period_key, score);

-- ============================================
-- FINANCIAL MODULE
-- ============================================

CREATE TABLE allowance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  frequency frequency NOT NULL,
  day_of_week INT,
  day_of_month INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  last_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_allowance_schedules_member_active ON allowance_schedules(member_id, is_active);
CREATE INDEX idx_allowance_schedules_active_paused_processed ON allowance_schedules(is_active, is_paused, last_processed_at);

CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_amount INT NOT NULL,
  current_amount INT NOT NULL DEFAULT 0,
  icon_name TEXT NOT NULL DEFAULT 'currency-dollar',
  color TEXT NOT NULL DEFAULT 'blue',
  deadline TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_savings_goals_member_completed ON savings_goals(member_id, is_completed);

CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  category spending_category NOT NULL,
  limit_amount INT NOT NULL,
  period TEXT NOT NULL,
  reset_day INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_member_category_period UNIQUE (member_id, category, period)
);

CREATE INDEX idx_budgets_member_active ON budgets(member_id, is_active);

CREATE TABLE budget_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  spent INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_budget_period UNIQUE (budget_id, period_key)
);

CREATE INDEX idx_budget_periods_budget_start ON budget_periods(budget_id, period_start);

-- ============================================
-- ROUTINES MODULE
-- ============================================

CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type routine_type NOT NULL,
  is_weekday BOOLEAN NOT NULL DEFAULT true,
  is_weekend BOOLEAN NOT NULL DEFAULT true,
  assigned_to UUID REFERENCES family_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_routines_family_assigned ON routines(family_id, assigned_to);

CREATE TABLE routine_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  estimated_minutes INT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_routine_steps_routine_order ON routine_steps(routine_id, sort_order);

CREATE TABLE routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date TIMESTAMPTZ NOT NULL,

  CONSTRAINT unique_routine_member_date UNIQUE (routine_id, member_id, date)
);

CREATE INDEX idx_routine_completions_member_date ON routine_completions(member_id, date);
CREATE INDEX idx_routine_completions_routine_date ON routine_completions(routine_id, date);

-- ============================================
-- COMMUNICATION MODULE
-- ============================================

CREATE TABLE communication_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  type post_type NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  author_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_communication_posts_family_created ON communication_posts(family_id, created_at);
CREATE INDEX idx_communication_posts_family_pinned ON communication_posts(family_id, is_pinned);

CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES communication_posts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_post_member_emoji UNIQUE (post_id, member_id, emoji)
);

CREATE INDEX idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX idx_post_reactions_member ON post_reactions(member_id);

-- ============================================
-- MEAL PLANNING MODULE
-- ============================================

CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  week_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_family_week UNIQUE (family_id, week_start)
);

CREATE INDEX idx_meal_plans_family ON meal_plans(family_id);
CREATE INDEX idx_meal_plans_week ON meal_plans(week_start);

CREATE TABLE meal_plan_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  meal_type meal_type NOT NULL,
  recipe_id UUID,
  custom_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_plan_entries_plan ON meal_plan_entries(meal_plan_id);
CREATE INDEX idx_meal_plan_entries_date ON meal_plan_entries(date);

CREATE TABLE meal_plan_dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_entry_id UUID NOT NULL REFERENCES meal_plan_entries(id) ON DELETE CASCADE,
  recipe_id UUID,
  dish_name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_plan_dishes_entry ON meal_plan_dishes(meal_entry_id);
CREATE INDEX idx_meal_plan_dishes_recipe ON meal_plan_dishes(recipe_id);

-- ============================================
-- LEFTOVERS MODULE
-- ============================================

CREATE TABLE leftovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meal_plan_entry_id UUID,
  quantity TEXT,
  stored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  tossed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leftovers_family ON leftovers(family_id);
CREATE INDEX idx_leftovers_expires ON leftovers(expires_at);
CREATE INDEX idx_leftovers_family_active ON leftovers(family_id, used_at, tossed_at);

-- ============================================
-- RECIPES MODULE
-- ============================================

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prep_time_minutes INT,
  cook_time_minutes INT,
  servings INT NOT NULL DEFAULT 4,
  difficulty difficulty NOT NULL DEFAULT 'MEDIUM',
  image_url TEXT,
  source_url TEXT,
  instructions TEXT NOT NULL,
  notes TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  category recipe_category,
  dietary_tags dietary_tag[] DEFAULT ARRAY[]::dietary_tag[],
  created_by UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_family ON recipes(family_id);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_favorite ON recipes(is_favorite);

CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity DOUBLE PRECISION,
  unit TEXT,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

CREATE TABLE recipe_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  rating INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_recipe_member UNIQUE (recipe_id, member_id)
);

CREATE INDEX idx_recipe_ratings_recipe ON recipe_ratings(recipe_id);

-- Add foreign key for meal_plan_dishes -> recipes
ALTER TABLE meal_plan_dishes ADD CONSTRAINT fk_meal_plan_dishes_recipe
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL;

-- ============================================
-- PET CARE MODULE
-- ============================================

CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species pet_species NOT NULL,
  breed TEXT,
  birthday TIMESTAMPTZ,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pets_family ON pets(family_id);

CREATE TABLE pet_feedings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  fed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fed_by UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  food_type TEXT,
  amount TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pet_feedings_pet ON pet_feedings(pet_id);
CREATE INDEX idx_pet_feedings_fed_at ON pet_feedings(fed_at);

CREATE TABLE pet_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  min_interval_hours INT,
  last_given_at TIMESTAMPTZ,
  last_given_by UUID,
  next_dose_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pet_medications_pet ON pet_medications(pet_id);
CREATE INDEX idx_pet_medications_next_dose ON pet_medications(next_dose_at);

CREATE TABLE pet_medication_doses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES pet_medications(id) ON DELETE CASCADE,
  given_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  given_by UUID NOT NULL,
  dosage TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pet_medication_doses_medication ON pet_medication_doses(medication_id);
CREATE INDEX idx_pet_medication_doses_given_at ON pet_medication_doses(given_at);

CREATE TABLE pet_vet_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  visit_date TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  diagnosis TEXT,
  treatment TEXT,
  cost DOUBLE PRECISION,
  next_visit TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pet_vet_visits_pet ON pet_vet_visits(pet_id);
CREATE INDEX idx_pet_vet_visits_date ON pet_vet_visits(visit_date);

CREATE TABLE pet_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  weight DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_pet_weights_pet ON pet_weights(pet_id);
CREATE INDEX idx_pet_weights_recorded_at ON pet_weights(recorded_at);

-- ============================================
-- INVENTORY MODULE
-- ============================================

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category inventory_category NOT NULL,
  location inventory_location NOT NULL,
  current_quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  low_stock_threshold DOUBLE PRECISION,
  expires_at TIMESTAMPTZ,
  barcode TEXT,
  notes TEXT,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_items_family ON inventory_items(family_id);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_inventory_items_expires ON inventory_items(expires_at);
CREATE INDEX idx_inventory_items_quantity ON inventory_items(current_quantity);

-- ============================================
-- MAINTENANCE MODULE
-- ============================================

CREATE TABLE maintenance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category maintenance_category NOT NULL,
  frequency TEXT NOT NULL,
  season season,
  last_completed_at TIMESTAMPTZ,
  next_due_at TIMESTAMPTZ,
  estimated_cost DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_items_family ON maintenance_items(family_id);
CREATE INDEX idx_maintenance_items_next_due ON maintenance_items(next_due_at);
CREATE INDEX idx_maintenance_items_category ON maintenance_items(category);

CREATE TABLE maintenance_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_item_id UUID NOT NULL REFERENCES maintenance_items(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_by UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  cost DOUBLE PRECISION,
  service_provider TEXT,
  notes TEXT,
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[]
);

CREATE INDEX idx_maintenance_completions_item ON maintenance_completions(maintenance_item_id);
CREATE INDEX idx_maintenance_completions_completed_at ON maintenance_completions(completed_at);

-- ============================================
-- TRANSPORT MODULE
-- ============================================

CREATE TABLE transport_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transport_locations_family ON transport_locations(family_id);

CREATE TABLE transport_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transport_drivers_family ON transport_drivers(family_id);

CREATE TABLE carpool_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_carpool_groups_family ON carpool_groups(family_id);

CREATE TABLE carpool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carpool_id UUID NOT NULL REFERENCES carpool_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_carpool_members_carpool ON carpool_members(carpool_id);

CREATE TABLE transport_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,
  time TEXT NOT NULL,
  type transport_type NOT NULL,
  location_id UUID REFERENCES transport_locations(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES transport_drivers(id) ON DELETE SET NULL,
  carpool_id UUID REFERENCES carpool_groups(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transport_schedules_family ON transport_schedules(family_id);
CREATE INDEX idx_transport_schedules_member ON transport_schedules(member_id);
CREATE INDEX idx_transport_schedules_day ON transport_schedules(day_of_week);

-- ============================================
-- DOCUMENTS MODULE
-- ============================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category document_category NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT NOT NULL,
  mime_type TEXT NOT NULL,
  document_number TEXT,
  issued_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  uploaded_by UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  access_list TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_family ON documents(family_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_expires ON documents(expires_at);

CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_document_versions_document ON document_versions(document_id);

CREATE TABLE document_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  password TEXT,
  access_count INT NOT NULL DEFAULT 0,
  max_access INT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID
);

CREATE INDEX idx_document_share_links_document ON document_share_links(document_id);
CREATE INDEX idx_document_share_links_token ON document_share_links(token);

CREATE TABLE document_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  accessed_by UUID REFERENCES family_members(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  via_share_link UUID
);

CREATE INDEX idx_document_access_logs_document ON document_access_logs(document_id);
CREATE INDEX idx_document_access_logs_accessed_by ON document_access_logs(accessed_by);

-- ============================================
-- MEDICATION SAFETY MODULE
-- ============================================

CREATE TABLE medication_safety (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  active_ingredient TEXT,
  min_interval_hours INT NOT NULL,
  max_doses_per_day INT,
  last_dose_at TIMESTAMPTZ,
  next_dose_available_at TIMESTAMPTZ,
  notify_when_ready BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medication_safety_member ON medication_safety(member_id);
CREATE INDEX idx_medication_safety_next_dose ON medication_safety(next_dose_available_at);

CREATE TABLE medication_doses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_safety_id UUID NOT NULL REFERENCES medication_safety(id) ON DELETE CASCADE,
  given_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  given_by UUID NOT NULL,
  dosage TEXT NOT NULL,
  notes TEXT,
  was_override BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  override_approved_by UUID
);

CREATE INDEX idx_medication_doses_medication ON medication_doses(medication_safety_id);
CREATE INDEX idx_medication_doses_given_at ON medication_doses(given_at);

-- ============================================
-- HEALTH MODULE
-- ============================================

CREATE TABLE health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  event_type health_event_type NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  severity INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_events_member ON health_events(member_id);
CREATE INDEX idx_health_events_started_at ON health_events(started_at);
CREATE INDEX idx_health_events_type ON health_events(event_type);

CREATE TABLE health_symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_event_id UUID NOT NULL REFERENCES health_events(id) ON DELETE CASCADE,
  symptom_type symptom_type NOT NULL,
  severity INT NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_symptoms_event ON health_symptoms(health_event_id);
CREATE INDEX idx_health_symptoms_recorded_at ON health_symptoms(recorded_at);

CREATE TABLE health_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_event_id UUID NOT NULL REFERENCES health_events(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  given_at TIMESTAMPTZ NOT NULL,
  given_by UUID NOT NULL,
  next_dose_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_health_medications_event ON health_medications(health_event_id);
CREATE INDEX idx_health_medications_given_at ON health_medications(given_at);
CREATE INDEX idx_health_medications_next_dose ON health_medications(next_dose_at);

CREATE TABLE temperature_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  temperature DOUBLE PRECISION NOT NULL,
  method temp_method NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_temperature_logs_member ON temperature_logs(member_id);
CREATE INDEX idx_temperature_logs_recorded_at ON temperature_logs(recorded_at);

CREATE TABLE medical_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES family_members(id) ON DELETE CASCADE,
  blood_type TEXT,
  allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
  conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
  medications TEXT[] DEFAULT ARRAY[]::TEXT[],
  weight DOUBLE PRECISION,
  weight_unit TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- SICK MODE MODULE
-- ============================================

CREATE TABLE sick_mode_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ended_by_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  triggered_by sick_mode_trigger NOT NULL,
  health_event_id UUID REFERENCES health_events(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sick_mode_instances_family_active ON sick_mode_instances(family_id, is_active);
CREATE INDEX idx_sick_mode_instances_member_active ON sick_mode_instances(member_id, is_active);

CREATE TABLE sick_mode_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL UNIQUE REFERENCES families(id) ON DELETE CASCADE,
  auto_enable_on_temperature BOOLEAN NOT NULL DEFAULT true,
  temperature_threshold DECIMAL NOT NULL DEFAULT 100.4,
  auto_disable_after_24_hours BOOLEAN NOT NULL DEFAULT false,
  pause_chores BOOLEAN NOT NULL DEFAULT true,
  pause_screen_time_tracking BOOLEAN NOT NULL DEFAULT true,
  screen_time_bonus INT NOT NULL DEFAULT 120,
  skip_morning_routine BOOLEAN NOT NULL DEFAULT true,
  skip_bedtime_routine BOOLEAN NOT NULL DEFAULT false,
  mute_non_essential_notifs BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- AUTOMATION/RULES MODULE
-- ============================================

CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger JSONB NOT NULL,
  conditions JSONB,
  actions JSONB NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_by_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_rules_family_enabled ON automation_rules(family_id, is_enabled);
CREATE INDEX idx_automation_rules_created ON automation_rules(created_at);

CREATE TABLE rule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  result JSONB,
  error TEXT,
  metadata JSONB,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rule_executions_rule_executed ON rule_executions(rule_id, executed_at);
CREATE INDEX idx_rule_executions_success_executed ON rule_executions(success, executed_at);

-- ============================================
-- PROJECTS MODULE
-- ============================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'ACTIVE',
  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  budget DOUBLE PRECISION,
  notes TEXT,
  created_by_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_family_status ON projects(family_id, status);
CREATE INDEX idx_projects_created ON projects(created_at);

CREATE TABLE project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  status task_status NOT NULL DEFAULT 'PENDING',
  assignee_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  estimated_hours DOUBLE PRECISION,
  actual_hours DOUBLE PRECISION,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_tasks_project_order ON project_tasks(project_id, sort_order);
CREATE INDEX idx_project_tasks_assignee ON project_tasks(assignee_id);
CREATE INDEX idx_project_tasks_status ON project_tasks(status);

CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dependent_task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  blocking_task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  dependency_type dependency_type NOT NULL DEFAULT 'FINISH_TO_START',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_dependency UNIQUE (dependent_task_id, blocking_task_id)
);

CREATE INDEX idx_task_dependencies_dependent ON task_dependencies(dependent_task_id);
CREATE INDEX idx_task_dependencies_blocking ON task_dependencies(blocking_task_id);

-- Add foreign key for shopping_items -> projects
ALTER TABLE shopping_items ADD CONSTRAINT fk_shopping_items_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- Add foreign key for calendar_events -> projects
ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- Add foreign key for calendar_events -> calendar_connections
ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_connection
  FOREIGN KEY (calendar_connection_id) REFERENCES calendar_connections(id) ON DELETE SET NULL;

-- Add foreign key for calendar_events -> external_calendar_subscriptions
ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_subscription
  FOREIGN KEY (external_subscription_id) REFERENCES external_calendar_subscriptions(id) ON DELETE SET NULL;

-- ============================================
-- UPDATED_AT TRIGGERS FOR ALL TABLES
-- ============================================

CREATE TRIGGER update_chore_definitions_updated_at BEFORE UPDATE ON chore_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chore_schedules_updated_at BEFORE UPDATE ON chore_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chore_assignments_updated_at BEFORE UPDATE ON chore_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chore_instances_updated_at BEFORE UPDATE ON chore_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_screen_time_settings_updated_at BEFORE UPDATE ON screen_time_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_screen_time_balances_updated_at BEFORE UPDATE ON screen_time_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_screen_time_types_updated_at BEFORE UPDATE ON screen_time_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_screen_time_allowances_updated_at BEFORE UPDATE ON screen_time_allowances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_screen_time_grace_settings_updated_at BEFORE UPDATE ON screen_time_grace_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_balances_updated_at BEFORE UPDATE ON credit_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reward_items_updated_at BEFORE UPDATE ON reward_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reward_redemptions_updated_at BEFORE UPDATE ON reward_redemptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_todo_items_updated_at BEFORE UPDATE ON todo_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_items_updated_at BEFORE UPDATE ON shopping_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_connections_updated_at BEFORE UPDATE ON calendar_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_external_calendar_subscriptions_updated_at BEFORE UPDATE ON external_calendar_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON achievements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_achievements_updated_at BEFORE UPDATE ON user_achievements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_streaks_updated_at BEFORE UPDATE ON streaks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leaderboard_entries_updated_at BEFORE UPDATE ON leaderboard_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_allowance_schedules_updated_at BEFORE UPDATE ON allowance_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON savings_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_periods_updated_at BEFORE UPDATE ON budget_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routines_updated_at BEFORE UPDATE ON routines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_posts_updated_at BEFORE UPDATE ON communication_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_plan_entries_updated_at BEFORE UPDATE ON meal_plan_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_plan_dishes_updated_at BEFORE UPDATE ON meal_plan_dishes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leftovers_updated_at BEFORE UPDATE ON leftovers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON pets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pet_medications_updated_at BEFORE UPDATE ON pet_medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pet_vet_visits_updated_at BEFORE UPDATE ON pet_vet_visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_items_updated_at BEFORE UPDATE ON maintenance_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transport_locations_updated_at BEFORE UPDATE ON transport_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transport_drivers_updated_at BEFORE UPDATE ON transport_drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carpool_groups_updated_at BEFORE UPDATE ON carpool_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transport_schedules_updated_at BEFORE UPDATE ON transport_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medication_safety_updated_at BEFORE UPDATE ON medication_safety FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_health_events_updated_at BEFORE UPDATE ON health_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sick_mode_instances_updated_at BEFORE UPDATE ON sick_mode_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sick_mode_settings_updated_at BEFORE UPDATE ON sick_mode_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
