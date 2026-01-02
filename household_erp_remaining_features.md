# Hearth – Remaining Features to Implement
### *Incomplete Features from Design Document*

---

## Overview

This document contains **only the features that have NOT yet been implemented** in the Hearth Household ERP system. All features listed below are from the original design document but are missing from the current codebase.

**Last Updated:** 2026-01-01

---

## Table of Contents

1. [Core System Enhancements](#1-core-system-enhancements)
2. [Kiosk Mode](#2-kiosk-mode)
3. [Meal Planning Module](#3-meal-planning-module)
4. [Recipe Management Module](#4-recipe-management-module)
5. [Household Inventory Module](#5-household-inventory-module)
6. [Health & Wellbeing Modules](#6-health--wellbeing-modules)
7. [Projects Module](#7-projects-module)
8. [Family Life Modules](#8-family-life-modules)
9. [Rules Engine & Automation](#9-rules-engine--automation)
10. [Dashboard Enhancements](#10-dashboard-enhancements)
11. [PWA & Notifications](#11-pwa--notifications)
12. [Advanced Features](#12-advanced-features)

---

## 1. Core System Enhancements

### 1.1 Kiosk Mode
**Status:** Models exist, UI not implemented

#### Features
- Persistent family dashboard session (no individual login required to view)
- Quick-switch between family members via PIN/avatar
- Auto-lock after configurable timeout (default: 15 minutes)
- Restricted to view-only actions unless user authenticates
- Large, readable-from-distance design
- Auto-rotating sections or configurable layout

#### UI Components Needed
- Kiosk login screen with auto-lock
- Family overview dashboard optimized for wall-mount tablets
- Quick PIN entry for member switching
- Timeout configuration in settings

#### Database/API
- Add kiosk session management
- Kiosk configuration settings
- Auto-lock timer implementation

---

### 1.2 Guest Access System
**Status:** ✅ COMPLETED (2026-01-01)

#### Implementation Summary
Complete guest access system for family helpers (babysitters, grandparents, caregivers) with secure time-limited access and configurable permissions.

**Database Models:**
- `GuestInvite` - Time-limited invites with 6-digit codes and access levels
- `GuestSession` - Active guest sessions with IP/user agent tracking
- Audit actions: GUEST_INVITE_CREATED, GUEST_INVITE_REVOKED, GUEST_SESSION_STARTED, GUEST_SESSION_ENDED, GUEST_ACCESS_DENIED

**API Routes (4 endpoints, 25 tests):**
- `POST /api/family/guests/invite` - Create guest invite (parents only)
- `GET /api/family/guests` - List active invites (parents only)
- `DELETE /api/family/guests/[id]` - Revoke invite and end sessions (parents only)
- `POST /api/auth/guest/[code]` - Redeem invite code (public)

**UI Components:**
- `/app/dashboard/guests` - Parent management dashboard with invite creation form
- `/app/guest` - Public guest redemption page with code entry
- Features: Access level badges, usage tracking, expiration countdown, session management

**Security Features:**
- 6-digit invite codes for easy entry
- Cryptographically secure session tokens
- Configurable max uses per invite
- Automatic expiration tracking
- Manual revocation with cascade session termination
- IP address and user agent logging

---

### 1.3 File Upload Integration
**Status:** FileUpload model exists, minimal integration

#### Features
- Cloud storage integration (S3-compatible/MinIO or local filesystem)
- Image processing pipeline (validation, virus scan, EXIF stripping, resize, convert to WebP)
- Upload size limits by type (avatar: 2MB, chore proof: 5MB, document: 25MB)
- Thumbnail generation
- Signed URLs for secure downloads
- CDN configuration for caching

#### Integration Points
- Chore photo proof uploads
- Recipe photos
- Document vault files
- Avatar uploads (enhance existing)
- Maintenance task photos
- Pet profile photos

---

### 1.4 Multi-Calendar Sync Enhancement
**Status:** Calendar models exist, Google sync likely partial

#### Features
- Full two-way sync with Google Calendar
- Add Outlook/Microsoft 365 calendar sync
- Add Apple Calendar sync
- Conflict detection and warnings
- Sync status indicators
- Calendar-specific settings per provider

#### API Routes Needed
- POST `/api/calendar/sync/google` - Trigger Google sync
- POST `/api/calendar/sync/outlook` - Trigger Outlook sync
- POST `/api/calendar/sync/apple` - Trigger Apple sync
- GET `/api/calendar/sync/status` - Get sync status

---

## 2. Kiosk Mode

See [Section 1.1](#11-kiosk-mode) above.

---

## 3. Meal Planning Module

**Status:** ✅ COMPLETED (Basic meal planning - Leftovers tracking pending)

**Implementation Summary:**
- Database schema implemented with MealPlan and MealPlanEntry models
- Full CRUD API routes for meal planning with week-based organization
- Week normalization to Monday (UTC-aware date handling)
- MealPlanner component with weekly calendar grid view
- Meal entry create/edit/delete with notes support
- Permission-based access (children can view and edit meal plans)
- 31 passing API integration tests
- 16 passing component tests
- Test-driven development approach followed throughout
- Total: 47 comprehensive tests

### 3.1 Weekly Meal Planner

**Status:** ✅ COMPLETED

#### Features Implemented
- ✅ Weekly meal planner grid (7 days × 4 meal types: breakfast, lunch, dinner, snack)
- ✅ Meal type categorization (BREAKFAST, LUNCH, DINNER, SNACK enum)
- ✅ Custom meal names and notes
- ✅ Week navigation (previous/next week with Monday normalization)
- ✅ Meal entry management:
  - Create new meal entries with date and meal type
  - Edit existing entries (update name and notes)
  - Delete entries with confirmation
  - Hover to view notes
- ✅ Empty state handling (no meals planned message)
- ✅ Loading and error states
- ✅ Family scoping (only show meals for user's family)
- ✅ Auto-create meal plan on first entry for a week
- ✅ Audit logging for all operations (MEAL_ENTRY_ADDED, MEAL_ENTRY_UPDATED, MEAL_ENTRY_DELETED)

#### Features Not Yet Implemented
- Recipe library integration (recipeId field exists but not used yet)
- Drag-and-drop interface
- Family favorites marking
- Busy day meal suggestions
- Dietary and allergy tags
- Quick meal templates
- Copy week functionality
- Print meal plan option

#### UI Components Implemented
- ✅ MealPlanner - Weekly calendar grid with day columns and meal type rows
- ✅ Week navigation controls (previous/next buttons, week display)
- ✅ Add meal dialog with form (meal name, notes)
- ✅ Edit meal dialog with form (update name, notes)
- ✅ Delete confirmation dialog
- ✅ Hover tooltips for notes display
- ✅ Empty state message
- ✅ Loading spinner
- ✅ Error message display

#### Database Schema (Implemented)
```prisma
model MealPlan {
  id        String          @id @default(uuid())
  familyId  String
  weekStart DateTime        // Monday of the week (UTC)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  family Family          @relation(fields: [familyId], references: [id], onDelete: Cascade)
  meals  MealPlanEntry[]

  @@unique([familyId, weekStart])
  @@index([familyId])
  @@index([weekStart])
  @@map("meal_plans")
}

model MealPlanEntry {
  id         String    @id @default(uuid())
  mealPlanId String
  date       DateTime  // Specific day (UTC)
  mealType   MealType
  recipeId   String?   // Future: link to Recipe model
  customName String?   // If not using a recipe
  notes      String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  mealPlan MealPlan @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)

  @@index([mealPlanId])
  @@index([date])
  @@map("meal_plan_entries")
}

enum MealType {
  BREAKFAST
  LUNCH
  DINNER
  SNACK
}
```

#### API Routes Implemented
- ✅ GET `/api/meals/plan?week=YYYY-MM-DD` - Get meal plan for week (with Monday normalization)
- ✅ POST `/api/meals/plan` - Create meal entry (auto-creates plan if needed)
- ✅ PATCH `/api/meals/plan/[id]` - Update meal entry (name, notes, recipeId)
- ✅ DELETE `/api/meals/plan/[id]` - Delete meal entry

#### API Routes Not Yet Implemented
- GET `/api/meals/suggestions?date=YYYY-MM-DD` - Get suggestions based on busy day

---

### 3.2 Leftovers Tracking

**Status:** ✅ COMPLETED (Core features - Analytics pending)

**Implementation Summary:**
- Database schema implemented with Leftover model
- Full CRUD API routes with family scoping
- LeftoversList component with color-coded expiration indicators
- Mark as used/tossed functionality
- 25 passing API integration tests
- Test-driven development approach followed throughout

#### Features Implemented
- ✅ Log leftovers after meals with custom expiration
- ✅ Expiration countdown (default: 3 days, customizable)
- ✅ Visual indicators (green → yellow → red based on days remaining)
- ✅ "Used it" or "Tossed it" logging with audit trail
- ✅ Active leftovers filtering (excludes used/tossed)
- ✅ Sorted by expiration date (soonest first)
- ✅ Family scoping and permission-based access
- ✅ Optional notes and quantity tracking

#### Features Not Yet Implemented
- Push notification reminders when expiring
- Leftover meal suggestions
- Food waste analytics dashboard
- Integration with meal planner

#### UI Components Implemented
- ✅ LeftoversList - Main tracker with grid layout
- ✅ Expiration countdown badges with color coding
- ✅ "Log Leftover" dialog with form
- ✅ Used/Toss action buttons
- ✅ Hover tooltips for notes display
- ✅ Loading and error states

#### Database Schema (Implemented)
```prisma
model Leftover {
  id              String   @id @default(uuid())
  familyId        String
  name            String
  mealPlanEntryId String?  // Link to original meal if applicable
  quantity        String?  // "Half a lasagna", "2 servings"
  storedAt        DateTime @default(now())
  expiresAt       DateTime // Auto-calculated based on default (3 days) + manual override
  usedAt          DateTime?
  tossedAt        DateTime?
  notes           String?
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  family  Family       @relation(fields: [familyId], references: [id], onDelete: Cascade)
  creator FamilyMember @relation(fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([familyId])
  @@index([expiresAt])
  @@index([familyId, usedAt, tossedAt]) // For active leftovers query
  @@map("leftovers")
}
```

#### API Routes Implemented
- ✅ GET `/api/meals/leftovers` - Get active leftovers (sorted by expiration)
- ✅ POST `/api/meals/leftovers` - Log a new leftover
- ✅ PATCH `/api/meals/leftovers/[id]` - Mark as used or tossed (single endpoint with action parameter)

#### API Routes Not Yet Implemented
- GET `/api/meals/leftovers/analytics` - Food waste stats

---

## 4. Recipe Management Module

**Status:** ✅ COMPLETED (Core features implemented, 48 API tests passing)

### Implementation Summary

#### ✅ Completed Features
- **Database Schema**: Recipe, RecipeIngredient, RecipeRating models with proper relations
- **Recipe CRUD API** (32 tests passing):
  - GET `/api/meals/recipes` - List recipes with filters (category, isFavorite, search)
  - POST `/api/meals/recipes` - Create recipe with ingredients
  - GET `/api/meals/recipes/[id]` - Get recipe details with ingredients and ratings
  - PATCH `/api/meals/recipes/[id]` - Update recipe (supports ingredient updates)
  - DELETE `/api/meals/recipes/[id]` - Delete recipe
- **Recipe Rating API** (16 tests passing):
  - POST `/api/meals/recipes/[id]/rate` - Rate a recipe (1-5 stars with notes)
  - DELETE `/api/meals/recipes/[id]/rate` - Remove rating
- **UI Components**:
  - Recipe list component with category/favorites filters
  - Recipe cards showing difficulty, time, servings, dietary tags
  - Favorite toggling
  - Recipe browsing page at `/dashboard/meals/recipes`
- **Dietary Tags**: VEGETARIAN, VEGAN, GLUTEN_FREE, DAIRY_FREE, NUT_FREE, EGG_FREE, SOY_FREE, LOW_CARB, KETO, PALEO
- **Categories**: BREAKFAST, LUNCH, DINNER, DESSERT, SNACK, SIDE, APPETIZER, DRINK
- **Difficulty Levels**: EASY, MEDIUM, HARD
- **Audit Logging**: All recipe operations tracked
- **Family Scoping**: Recipes isolated by family

#### ⏳ Not Yet Implemented
- Web import via URL scraping
- Recipe detail view with ingredient scaling
- Recipe editor/form
- Photo attachments
- Ingredient substitution suggestions
- "Add to meal plan" action
- "Add ingredients to shopping list" action
- Advanced search/filtering UI

### 4.1 Recipe Database

#### Features
- Manual recipe entry
- Web import via URL scraping (schema.org/Recipe detection)
- Ingredients with quantities and units
- Prep and cook times
- Serving size with auto-scaling
- Family ratings and notes
- Photo attachments
- Dietary tags (vegetarian, gluten-free, dairy-free, nut-free, etc.)
- Difficulty ratings (easy, medium, hard)
- Favorite marking
- Recipe categories (breakfast, lunch, dinner, dessert, snack, side)
- Ingredient substitution suggestions

#### UI Components
- Recipe list with filters (category, dietary tags, difficulty, favorites)
- Recipe card for browsing
- Recipe detail view with ingredient scaling slider
- Recipe editor with ingredient builder
- URL import modal
- Rating stars component
- "Add to meal plan" action
- "Add ingredients to shopping list" action

#### Database Schema
```prisma
model Recipe {
  id             String   @id @default(cuid())
  familyId       String
  family         Family   @relation(fields: [familyId], references: [id])
  name           String
  description    String?
  prepTimeMinutes Int?
  cookTimeMinutes Int?
  servings       Int      @default(4)
  difficulty     Difficulty @default(MEDIUM)
  imageUrl       String?
  sourceUrl      String?  // If imported from web
  instructions   String   // JSON array of steps
  notes          String?
  isFavorite     Boolean  @default(false)
  categories     RecipeCategory[]
  dietaryTags    DietaryTag[]
  ingredients    RecipeIngredient[]
  ratings        RecipeRating[]
  createdBy      String
  creator        FamilyMember @relation(fields: [createdBy], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model RecipeIngredient {
  id         String   @id @default(cuid())
  recipeId   String
  recipe     Recipe   @relation(fields: [recipeId], references: [id])
  name       String
  quantity   Float
  unit       String   // cups, tbsp, lbs, oz, etc.
  notes      String?  // "diced", "room temperature"
  sortOrder  Int      @default(0)
}

model RecipeRating {
  id         String   @id @default(cuid())
  recipeId   String
  recipe     Recipe   @relation(fields: [recipeId], references: [id])
  memberId   String
  member     FamilyMember @relation(fields: [memberId], references: [id])
  rating     Int      // 1-5 stars
  notes      String?
  createdAt  DateTime @default(now())
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum RecipeCategory {
  BREAKFAST
  LUNCH
  DINNER
  DESSERT
  SNACK
  SIDE
  APPETIZER
  DRINK
}

enum DietaryTag {
  VEGETARIAN
  VEGAN
  GLUTEN_FREE
  DAIRY_FREE
  NUT_FREE
  EGG_FREE
  SOY_FREE
  LOW_CARB
  KETO
  PALEO
}
```

#### API Routes Needed
- GET `/api/recipes` - List all recipes with filters
- POST `/api/recipes` - Create new recipe
- GET `/api/recipes/[id]` - Get recipe detail
- PATCH `/api/recipes/[id]` - Update recipe
- DELETE `/api/recipes/[id]` - Delete recipe
- POST `/api/recipes/import` - Import from URL
- POST `/api/recipes/[id]/rate` - Add/update rating
- POST `/api/recipes/[id]/add-to-meal-plan` - Quick add to meal plan
- POST `/api/recipes/[id]/add-to-shopping` - Add ingredients to shopping list

---

## 5. Household Inventory Module

**Status:** ✅ COMPLETED (Core features implemented, 44 API tests passing)

### Implementation Summary

#### ✅ Completed Features
- **Database Schema**: InventoryItem model with category, location, quantity tracking, low-stock threshold, expiration dates
- **Inventory CRUD API** (32 tests passing):
  - GET `/api/inventory` - List all family inventory items
  - POST `/api/inventory` - Add new item (parents only)
  - GET `/api/inventory/[id]` - Get item details
  - PATCH `/api/inventory/[id]` - Update item (parents only)
  - DELETE `/api/inventory/[id]` - Delete item (parents only)
- **Special Endpoints** (12 tests passing):
  - GET `/api/inventory/low-stock` - Get items below threshold (all members)
  - GET `/api/inventory/expiring?days=7` - Get items expiring soon (all members)
- **UI Components**:
  - Inventory list with category filters (All, Low Stock, Expiring Soon)
  - Item cards showing quantity, category emoji, location
  - Low-stock and expiring soon alerts
  - Filter tabs for different views
- **Categories**: FOOD_PANTRY, FOOD_FRIDGE, FOOD_FREEZER, CLEANING, TOILETRIES, PAPER_GOODS, MEDICINE, PET_SUPPLIES, OTHER
- **Locations**: PANTRY, FRIDGE, FREEZER, BATHROOM, GARAGE, LAUNDRY_ROOM, KITCHEN_CABINET, OTHER
- **Audit Logging**: INVENTORY_ITEM_ADDED, INVENTORY_ITEM_UPDATED, INVENTORY_ITEM_DELETED, INVENTORY_QUANTITY_ADJUSTED, INVENTORY_ITEM_RESTOCKED
- **Family Scoping**: Inventory isolated by family
- **Permission Controls**: Only parents can add/edit/delete items, all members can view

#### ⏳ Not Yet Implemented
- Bulk restock mode (adjust multiple items after shopping trip)
- Auto-add to shopping list when low-stock
- Consumption rate estimation
- Barcode scanning integration
- Usage trend charts
- Bulk purchase tracking
- Shopping list integration

### 5.1 Pantry & Household Inventory

#### Features
- Track pantry and household staples
- Quantity tracking with units
- Low-stock thresholds with alerts
- Auto-add to shopping list when low
- Expiration date tracking
- Location categorization (pantry, fridge, freezer, bathroom, garage, laundry)
- Consumption rate estimation
- Bulk purchase tracking
- Barcode scanning (future enhancement)

#### UI Components
- Inventory list with category filters
- Item card with quick quantity adjustment (+/- buttons)
- Low-stock dashboard widget
- Expiring soon alerts
- Bulk restock mode (after shopping trip)
- Usage trend charts
- Barcode scanner integration (future)

#### Database Schema
```prisma
model InventoryItem {
  id                String    @id @default(cuid())
  familyId          String
  family            Family    @relation(fields: [familyId], references: [id])
  name              String
  category          InventoryCategory
  location          InventoryLocation
  currentQuantity   Float     @default(0)
  unit              String    // count, oz, lbs, liters, etc.
  lowStockThreshold Float?
  expiresAt         DateTime?
  barcode           String?
  notes             String?
  lastRestockedAt   DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

enum InventoryCategory {
  FOOD_PANTRY
  FOOD_FRIDGE
  FOOD_FREEZER
  CLEANING
  TOILETRIES
  PAPER_GOODS
  MEDICINE
  PET_SUPPLIES
  OTHER
}

enum InventoryLocation {
  PANTRY
  FRIDGE
  FREEZER
  BATHROOM
  GARAGE
  LAUNDRY_ROOM
  KITCHEN_CABINET
  OTHER
}
```

#### API Routes Needed
- GET `/api/inventory` - List all items with filters
- POST `/api/inventory` - Create item
- PATCH `/api/inventory/[id]` - Update item (adjust quantity, etc.)
- DELETE `/api/inventory/[id]` - Delete item
- GET `/api/inventory/low-stock` - Get items below threshold
- GET `/api/inventory/expiring` - Get items expiring soon
- POST `/api/inventory/bulk-restock` - Bulk update after shopping

---

## 6. Health & Wellbeing Modules

**Status:** ✅ PARTIALLY COMPLETED (Child Sickness Manager API implemented - 2026-01-02)

### 6.1 Child Sickness Manager

**Status:** ✅ PARTIALLY COMPLETED (Core API implemented - 2026-01-02)

#### Implementation Summary

**Database Models (Implemented):**
- `HealthEvent` - Per-child health event tracking with event types, severity, and notes
- `HealthSymptom` - Symptom logging with type, severity (1-10), and timestamps
- `HealthMedication` - Medication doses linked to health events with countdown timers
- `TemperatureLog` - Temperature tracking with multiple methods (oral, rectal, armpit, ear, forehead)
- `MedicalProfile` - Medical profiles with blood type, allergies, conditions, medications, and weight
- Enums: HealthEventType, SymptomType, TempMethod
- Audit actions: HEALTH_EVENT_CREATED, HEALTH_EVENT_UPDATED, HEALTH_EVENT_ENDED, HEALTH_SYMPTOM_LOGGED, HEALTH_MEDICATION_GIVEN, TEMPERATURE_LOGGED, MEDICAL_PROFILE_UPDATED

**API Routes Implemented (70 tests passing):**
- ✅ GET `/api/health/events` - List health events with filters (memberId, eventType, active)
- ✅ POST `/api/health/events` - Log new health event
- ✅ GET `/api/health/events/[id]` - Get event details with symptoms and medications
- ✅ PATCH `/api/health/events/[id]` - Update event (severity, notes, endedAt)
- ✅ POST `/api/health/temperature` - Log temperature with method and notes
- ✅ GET `/api/health/profile/[memberId]` - Get medical profile
- ✅ PATCH `/api/health/profile/[memberId]` - Update medical profile (upsert)

**Security & Permissions:**
- Parents can manage all health data for all family members
- Children can view health data and create/update their own health events and temperature logs
- Medical profiles can only be updated by parents
- Comprehensive family scoping on all operations
- Full audit logging for all health operations

#### Features Implemented
- ✅ Per-child health event logs with event types (ILLNESS, INJURY, DOCTOR_VISIT, WELLNESS_CHECK, VACCINATION, OTHER)
- ✅ Severity tracking (1-10 scale) for health events
- ✅ Temperature logging with 5 methods (ORAL, RECTAL, ARMPIT, EAR, FOREHEAD)
- ✅ Temperature validation (90-110°F range)
- ✅ Medical profile management (blood type, allergies, conditions, medications)
- ✅ Weight tracking for dosage calculations (lbs/kg)
- ✅ Event timeline with filtering (by member, event type, active status)
- ✅ Health event start/end tracking

#### Features Not Yet Implemented
- Symptom logging API route (POST `/api/health/symptoms`)
- Medication dose logging API route (POST `/api/health/medications`)
- Health summary export (GET `/api/health/summary/[memberId]`)
- UI Components (all pending)
- Temperature trend visualization
- Symptom timeline visualization
- Photo documentation
- Doctor visit notes UI

#### UI Components
- Health event timeline
- Symptom logger with quick-select icons (fever, cough, sore throat, etc.)
- Temperature chart with fever threshold indicator
- Medical profile editor
- Doctor visit notes
- Health summary export button
- Active illness dashboard card
- Weight tracking chart

#### Database Schema
```prisma
model HealthEvent {
  id          String    @id @default(cuid())
  memberId    String
  member      FamilyMember @relation(fields: [memberId], references: [id])
  eventType   HealthEventType
  startedAt   DateTime  @default(now())
  endedAt     DateTime?
  severity    Int?      // 1-10 scale
  notes       String?
  symptoms    HealthSymptom[]
  medications HealthMedication[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model HealthSymptom {
  id             String      @id @default(cuid())
  healthEventId  String
  healthEvent    HealthEvent @relation(fields: [healthEventId], references: [id])
  symptomType    SymptomType
  severity       Int         // 1-10
  notes          String?
  recordedAt     DateTime    @default(now())
}

model HealthMedication {
  id             String      @id @default(cuid())
  healthEventId  String
  healthEvent    HealthEvent @relation(fields: [healthEventId], references: [id])
  medicationName String
  dosage         String
  givenAt        DateTime
  givenBy        String
  nextDoseAt     DateTime?   // For countdown timer
  notes          String?
}

model TemperatureLog {
  id         String       @id @default(cuid())
  memberId   String
  member     FamilyMember @relation(fields: [memberId], references: [id])
  temperature Float       // In Fahrenheit
  method     TempMethod   // ORAL, RECTAL, ARMPIT, EAR, FOREHEAD
  recordedAt DateTime     @default(now())
  notes      String?
}

model MedicalProfile {
  id          String       @id @default(cuid())
  memberId    String       @unique
  member      FamilyMember @relation(fields: [memberId], references: [id])
  bloodType   String?
  allergies   String[]     // Array of allergy strings
  conditions  String[]     // Array of medical conditions
  medications String[]     // Long-term medications
  weight      Float?       // For dosage calculations
  weightUnit  String?      // lbs or kg
  updatedAt   DateTime     @updatedAt
}

enum HealthEventType {
  ILLNESS
  INJURY
  DOCTOR_VISIT
  WELLNESS_CHECK
  VACCINATION
  OTHER
}

enum SymptomType {
  FEVER
  COUGH
  SORE_THROAT
  RUNNY_NOSE
  HEADACHE
  STOMACH_ACHE
  VOMITING
  DIARRHEA
  RASH
  FATIGUE
  LOSS_OF_APPETITE
  OTHER
}

enum TempMethod {
  ORAL
  RECTAL
  ARMPIT
  EAR
  FOREHEAD
}
```

#### API Routes Needed
- GET `/api/health/events` - List health events with filters
- POST `/api/health/events` - Log new health event
- GET `/api/health/events/[id]` - Get event details
- PATCH `/api/health/events/[id]` - Update event
- POST `/api/health/symptoms` - Log symptom
- POST `/api/health/temperature` - Log temperature
- POST `/api/health/medications` - Log medication dose
- GET `/api/health/profile/[memberId]` - Get medical profile
- PATCH `/api/health/profile/[memberId]` - Update medical profile
- GET `/api/health/summary/[memberId]` - Export health summary (PDF)

---

### 6.2 Sick Mode (Global Family State)

#### Features
- One-click activation per family member
- Severity levels (MILD, MODERATE, SEVERE)
- Duration estimate (optional)
- Auto-adjustments when activated:
  - **Chores:** Auto-pause or reduce assigned chores
  - **Screen Time:** Increase allowance or suspend tracking
  - **Routines:** Mark as optional or adjust expectations
  - **Meals:** Suggest comfort foods, easy meals
  - **Notifications:** Reduce non-urgent notifications
- Recovery tracking and gradual return to normal
- Notification to other family members (configurable)
- Integration with health event logging

#### UI Components
- Sick mode activation button (prominent on child profile/dashboard)
- Severity selector with visual indicators
- Active sick mode banner on dashboard
- Affected adjustments summary
- Recovery timeline view
- Quick "feeling better" end button

#### Database Schema
```prisma
model SickMode {
  id          String       @id @default(cuid())
  memberId    String
  member      FamilyMember @relation(fields: [memberId], references: [id])
  severity    SickSeverity
  startedAt   DateTime     @default(now())
  endedAt     DateTime?
  expectedDuration Int?     // Days
  adjustments Json         // What was changed
  notes       String?
  createdBy   String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

enum SickSeverity {
  MILD       // Can do some activities
  MODERATE   // Rest recommended
  SEVERE     // Full rest required
}
```

#### API Routes Needed
- POST `/api/health/sick-mode/activate` - Activate sick mode
- PATCH `/api/health/sick-mode/[id]/end` - End sick mode
- GET `/api/health/sick-mode/active` - Get active sick modes for family

---

### 6.3 Medication Safety Interlock with Countdown Timer

**Status:** ✅ COMPLETED (2026-01-01)

#### Implementation Summary
Complete medication safety system with safety interlock to prevent accidental double-dosing, real-time countdown timers, and parent override capabilities.

**Database Models:**
- `MedicationSafety` - Per-medication, per-child configurations with intervals and daily limits
- `MedicationDose` - Dose logging with override tracking and approval
- Audit actions: MEDICATION_SAFETY_CREATED, MEDICATION_DOSE_LOGGED, MEDICATION_DOSE_OVERRIDE, MEDICATION_SAFETY_UPDATED, MEDICATION_SAFETY_DELETED

**API Routes (23 tests passing):**
- `GET /api/medications` - List medications with recent dose history (filter by member)
- `POST /api/medications` - Create medication safety config (parents only)
- `POST /api/medications/dose` - Log dose with safety interlock check (all members)

**UI Components:**
- `/app/dashboard/medications` - Medication safety page with countdown timers
- Real-time countdown display (hours:minutes:seconds format)
- Visual lock indicators (🔒 when locked, ✅ when safe)
- Color-coded borders (red=locked, green=safe)
- Daily dose counter (X/Y doses today)
- Parent override modal with mandatory reason
- Recent dose history display
- Auto-refresh every 30 seconds

**Safety Features:**
- Hard lock preventing doses before minimum interval expires
- Countdown timer showing exact time until next dose available
- Daily maximum dose tracking with hard stop
- Parent override with mandatory reason and approval logging
- Comprehensive audit logging of all dose events
- Visual and textual safety warnings

#### Features Implemented (Complete)
- ✅ Configurable minimum interval between doses (e.g., 4-6 hours)
- ✅ Visual countdown timer showing "next dose available at"
- ✅ Hard lock preventing logging before cooldown expires
- ✅ Parent override capability (with confirmation and reason)
- ✅ Distinct timers per medication per child
- ✅ Warning if approaching daily maximum doses
- ✅ Daily maximum tracking with hard stop option
- ⏳ Push notification when dose becomes available (not implemented)
- ⏳ Cross-medication warnings (same active ingredient) (not implemented)

#### Features Not Yet Implemented
- Push notifications when medication becomes available
- Cross-medication active ingredient checking
- Medication update/delete routes
- Bulk medication management

---

## 7. Projects Module

**Status:** Module defined in schema, no implementation

### 7.1 Project Management with Task Dependencies

#### Features
- Project overview with progress tracking
- Linked tasks with dependencies
- Shopping items linked to project
- Calendar events linked to project
- Budget tracking (optional)
- Notes and file attachments
- Project templates (reusable for recurring events)
- Assignees per task
- Due date tracking with timeline view
- Task dependency types:
  - **Finish-to-Start:** Task B starts when Task A finishes
  - **Start-to-Start:** Task B starts when Task A starts
  - **Blocking:** Task A must complete before any progress on Task B
- Dependency validation (prevent circular dependencies)
- Critical path highlighting (tasks affecting project end date)

#### UI Components
- Project list with status filters (active, completed, on-hold)
- Project detail view with task list
- Timeline/Gantt chart view (showing dependencies)
- Task card with dependency indicators
- Dependency editor (drag to connect tasks visually)
- Blocked task visual (lock icon, grayed out)
- Progress bar (based on completed tasks)
- Budget tracker widget
- Template selector for new projects
- Critical path highlight toggle

#### Database Schema
```prisma
model Project {
  id          String       @id @default(cuid())
  familyId    String
  family      Family       @relation(fields: [familyId], references: [id])
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  startDate   DateTime?
  dueDate     DateTime?
  budget      Float?
  notes       String?
  tasks       ProjectTask[]
  shopping    ShoppingItem[] // Link to shopping items
  events      CalendarEvent[] // Link to calendar events
  createdBy   String
  creator     FamilyMember @relation(fields: [createdBy], references: [id])
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model ProjectTask {
  id            String       @id @default(cuid())
  projectId     String
  project       Project      @relation(fields: [projectId], references: [id])
  name          String
  description   String?
  status        TaskStatus   @default(PENDING)
  assigneeId    String?
  assignee      FamilyMember? @relation(fields: [assigneeId], references: [id])
  dueDate       DateTime?
  estimatedHours Float?
  actualHours   Float?
  sortOrder     Int          @default(0)
  dependencies  TaskDependency[] @relation("DependentTask")
  dependents    TaskDependency[] @relation("BlockingTask")
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

model TaskDependency {
  id              String       @id @default(cuid())
  dependentTaskId String       // Task that is blocked
  dependentTask   ProjectTask  @relation("DependentTask", fields: [dependentTaskId], references: [id])
  blockingTaskId  String       // Task that must complete first
  blockingTask    ProjectTask  @relation("BlockingTask", fields: [blockingTaskId], references: [id])
  dependencyType  DependencyType @default(FINISH_TO_START)
  createdAt       DateTime     @default(now())
}

enum ProjectStatus {
  ACTIVE
  ON_HOLD
  COMPLETED
  CANCELLED
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  BLOCKED
  CANCELLED
}

enum DependencyType {
  FINISH_TO_START
  START_TO_START
  BLOCKING
}
```

#### API Routes Needed
- GET `/api/projects` - List all projects
- POST `/api/projects` - Create project
- GET `/api/projects/[id]` - Get project details
- PATCH `/api/projects/[id]` - Update project
- DELETE `/api/projects/[id]` - Delete project
- GET `/api/projects/[id]/tasks` - Get project tasks
- POST `/api/projects/[id]/tasks` - Create task
- PATCH `/api/projects/tasks/[taskId]` - Update task
- DELETE `/api/projects/tasks/[taskId]` - Delete task
- POST `/api/projects/tasks/[taskId]/dependencies` - Add dependency
- DELETE `/api/projects/tasks/dependencies/[depId]` - Remove dependency
- GET `/api/projects/[id]/critical-path` - Calculate critical path
- GET `/api/projects/templates` - Get project templates
- POST `/api/projects/from-template` - Create project from template

#### Built-in Templates
1. **Birthday Party Planning**
   - Tasks: Guest list, invitations, venue booking, cake ordering, decorations, etc.
2. **School Year Start**
   - Tasks: School supply shopping, uniform prep, schedule review, etc.
3. **Vacation Planning**
   - Tasks: Destination research, booking flights, booking hotel, itinerary, packing list, etc.
4. **Holiday Prep**
   - Tasks: Decorations, menu planning, gift shopping, wrapping, etc.

---

## 8. Family Life Modules

### 8.1 Family Communication Board

**Status:** ✅ COMPLETED

**Implementation Summary:**
- Database schema implemented with CommunicationPost and PostReaction models
- Full CRUD API routes for posts and reactions management
- Permission-based posting (parents can post announcements, all members can post kudos/notes)
- Post reactions with emoji support (add/remove reactions)
- Pin/unpin functionality for important announcements (parents only)
- CommunicationFeed component with filtering, pagination, and real-time reactions
- PostComposer component with type selection and validation
- 49 passing API integration tests
- 27 passing component tests (14 for Feed, 13 for Composer)
- Test-driven development approach followed throughout
- Total: 76 comprehensive tests

#### Features Implemented
- ✅ Family announcements (pinned messages from parents)
- ✅ Kudos/shout-outs (celebrate achievements, say thanks)
- ✅ Quick notes (reminders, FYIs)
- ✅ Photo sharing (with image URL support)
- ✅ Reactions (emoji responses for engagement)
- ✅ Permission controls:
  - Only parents can post announcements
  - Only post authors can edit content
  - Only parents can pin/unpin posts
  - Parents can delete any post, authors can delete own posts
- ✅ Post filtering by type and pinned status
- ✅ Pagination support for large post lists
- ✅ Audit logging for all post operations (create, update, delete, pin, unpin)

#### UI Components Implemented
- ✅ CommunicationFeed - Message feed with card-based layout, newest first, pinned posts at top
- ✅ PostComposer - Quick post creation with type selection, title, content, and image URL
- ✅ Reaction system - Click existing reactions to remove, add new reactions with emoji picker
- ✅ Post type badges with color-coding (Announcement, Kudos, Note, Photo)
- ✅ Filter controls - Filter by post type and pinned status
- ✅ Load more pagination - Efficient loading of large post lists

#### Database Schema (Implemented)
```prisma
model CommunicationPost {
  id          String       @id @default(uuid())
  familyId    String
  family      Family       @relation(fields: [familyId], references: [id], onDelete: Cascade)
  type        PostType
  title       String?
  content     String
  imageUrl    String?
  isPinned    Boolean      @default(false)
  expiresAt   DateTime?
  authorId    String
  author      FamilyMember @relation("PostAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  reactions   PostReaction[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([familyId, createdAt])
  @@index([familyId, isPinned])
}

model PostReaction {
  id        String            @id @default(uuid())
  postId    String
  post      CommunicationPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  memberId  String
  member    FamilyMember      @relation(fields: [memberId], references: [id], onDelete: Cascade)
  emoji     String
  createdAt DateTime          @default(now())

  @@unique([postId, memberId, emoji])
}

enum PostType {
  ANNOUNCEMENT
  KUDOS
  NOTE
  PHOTO
}
```

#### API Routes Implemented
- ✅ GET `/api/communication` - Get all posts with filters (type, pinned), pagination
- ✅ POST `/api/communication` - Create post with validation and permission checks
- ✅ PATCH `/api/communication/[id]` - Update post (edit content, pin/unpin)
- ✅ DELETE `/api/communication/[id]` - Delete post with permission checks
- ✅ POST `/api/communication/[id]/react` - Add reaction (idempotent)
- ✅ DELETE `/api/communication/[id]/react` - Remove reaction (idempotent)

#### Future Enhancements (Not Yet Implemented)
- Message expiration (auto-archive after X days, configurable)
- Age-appropriate permissions based on child age brackets
- Photo upload integration (currently uses image URLs)
- Push notifications for new announcements

---

### 8.2 Routines & Morning Checklists

**Status:** ✅ COMPLETED

**Implementation Summary:**
- Database schema implemented with Routine, RoutineStep, and RoutineCompletion models
- Full CRUD API routes for routines management
- Routine completion tracking with daily unique constraint
- RoutineBuilder component for creating/editing routines (parents)
- RoutineExecutionView component for completing routines (children)
- 57 passing integration tests
- 31 passing component tests
- Test-driven development approach followed throughout

#### Features
- Routine templates (morning, bedtime, homework, after-school, etc.)
- Step-by-step task lists with icons
- Visual progress indicators
- Time estimates per step
- Audio/visual cues (optional sounds, animations)
- Completion tracking per day
- Different routines for weekday vs weekend
- Parent-defined routines per child
- Age-appropriate execution:
  - **5-8:** One step at a time, large buttons, celebration animations
  - **9-12:** Checklist view, swipe to complete
  - **13+:** Simple list, quick completion

#### UI Components
- Routine builder (drag-and-drop steps)
- Step-by-step execution view (one step at a time for younger kids)
- Progress bar/visual indicator
- Celebration animation on completion
- Weekly completion calendar
- Routine template library
- Icon picker for steps

#### Database Schema
```prisma
model Routine {
  id          String         @id @default(cuid())
  familyId    String
  family      Family         @relation(fields: [familyId], references: [id])
  name        String
  type        RoutineType
  isWeekday   Boolean        @default(true)
  isWeekend   Boolean        @default(true)
  assignedTo  String?        // Specific child, or null for all
  assignee    FamilyMember?  @relation(fields: [assignedTo], references: [id])
  steps       RoutineStep[]
  completions RoutineCompletion[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

model RoutineStep {
  id              String   @id @default(cuid())
  routineId       String
  routine         Routine  @relation(fields: [routineId], references: [id])
  name            String
  icon            String?  // Emoji or icon name
  estimatedMinutes Int?
  sortOrder       Int      @default(0)
}

model RoutineCompletion {
  id          String       @id @default(cuid())
  routineId   String
  routine     Routine      @relation(fields: [routineId], references: [id])
  memberId    String
  member      FamilyMember @relation(fields: [memberId], references: [id])
  completedAt DateTime     @default(now())
  date        DateTime     // Just the date part for daily tracking
}

enum RoutineType {
  MORNING
  BEDTIME
  HOMEWORK
  AFTER_SCHOOL
  CUSTOM
}
```

#### API Routes Needed
- GET `/api/routines` - Get all routines for family/member
- POST `/api/routines` - Create routine
- GET `/api/routines/[id]` - Get routine details
- PATCH `/api/routines/[id]` - Update routine
- DELETE `/api/routines/[id]` - Delete routine
- POST `/api/routines/[id]/complete` - Log completion
- GET `/api/routines/completions?memberId=X&date=Y` - Get completions for day
- GET `/api/routines/templates` - Get routine templates

---

### 8.3 Transportation & Carpool Tracker

**Status:** ✅ COMPLETED (2026-01-01)

#### Implementation Summary
Complete transportation coordination system for managing daily pickup/dropoff schedules, driver assignments, locations, and carpool groups.

**Database Models:**
- `TransportSchedule` - Weekly recurring schedules with day/time, type (PICKUP/DROPOFF)
- `TransportLocation` - Location presets (school, activities, etc.)
- `TransportDriver` - Driver registry with contact info and relationships
- `CarpoolGroup` - Carpool coordination with external family contacts
- `CarpoolMember` - Individual carpool participant contact details
- `TransportType` enum - PICKUP, DROPOFF
- Audit actions: TRANSPORT_SCHEDULE_CREATED, TRANSPORT_SCHEDULE_UPDATED, TRANSPORT_SCHEDULE_DELETED, TRANSPORT_LOCATION_ADDED, TRANSPORT_DRIVER_ADDED, CARPOOL_GROUP_CREATED, CARPOOL_MEMBER_ADDED, TRANSPORT_CONFIRMED

**API Routes (53 tests passing):**
- `GET /api/transport/schedules` - List schedules (filter by member, day of week)
- `POST /api/transport/schedules` - Create schedule (parents only)
- `GET /api/transport/schedules/[id]` - Get schedule details
- `PATCH /api/transport/schedules/[id]` - Update schedule (parents only)
- `DELETE /api/transport/schedules/[id]` - Soft delete schedule (parents only)
- `GET /api/transport/today` - Get today's transport (filter by member)
- `GET /api/transport/locations` - List locations
- `POST /api/transport/locations` - Create location (parents only)
- `GET /api/transport/drivers` - List drivers
- `POST /api/transport/drivers` - Add driver (parents only)
- `GET /api/transport/carpools` - List carpool groups with members
- `POST /api/transport/carpools` - Create carpool with members (parents only)

**UI Components:**
- `/app/dashboard/transport` - Main transportation page
- Today's transport section with highlighted schedules
- Weekly schedule view organized by day of week
- Time formatting (12-hour display from 24-hour storage)
- Color-coded badges (blue for pickup, green for dropoff)
- Display of member, location, driver, carpool, and notes

**Key Features:**
- Weekly recurring schedules (Sunday-Saturday, 0-6)
- 24-hour time format (HH:MM) with validation
- Soft delete with isActive flag
- Family scoping with permission controls
- Support for locations, drivers, or carpool groups
- Optional notes per schedule
- Today's transport quick view

---

### 8.4 Pet Care Module

**Status:** ✅ COMPLETED (Core features implemented, 44 API tests passing)

### Implementation Summary

#### ✅ Completed Features
- **Database Schema**: Pet, PetFeeding, PetMedication, PetVetVisit, PetWeight models with proper relations
- **Pet CRUD API** (31 tests passing):
  - GET `/api/pets` - List all family pets
  - POST `/api/pets` - Add new pet (parents only)
  - GET `/api/pets/[id]` - Get pet details
  - PATCH `/api/pets/[id]` - Update pet (parents only)
  - DELETE `/api/pets/[id]` - Delete pet (parents only)
- **Pet Feeding API** (13 tests passing):
  - POST `/api/pets/[id]/feed` - Log feeding (all family members)
  - GET `/api/pets/[id]/feed` - Get feeding history (last 50)
- **UI Components**:
  - Pet list with species emojis (🐕🐈🐦🐠🐹🐰🦎)
  - Pet cards showing name, breed, age
  - Quick feed button with success feedback
  - Pet browsing page at `/dashboard/pets`
- **Pet Species**: DOG, CAT, BIRD, FISH, HAMSTER, RABBIT, GUINEA_PIG, REPTILE, OTHER
- **Audit Logging**: PET_ADDED, PET_UPDATED, PET_DELETED, PET_FED
- **Family Scoping**: Pets isolated by family
- **Permission Controls**: Only parents can add/edit/delete pets, all members can log feedings

#### ⏳ Not Yet Implemented
- Medication tracking with countdown timers
- Vet visit logging
- Weight tracking with charts
- Grooming schedule
- Pet care assignment to kids (gamified)
- Pet profile photos/image upload
- Supply tracking (food, litter, treats)
- Feeding schedule/reminders

#### Features
- Pet profiles (name, species, breed, birthday, photo)
- Feeding schedule and tracking
- Medication reminders (similar to child medications with countdown)
- Vet appointment tracking
- Grooming schedule
- Pet chore assignments (feeding as a rotating chore)
- Supply tracking (food, litter, treats, etc.)
- Weight and health log

#### UI Components
- Pet profile cards with photos
- Daily care checklist (feed, walk, clean litter)
- Feeding time reminders
- Medication tracker (with next-dose countdown like child meds)
- Vet appointment calendar integration
- Weight tracking chart
- Pet care assignment to kids (gamified with credits)

#### Database Schema
```prisma
model Pet {
  id          String       @id @default(cuid())
  familyId    String
  family      Family       @relation(fields: [familyId], references: [id])
  name        String
  species     PetSpecies
  breed       String?
  birthday    DateTime?
  imageUrl    String?
  notes       String?
  feedings    PetFeeding[]
  medications PetMedication[]
  vetVisits   PetVetVisit[]
  weights     PetWeight[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model PetFeeding {
  id          String       @id @default(cuid())
  petId       String
  pet         Pet          @relation(fields: [petId], references: [id])
  fedAt       DateTime     @default(now())
  fedBy       String
  member      FamilyMember @relation(fields: [fedBy], references: [id])
  foodType    String?
  amount      String?
}

model PetMedication {
  id                 String   @id @default(cuid())
  petId              String
  pet                Pet      @relation(fields: [petId], references: [id])
  medicationName     String
  dosage             String
  frequency          String   // "Daily", "Twice daily", "As needed"
  minIntervalHours   Int?     // For countdown timer
  lastGivenAt        DateTime?
  nextDoseAt         DateTime?
  notes              String?
}

model PetVetVisit {
  id          String   @id @default(cuid())
  petId       String
  pet         Pet      @relation(fields: [petId], references: [id])
  visitDate   DateTime
  reason      String
  diagnosis   String?
  treatment   String?
  cost        Float?
  nextVisit   DateTime?
  notes       String?
}

model PetWeight {
  id          String   @id @default(cuid())
  petId       String
  pet         Pet      @relation(fields: [petId], references: [id])
  weight      Float
  unit        String   // lbs or kg
  recordedAt  DateTime @default(now())
}

enum PetSpecies {
  DOG
  CAT
  BIRD
  FISH
  HAMSTER
  RABBIT
  GUINEA_PIG
  REPTILE
  OTHER
}
```

#### API Routes Needed
- GET `/api/pets` - List all pets
- POST `/api/pets` - Add pet
- GET `/api/pets/[id]` - Get pet details
- PATCH `/api/pets/[id]` - Update pet
- DELETE `/api/pets/[id]` - Delete pet
- POST `/api/pets/[id]/feed` - Log feeding
- GET `/api/pets/[id]/feedings` - Get feeding history
- POST `/api/pets/[id]/medications` - Add medication
- GET `/api/pets/[id]/medications` - Get medications
- POST `/api/pets/[id]/medications/dose` - Log medication dose
- POST `/api/pets/[id]/vet-visits` - Log vet visit
- POST `/api/pets/[id]/weight` - Log weight

---

### 8.5 Household Maintenance Tracker

**Status:** ✅ COMPLETED (Core features implemented, 45 API tests passing)

### Implementation Summary

#### ✅ Completed Features
- **Database Schema**: MaintenanceItem and MaintenanceCompletion models with full tracking capabilities
- **Maintenance CRUD API** (32 tests passing):
  - GET `/api/maintenance` - List all family maintenance items
  - POST `/api/maintenance` - Create new item (parents only)
  - GET `/api/maintenance/[id]` - Get item details with completion history
  - PATCH `/api/maintenance/[id]` - Update item (parents only)
  - DELETE `/api/maintenance/[id]` - Delete item (parents only)
- **Completion Logging API** (7 tests passing):
  - POST `/api/maintenance/[id]/complete` - Log task completion (all members)
- **Special Endpoints** (6 tests passing):
  - GET `/api/maintenance/upcoming?days=30` - Get upcoming and overdue tasks
- **UI Components**:
  - Maintenance list with filter tabs (All Tasks, Upcoming & Overdue)
  - Item cards showing category emoji, frequency, due dates
  - Overdue and due soon alerts with color coding
  - Last completion tracking
  - Estimated cost display
- **Categories**: HVAC, PLUMBING, ELECTRICAL, EXTERIOR, INTERIOR, LAWN_GARDEN, APPLIANCES, SAFETY, SEASONAL, OTHER
- **Seasonal Tracking**: SPRING, SUMMER, FALL, WINTER support for seasonal tasks
- **Audit Logging**: MAINTENANCE_ITEM_CREATED, MAINTENANCE_ITEM_UPDATED, MAINTENANCE_ITEM_DELETED, MAINTENANCE_TASK_COMPLETED
- **Family Scoping**: Maintenance items isolated by family
- **Permission Controls**: Only parents can add/edit/delete items, all members can log completions

#### ⏳ Not Yet Implemented
- Maintenance task templates library (common tasks with recommended frequencies)
- Service provider contact management
- Photo documentation for completions
- Cost tracking summary/reports
- Recurring reminder notifications
- Calendar view for maintenance schedule
- Seasonal task suggestions

#### Features
- Maintenance task library (common tasks with recommended frequencies)
- Custom maintenance items
- Due date tracking with reminders
- Completion history
- Seasonal task suggestions (spring, summer, fall, winter)
- Service provider contacts
- Cost tracking (optional)
- Photo documentation (before/after)

#### Common Maintenance Items
- HVAC filter replacement (every 3 months)
- Smoke detector batteries (every 6 months)
- Carbon monoxide detector check (every 6 months)
- Water heater flush (annual)
- Gutter cleaning (twice yearly)
- Dryer vent cleaning (annual)
- Air conditioner service (annual)
- Furnace service (annual)
- Lawn mower blade sharpening (seasonal)
- Sprinkler system check (spring)

#### UI Components
- Maintenance calendar view (shows upcoming tasks)
- Upcoming tasks dashboard widget
- Overdue alerts (prominent warning on dashboard)
- Task completion form with cost/notes
- Service provider directory
- Seasonal checklist view
- Cost tracking summary
- Photo documentation viewer

#### Database Schema
```prisma
model MaintenanceItem {
  id              String                @id @default(cuid())
  familyId        String
  family          Family                @relation(fields: [familyId], references: [id])
  name            String
  description     String?
  category        MaintenanceCategory
  frequency       String                // "Every 3 months", "Annual", "As needed"
  season          Season?               // For seasonal tasks
  lastCompletedAt DateTime?
  nextDueAt       DateTime?
  estimatedCost   Float?
  notes           String?
  completions     MaintenanceCompletion[]
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
}

model MaintenanceCompletion {
  id                String           @id @default(cuid())
  maintenanceItemId String
  item              MaintenanceItem  @relation(fields: [maintenanceItemId], references: [id])
  completedAt       DateTime         @default(now())
  completedBy       String
  member            FamilyMember     @relation(fields: [completedBy], references: [id])
  cost              Float?
  serviceProvider   String?
  notes             String?
  photoUrls         String[]         // Array of photo URLs
}

enum MaintenanceCategory {
  HVAC
  PLUMBING
  ELECTRICAL
  EXTERIOR
  INTERIOR
  LAWN_GARDEN
  APPLIANCES
  SAFETY
  SEASONAL
  OTHER
}

enum Season {
  SPRING
  SUMMER
  FALL
  WINTER
}
```

#### API Routes Needed
- GET `/api/maintenance` - List all maintenance items
- POST `/api/maintenance` - Create maintenance item
- GET `/api/maintenance/[id]` - Get item details
- PATCH `/api/maintenance/[id]` - Update item
- DELETE `/api/maintenance/[id]` - Delete item
- POST `/api/maintenance/[id]/complete` - Log completion
- GET `/api/maintenance/upcoming` - Get upcoming/overdue tasks
- GET `/api/maintenance/seasonal?season=X` - Get seasonal checklist
- GET `/api/maintenance/templates` - Get common maintenance templates

---

### 8.6 Document Vault

**Status:** ✅ COMPLETED (2026-01-01)

#### Implementation Summary
Complete secure document storage system with categorization, expiration tracking, access controls, sharing capabilities, and comprehensive audit logging.

**Database Models:**
- `Document` - Secure document storage with metadata, access control, and versioning
- `DocumentVersion` - Version history tracking
- `DocumentShareLink` - Time-limited secure sharing with token-based access
- `DocumentAccessLog` - Comprehensive access audit trail
- `DocumentCategory` enum - IDENTITY, MEDICAL, FINANCIAL, HOUSEHOLD, EDUCATION, LEGAL, PETS, OTHER
- Audit actions: DOCUMENT_UPLOADED, DOCUMENT_UPDATED, DOCUMENT_DELETED, DOCUMENT_ACCESSED, DOCUMENT_SHARED, DOCUMENT_SHARE_ACCESSED

**API Routes (54 tests passing):**
- `GET /api/documents` - List documents with category filters
- `POST /api/documents` - Upload document with metadata
- `GET /api/documents/[id]` - Get document details (with access logging)
- `PATCH /api/documents/[id]` - Update document metadata (parents only)
- `DELETE /api/documents/[id]` - Delete document (parents only)
- `GET /api/documents/expiring?days=90` - Get expiring documents
- `POST /api/documents/[id]/share` - Generate secure share link (parents only)
- `GET /api/documents/[id]/share` - List share links for document
- `GET /api/documents/shared/[token]` - Access via share link (public, logged)
- `POST /api/documents/share/[linkId]/revoke` - Revoke share link (parents only)

**UI Components:**
- `/app/dashboard/documents` - Document vault page with category filtering
- Category filters with emoji icons (🆔🏥💰🏠📚⚖️🐾📄)
- Document cards with masked document numbers (****1234)
- Expiring soon alerts (90-day default with countdown)
- File size formatting (B, KB, MB)
- Upload date and uploader display
- Tags display with filtering

**Security Features:**
- Per-document access control lists (who can view)
- Document number masking (show last 4 digits only)
- Access logging with IP address and user agent tracking
- Secure share links with token-based access
- Expiration date tracking with advance alerts
- Share link revocation with cascade session termination
- Comprehensive audit logging of all document operations
- Family scoping for all operations

#### Features Implemented (Complete)
- ✅ Secure document upload and storage
- ✅ Document categorization (identity, medical, financial, household, education, legal, pets)
- ✅ Expiration date tracking with advance reminders (90-day default)
- ✅ Per-document access controls (accessList field)
- ✅ Secure sharing links (time-limited with token-based access)
- ✅ Document numbers masked in UI (show last 4 digits only)
- ✅ Access logging for audit trail
- ✅ Share link revocation
- ✅ Quick-search and filtering by category
- ✅ Category icons and color coding
- ⏳ Document versioning (models exist, not implemented)
- ⏳ Mobile-friendly document viewer (PDF, images)
- ⏳ Encrypted storage (file storage integration needed)
- ⏳ Share link password protection
- ⏳ Upload modal with drag-and-drop
- ⏳ Document detail view with inline preview
- ⏳ Version history viewer

#### Features Not Yet Implemented
- File upload integration (S3/MinIO or local filesystem)
- Document viewer component
- Document version management
- Password-protected share links
- Share link max access limit
- Upload UI with drag-and-drop
- Inline document preview
- Search by tags and content
- Batch document operations

---

## 9. Rules Engine & Automation

**Status:** Module defined in schema, no implementation

### 9.1 Configurable Rules Engine

#### Features
- Configurable triggers and actions
- Pre-built rule templates
- Rule execution history
- Dry-run testing for rules
- Enable/disable rules without deletion

#### Trigger Types
1. **Chore completed** - When any/specific chore is completed
2. **Chore streak** - When a streak milestone is reached (3, 7, 30 days)
3. **Screen time low** - When balance drops below threshold
4. **Inventory low** - When item drops below threshold
5. **Calendar busy day** - When day has 3+ events
6. **Medication given** - When medication is logged
7. **Routine completed** - When routine is finished
8. **Time-based** - Daily at time, weekly on day, monthly

#### Action Types
1. **Award credits** - Add credits to child's balance
2. **Send notification** - Push notification to specific member(s)
3. **Add shopping item** - Auto-add item to shopping list
4. **Create todo** - Generate a to-do task
5. **Lock medication** - Activate medication countdown timer
6. **Suggest meal** - Recommend easy meal for busy day
7. **Reduce chores** - Temporarily reduce chore assignments
8. **Adjust screen time** - Modify weekly allocation

#### Pre-built Rule Templates
1. **Chore Streak Bonus** - Award 10 credits for 7-day chore streak
2. **Low Screen Time Warning** - Notify when balance < 30 minutes
3. **Medication Cooldown** - Lock medication for 6 hours after dose
4. **Busy Day Easy Meals** - Suggest simple meal when calendar shows 3+ events
5. **Weekly Allowance** - Award credits every Sunday
6. **Birthday Bonus** - Award 50 credits on birthday
7. **Perfect Week** - Award 25 credits if all chores completed for week
8. **Low Inventory Alert** - Notify parent when staple item is low

#### UI Components
- Rule list with enable/disable toggles
- Rule builder (trigger selector, condition editor, action selector)
- Template selector for quick setup
- Rule execution history log
- Dry-run simulator
- Condition editor (threshold values, schedules, etc.)

#### Database Schema
```prisma
model AutomationRule {
  id          String       @id @default(cuid())
  familyId    String
  family      Family       @relation(fields: [familyId], references: [id])
  name        String
  description String?
  trigger     Json         // Trigger configuration
  conditions  Json?        // Optional conditions
  actions     Json         // Array of actions
  isEnabled   Boolean      @default(true)
  executions  RuleExecution[]
  createdBy   String
  creator     FamilyMember @relation(fields: [createdBy], references: [id])
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model RuleExecution {
  id        String         @id @default(cuid())
  ruleId    String
  rule      AutomationRule @relation(fields: [ruleId], references: [id])
  success   Boolean
  result    Json?          // Execution results
  error     String?
  executedAt DateTime      @default(now())
}
```

#### API Routes Needed
- GET `/api/rules` - List all rules
- POST `/api/rules` - Create rule
- GET `/api/rules/[id]` - Get rule details
- PATCH `/api/rules/[id]` - Update rule
- DELETE `/api/rules/[id]` - Delete rule
- PATCH `/api/rules/[id]/toggle` - Enable/disable rule
- POST `/api/rules/[id]/test` - Dry-run test
- GET `/api/rules/templates` - Get rule templates
- GET `/api/rules/executions` - Get execution history

---

## 10. Dashboard Enhancements

### 10.1 Enhanced Parent Dashboard

**Status:** Basic dashboard exists, missing detailed widgets

#### Missing Features
- Weather integration (optional)
- Transport schedule widget
- Medication due/available widget
- Maintenance overdue widget
- Low inventory alerts widget
- Expiring documents widget
- Active sick mode indicators
- Busy day meal suggestions

#### UI Components to Add
- Weather widget (current + 3-day forecast)
- Today's transport schedule card
- Medications dashboard (due now, available soon)
- Maintenance alerts (overdue/upcoming in red/yellow)
- Quick inventory status (items below threshold)
- Document expiration warnings
- Sick mode active banner
- Meal suggestion card for busy days

---

### 10.2 Kiosk Dashboard

**Status:** Not implemented

See [Section 1.1](#11-kiosk-mode) for full details.

#### Features
- No login required to view
- Large, readable from distance
- Auto-rotating sections or configurable layout
- Quick-switch to individual views via avatar tap + PIN

#### Sections
- Family calendar (today + next 7 days)
- Today's chores by person
- Transport schedule
- Shopping list (items to buy)
- Communication board (pinned announcements)
- Weather widget

---

### 10.3 Analytics Dashboard

**Status:** Basic reports exist, advanced analytics missing

#### Missing Analytics
- Chore fairness index (distribution across kids)
- Screen time trends (weekly/monthly charts)
- Chore completion rates by child (percentage)
- Credit economy summary (earning vs spending)
- Routine completion rates
- Meal repetition analysis (how often meals repeat)
- Maintenance cost tracking (annual spending)
- Food waste tracking (from leftovers)

#### UI Components to Add
- Fairness index chart (bar chart showing distribution)
- Screen time trend line chart
- Completion rate cards per child
- Credit flow Sankey diagram
- Routine heatmap (completion per day)
- Meal frequency chart
- Maintenance cost summary by category
- Food waste reduction goals

---

## 11. PWA & Notifications

### 11.1 Progressive Web App (PWA) Enhancements

**Status:** Likely partial implementation, needs verification

#### Missing Features
- Full offline capability (cached static assets, queued actions)
- Background sync for offline actions
- Full-screen mode configuration
- App-like navigation (no browser chrome)
- Install prompts and onboarding
- Update notifications when new version available

#### Implementation Checklist
- [ ] Service worker with cache-first for static assets
- [ ] Network-first for API calls with offline fallback
- [ ] IndexedDB queue for offline actions
- [ ] Background sync registration
- [ ] Install banner/prompt
- [ ] Update notification and reload prompt

---

### 11.2 Push Notifications Expansion

**Status:** Notification models exist, push notification implementation unclear

#### Missing Notification Types
1. **Leftover Expiring** - X hours before leftover expires
2. **Document Expiring** - 90/30/7 days before document expires
3. **Medication Available** - When medication countdown completes
4. **Routine Time** - When it's time to start routine
5. **Maintenance Due** - When maintenance task is due/overdue
6. **Pet Care Reminder** - When pet needs feeding/walking
7. **Carpool Reminder** - 30 minutes before pickup time
8. **Savings Goal Achieved** - When savings goal is reached
9. **Busy Day Alert** - Morning notification about busy day ahead
10. **Rule Triggered** - When automation rule executes

#### Implementation Needs
- Web Push API with VAPID keys
- Push subscription management
- Notification preferences (quiet hours, enable/disable by type)
- Notification history
- Quiet hours configuration (e.g., 9pm-7am)

---

## 12. Advanced Features

### 12.1 Internationalization (i18n)

**Status:** Not implemented

#### Features
- Multi-language support (English primary, Spanish and French planned)
- Translation implementation (next-intl or react-i18next)
- Date/time/currency localization
- 12-hour vs 24-hour time formats
- Currency display (USD, EUR, GBP, CAD, AUD)
- Number format localization (1,000.00 vs 1.000,00)
- RTL language support planning (Arabic, Hebrew future)
- Age-appropriate translations (simplified for younger kids)
- Emoji support (universal, already works)

---

### 12.2 Data Export & GDPR Compliance

**Status:** Partial (account deletion exists, export missing)

#### Missing Features
- Data export (JSON/CSV) for entire family
- Right to access (generate comprehensive data package)
- Right to portability (machine-readable format)
- Data anonymization on account deletion
- Cookie consent management
- Granular notification controls
- Privacy policy generator

---

### 12.3 Multi-Family Support

**Status:** Not planned for MVP, future consideration

#### Concept
- Support for blended families
- Shared custody schedules
- Multiple family contexts per child
- Cross-family calendar sharing
- Separate credit balances per family

---

### 12.4 Voice Integration

**Status:** Not planned for MVP, future consideration

#### Concept
- Alexa/Google Home integration
- Voice commands for common tasks:
  - "Log 30 minutes of screen time"
  - "What chores do I have today?"
  - "What's for dinner?"
  - "Add milk to the shopping list"

---

### 12.5 AI-Powered Suggestions

**Status:** Not planned for MVP, future consideration

#### Concept
- Meal planning suggestions based on past preferences
- Chore optimization (fair distribution, time balancing)
- Budget recommendations
- Routine optimization based on completion patterns
- Smart shopping list (predict when items run out)

---

## Summary

This document captures **all remaining features** from the original design document that are not yet implemented. The main categories of missing features are:

1. **8 New Modules:**
   - Meal Planning & Leftovers
   - Recipe Management
   - Household Inventory
   - Health Tracking & Sick Mode
   - Projects with Dependencies
   - Communication Board
   - Routines & Checklists
   - Transportation & Carpool
   - Pet Care
   - Maintenance Tracker
   - Document Vault

2. **Core System Enhancements:**
   - Kiosk Mode (UI)
   - Guest Access (UI)
   - File Upload Integration
   - Multi-Calendar Sync (enhancement)

3. **Automation & Intelligence:**
   - Rules Engine (complete system)
   - Advanced Analytics
   - AI Suggestions (future)

4. **Platform Features:**
   - Full PWA Implementation
   - Push Notifications (expanded types)
   - Internationalization (i18n)
   - GDPR Compliance Tools
   - Data Export

The current implementation has excellent coverage of the **core MVP features** (Family, Chores, Screen Time, Credits, Rewards, Shopping, Calendar, Todos). The remaining work focuses on **optional modules** and **advanced features** that enhance the system but are not required for basic household management.

---

**Next Steps:**
1. Prioritize which modules to implement next based on family needs
2. Follow TDD approach for each new module
3. Ensure database migrations are tested
4. Update this document as features are completed
