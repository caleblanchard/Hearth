# Hearth

Hearth is a household ERP focused on the home screen and the family workflows it summarizes. This glossary records domain terms that should stay stable across refactors, tests, and architecture reviews.

## Language

**Dashboard Snapshot**:
A home-screen summary assembled for one viewer at one point in time.
_Avoid_: dashboard data, dashboard payload, homepage data

**Current Family Member**:
The active family membership resolved for the current viewer in the current family context, including kiosk fallback when no full auth session exists.
_Avoid_: current user row, member lookup glue, active member fetch

**Dashboard Widget Collection**:
A batched set of richer dashboard or kiosk widgets assembled for one viewer and one requested widget set.
_Avoid_: widget batch route, widget fetch wrapper, dashboard widget payload

**Automation Rule Lifecycle**:
The parent-managed lifecycle for one family's automation rules, including listing, creation, validation, ownership checks, updates, enablement changes, dry-run tests, and execution history.
_Avoid_: rules CRUD glue, rule route helpers, automation rule fetch wrappers

**Parent Authorization Context**:
The resolved authorization context for the current viewer in one family, including membership identity, role, and parent-required access checks for server and client adapters.
_Avoid_: parent check helper, route auth glue, role boolean fetch

**Approval Request Lifecycle**:
The parent-managed lifecycle for one family's approval requests, including queue shaping, per-type ownership checks, bulk and direct approval decisions, request stats, and parent approval callers.
_Avoid_: approvals route glue, bulk-approve helper, per-route approval dispatch

**Parent Configuration Lifecycle**:
The parent-managed lifecycle for one family's shared settings, including family settings updates, module settings, kiosk settings, and sick mode settings.
_Avoid_: settings route glue, family settings fetch wrappers, per-page configuration mutation helpers

**Screen Time Lifecycle**:
The family-managed lifecycle for one family's screen time configuration flow, including type management, allowances, parent adjustments, and grace settings, status, and requests.
_Avoid_: screen time route glue, allowance helpers, grace fetch wrappers

**Allowance Schedule Lifecycle**:
The parent-managed lifecycle for one family's recurring allowance schedules, including listing, creation, validation, ownership checks, updates, pause or resume changes, and deactivation.
_Avoid_: allowance route glue, schedule CRUD helpers, manage-page fetch wrappers

**Sick Mode Lifecycle**:
The family-managed lifecycle for one family's active sick mode instances, including start, status, end, and caller-facing status shaping for current active instances.
_Avoid_: sick mode route glue, start or end helpers, status fetch wrappers

**Meal Plan Lifecycle**:
The family-managed lifecycle for one family's meal planning flow, including week resolution, plan entry loading, meal dish mutations, and normalized plan shaping for the active planning window.
_Avoid_: meal plan route glue, week-start fetch wrappers, planner mutation helpers

**Project Lifecycle**:
The family-managed lifecycle for one family's projects, including project listing, detail loading, creation, updates, template reads, and normalized project shaping.
_Avoid_: projects route glue, project CRUD helpers, project page fetch wrappers

**Budget Lifecycle**:
The family-managed lifecycle for one family's budgets, including list, creation, deletion, usage shaping, and normalized budget summary records.
_Avoid_: budgets route glue, budget fetch wrappers, page-local usage mapping

**Routine Lifecycle**:
The family-managed lifecycle for one family's routines, including listing, detail loading, completion flow, completion history, and normalized routine shaping.
_Avoid_: routines route glue, completion helpers, routine page fetch wrappers

**Document Lifecycle**:
The family-managed lifecycle for one family's documents, including listing, upload creation, expiry queries, share shaping, and normalized document records.
_Avoid_: documents route glue, upload helpers, document page fetch wrappers

## Relationships

- A **Dashboard Snapshot** belongs to exactly one viewer context.
- A **Dashboard Snapshot** is for the home screen, not for every downstream page that happens to need one field from it.
- A **Current Family Member** belongs to exactly one viewer and one active family context.
- A **Current Family Member** is the shared source for member role, active-family member lists, family membership, and kiosk fallback in dashboard client modules.
- A **Dashboard Widget Collection** belongs to one viewer context and one requested widget set.
- A **Dashboard Widget Collection** is for richer live widgets; it is not the same thing as the home-screen **Dashboard Snapshot**.
- An **Automation Rule Lifecycle** belongs to one family and is only available to parent viewers in that family.
- An **Automation Rule Lifecycle** owns normalized rule data, lifecycle mutations, and execution-history queries instead of scattering them across rules routes and rules pages.
- A **Parent Authorization Context** belongs to one viewer and one family context.
- A **Parent Authorization Context** owns parent-required access checks and normalized role access so routes, server modules, hooks, and pages do not repeat authorization glue.
- An **Approval Request Lifecycle** belongs to one family and is only available to parent viewers in that family.
- An **Approval Request Lifecycle** owns approval-item parsing, queue and stats shaping, and per-type decision behavior so approvals routes and parent approval pages do not re-own dispatch logic.
- A **Parent Configuration Lifecycle** belongs to one family and is only available to parent viewers in that family for mutations.
- A **Parent Configuration Lifecycle** owns parent-only configuration validation, normalization, and audit behavior so settings routes and parent settings pages do not repeat mapping or authorization glue.
- A **Screen Time Lifecycle** belongs to one family context and spans both parent-managed configuration changes and viewer-scoped grace request behavior in that family.
- A **Screen Time Lifecycle** owns normalized screen time type and allowance shapes, parent-only adjustment and configuration rules, and grace eligibility and request behavior so routes and screen time pages do not repeat family/member checks or mapping glue.
- An **Allowance Schedule Lifecycle** belongs to one family and is only available to parent viewers in that family.
- An **Allowance Schedule Lifecycle** owns schedule validation, member ownership checks, pause or resume transitions, and normalized schedule shapes so allowance routes and the parent manage page do not repeat scheduling or authorization glue.
- A **Sick Mode Lifecycle** belongs to one family context and spans self-start or parent-start behavior, active-instance listing, and end behavior for that family's current sick mode instances.
- A **Sick Mode Lifecycle** owns sick mode start or end authorization, instance ownership checks, normalized active-instance shapes, and caller-facing status queries so sick mode routes and callers do not repeat instance lookup or response shaping.
- A **Meal Plan Lifecycle** belongs to one family context and one planning window in that family.
- A **Meal Plan Lifecycle** owns week resolution, normalized meal plan entry and dish shapes, and meal-plan mutation behavior so planner routes and callers do not repeat date math, family checks, or response shaping.
- A **Project Lifecycle** belongs to one family and spans project list, project detail, and template reads for that family.
- A **Project Lifecycle** owns normalized project shapes, ownership checks, template shaping, and project mutation behavior so project routes and callers do not repeat mapping or access glue.
- A **Budget Lifecycle** belongs to one family and is only available to parent viewers in that family for mutations.
- A **Budget Lifecycle** owns normalized budget summary shapes, parent-only mutation rules, and usage shaping so budget routes and callers do not repeat category or period mapping.
- A **Routine Lifecycle** belongs to one family and spans routine definition reads plus completion behavior for members in that family.
- A **Routine Lifecycle** owns normalized routine and completion shapes, family ownership checks, and routine-completion behavior so routine routes and callers do not repeat mapping or dispatch glue.
- A **Document Lifecycle** belongs to one family and spans document list, upload, expiry, and sharing behavior for that family.
- A **Document Lifecycle** owns normalized document and share shapes, family ownership checks, and expiry query behavior so document routes and callers do not repeat storage, mapping, or response glue.

## Example dialogue

> **Dev:** "Should the rewards page keep reading the **Dashboard Snapshot** just to get the current credits?"
> **Domain expert:** "No — the **Dashboard Snapshot** is the home-screen summary. The rewards page should have its own narrower module."

> **Dev:** "Should `useCurrentMember` and `useMemberContext` each keep their own kiosk and family selection implementation?"
> **Domain expert:** "No — they should adapt one **Current Family Member** module and expose only the caller-specific shape."

> **Dev:** "Should the dashboard and kiosk fetch each widget independently?"
> **Domain expert:** "No — a **Dashboard Widget Collection** should own batch selection and per-widget results, with callers adapting it to their screens."

> **Dev:** "Should the rules list, edit screen, toggle route, dry-run route, and history screen each keep their own rule validation and ownership logic?"
> **Domain expert:** "No — the **Automation Rule Lifecycle** should own parent access, ownership, normalized rule shapes, and rule-history queries, with routes and pages adapting that seam."

> **Dev:** "Should each parent-only route keep calling `getAuthContext` and `isParentInFamily` directly, while client hooks separately infer parent access from member role?"
> **Domain expert:** "No — a **Parent Authorization Context** should own the resolved authorization record, with server and client adapters exposing only the caller-specific shape."

> **Dev:** "Should the unified approvals queue, bulk decision routes, reward redemption approval pages, and direct chore or grace approval routes each keep their own approval-item parsing and per-type mutation logic?"
> **Domain expert:** "No — an **Approval Request Lifecycle** should own queue shaping, item-id parsing, family ownership checks, and approval decisions, with routes and pages adapting that seam."

> **Dev:** "Should family settings, module settings, kiosk settings, and sick mode settings each keep their own parent check, validation, camel-case mapping, and audit logic?"
> **Domain expert:** "No — a **Parent Configuration Lifecycle** should own the family-level parent settings flow, with routes and pages adapting that seam."

> **Dev:** "Should screen time types, allowances, manual adjustments, and grace status or request routes each keep their own family checks, type lookups, and response mapping?"
> **Domain expert:** "No — a **Screen Time Lifecycle** should own the screen time configuration and grace flow, with routes and pages adapting that seam."

> **Dev:** "Should the allowance schedule routes and the manage page each keep their own validation for frequency, member ownership, pause state changes, and response mapping?"
> **Domain expert:** "No — an **Allowance Schedule Lifecycle** should own the recurring allowance schedule flow, with routes and the manage page adapting that seam."

> **Dev:** "Should sick mode start, status, end, and active sick mode callers each keep their own member checks, active-instance checks, and status shaping?"
> **Domain expert:** "No — a **Sick Mode Lifecycle** should own the active sick mode instance flow, with routes and callers adapting that seam."

> **Dev:** "Should the meal planner routes and planner screen each keep their own week-start resolution, entry shaping, and dish mutation glue?"
> **Domain expert:** "No — a **Meal Plan Lifecycle** should own the family planning window flow, with routes and the planner adapting that seam."

> **Dev:** "Should the projects list, detail, create, edit, and template callers each keep their own project normalization and access checks?"
> **Domain expert:** "No — a **Project Lifecycle** should own the project flow, with routes and project callers adapting that seam."

> **Dev:** "Should budget routes and the budgets page each keep their own period mapping, usage shaping, and parent-only mutation glue?"
> **Domain expert:** "No — a **Budget Lifecycle** should own the budget flow, with routes and budget callers adapting that seam."

> **Dev:** "Should routine routes, completion routes, and routine callers each keep their own routine shaping and completion dispatch logic?"
> **Domain expert:** "No — a **Routine Lifecycle** should own the routine flow, with routes and callers adapting that seam."

> **Dev:** "Should the documents routes, upload flow, expiry reads, and document pages each keep their own mapping and sharing glue?"
> **Domain expert:** "No — a **Document Lifecycle** should own the document flow, with routes and callers adapting that seam."

## Flagged ambiguities

- "dashboard" was being used to mean both the home-screen summary and a grab-bag data source for chores, rewards, and screen time pages — resolved: use **Dashboard Snapshot** only for the home-screen summary.
- "current member" was being used for both a minimal role check and a full family membership lookup — resolved: use **Current Family Member** for the shared resolved membership behind those adapters.
- "dashboard widgets" was being used for both individual widget fetches and the batch collection route/hook — resolved: use **Dashboard Widget Collection** for the shared batched widget seam.
- "automation rules" was being used for both raw persistence helpers and the full parent-facing rule flow — resolved: use **Automation Rule Lifecycle** for the shared lifecycle seam behind rules routes and rules pages.
- "parent access" was being used for both repeated route guards and ad-hoc client role booleans — resolved: use **Parent Authorization Context** for the shared authorization seam.
- "approvals" was being used for both the unified queue and several direct per-feature parent decisions — resolved: use **Approval Request Lifecycle** for the shared lifecycle seam behind approval routes and parent approval callers.
- "settings" was being used for both user-specific preferences and family-level parent-managed configuration — resolved: use **Parent Configuration Lifecycle** for the shared family settings seam behind parent settings routes and callers.
- "current member" was also being used for separate role fetches and active-family member-list fetches — resolved: keep **Current Family Member** as the shared client seam for both.
- "screen time" was being used for both usage reporting and allowance or grace management — resolved: use **Screen Time Lifecycle** for the shared type, allowance, adjustment, and grace-management seam, not stats or history reporting.
- "allowance schedules" was being used for both recurring allowance rules and the manage-page CRUD glue — resolved: use **Allowance Schedule Lifecycle** for the shared recurring schedule seam.
- "sick mode" was being used for both family-level settings and active start or stop or status behavior — resolved: keep **Parent Configuration Lifecycle** for family sick mode settings and use **Sick Mode Lifecycle** for active sick mode instances.
- "meal plan" was being used for both the planner screen and route-owned week or entry shaping — resolved: use **Meal Plan Lifecycle** for the shared planning-window seam.
- "projects" was being used for both raw project helpers and the full project page flow — resolved: use **Project Lifecycle** for the shared projects seam.
- "budgets" was being used for both budget persistence helpers and page-local usage shaping — resolved: use **Budget Lifecycle** for the shared budget seam.
- "routines" was being used for both routine records and completion flow behavior — resolved: use **Routine Lifecycle** for the shared routines seam.
- "documents" was being used for both storage operations and the full family-facing document flow — resolved: use **Document Lifecycle** for the shared documents seam.
