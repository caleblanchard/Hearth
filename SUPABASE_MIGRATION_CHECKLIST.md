# Supabase Migration Implementation Checklist

**Status:** In Progress  
**Started:** January 9, 2026  
**Strategy:** Cloud-only (Supabase + Vercel)  
**Approach:** Incremental migration with TDD

---

## Phase 1: Initial Setup (Day 1-2)

- [x] Install Supabase CLI globally (via Homebrew)
- [x] Initialize Supabase in project (`supabase init`)
- [x] Start local Supabase (`supabase start`)
- [x] Install @supabase/ssr
- [x] Install @supabase/supabase-js
- [x] Create git branch `feature/supabase-migration`
- [x] Create git tag `pre-supabase-migration` (already existed)
- [x] Document Supabase project URL and keys (see SUPABASE_LOCAL_SETUP.md)

---

## Phase 2: Test Infrastructure (Day 3-4)

- [x] Create `lib/test-utils/supabase-mock.ts`
- [x] Create `lib/test-utils/supabase-auth-mock.ts`
- [x] Create example test using Supabase mocks
- [x] Validate mocks work correctly (18/18 tests passing)
- [x] Document test patterns (see lib/test-utils/README.md) in README

---

## Phase 3: Schema Migration (Day 5-7)

- [x] Create migration: `supabase/migrations/00001_initial_schema.sql`
  - [x] Create families table
  - [x] Create family_members table (with auth_user_id)
  - [x] Create kiosk_sessions table
  - [x] Create kiosk_settings table
  - [x] Add all existing tables with UUID primary keys
- [x] Create migration: `supabase/migrations/00002_module_tables.sql`
  - [x] All module tables (chores, meals, calendar, etc.)
- [x] Create migration: `supabase/migrations/00003_rls_functions.sql`
  - [x] Create `get_user_family_ids()` function
  - [x] Create `is_parent_in_family()` function
  - [x] Fixed duplicate `auth.uid()` issue
- [x] Create migration: `supabase/migrations/00004_rls_policies.sql`
  - [x] Enable RLS on all tables
  - [x] Create policies for families
  - [x] Create policies for family_members
  - [x] Create policies for all other tables
- [x] Create migration: `supabase/migrations/00005_additional_indexes.sql`
  - [x] Performance indexes
- [x] Apply migrations locally (`supabase db reset`)
- [x] Generate TypeScript types (`supabase gen types typescript`)
- [x] Test RLS policies work

---

## Phase 4: Core Infrastructure (Week 2)

- [x] Create `lib/supabase/server.ts` (server-side client)
- [x] Create `lib/supabase/client.ts` (browser client)
- [x] Create `lib/supabase/middleware.ts` (helpers)
- [x] Create `lib/database.types.ts` (generated types)
- [x] Update `middleware.ts` for Supabase auth
- [x] Create `lib/data/` directory structure

---

## Phase 5: Data Layer Migration (Week 2-4)

### Module: Families & Members
- [x] Create `lib/data/families.ts` with Supabase queries
- [x] Create `lib/data/members.ts` with Supabase queries

### Module: Chores
- [x] Create `lib/data/chores.ts`

### Module: Credits
- [x] Create `lib/data/credits.ts`

### Module: Kiosk
- [x] Create `lib/data/kiosk.ts`

### Module: Meals & Recipes
- [ ] Create `lib/data/meals.ts`
- [ ] Create `lib/data/recipes.ts`

### Module: Calendar
- [ ] Create `lib/data/calendar.ts`

### Module: Communication
- [ ] Create `lib/data/communication.ts`

### Module: Routines
- [ ] Create `lib/data/routines.ts`

### Module: All Remaining
- [ ] Todo items
- [ ] Screen time
- [ ] Inventory
- [ ] Maintenance
- [ ] Transport
- [ ] Documents
- [ ] Pets
- [ ] Medications
- [ ] Weather

---

## Phase 6: Auth Migration (Week 3-4)

- [x] Configure Supabase Auth (email/password)
- [ ] Configure OAuth providers (Google, Apple) - Optional
- [x] Create `app/auth/signin/page.tsx`
- [x] Create `app/auth/signup/page.tsx`
- [x] Create `app/auth/callback/route.ts`
- [x] Create sign-up wizard flow
- [x] Create family creation flow
- [x] Write auth tests (via integration tests)
- [ ] Test authentication flows manually (Phase 7.5)
- [ ] Create user migration script (only if migrating existing data)

---

## Phase 7: Kiosk Migration & Testing (Week 5)

- [x] Create `lib/data/kiosk.ts`
- [x] Update `POST /api/kiosk/session/start`
- [x] Update `POST /api/kiosk/session/unlock`
- [x] Update `POST /api/kiosk/session/lock`
- [x] Update `POST /api/kiosk/session`
- [x] Update `DELETE /api/kiosk/session`
- [x] Update `POST /api/kiosk/session/activity`
- [x] Update `GET /api/kiosk/settings` + `PUT /api/kiosk/settings`
- [x] Update kiosk integration tests
  - [x] `__tests__/integration/api/kiosk/session.test.ts` (18/18 passing)
  - [x] `__tests__/integration/api/kiosk/settings.test.ts` (10/10 passing)
- [x] All kiosk tests passing (28/28)
- [ ] Update `app/kiosk/page.tsx` if needed
- [ ] Update kiosk components if needed
- [ ] Test full kiosk flow manually (Phase 7.5)

---

## Phase 8: Production Deployment (Week 6-7)

- [ ] Create Supabase production project
- [ ] Run migrations on production database
- [ ] Create Vercel project
- [ ] Configure Vercel environment variables
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] NEXT_PUBLIC_APP_URL
- [ ] Deploy to Vercel
- [ ] Test production deployment
- [ ] Monitor for errors
- [ ] Verify all features work

---

## Phase 9: Cleanup (Week 7)

- [ ] Remove Prisma dependencies
  - [ ] `npm uninstall prisma @prisma/client`
  - [ ] Remove `prisma/` directory
  - [ ] Remove `prisma.config.js`
  - [ ] Remove `prisma.config.ts`
- [ ] Remove NextAuth dependencies
  - [ ] `npm uninstall next-auth`
  - [ ] Remove NextAuth configuration
- [ ] Remove old test mocks (`lib/test-utils/prisma-mock.ts`)
- [ ] Update all documentation
  - [ ] README.md
  - [ ] claude.md
  - [ ] .github/copilot-instructions.md
- [ ] Update deployment documentation
- [ ] Archive migration checklist
- [ ] Celebrate! 🎉

---

## Notes

- Keep Prisma working alongside Supabase initially
- Maintain 80%+ test coverage throughout
- Test each module thoroughly before moving to next
- Document any issues or learnings

---

## Current Status

**Last Updated:** January 10, 2026  
**Current Phase:** Phase 7 - Testing & Verification (COMPLETE ✅)  
**Next Steps:** Manual testing, then Phase 8 (Production Deployment)
