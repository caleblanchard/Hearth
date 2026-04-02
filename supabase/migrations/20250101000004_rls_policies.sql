-- Hearth Cloud Deployment Migration 00004
-- Row Level Security Policies
-- Enforces multi-tenant data isolation at database level

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

-- Core tables
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_module_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Chores module
ALTER TABLE chore_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_instances ENABLE ROW LEVEL SECURITY;

-- Screen time module
ALTER TABLE screen_time_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_time_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_time_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_time_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_time_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_time_grace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE grace_period_logs ENABLE ROW LEVEL SECURITY;

-- Credits module
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Rewards module
ALTER TABLE reward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Todo module
ALTER TABLE todo_items ENABLE ROW LEVEL SECURITY;

-- Shopping module
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

-- Calendar module
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- Guest module
ALTER TABLE guest_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

-- File storage
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Gamification
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Financial
ALTER TABLE allowance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;

-- Routines
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;

-- Communication
ALTER TABLE communication_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- Meal planning
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leftovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;

-- Pets
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_feedings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_medication_doses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_vet_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_weights ENABLE ROW LEVEL SECURITY;

-- Inventory
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Maintenance
ALTER TABLE maintenance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_completions ENABLE ROW LEVEL SECURITY;

-- Transport
ALTER TABLE transport_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpool_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpool_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_schedules ENABLE ROW LEVEL SECURITY;

-- Documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;

-- Medication safety
ALTER TABLE medication_safety ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_doses ENABLE ROW LEVEL SECURITY;

-- Health
ALTER TABLE health_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE temperature_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_profiles ENABLE ROW LEVEL SECURITY;

-- Sick mode
ALTER TABLE sick_mode_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sick_mode_settings ENABLE ROW LEVEL SECURITY;

-- Automation
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_executions ENABLE ROW LEVEL SECURITY;

-- Projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CORE TABLE POLICIES
-- ============================================

-- Families: Users can only see families they belong to
CREATE POLICY "Users can view their families" ON families
  FOR SELECT USING (id = ANY(get_user_family_ids()));

CREATE POLICY "Parents can update their families" ON families
  FOR UPDATE USING (is_parent_in_family(id));

CREATE POLICY "Parents can insert families" ON families
  FOR INSERT WITH CHECK (true); -- Controlled by signup flow

-- Family Members: Users can see members in their families
CREATE POLICY "Users can view members in their families" ON family_members
  FOR SELECT USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "Parents can manage members" ON family_members
  FOR ALL USING (is_parent_in_family(family_id));

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON family_members
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Module Configurations
CREATE POLICY "family_isolation" ON module_configurations
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

-- Member Module Access
CREATE POLICY "family_isolation" ON member_module_access
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

-- Dashboard Layouts: Users can manage their own
CREATE POLICY "own_layout" ON dashboard_layouts
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
    AND (is_owner(member_id) OR is_parent_in_family(get_family_id_from_member(member_id)))
  );

-- Kiosk Sessions
CREATE POLICY "family_isolation" ON kiosk_sessions
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

-- Kiosk Settings
CREATE POLICY "family_isolation" ON kiosk_settings
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

-- System Config: Only readable, admin-only writes
CREATE POLICY "anyone_can_read" ON system_config
  FOR SELECT USING (true);

-- ============================================
-- CHORES MODULE POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON chore_definitions
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON chore_schedules
  FOR ALL USING (
    get_family_id_from_chore_schedule(id) = ANY(get_user_family_ids())
    OR chore_definition_id IN (
      SELECT id FROM chore_definitions WHERE family_id = ANY(get_user_family_ids())
    )
  );

CREATE POLICY "family_isolation" ON chore_assignments
  FOR ALL USING (
    get_family_id_from_chore_schedule(chore_schedule_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON chore_instances
  FOR ALL USING (
    get_family_id_from_chore_schedule(chore_schedule_id) = ANY(get_user_family_ids())
  );

-- ============================================
-- SCREEN TIME MODULE POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON screen_time_settings
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON screen_time_balances
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON screen_time_types
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON screen_time_allowances
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON screen_time_transactions
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON screen_time_grace_settings
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON grace_period_logs
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

-- ============================================
-- CREDITS MODULE POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON credit_balances
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON credit_transactions
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

-- ============================================
-- REWARDS MODULE POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON reward_items
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON reward_redemptions
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

-- ============================================
-- TODO MODULE POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON todo_items
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

-- ============================================
-- SHOPPING MODULE POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON shopping_lists
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON shopping_items
  FOR ALL USING (
    get_family_id_from_shopping_item(list_id) = ANY(get_user_family_ids())
  );

-- ============================================
-- CALENDAR MODULE POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON calendar_events
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON calendar_event_assignments
  FOR ALL USING (
    event_id IN (SELECT id FROM calendar_events WHERE family_id = ANY(get_user_family_ids()))
  );

CREATE POLICY "family_isolation" ON calendar_connections
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON external_calendar_subscriptions
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON calendar_sync_logs
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

-- ============================================
-- GUEST MODULE POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON guest_invites
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON guest_sessions
  FOR ALL USING (
    guest_invite_id IN (SELECT id FROM guest_invites WHERE family_id = ANY(get_user_family_ids()))
  );

-- ============================================
-- FILE STORAGE POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON file_uploads
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

-- ============================================
-- AUDIT LOG POLICIES
-- ============================================

-- Parents can see audit logs for their family
CREATE POLICY "parents_only" ON audit_logs
  FOR SELECT USING (is_parent_in_family(family_id));

-- System can insert (no user restriction for writes)
CREATE POLICY "system_insert" ON audit_logs
  FOR INSERT WITH CHECK (family_id = ANY(get_user_family_ids()));

-- ============================================
-- NOTIFICATION POLICIES
-- ============================================

-- Users can see their own notifications
CREATE POLICY "own_notifications" ON notifications
  FOR ALL USING (
    get_family_id_from_member(user_id) = ANY(get_user_family_ids())
    AND is_owner(user_id)
  );

CREATE POLICY "own_subscriptions" ON push_subscriptions
  FOR ALL USING (
    get_family_id_from_member(user_id) = ANY(get_user_family_ids())
    AND is_owner(user_id)
  );

CREATE POLICY "own_preferences" ON notification_preferences
  FOR ALL USING (
    get_family_id_from_member(user_id) = ANY(get_user_family_ids())
    AND is_owner(user_id)
  );

-- ============================================
-- GAMIFICATION POLICIES
-- ============================================

-- Achievements are global/readable by all
CREATE POLICY "anyone_can_read" ON achievements
  FOR SELECT USING (true);

CREATE POLICY "family_isolation" ON user_achievements
  FOR ALL USING (
    get_family_id_from_member(user_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON streaks
  FOR ALL USING (
    get_family_id_from_member(user_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON leaderboard_entries
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

-- ============================================
-- FINANCIAL POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON allowance_schedules
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON savings_goals
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON budgets
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON budget_periods
  FOR ALL USING (
    budget_id IN (SELECT id FROM budgets WHERE get_family_id_from_member(member_id) = ANY(get_user_family_ids()))
  );

-- ============================================
-- ROUTINES POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON routines
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON routine_steps
  FOR ALL USING (
    get_family_id_from_routine_step(routine_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON routine_completions
  FOR ALL USING (
    get_family_id_from_routine_step(routine_id) = ANY(get_user_family_ids())
  );

-- ============================================
-- COMMUNICATION POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON communication_posts
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON post_reactions
  FOR ALL USING (
    post_id IN (SELECT id FROM communication_posts WHERE family_id = ANY(get_user_family_ids()))
  );

-- ============================================
-- MEAL PLANNING POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON meal_plans
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON meal_plan_entries
  FOR ALL USING (
    get_family_id_from_meal_plan_entry(meal_plan_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON meal_plan_dishes
  FOR ALL USING (
    meal_entry_id IN (
      SELECT mpe.id FROM meal_plan_entries mpe
      JOIN meal_plans mp ON mp.id = mpe.meal_plan_id
      WHERE mp.family_id = ANY(get_user_family_ids())
    )
  );

CREATE POLICY "family_isolation" ON leftovers
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON recipes
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON recipe_ingredients
  FOR ALL USING (
    recipe_id IN (SELECT id FROM recipes WHERE family_id = ANY(get_user_family_ids()))
  );

CREATE POLICY "family_isolation" ON recipe_ratings
  FOR ALL USING (
    recipe_id IN (SELECT id FROM recipes WHERE family_id = ANY(get_user_family_ids()))
  );

-- ============================================
-- PET POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON pets
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON pet_feedings
  FOR ALL USING (
    pet_id IN (SELECT id FROM pets WHERE family_id = ANY(get_user_family_ids()))
  );

CREATE POLICY "family_isolation" ON pet_medications
  FOR ALL USING (
    pet_id IN (SELECT id FROM pets WHERE family_id = ANY(get_user_family_ids()))
  );

CREATE POLICY "family_isolation" ON pet_medication_doses
  FOR ALL USING (
    medication_id IN (
      SELECT pm.id FROM pet_medications pm
      JOIN pets p ON p.id = pm.pet_id
      WHERE p.family_id = ANY(get_user_family_ids())
    )
  );

CREATE POLICY "family_isolation" ON pet_vet_visits
  FOR ALL USING (
    pet_id IN (SELECT id FROM pets WHERE family_id = ANY(get_user_family_ids()))
  );

CREATE POLICY "family_isolation" ON pet_weights
  FOR ALL USING (
    pet_id IN (SELECT id FROM pets WHERE family_id = ANY(get_user_family_ids()))
  );

-- ============================================
-- INVENTORY POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON inventory_items
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

-- ============================================
-- MAINTENANCE POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON maintenance_items
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON maintenance_completions
  FOR ALL USING (
    maintenance_item_id IN (SELECT id FROM maintenance_items WHERE family_id = ANY(get_user_family_ids()))
  );

-- ============================================
-- TRANSPORT POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON transport_locations
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON transport_drivers
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON carpool_groups
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON carpool_members
  FOR ALL USING (
    carpool_id IN (SELECT id FROM carpool_groups WHERE family_id = ANY(get_user_family_ids()))
  );

CREATE POLICY "family_isolation" ON transport_schedules
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

-- ============================================
-- DOCUMENT POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON documents
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON document_versions
  FOR ALL USING (
    document_id IN (SELECT id FROM documents WHERE family_id = ANY(get_user_family_ids()))
  );

CREATE POLICY "family_isolation" ON document_share_links
  FOR ALL USING (
    document_id IN (SELECT id FROM documents WHERE family_id = ANY(get_user_family_ids()))
  );

CREATE POLICY "family_isolation" ON document_access_logs
  FOR ALL USING (
    document_id IN (SELECT id FROM documents WHERE family_id = ANY(get_user_family_ids()))
  );

-- ============================================
-- MEDICATION SAFETY POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON medication_safety
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON medication_doses
  FOR ALL USING (
    medication_safety_id IN (
      SELECT ms.id FROM medication_safety ms
      WHERE get_family_id_from_member(ms.member_id) = ANY(get_user_family_ids())
    )
  );

-- ============================================
-- HEALTH POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON health_events
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON health_symptoms
  FOR ALL USING (
    health_event_id IN (
      SELECT he.id FROM health_events he
      WHERE get_family_id_from_member(he.member_id) = ANY(get_user_family_ids())
    )
  );

CREATE POLICY "family_isolation" ON health_medications
  FOR ALL USING (
    health_event_id IN (
      SELECT he.id FROM health_events he
      WHERE get_family_id_from_member(he.member_id) = ANY(get_user_family_ids())
    )
  );

CREATE POLICY "family_isolation" ON temperature_logs
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON medical_profiles
  FOR ALL USING (
    get_family_id_from_member(member_id) = ANY(get_user_family_ids())
  );

-- ============================================
-- SICK MODE POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON sick_mode_instances
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON sick_mode_settings
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

-- ============================================
-- AUTOMATION POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON automation_rules
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON rule_executions
  FOR ALL USING (
    rule_id IN (SELECT id FROM automation_rules WHERE family_id = ANY(get_user_family_ids()))
  );

-- ============================================
-- PROJECT POLICIES
-- ============================================

CREATE POLICY "family_isolation" ON projects
  FOR ALL USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "family_isolation" ON project_tasks
  FOR ALL USING (
    get_family_id_from_project_task(project_id) = ANY(get_user_family_ids())
  );

CREATE POLICY "family_isolation" ON task_dependencies
  FOR ALL USING (
    dependent_task_id IN (
      SELECT pt.id FROM project_tasks pt
      JOIN projects p ON p.id = pt.project_id
      WHERE p.family_id = ANY(get_user_family_ids())
    )
  );
