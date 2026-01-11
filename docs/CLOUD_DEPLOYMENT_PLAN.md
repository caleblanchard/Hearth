# Hearth Cloud Deployment - Implementation Plan

## Document Information

- **Version:** 4.0 (Implementation Edition)
- **Created:** January 9, 2026
- **Last Updated:** January 9, 2026
- **Status:** ✅ **READY FOR IMPLEMENTATION**
- **Scope:** Cloud SaaS deployment, Supabase migration, simplified auth model
- **Strategy:** Cloud-only (Supabase + Vercel), incremental migration with TDD

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Decisions](#3-technology-decisions)
4. [Data Model](#4-data-model)
5. [Authentication System](#5-authentication-system)
6. [Kiosk Mode](#6-kiosk-mode)
7. [Row Level Security](#7-row-level-security)
8. [API Layer](#8-api-layer)
9. [File Structure](#9-file-structure)
10. [Migration Plan](#10-migration-plan)
11. [Implementation Phases](#11-implementation-phases)
12. [Security Considerations](#12-security-considerations)
13. [Environment Variables](#13-environment-variables)

---

## 1. Executive Summary

### What We're Building

Hearth is a family household management app being deployed as a cloud SaaS on Vercel with Supabase. Multiple families can register and use the same deployment with complete data isolation.

### Key Requirements

1. **Publicly accessible and secure** - Hosted on Vercel, accessible via internet
2. **Multi-tenant** - Multiple families, isolated data
3. **Kid-friendly authentication** - Easy for children to use
4. **Simple, efficient, maintainable** - Minimal dependencies, clean architecture

### Major Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database Client | **Supabase Client** (drop Prisma) | Native RLS support, fewer dependencies, better performance |
| Auth Provider | **Supabase Auth** (cloud-only) | Managed cloud auth, integrated with database |
| Security Model | **Row Level Security** | Database-level isolation, can't be bypassed by app bugs |
| Hosting | **Vercel + Supabase** | Managed SaaS, easy deployment |
| Migration Strategy | **Incremental with TDD** | Module by module, maintain test coverage |

### Authentication Model

| User Type | Has Email? | Login Method |
|-----------|------------|--------------|
| Parent | Yes | Email/password or OAuth |
| Kid (own device) | Yes | Email/password |
| Kid (no email) | No | Kiosk mode only (parent activates, kid uses PIN) |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                           VERCEL                                 │
│                                                                  │
│   Next.js 14 (App Router)                                        │
│   ├── Server Components (data fetching)                          │
│   ├── Route Handlers (API endpoints)                             │
│   ├── Server Actions (mutations)                                 │
│   └── Middleware (auth session management)                       │
│                                                                  │
│   Dependencies:                                                  │
│   └── @supabase/ssr (auth + database queries)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                 │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│   │     Auth     │  │  PostgreSQL  │  │  Row Level Security  │  │
│   │              │  │              │  │                      │  │
│   │ • Email/PW   │  │ • families   │  │ • family_isolation   │  │
│   │ • OAuth      │  │ • members    │  │ • role_based_access  │  │
│   │ • Magic Link │  │ • all data   │  │ • audit_logging      │  │
│   └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Decisions

### Why Drop Prisma?

| Aspect | Prisma | Supabase Client |
|--------|--------|-----------------|
| RLS Integration | Requires workarounds | Native support |
| Dependencies | prisma, @prisma/client, query engine | @supabase/ssr only |
| Type Safety | Excellent (dynamic) | Good (generated, static) |

**Decision:** The security benefits of native RLS outweigh Prisma's developer ergonomics. For a multi-tenant family app where data isolation is critical, database-level security is the right choice.

### Why Supabase Auth?

- **Integrated** - Same platform as database, shared user context
- **RLS-aware** - `auth.uid()` available in policies
- **OAuth built-in** - Google, Apple, etc. with minimal config
- **Managed** - No session storage, token refresh handled

---

## 4. Data Model

### Schema Changes from Current

```diff
  model FamilyMember {
    id            String   @id
    familyId      String
+   authUserId    String?  // Links to auth.users (NULL for kiosk-only kids)
    name          String
-   email         String?  @unique  // REMOVED - lives in auth.users
-   passwordHash  String?           // REMOVED - Supabase handles
    pin           String?           // KEPT - for kiosk mode (hashed)
    role          Role
    // ... rest unchanged
  }

- model User { ... }  // NOT NEEDED - use auth.users directly
```

### Core Tables

```sql
-- FAMILIES (Tenants)
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

-- FAMILY MEMBERS
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PARENT', 'CHILD', 'GUEST')),
  pin_hash TEXT,
  avatar_url TEXT,
  birth_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  CONSTRAINT unique_auth_user_per_family UNIQUE (family_id, auth_user_id)
);

CREATE INDEX idx_family_members_auth_user ON family_members(auth_user_id);
CREATE INDEX idx_family_members_family ON family_members(family_id);

-- KIOSK SESSIONS
CREATE TABLE kiosk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  activated_by UUID NOT NULL REFERENCES family_members(id),
  active_member_id UUID REFERENCES family_members(id),
  is_locked BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  auto_lock_minutes INT NOT NULL DEFAULT 15
);
```

---

## 5. Authentication System

### Supabase Auth Configuration

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

export async function getAuthContext() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user) return null

  const { data: memberships } = await supabase
    .from('family_members')
    .select('id, family_id, name, role, families(name)')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)

  return {
    user,
    memberships: memberships || [],
    defaultFamilyId: memberships?.[0]?.family_id || null
  }
}
```

### Middleware

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options) { 
          response.cookies.set({ name, value, ...options }) 
        },
        remove(name: string, options) { 
          response.cookies.set({ name, value: '', ...options }) 
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  if (user && request.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*', '/kiosk/:path*'],
}
```

---

## 6. Kiosk Mode

Kiosk mode allows multiple family members to use a shared device without individual login credentials.

### Security Model

- Parent logs in normally (Supabase Auth)
- Parent activates kiosk mode
- Family members unlock with PIN
- All API calls use parent's auth token
- RLS sees parent's user ID
- Active member tracked in kiosk session

### Kiosk API Endpoints

```typescript
// POST /api/kiosk/start - Create kiosk session
// POST /api/kiosk/unlock - Validate PIN, set active member
// POST /api/kiosk/lock - Clear active member
// POST /api/kiosk/end - End kiosk session
```

---

## 7. Row Level Security

### Helper Functions

```sql
-- Get current user's family IDs
CREATE OR REPLACE FUNCTION get_user_family_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(ARRAY_AGG(family_id), ARRAY[]::UUID[])
  FROM family_members
  WHERE auth_user_id = auth.uid() AND is_active = true
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is parent in family
CREATE OR REPLACE FUNCTION is_parent_in_family(check_family_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE auth_user_id = auth.uid()
      AND family_id = check_family_id
      AND role = 'PARENT'
      AND is_active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Standard Policies

```sql
-- FAMILIES
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their families"
  ON families FOR SELECT
  USING (id = ANY(get_user_family_ids()));

CREATE POLICY "Parents can update their families"
  ON families FOR UPDATE
  USING (is_parent_in_family(id));

-- FAMILY MEMBERS
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members in their families"
  ON family_members FOR SELECT
  USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "Parents can manage members"
  ON family_members FOR ALL
  USING (is_parent_in_family(family_id));

-- ALL OTHER TABLES
ALTER TABLE chore_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_isolation" ON chore_definitions
  FOR ALL
  USING (family_id = ANY(get_user_family_ids()));

-- Apply to: chore_assignments, chore_completions, todo_items, 
-- calendar_events, meal_plans, recipes, etc.
```

---

## 8. API Layer

### Data Access Pattern

```typescript
// lib/data/chores.ts
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type ChoreDefinition = Database['public']['Tables']['chore_definitions']['Row']

export async function getChoreDefinitions(familyId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('chore_definitions')
    .select(`
      *,
      assignments:chore_assignments(
        id,
        member:family_members(id, name, avatar_url)
      )
    `)
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data
}
```

### Type Generation

```bash
supabase gen types typescript --project-id <id> > lib/database.types.ts
```

---

## 9. File Structure

```
hearth/
├── app/
│   ├── auth/
│   │   ├── signin/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── chores/...
│   │   └── family/...
│   ├── kiosk/
│   │   └── page.tsx
│   └── api/
│       └── kiosk/...
├── components/
├── lib/
│   ├── supabase/
│   │   ├── server.ts
│   │   ├── client.ts
│   │   └── middleware.ts
│   ├── data/
│   │   ├── families.ts
│   │   ├── chores.ts
│   │   └── ...
│   └── test-utils/
│       ├── supabase-mock.ts
│       └── supabase-auth-mock.ts
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── middleware.ts
```

---

## 10. Migration Plan

### Phase 1: Initial Setup (Day 1-2)

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init
supabase start

# Install dependencies (keep Prisma)
npm install @supabase/ssr @supabase/supabase-js

# Create git checkpoint
git checkout -b feature/supabase-migration
git tag pre-supabase-migration
```

### Phase 2: Test Infrastructure (Day 3-4)

Create test mocks in `lib/test-utils/supabase-mock.ts`:

```typescript
import { jest } from '@jest/globals'

export function createMockSupabaseClient() {
  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  }
}
```

### Phase 3: Schema Migration (Day 5-7)

Create Supabase migrations for:
- Core schema (families, family_members, kiosk_sessions)
- RLS helper functions
- RLS policies for all tables
- Indexes for performance

### Phase 4: Data Layer Migration (Week 2-4)

Migrate module by module:
1. Families & Members
2. Chores
3. Meals & Recipes
4. Calendar
5. All remaining modules

### Phase 5: Auth Migration (Week 3-4)

- Configure Supabase Auth
- Update middleware
- Create sign-up/sign-in flows
- Migrate existing users

### Phase 6: Kiosk Migration (Week 5)

- Update kiosk session management
- Update PIN verification
- Test kiosk flows

### Phase 7: Production Deployment (Week 6-7)

- Deploy to Vercel
- Configure environment variables
- Remove Prisma
- Update documentation

---

## 11. Implementation Phases

See Section 10 for detailed migration plan.

**Total Timeline:** 6-8 weeks  
**Strategy:** Cloud-only, incremental migration with TDD

---

## 12. Security Considerations

| Threat | Mitigation |
|--------|------------|
| Cross-family data access | RLS policies at database level |
| Session hijacking | httpOnly cookies, JWT expiry |
| PIN brute force | Rate limiting (5 attempts/5 min) |
| SQL injection | Supabase client uses parameterized queries |

---

## 13. Environment Variables

### Vercel Production

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_APP_URL=https://hearth.app
```

### Local Development

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 4.0 | 2026-01-09 | **Implementation Edition**: Streamlined for immediate implementation, cloud-only focus, removed validation requirements |
