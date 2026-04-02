-- Hearth Cloud Deployment Migration 00005
-- Additional Performance Indexes and Optimizations
-- These complement the indexes created in previous migrations

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================

-- Chores: Get pending chores for a member on a date range
CREATE INDEX IF NOT EXISTS idx_chore_instances_member_status_due
  ON chore_instances(assigned_to_id, status, due_date)
  WHERE status = 'PENDING';

-- Screen time: Get transactions for a member in a date range
CREATE INDEX IF NOT EXISTS idx_screen_time_transactions_member_type_date
  ON screen_time_transactions(member_id, type, created_at DESC);

-- Credits: Get transaction history with type filtering
CREATE INDEX IF NOT EXISTS idx_credit_transactions_member_type_date
  ON credit_transactions(member_id, type, created_at DESC);

-- Calendar: Get events in a date range for a family
CREATE INDEX IF NOT EXISTS idx_calendar_events_family_range
  ON calendar_events(family_id, start_time, end_time)
  WHERE event_type = 'INTERNAL';

-- Notifications: Get unread notifications efficiently
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE is_read = false;

-- Leftovers: Active leftovers (not used or tossed)
CREATE INDEX IF NOT EXISTS idx_leftovers_family_active_expires
  ON leftovers(family_id, expires_at)
  WHERE used_at IS NULL AND tossed_at IS NULL;

-- Routines: Get routines for a specific day type
CREATE INDEX IF NOT EXISTS idx_routines_family_weekday
  ON routines(family_id)
  WHERE is_weekday = true;

CREATE INDEX IF NOT EXISTS idx_routines_family_weekend
  ON routines(family_id)
  WHERE is_weekend = true;

-- ============================================
-- PARTIAL INDEXES FOR FILTERED QUERIES
-- ============================================

-- Active chore definitions only
CREATE INDEX IF NOT EXISTS idx_chore_definitions_family_active_only
  ON chore_definitions(family_id, name)
  WHERE is_active = true;

-- Active reward items only
CREATE INDEX IF NOT EXISTS idx_reward_items_family_active_only
  ON reward_items(family_id, cost_credits)
  WHERE status = 'ACTIVE';

-- Pending redemptions
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_pending
  ON reward_redemptions(requested_at DESC)
  WHERE status = 'PENDING';

-- Active automation rules
CREATE INDEX IF NOT EXISTS idx_automation_rules_family_active_only
  ON automation_rules(family_id)
  WHERE is_enabled = true;

-- Active kiosk sessions
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_family_active_only
  ON kiosk_sessions(family_id)
  WHERE is_active = true;

-- Active projects
CREATE INDEX IF NOT EXISTS idx_projects_family_active_only
  ON projects(family_id, due_date)
  WHERE status = 'ACTIVE';

-- Pending project tasks
CREATE INDEX IF NOT EXISTS idx_project_tasks_pending
  ON project_tasks(project_id, due_date)
  WHERE status IN ('PENDING', 'IN_PROGRESS');

-- ============================================
-- TEXT SEARCH INDEXES
-- ============================================

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Recipe name search
CREATE INDEX IF NOT EXISTS idx_recipes_name_trgm
  ON recipes USING gin(name gin_trgm_ops);

-- Inventory item search
CREATE INDEX IF NOT EXISTS idx_inventory_items_name_trgm
  ON inventory_items USING gin(name gin_trgm_ops);

-- Shopping item search
CREATE INDEX IF NOT EXISTS idx_shopping_items_name_trgm
  ON shopping_items USING gin(name gin_trgm_ops);

-- ============================================
-- JSONB INDEXES FOR SETTINGS/METADATA
-- ============================================

-- Family settings JSONB index
CREATE INDEX IF NOT EXISTS idx_families_settings
  ON families USING gin(settings);

-- Module configuration settings
CREATE INDEX IF NOT EXISTS idx_module_configurations_settings
  ON module_configurations USING gin(settings);

-- Automation rule trigger type
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger_type
  ON automation_rules USING gin((trigger->'type'));

-- ============================================
-- ARRAY INDEXES
-- ============================================

-- Recipe dietary tags
CREATE INDEX IF NOT EXISTS idx_recipes_dietary_tags
  ON recipes USING gin(dietary_tags);

-- Document tags
CREATE INDEX IF NOT EXISTS idx_documents_tags
  ON documents USING gin(tags);

-- ============================================
-- STATISTICS FOR QUERY PLANNING
-- ============================================

-- Increase statistics target for frequently filtered columns
ALTER TABLE chore_instances ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE chore_instances ALTER COLUMN due_date SET STATISTICS 1000;
ALTER TABLE calendar_events ALTER COLUMN start_time SET STATISTICS 1000;
ALTER TABLE notifications ALTER COLUMN is_read SET STATISTICS 1000;

-- ============================================
-- ANALYZE TABLES
-- ============================================

ANALYZE families;
ANALYZE family_members;
ANALYZE chore_definitions;
ANALYZE chore_schedules;
ANALYZE chore_assignments;
ANALYZE chore_instances;
ANALYZE calendar_events;
ANALYZE notifications;
ANALYZE recipes;
ANALYZE automation_rules;
