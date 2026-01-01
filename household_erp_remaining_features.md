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
**Status:** Models exist (GuestInvite, GuestSession), UI not implemented

#### Features
- Guest invitation workflow with unique links or 6-digit codes
- Access levels (View Only, Limited, Caregiver)
- Time-limited access (4 hours, 24 hours, 1 week, custom)
- Device-bound sessions
- Automatic cleanup of expired invites

#### UI Components Needed
- Guest invitation creation form
- Guest access management page
- Guest session viewer
- Active guest indicator

#### API Routes Needed
- POST `/api/family/guests/invite` - Create guest invite
- GET `/api/family/guests` - List active guests
- DELETE `/api/family/guests/[id]` - Revoke guest access
- POST `/api/auth/guest/[code]` - Redeem guest invite

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

**Status:** Module defined in schema, no implementation

### 3.1 Weekly Meal Planner

#### Features
- Weekly meal planner grid (7 days × 3 meals)
- Drag-and-drop meals from recipe library
- Meal type categorization (breakfast, lunch, dinner, snack)
- Family favorites marking
- Busy day meal suggestions (integrates with calendar)
- Dietary and allergy tags
- Quick meal templates for common weeks

#### UI Components
- Weekly calendar grid with drag-and-drop
- Meal selector/browser modal
- Quick actions (copy week, clear week, use template)
- Print meal plan option

#### Database Schema
```prisma
model MealPlan {
  id        String   @id @default(cuid())
  familyId  String
  family    Family   @relation(fields: [familyId], references: [id])
  weekStart DateTime // Monday of the week
  meals     MealPlanEntry[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model MealPlanEntry {
  id         String    @id @default(cuid())
  mealPlanId String
  mealPlan   MealPlan  @relation(fields: [mealPlanId], references: [id])
  date       DateTime  // Specific day
  mealType   MealType  // BREAKFAST, LUNCH, DINNER, SNACK
  recipeId   String?
  recipe     Recipe?   @relation(fields: [recipeId], references: [id])
  customName String?   // If not using a recipe
  notes      String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

enum MealType {
  BREAKFAST
  LUNCH
  DINNER
  SNACK
}
```

#### API Routes Needed
- GET `/api/meals/plan?week=YYYY-MM-DD` - Get meal plan for week
- POST `/api/meals/plan` - Create/update meal plan entry
- DELETE `/api/meals/plan/[id]` - Remove meal plan entry
- GET `/api/meals/suggestions?date=YYYY-MM-DD` - Get suggestions based on busy day

---

### 3.2 Leftovers Tracking

#### Features
- Log leftovers after meals
- Expiration countdown (configurable default: 3 days)
- Visual indicators (green → yellow → red)
- "Use by" reminders via push notification
- Leftover meal suggestions
- "Used it" or "Tossed it" logging
- Food waste analytics (optional)

#### UI Components
- Leftover inventory card on dashboard
- Expiration countdown badges
- "Log Leftover" quick action after meals
- "What to make with leftovers" suggestion modal
- Food waste summary (monthly stats)

#### Database Schema
```prisma
model Leftover {
  id              String    @id @default(cuid())
  familyId        String
  family          Family    @relation(fields: [familyId], references: [id])
  name            String
  mealPlanEntryId String?   // Link to original meal if applicable
  quantity        String?   // "Half a lasagna", "2 servings"
  storedAt        DateTime  @default(now())
  expiresAt       DateTime  // Auto-calculated based on default + manual override
  usedAt          DateTime?
  tossedAt        DateTime?
  notes           String?
  createdBy       String
  creator         FamilyMember @relation(fields: [createdBy], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

#### API Routes Needed
- GET `/api/meals/leftovers` - Get active leftovers
- POST `/api/meals/leftovers` - Log a new leftover
- PATCH `/api/meals/leftovers/[id]/used` - Mark as used
- PATCH `/api/meals/leftovers/[id]/tossed` - Mark as tossed
- GET `/api/meals/leftovers/analytics` - Food waste stats

---

## 4. Recipe Management Module

**Status:** Module defined in schema, no implementation

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

**Status:** Module defined in schema, no implementation

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

**Status:** Module defined in schema, no implementation

### 6.1 Child Sickness Manager

#### Features
- Per-child health event logs
- Symptom timeline with severity tracking (1-10 scale)
- Temperature logging with trend visualization
- Medication tracking (linked to medication safety system)
- Doctor visit scheduling and notes
- Allergy and medical condition tracking
- Weight tracking for dosage calculations
- Photo documentation (rashes, symptoms)
- Shareable health summary for doctors (PDF export)

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

#### Features
- Configurable minimum interval between doses (e.g., 4-6 hours)
- Visual countdown timer showing "next dose available at"
- Hard lock preventing logging before cooldown expires
- Parent override capability (with confirmation and reason)
- Distinct timers per medication per child
- Push notification when dose becomes available
- Warning if approaching daily maximum doses
- Cross-medication warnings (same active ingredient)
- Daily maximum tracking with hard stop option

#### UI Components
- Medication card with prominent countdown timer
- Visual lock indicator (red lock icon when locked)
- "Log Dose" button (disabled with countdown when locked)
- Countdown display formats (hours:minutes:seconds)
- Override flow (parent only) with warning modal
- Daily dose counter (X/Y doses today)
- Notification preference toggle per medication
- Dose history visible at a glance

#### Database Schema
```prisma
model MedicationSafety {
  id                 String       @id @default(cuid())
  memberId           String
  member             FamilyMember @relation(fields: [memberId], references: [id])
  medicationName     String
  activeIngredient   String?      // For cross-medication checking
  minIntervalHours   Int          // Minimum hours between doses
  maxDosesPerDay     Int?         // Daily limit
  lastDoseAt         DateTime?
  nextDoseAvailableAt DateTime?   // Calculated field
  notifyWhenReady    Boolean      @default(true)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  doses              MedicationDose[]
}

model MedicationDose {
  id                   String            @id @default(cuid())
  medicationSafetyId   String
  medicationSafety     MedicationSafety  @relation(fields: [medicationSafetyId], references: [id])
  givenAt              DateTime          @default(now())
  givenBy              String
  dosage               String
  notes                String?
  wasOverride          Boolean           @default(false)
  overrideReason       String?
  overrideApprovedBy   String?
}
```

#### API Routes Needed
- GET `/api/health/medications/safety` - Get all medication safety configs
- POST `/api/health/medications/safety` - Create medication safety config
- GET `/api/health/medications/safety/[id]` - Get config details
- PATCH `/api/health/medications/safety/[id]` - Update config
- POST `/api/health/medications/dose` - Log a dose (with interlock check)
- POST `/api/health/medications/dose/override` - Parent override (requires auth)
- GET `/api/health/medications/available` - Get medications ready for next dose
- GET `/api/health/medications/countdown` - Get all active countdown timers

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

**Status:** Module defined in schema, no implementation

#### Features
- Family announcements (pinned messages from parents)
- Kudos/shout-outs (celebrate achievements, say thanks)
- Quick notes (reminders, FYIs)
- Photo sharing (family moments)
- Message expiration (auto-archive after X days, configurable)
- Reactions (emoji responses for engagement)
- Age-appropriate permissions:
  - **5-8:** View-only
  - **9-12:** Can post kudos, view all
  - **13+:** Full posting rights
  - **Parents:** Full control, can pin/unpin

#### UI Components
- Message feed (card-based layout, newest first)
- Quick post composer (text + optional photo)
- Kudos picker with member selector
- Pinned announcements banner at top
- Photo upload with preview
- Reaction picker (emoji selector)
- Filter by type (all, announcements, kudos, notes, photos)

#### Database Schema
```prisma
model CommunicationPost {
  id          String       @id @default(cuid())
  familyId    String
  family      Family       @relation(fields: [familyId], references: [id])
  type        PostType
  title       String?
  content     String
  imageUrl    String?
  isPinned    Boolean      @default(false)
  expiresAt   DateTime?
  authorId    String
  author      FamilyMember @relation(fields: [authorId], references: [id])
  reactions   PostReaction[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model PostReaction {
  id        String            @id @default(cuid())
  postId    String
  post      CommunicationPost @relation(fields: [postId], references: [id])
  memberId  String
  member    FamilyMember      @relation(fields: [memberId], references: [id])
  emoji     String            // 👍, ❤️, 🎉, etc.
  createdAt DateTime          @default(now())
}

enum PostType {
  ANNOUNCEMENT
  KUDOS
  NOTE
  PHOTO
}
```

#### API Routes Needed
- GET `/api/communication` - Get all posts with filters
- POST `/api/communication` - Create post
- PATCH `/api/communication/[id]` - Update post (edit, pin/unpin)
- DELETE `/api/communication/[id]` - Delete post
- POST `/api/communication/[id]/react` - Add reaction
- DELETE `/api/communication/[id]/react` - Remove reaction

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

**Status:** Module defined in schema, no implementation

#### Features
- Pickup/dropoff schedule per child
- Driver assignments (parents, grandparents, carpool members)
- Location presets (school, soccer practice, piano lessons, etc.)
- Carpool groups with external families (contact info)
- Driver confirmation workflow ("I'll be there")
- Day-of changes and notifications
- Weekly schedule view
- Integration with calendar events (auto-create transport events)

#### UI Components
- Weekly transport calendar view
- Today's transport card on dashboard
- Driver quick-select dropdown
- Confirmation buttons (confirmed/need backup)
- Change request flow
- Carpool rotation manager (who drives this week)
- Contact quick-dial for drivers

#### Database Schema
```prisma
model TransportSchedule {
  id          String       @id @default(cuid())
  familyId    String
  family      Family       @relation(fields: [familyId], references: [id])
  memberId    String
  member      FamilyMember @relation(fields: [memberId], references: [id])
  dayOfWeek   Int          // 0-6 (Sunday-Saturday)
  time        String       // HH:MM format
  type        TransportType
  locationId  String
  location    TransportLocation @relation(fields: [locationId], references: [id])
  driverId    String?
  driver      TransportDriver? @relation(fields: [driverId], references: [id])
  carpoolId   String?
  carpool     CarpoolGroup? @relation(fields: [carpoolId], references: [id])
  notes       String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model TransportLocation {
  id          String              @id @default(cuid())
  familyId    String
  family      Family              @relation(fields: [familyId], references: [id])
  name        String
  address     String?
  schedules   TransportSchedule[]
}

model TransportDriver {
  id          String              @id @default(cuid())
  familyId    String
  family      Family              @relation(fields: [familyId], references: [id])
  name        String
  phone       String?
  relationship String?            // "Mom", "Dad", "Grandma", "Carpool Parent"
  schedules   TransportSchedule[]
}

model CarpoolGroup {
  id          String              @id @default(cuid())
  familyId    String
  family      Family              @relation(fields: [familyId], references: [id])
  name        String
  members     CarpoolMember[]
  schedules   TransportSchedule[]
}

model CarpoolMember {
  id          String       @id @default(cuid())
  carpoolId   String
  carpool     CarpoolGroup @relation(fields: [carpoolId], references: [id])
  name        String
  phone       String?
  email       String?
}

enum TransportType {
  PICKUP
  DROPOFF
}
```

#### API Routes Needed
- GET `/api/transport/schedules` - Get transport schedules
- POST `/api/transport/schedules` - Create schedule
- PATCH `/api/transport/schedules/[id]` - Update schedule
- DELETE `/api/transport/schedules/[id]` - Delete schedule
- GET `/api/transport/today` - Get today's transport
- POST `/api/transport/confirm/[id]` - Driver confirms pickup
- GET `/api/transport/locations` - Get location presets
- POST `/api/transport/locations` - Create location
- GET `/api/transport/drivers` - Get drivers
- POST `/api/transport/drivers` - Add driver
- GET `/api/transport/carpools` - Get carpool groups
- POST `/api/transport/carpools` - Create carpool group

---

### 8.4 Pet Care Module

**Status:** Module defined in schema, no implementation

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

**Status:** Module defined in schema, no implementation

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

**Status:** Module defined in schema, no implementation

#### Features
- Secure document upload and storage
- Document categorization (identity, medical, financial, household, education, legal, pets)
- Expiration date tracking with advance reminders (90/30/7 days before)
- Per-document access controls (which family members can view)
- Document versioning (keep old copies)
- Quick-search and filtering
- Secure sharing links (time-limited, password-protected)
- Mobile-friendly document viewer (PDF, images)
- Encrypted storage
- Document numbers masked in UI (show last 4 digits only)
- Access logging for audit trail
- Automatic share link expiration

#### UI Components
- Document list with category filters
- Upload modal with drag-and-drop
- Document detail view with inline preview
- Expiration timeline view
- "Expiring Soon" dashboard widget
- Member document quick-view (see all docs for a person)
- Share link generator with expiration/password options
- Document search with tag filtering
- Category icons and color coding
- Version history viewer

#### Database Schema
```prisma
model Document {
  id             String           @id @default(cuid())
  familyId       String
  family         Family           @relation(fields: [familyId], references: [id])
  name           String
  category       DocumentCategory
  fileUrl        String           // S3/MinIO URL
  fileSize       Int              // Bytes
  mimeType       String
  documentNumber String?          // Masked in UI
  issuedDate     DateTime?
  expiresAt      DateTime?
  tags           String[]
  notes          String?
  uploadedBy     String
  uploader       FamilyMember     @relation(fields: [uploadedBy], references: [id])
  accessList     String[]         // Array of member IDs who can view
  versions       DocumentVersion[]
  shareLinks     DocumentShareLink[]
  accessLogs     DocumentAccessLog[]
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
}

model DocumentVersion {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id])
  version    Int
  fileUrl    String
  uploadedBy String
  uploadedAt DateTime @default(now())
  notes      String?
}

model DocumentShareLink {
  id         String    @id @default(cuid())
  documentId String
  document   Document  @relation(fields: [documentId], references: [id])
  token      String    @unique
  expiresAt  DateTime
  password   String?   // Hashed
  accessCount Int      @default(0)
  maxAccess  Int?      // Limit number of accesses
  createdBy  String
  createdAt  DateTime  @default(now())
}

model DocumentAccessLog {
  id         String       @id @default(cuid())
  documentId String
  document   Document     @relation(fields: [documentId], references: [id])
  accessedBy String
  member     FamilyMember @relation(fields: [accessedBy], references: [id])
  accessedAt DateTime     @default(now())
  ipAddress  String?
}

enum DocumentCategory {
  IDENTITY          // Passports, birth certificates, SSN cards
  MEDICAL           // Insurance cards, vaccination records
  FINANCIAL         // Bank statements, tax documents
  HOUSEHOLD         // Warranties, manuals, receipts
  EDUCATION         // Report cards, transcripts, diplomas
  LEGAL             // Wills, powers of attorney, contracts
  PETS              // Vet records, licenses
  OTHER
}
```

#### API Routes Needed
- GET `/api/documents` - List documents with filters
- POST `/api/documents` - Upload document
- GET `/api/documents/[id]` - Get document details (with access check)
- PATCH `/api/documents/[id]` - Update document metadata
- DELETE `/api/documents/[id]` - Delete document
- GET `/api/documents/[id]/download` - Download file (with access logging)
- POST `/api/documents/[id]/share` - Generate share link
- GET `/api/documents/share/[token]` - Access via share link
- GET `/api/documents/expiring` - Get documents expiring soon
- POST `/api/documents/[id]/version` - Upload new version

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
