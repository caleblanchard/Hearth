# Hearth Cloud Deployment - Final Design Document

## Document Information

- **Version:** 3.0 (Review Edition)
- **Created:** January 9, 2026
- **Last Updated:** January 9, 2026
- **Status:** ⚠️ **REQUIRES VALIDATION - NOT READY FOR IMPLEMENTATION**
- **Scope:** Cloud SaaS deployment, Supabase migration, simplified auth model
- **Reviewed By:** GitHub Copilot CLI
- **Next Steps:** Complete Phase 0 validation before any implementation

---

## Table of Contents

**⚠️ CRITICAL REVIEW SECTIONS (Read First)**
- [⚠️ Implementation Readiness Review](#-implementation-readiness-review)
- [🚨 Critical Risks & Concerns](#-critical-risks--concerns)
- [✅ Pre-Implementation Requirements](#-pre-implementation-requirements)

**Original Design**
1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Decisions](#3-technology-decisions)
4. [Data Model](#4-data-model)
5. [Authentication System](#5-authentication-system)
6. [Kiosk Mode](#6-kiosk-mode)
7. [Row Level Security](#7-row-level-security)
8. [API Layer](#8-api-layer)
9. [File Structure](#9-file-structure)
10. [Migration Plan - REVISED](#10-migration-plan)
11. [Implementation Phases - REVISED](#11-implementation-phases)
12. [Security Considerations](#12-security-considerations)
13. [Environment Variables](#13-environment-variables)
14. [Test Migration Strategy - NEW](#14-test-migration-strategy)
15. [Performance Benchmarks - NEW](#15-performance-benchmarks)
16. [Monitoring & Observability - NEW](#16-monitoring--observability)
17. [Rollback Procedures - NEW](#17-rollback-procedures)

---

## ⚠️ Implementation Readiness Review

**Date:** January 9, 2026  
**Reviewer:** GitHub Copilot CLI  
**Overall Assessment:** ⚠️ **NOT READY FOR IMPLEMENTATION**

### Current Project State

| Metric | Value |
|--------|-------|
| Test Files | 202 |
| Lines of Prisma Schema | 2,787 |
| Current Next.js Version | 14.2.0 |
| Current Auth System | NextAuth.js v5 |
| Current Database Client | Prisma |
| Test Coverage Target | 80%+ |
| Development Methodology | Strict TDD |

### Migration Scope Analysis

This is **NOT an incremental feature addition**. This is a **complete platform rewrite** involving:

- ❌ Removal of Prisma (complete ORM replacement)
- ❌ Removal of NextAuth (auth system replacement)
- ❌ Rewrite of 200+ test files
- ❌ Database schema changes affecting all tables
- ❌ Middleware complete rewrite
- ❌ All API routes require refactoring
- ❌ Dual deployment mode support
- ⚠️ Estimated: **60-80% of codebase** will be modified

---

## 🚨 Critical Risks & Concerns

### 1. **Breaking Change Without Rollback Strategy**

**Issue:** The migration plan describes a one-way transformation with no tested rollback procedure.

**Impact:** If migration fails mid-way (e.g., data corruption, RLS policy bug, performance degradation), there's no way back.

**Required:**
- [ ] Full database backup and restore testing
- [ ] Code rollback procedure (tested)
- [ ] Data migration validation scripts
- [ ] Go/no-go decision checkpoints

### 2. **Test Coverage Destruction Risk**

**Issue:** Your project follows strict TDD with 202 test files. The plan proposes replacing Prisma, but:
- No strategy for maintaining test coverage during migration
- No Supabase mock utilities designed yet
- No RLS policy testing framework
- Tests will fail immediately when Prisma is removed

**Impact:** Violates your core development principle: "Never implement code without tests first"

**Required:**
- [ ] Create Supabase test mocks BEFORE any migration
- [ ] RLS policy testing framework
- [ ] Parallel test implementation (keep Prisma tests while adding Supabase)
- [ ] Maintain 80%+ coverage throughout ALL phases

### 3. **Dual Deployment Complexity**

**Issue:** Supporting both cloud (Supabase Auth) and self-hosted (NextAuth) means:
- 2x authentication systems to maintain
- 2x test matrices (cloud mode + self-hosted mode)
- Auth adapter abstraction adds complexity
- Your existing Docker setup requires major refactoring

**Impact:** Doubles maintenance burden, testing time, and potential bug surface area

**Required Decision:**
- [ ] **Option A:** Cloud-only (Vercel + Supabase) - simpler, one auth system
- [ ] **Option B:** Self-hosted only (Docker + PostgreSQL + NextAuth) - keep existing setup
- [ ] **Option C:** Dual mode (as designed) - accept 2x complexity

**Recommendation:** Start with cloud-only. Add self-hosted later if demand exists.

### 4. **Unrealistic Timeline**

**Issue:** Original plan suggests 7-8 days. Based on codebase size:
- 202 test files to rewrite
- 2,787 lines of schema
- Full auth system replacement
- RLS policy implementation and testing

**Realistic Estimate:** **12-16 weeks** for safe, tested migration

### 5. **Next.js 16 Experimental Risk**

**Issue:** Document recommends upgrading to Next.js 16.x (currently 14.2.0)
- React Compiler is experimental
- Turbopack still in beta
- Potential breaking changes

**Impact:** Adding instability on top of already risky migration

**Recommendation:** Migrate to Supabase on Next.js 14 first, then upgrade separately

### 6. **Kiosk Security Model Change**

**Issue:** Fundamental change to kiosk authentication:
- Current: PINs are actual authentication
- Proposed: PINs just switch context within parent's session

**Impact:** Requires extensive security review and penetration testing

**Required:**
- [ ] Security audit of new kiosk model
- [ ] Penetration testing
- [ ] User acceptance testing with families

### 7. **No Performance Validation**

**Issue:** Claims RLS will be faster, but:
- No benchmarks of current system
- No proof RLS overhead is acceptable
- No testing with multi-tenant data (1000+ families)

**Required:**
- [ ] Baseline performance metrics (current API response times)
- [ ] Load testing with RLS enabled
- [ ] Query plan analysis for RLS policies

---

## ✅ Pre-Implementation Requirements

**These MUST be completed before writing any migration code:**

### Phase 0: Validation & Planning (2-3 weeks)

#### 1. Define Success Criteria
- [ ] Document WHY migrate (performance? features? cost?)
- [ ] Quantify expected benefits with metrics
- [ ] Define what "done" looks like (acceptance criteria)
- [ ] Get stakeholder sign-off on 12-16 week timeline
- [ ] Establish go/no-go decision points for each phase

#### 2. Choose Deployment Strategy
- [ ] Make decision: Cloud-only, Self-hosted only, or Dual?
- [ ] If dual: document justification for 2x complexity
- [ ] Update architecture diagrams based on choice

#### 3. Create Baseline Documentation
- [ ] Run full test suite - capture baseline (all tests passing)
- [ ] Performance benchmark all API endpoints (p50, p95, p99)
- [ ] Document all current auth flows (screenshots + user journeys)
- [ ] Measure current Prisma query performance
- [ ] Document current error rates and patterns

#### 4. Develop Rollback Plan
- [ ] Create full database backup procedure
- [ ] Test database restore from backup (actually restore and verify)
- [ ] Document code revert steps (git strategy)
- [ ] Create data consistency verification scripts
- [ ] Write user communication templates (if rollback needed)

#### 5. Build Test Infrastructure FIRST
- [ ] Create Supabase client test mocks
- [ ] Create RLS policy testing framework
- [ ] Write test helpers for auth context injection
- [ ] Validate mocks work with sample queries
- [ ] Document testing patterns for team

#### 6. Proof of Concept (2 weeks)
- [ ] Set up Supabase project (dev environment)
- [ ] Migrate ONE simple module (e.g., weather data)
- [ ] Implement RLS policies for that module
- [ ] Write tests using new Supabase mocks
- [ ] Measure performance vs. current Prisma implementation
- [ ] Document lessons learned and pain points
- [ ] **DECISION POINT:** Continue or abort based on POC results?

#### 7. Security Review
- [ ] Third-party audit of proposed RLS policies
- [ ] Penetration testing plan for kiosk mode
- [ ] GDPR/privacy compliance check (data residency, etc.)
- [ ] Auth token storage security review
- [ ] Rate limiting strategy for Supabase endpoints

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
| Auth Provider | **Dual**: Supabase Auth (cloud) / NextAuth (self-hosted) | Best of both: managed cloud auth + offline-capable local |
| Security Model | **Row Level Security** | Database-level isolation, can't be bypassed by app bugs |
| Hosting | **Dual**: Vercel + Supabase (cloud) / Docker (self-hosted) | User choice: managed SaaS or privacy-focused local |
| Code Sharing | **Auth Adapter pattern** | 95%+ shared code, deployment-specific auth only |

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
│   Next.js 16 (App Router)                                        │
│   ├── Server Components (data fetching)                          │
│   ├── Route Handlers (API endpoints)                             │
│   ├── Server Actions (mutations)                                 │
│   ├── Middleware (auth session refresh)                          │
│   ├── React Compiler (automatic memoization)                     │
│   └── Turbopack (fast builds)                                    │
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
│   Connection: Port 6543 (Transaction Pooler / Supavisor)         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Decisions

### Why Drop Prisma?

| Aspect | Prisma | Supabase Client |
|--------|--------|-----------------|
| RLS Integration | Requires workarounds | Native support |
| Performance | 7-8x slower (benchmarks) | Direct PostgREST |
| Dependencies | prisma, @prisma/client, query engine | @supabase/ssr only |
| Cold Starts | Heavy (Rust binary) | Lightweight (fetch wrapper) |
| Type Safety | Excellent (dynamic) | Good (generated, static) |
| Transactions | `$transaction` (great) | SQL functions (RPC) |

**Decision:** The security benefits of native RLS outweigh Prisma's developer ergonomics. For a multi-tenant family app where data isolation is critical, database-level security is the right choice.

### Why Next.js 16?

- **React Compiler** - Automatic memoization, no manual `useMemo`/`useCallback`
- **Turbopack** - Faster dev builds with file system caching
- **React 19.2** - Latest React features in App Router
- **Smaller installs** - ~20MB smaller than previous versions
- **Improved caching** - `"use cache"` directive for explicit caching control

### Why Supabase Auth?

- **Integrated** - Same platform as database, shared user context
- **RLS-aware** - `auth.uid()` available in policies
- **OAuth built-in** - Google, Apple, etc. with minimal config
- **Managed** - No session storage, token refresh handled

### Dual Deployment Strategy

Hearth supports both cloud and self-hosted deployments with maximum code sharing.

| Aspect | Cloud | Self-Hosted |
|--------|-------|-------------|
| Hosting | Vercel | Docker |
| Database | Supabase PostgreSQL | PostgreSQL container |
| Auth | Supabase Auth | NextAuth.js |
| Redis | Upstash | Redis container |
| RLS | Yes (via Supabase client) | Yes (via Supabase client + local PG) |
| OAuth | Google, Apple (easy) | Optional (requires config) |
| Updates | Automatic | Manual (docker pull) |

**Key insight:** The Supabase JavaScript client (`@supabase/supabase-js`) works with ANY PostgreSQL database, not just Supabase's hosted service. This means we can use the same query patterns and RLS in both modes.

### Auth Adapter Pattern

To support both deployment modes with minimal code duplication:

```typescript
// lib/auth/adapter.ts
export interface AuthAdapter {
  getSession(): Promise<AuthSession | null>
  getUser(): Promise<AuthUser | null>
  signIn(email: string, password: string): Promise<SignInResult>
  signOut(): Promise<void>
  createUser(data: CreateUserData): Promise<AuthUser>
}

export interface AuthSession {
  userId: string
  email?: string
  expiresAt: Date
}

export interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
  metadata: Record<string, unknown>
}

// Factory function
export function getAuthAdapter(): AuthAdapter {
  if (process.env.DEPLOYMENT_MODE === 'cloud') {
    return new SupabaseAuthAdapter()
  }
  return new NextAuthAdapter()
}
```

```typescript
// lib/auth/supabase-adapter.ts (cloud)
export class SupabaseAuthAdapter implements AuthAdapter {
  async getUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user ? mapSupabaseUser(user) : null
  }
  // ... other methods
}
```

```typescript
// lib/auth/nextauth-adapter.ts (self-hosted)
export class NextAuthAdapter implements AuthAdapter {
  async getUser() {
    const session = await auth()
    return session?.user ? mapNextAuthUser(session.user) : null
  }
  // ... other methods
}
```

### Environment Detection

```typescript
// lib/deployment.ts
export type DeploymentMode = 'cloud' | 'self-hosted'

export function getDeploymentMode(): DeploymentMode {
  return (process.env.DEPLOYMENT_MODE as DeploymentMode) || 'self-hosted'
}

export function isCloud(): boolean {
  return getDeploymentMode() === 'cloud'
}

export function isSelfHosted(): boolean {
  return getDeploymentMode() === 'self-hosted'
}
```

### Docker Compose (Self-Hosted)

```yaml
# docker-compose.yml
version: '3.8'

services:
  hearth:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DEPLOYMENT_MODE=self-hosted
      - DATABASE_URL=postgresql://hearth:hearth@db:5432/hearth
      - REDIS_URL=redis://cache:6379
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    depends_on:
      - db
      - cache

  db:
    image: postgres:16-alpine
    volumes:
      - hearth-db:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    environment:
      - POSTGRES_USER=hearth
      - POSTGRES_PASSWORD=hearth
      - POSTGRES_DB=hearth

  cache:
    image: redis:7-alpine
    volumes:
      - hearth-cache:/data

volumes:
  hearth-db:
  hearth-cache:
```

### Self-Hosted RLS Configuration

For self-hosted deployments, RLS policies use a different auth context since there's no Supabase Auth. We use PostgreSQL session variables:

```sql
-- Self-hosted: Set user context before queries
CREATE OR REPLACE FUNCTION set_auth_context(user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, true);
END;
$$ LANGUAGE plpgsql;

-- Modified RLS helper for dual deployment
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  -- Try Supabase auth first (cloud)
  IF current_setting('request.jwt.claim.sub', true) IS NOT NULL THEN
    RETURN current_setting('request.jwt.claim.sub', true)::UUID;
  END IF;

  -- Fall back to session variable (self-hosted)
  IF current_setting('app.current_user_id', true) IS NOT NULL THEN
    RETURN current_setting('app.current_user_id', true)::UUID;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS policies use this function
CREATE POLICY "family_isolation" ON chore_definitions
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE auth_user_id = get_current_user_id()
    )
  );
```

```typescript
// lib/data/context.ts (self-hosted query wrapper)
export async function withAuthContext<T>(
  userId: string,
  queryFn: () => Promise<T>
): Promise<T> {
  if (isSelfHosted()) {
    // Set PostgreSQL session variable for RLS
    await db.execute(sql`SELECT set_auth_context(${userId}::UUID)`)
  }
  return queryFn()
}
```

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
-- =============================================
-- FAMILIES (Tenants)
-- =============================================
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

-- =============================================
-- FAMILY MEMBERS
-- =============================================
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  -- Link to Supabase Auth (NULL for kiosk-only children)
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PARENT', 'CHILD', 'GUEST')),

  -- PIN for kiosk mode (bcrypt hashed)
  pin_hash TEXT,

  -- Profile
  avatar_url TEXT,
  birth_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_auth_user_per_family UNIQUE (family_id, auth_user_id)
);

-- Index for fast lookups
CREATE INDEX idx_family_members_auth_user ON family_members(auth_user_id);
CREATE INDEX idx_family_members_family ON family_members(family_id);

-- =============================================
-- KIOSK SESSIONS
-- =============================================
CREATE TABLE kiosk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  -- Parent who activated kiosk
  activated_by UUID NOT NULL REFERENCES family_members(id),

  -- Currently active member (who's using the kiosk right now)
  active_member_id UUID REFERENCES family_members(id),

  -- Session state
  is_locked BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,  -- Parent session expiry

  -- Settings
  auto_lock_minutes INT NOT NULL DEFAULT 15
);

-- =============================================
-- KIOSK SETTINGS (per family)
-- =============================================
CREATE TABLE kiosk_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL UNIQUE REFERENCES families(id) ON DELETE CASCADE,

  is_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_lock_minutes INT NOT NULL DEFAULT 15,
  session_timeout_hours INT NOT NULL DEFAULT 24,
  require_pin_for_switch BOOLEAN NOT NULL DEFAULT true,
  allowed_widgets TEXT[] DEFAULT ARRAY['chores', 'calendar', 'weather'],

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### User Identity Model

```
┌─────────────────────────────────────────────────────────────────┐
│                      auth.users (Supabase)                       │
│                                                                  │
│   • id (UUID)                                                    │
│   • email                                                        │
│   • encrypted_password                                           │
│   • app_metadata: { family_ids: [...] }                          │
│   • user_metadata: { name: "...", avatar: "..." }                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ auth_user_id (nullable FK)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      family_members                              │
│                                                                  │
│   Parent with email:     auth_user_id = <uuid>                   │
│   Kid with email:        auth_user_id = <uuid>                   │
│   Kid without email:     auth_user_id = NULL (kiosk only)        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Authentication System

### Authentication Flows

#### Flow 1: Standard Login (Parents & Kids with Email)

```
User visits /auth/signin
        │
        ▼
┌─────────────────────────────┐
│   Enter email + password    │
│   ─────── OR ───────        │
│   Click Google/Apple        │
└─────────────────────────────┘
        │
        ▼
Supabase Auth validates credentials
        │
        ▼
JWT issued with user.id
        │
        ▼
Middleware looks up family_members WHERE auth_user_id = user.id
        │
        ├─── One family ──────► Redirect to /dashboard
        │
        └─── Multiple families ► Show family picker, then /dashboard
```

#### Flow 2: New Family Registration

```
User visits /auth/signup
        │
        ▼
┌─────────────────────────────┐
│   Step 1: Create Account    │
│   • Email                   │
│   • Password                │
│   • Your name               │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   Step 2: Create Family     │
│   • Family name             │
│   • Timezone                │
│   • Location (optional)     │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   Step 3: Add Members       │
│   • Children (name, email?) │
│   • Other parent (invite)   │
│   (Can skip)                │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   Step 4: Choose Modules    │
│   • Chores, Credits, etc.   │
│   (Can change later)        │
└─────────────────────────────┘
        │
        ▼
Redirect to /dashboard
```

#### Flow 3: Kiosk Mode (Detailed in Section 6)

```
Parent logs in on shared device
        │
        ▼
Parent navigates to /kiosk and activates
        │
        ▼
Kiosk shows family member avatars
        │
        ▼
Family member taps avatar → enters PIN
        │
        ▼
Kiosk unlocks as that member
```

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

// Helper to get current user and their family context
export async function getAuthContext() {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
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
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // IMPORTANT: Use getUser() not getSession() for security
  // getUser() validates the token with Supabase Auth server
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Redirect logged-in users away from auth pages
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

### Overview

Kiosk mode allows multiple family members to use a shared device (like an Echo Show or kitchen iPad) without each person needing their own login credentials.

### Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│                      KIOSK SECURITY                              │
│                                                                  │
│   KEY INSIGHT: The parent's auth token is used for ALL API      │
│   calls from the kiosk. PINs do NOT authenticate - they just    │
│   switch which family member is the "active user" within the    │
│   already-authenticated session.                                 │
│                                                                  │
│   This means:                                                    │
│   • All kiosk requests are authenticated (parent's token)        │
│   • RLS sees the parent's user ID                                │
│   • Family isolation is enforced                                 │
│   • PINs are verified server-side but don't grant new tokens     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Kiosk Flow

```
ACTIVATION:
───────────
1. Parent logs in normally (email/password)
2. Parent navigates to /kiosk
3. Parent clicks "Start Kiosk Mode"
4. Server creates kiosk_sessions row:
   - family_id: parent's family
   - activated_by: parent's member ID
   - expires_at: parent's session expiry
5. Kiosk UI shows locked state

UNLOCKING:
──────────
1. Any family member taps the screen
2. UI shows avatars of all family members
3. Member taps their avatar
4. PIN entry screen appears
5. Member enters their 4-6 digit PIN
6. Server validates:
   - PIN matches member's pin_hash (bcrypt compare)
   - Member belongs to the kiosk's family
   - Kiosk session is still valid
7. Kiosk unlocks, shows that member's dashboard view

MEMBER SWITCHING:
─────────────────
1. Current member taps "Switch User" or session times out
2. Kiosk locks (returns to avatar screen)
3. Different member can unlock with their PIN

AUTO-LOCK:
──────────
1. After X minutes of inactivity (configurable, default 15)
2. Kiosk locks automatically
3. Returns to avatar selection screen
```

### Kiosk State Management

```typescript
// types/kiosk.ts
interface KioskSession {
  id: string
  familyId: string
  activatedBy: string       // Parent who started kiosk
  activeMemberId: string | null  // Currently unlocked as
  isLocked: boolean
  expiresAt: Date
  autoLockMinutes: number
}

// The parent's auth token is stored in the normal Supabase session cookie
// The kiosk just tracks WHO is using it, not authentication
```

### Kiosk API Endpoints

```typescript
// POST /api/kiosk/start
// Requires: Authenticated parent
// Creates kiosk session, returns session ID

// POST /api/kiosk/unlock
// Body: { memberId, pin }
// Validates PIN, updates active_member_id

// POST /api/kiosk/lock
// Clears active_member_id, sets isLocked = true

// GET /api/kiosk/session
// Returns current kiosk state

// POST /api/kiosk/end
// Ends kiosk session entirely
```

### Kiosk + RLS Interaction

Since kiosk uses the parent's auth token, RLS policies see the parent's `auth.uid()`. This is fine because:

1. Parent belongs to the family, so family data is accessible
2. The "active member" is tracked in the kiosk session, not in auth
3. App code filters data based on active member when appropriate

```typescript
// Example: Fetching chores in kiosk mode
async function getKioskChores(kioskSession: KioskSession) {
  const supabase = createClient()

  // RLS allows access because parent's token is authenticated
  let query = supabase
    .from('chore_assignments')
    .select('*, chore:chore_definitions(*)')
    .eq('family_id', kioskSession.familyId)

  // If a specific member is active, filter to their chores
  if (kioskSession.activeMemberId) {
    query = query.eq('assigned_to', kioskSession.activeMemberId)
  }

  return query
}
```

### PIN Security

```typescript
// Setting a PIN (parent sets for child, or member sets own)
import bcrypt from 'bcrypt'

async function setMemberPin(memberId: string, pin: string) {
  // Validate PIN format (4-6 digits)
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error('PIN must be 4-6 digits')
  }

  const pinHash = await bcrypt.hash(pin, 10)

  await supabase
    .from('family_members')
    .update({ pin_hash: pinHash })
    .eq('id', memberId)
}

// Validating PIN (during kiosk unlock)
async function validatePin(memberId: string, pin: string): Promise<boolean> {
  const { data: member } = await supabase
    .from('family_members')
    .select('pin_hash')
    .eq('id', memberId)
    .single()

  if (!member?.pin_hash) return false

  return bcrypt.compare(pin, member.pin_hash)
}
```

---

## 7. Row Level Security

### Philosophy

RLS is the **primary** security mechanism, not a backup. Every table has RLS enabled, and policies ensure:

1. Users can only access their family's data
2. Role-based restrictions (parent-only data)
3. Even buggy app code can't leak data across families

### Helper Functions

```sql
-- Get the current user's family IDs
CREATE OR REPLACE FUNCTION get_user_family_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(
    ARRAY_AGG(family_id),
    ARRAY[]::UUID[]
  )
  FROM family_members
  WHERE auth_user_id = auth.uid()
    AND is_active = true
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is a parent in a specific family
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
-- =============================================
-- FAMILIES
-- =============================================
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their families"
  ON families FOR SELECT
  USING (id = ANY(get_user_family_ids()));

CREATE POLICY "Parents can update their families"
  ON families FOR UPDATE
  USING (is_parent_in_family(id));

-- =============================================
-- FAMILY MEMBERS
-- =============================================
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members in their families"
  ON family_members FOR SELECT
  USING (family_id = ANY(get_user_family_ids()));

CREATE POLICY "Parents can manage members"
  ON family_members FOR ALL
  USING (is_parent_in_family(family_id));

-- =============================================
-- GENERIC FAMILY DATA (chores, meals, etc.)
-- =============================================
-- Apply this pattern to all family-scoped tables:

ALTER TABLE chore_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_isolation" ON chore_definitions
  FOR ALL
  USING (family_id = ANY(get_user_family_ids()));

-- =============================================
-- PARENT-ONLY DATA (credits, settings, etc.)
-- =============================================
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parents_only" ON credit_transactions
  FOR ALL
  USING (
    family_id = ANY(get_user_family_ids())
    AND is_parent_in_family(family_id)
  );

-- =============================================
-- KIOSK SESSIONS
-- =============================================
ALTER TABLE kiosk_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_isolation" ON kiosk_sessions
  FOR ALL
  USING (family_id = ANY(get_user_family_ids()));
```

### Tables Requiring RLS

Apply the `family_isolation` policy pattern to all tables with `family_id`:

```
families, family_members, kiosk_sessions, kiosk_settings,
chore_definitions, chore_assignments, chore_completions,
todo_items, calendar_events, meal_plans, recipes, leftovers,
screen_time_types, screen_time_sessions, credit_transactions,
reward_items, reward_redemptions, inventory_items,
maintenance_items, transport_schedules, routines, routine_items,
communication_posts, post_reactions, automation_rules,
rule_executions, documents, pets, medications, ...
```

---

## 8. API Layer

### Data Access Pattern

Replace Prisma calls with Supabase client. Create a data access layer:

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

export async function createChoreDefinition(
  familyId: string,
  data: Omit<ChoreDefinition, 'id' | 'created_at' | 'updated_at'>
) {
  const supabase = createClient()

  const { data: chore, error } = await supabase
    .from('chore_definitions')
    .insert({ ...data, family_id: familyId })
    .select()
    .single()

  if (error) throw error
  return chore
}
```

### Transactions via RPC

For operations requiring atomicity, use PostgreSQL functions:

```sql
-- Function: Complete a chore and award credits
CREATE OR REPLACE FUNCTION complete_chore_with_credits(
  p_assignment_id UUID,
  p_completed_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_chore chore_definitions;
  v_completion_id UUID;
  v_credit_amount INT;
BEGIN
  -- Get the chore details
  SELECT cd.* INTO v_chore
  FROM chore_assignments ca
  JOIN chore_definitions cd ON cd.id = ca.chore_definition_id
  WHERE ca.id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  -- Create completion record
  INSERT INTO chore_completions (assignment_id, completed_by, completed_at, notes)
  VALUES (p_assignment_id, p_completed_by, now(), p_notes)
  RETURNING id INTO v_completion_id;

  -- Award credits if applicable
  IF v_chore.credit_value > 0 THEN
    INSERT INTO credit_transactions (
      family_id, member_id, amount, type, reference_type, reference_id
    )
    VALUES (
      v_chore.family_id, p_completed_by, v_chore.credit_value,
      'EARNED', 'CHORE_COMPLETION', v_completion_id
    );
  END IF;

  RETURN json_build_object(
    'completion_id', v_completion_id,
    'credits_awarded', v_chore.credit_value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```typescript
// Usage in app
const { data, error } = await supabase.rpc('complete_chore_with_credits', {
  p_assignment_id: assignmentId,
  p_completed_by: memberId,
  p_notes: notes
})
```

### Type Generation

```bash
# Generate types from Supabase schema
supabase gen types typescript --project-id <project-id> > lib/database.types.ts

# Add to package.json scripts
"scripts": {
  "types:generate": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > lib/database.types.ts"
}
```

---

## 9. File Structure

```
hearth/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                    # Landing page (optional)
│   │   └── layout.tsx
│   │
│   ├── auth/
│   │   ├── signin/page.tsx             # Email/password + OAuth
│   │   ├── signup/page.tsx             # New family registration
│   │   ├── callback/route.ts           # OAuth callback
│   │   └── layout.tsx
│   │
│   ├── dashboard/
│   │   ├── page.tsx                    # Main dashboard
│   │   ├── layout.tsx                  # Dashboard layout with nav
│   │   ├── chores/...
│   │   ├── meals/...
│   │   ├── calendar/...
│   │   ├── family/
│   │   │   ├── page.tsx                # Family management
│   │   │   └── members/[id]/page.tsx   # Member details + PIN setup
│   │   └── settings/...
│   │
│   ├── kiosk/
│   │   ├── page.tsx                    # Kiosk main view
│   │   └── layout.tsx                  # Kiosk-specific layout
│   │
│   └── api/
│       ├── kiosk/
│       │   ├── start/route.ts
│       │   ├── unlock/route.ts
│       │   ├── lock/route.ts
│       │   └── session/route.ts
│       └── ...
│
├── components/
│   ├── auth/
│   │   ├── SignInForm.tsx
│   │   ├── SignUpWizard.tsx
│   │   └── OAuthButtons.tsx
│   ├── kiosk/
│   │   ├── KioskLayout.tsx
│   │   ├── MemberSelector.tsx
│   │   ├── PinPad.tsx
│   │   └── KioskDashboard.tsx
│   └── ...
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                   # Server-side client
│   │   ├── client.ts                   # Browser client
│   │   ├── middleware.ts               # Middleware helpers
│   │   └── admin.ts                    # Service role client
│   │
│   ├── data/                           # Data access layer
│   │   ├── families.ts
│   │   ├── members.ts
│   │   ├── chores.ts
│   │   ├── meals.ts
│   │   ├── kiosk.ts
│   │   └── ...
│   │
│   ├── database.types.ts               # Generated from Supabase
│   │
│   └── utils/
│       ├── auth.ts                     # Auth helpers
│       └── ...
│
├── supabase/
│   ├── migrations/
│   │   ├── 00001_initial_schema.sql
│   │   ├── 00002_rls_policies.sql
│   │   ├── 00003_rpc_functions.sql
│   │   └── ...
│   ├── seed.sql
│   └── config.toml
│
├── middleware.ts                       # Next.js middleware
├── package.json
└── ...
```

---

## 10. Migration Plan - REVISED

**⚠️ CRITICAL:** This section has been completely revised to reflect realistic timelines and proper TDD methodology.

### Overview

**Original Estimate:** 7-8 days  
**Revised Estimate:** **12-16 weeks**  
**Reason:** This is a platform rewrite, not a feature addition. Requires test-first development, validation at each stage, and proper risk management.

---

### Phase 0: Validation & Proof of Concept (Weeks 1-3)

**REQUIRED BEFORE ANY MIGRATION CODE IS WRITTEN**

#### Week 1: Baseline & Planning

```bash
# 1. Create full backup
pg_dump $DATABASE_URL > hearth_backup_$(date +%Y%m%d).sql

# 2. Run full test suite - capture baseline
npm test -- --coverage --json --outputFile=baseline-test-results.json

# 3. Performance benchmarking
npm run benchmark:api  # Create this script to measure current performance

# 4. Document current state
git tag pre-supabase-migration
git branch backup/before-migration
```

**Deliverables:**
- [ ] Baseline test results (all 202 tests passing)
- [ ] Performance metrics (API response times)
- [ ] Database backup validated (restore tested)
- [ ] Current auth flows documented
- [ ] Stakeholder approval for 12-16 week timeline

#### Week 2-3: Proof of Concept

**Goal:** Migrate ONE simple module to validate approach

```bash
# 1. Set up Supabase dev project
supabase init
supabase start

# 2. Install dependencies (don't remove Prisma yet!)
npm install @supabase/ssr @supabase/supabase-js

# 3. Create test utilities FIRST
# lib/test-utils/supabase-mock.ts
```

**POC Module Selection:** Weather data (simple, no auth dependencies)

```typescript
// Example: Create Supabase mock utilities FIRST
// lib/test-utils/supabase-mock.ts
import { jest } from '@jest/globals';

export const createMockSupabaseClient = () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  insert: jest.fn().mockResolvedValue({ data: null, error: null }),
  // ... etc
});
```

**POC Steps:**
1. ✅ Create Supabase test mocks
2. ✅ Write tests for weather module using Supabase mocks
3. ✅ Implement weather module with Supabase client
4. ✅ All tests pass
5. ✅ Measure performance vs Prisma
6. ✅ Document lessons learned

**Go/No-Go Decision Point:**
- [ ] Tests pass with Supabase mocks
- [ ] Performance acceptable (within 20% of Prisma)
- [ ] Team comfortable with new patterns
- [ ] No blockers identified

**If No-Go:** Abort migration, document reasons, revisit later

---

### Phase 1: Test Infrastructure (Weeks 4-5)

**DO NOT PROCEED until Phase 0 complete and approved**

#### Build Complete Test Utilities

```bash
# Create comprehensive test utilities
touch lib/test-utils/supabase-mock.ts
touch lib/test-utils/supabase-auth-mock.ts
touch lib/test-utils/rls-test-helpers.ts
```

```typescript
// lib/test-utils/rls-test-helpers.ts
/**
 * Test RLS policies by setting auth context
 */
export async function testWithAuthContext(
  userId: string,
  testFn: () => Promise<void>
) {
  // Set up test database with user context
  // Execute test
  // Clean up
}

export async function expectRLSBlock(
  userId: string,
  query: () => Promise<any>
) {
  // Expect query to fail with RLS violation
}
```

**Deliverables:**
- [ ] Complete Supabase client mock library
- [ ] Auth context injection for tests
- [ ] RLS policy testing framework
- [ ] Documentation of test patterns
- [ ] Example tests demonstrating all patterns

---

### Phase 2: Schema Migration (Week 6)

**IMPORTANT:** Run in staging environment first, NOT production

#### Step 1: Additive Schema Changes (No Deletions Yet)

```sql
-- Migration: 001_add_auth_user_id.sql
-- ONLY additions, no deletions
-- This allows rollback

BEGIN;

-- Add new column (nullable for now)
ALTER TABLE family_members
ADD COLUMN auth_user_id UUID;

-- Add index for performance
CREATE INDEX idx_family_members_auth_user_id 
ON family_members(auth_user_id);

-- Do NOT drop email/passwordHash yet!

COMMIT;
```

#### Step 2: Validation Script

```typescript
// scripts/validate-schema.ts
/**
 * Verify schema migration was successful
 */
async function validateSchemaMigration() {
  // Check all expected columns exist
  // Verify indexes created
  // Test queries work
  // Report any issues
}
```

**Deliverables:**
- [ ] Schema migrations written
- [ ] Migrations tested in local environment
- [ ] Validation scripts pass
- [ ] Rollback script tested
- [ ] Schema changes documented

---

### Phase 3: Dual-Write Period (Weeks 7-9)

**Strategy:** Run both Prisma AND Supabase in parallel to ensure data consistency

```typescript
// lib/data/dual-write-wrapper.ts
/**
 * Temporarily write to both Prisma and Supabase
 * Compare results to validate correctness
 */
export async function createFamily(data: FamilyInput) {
  // Write to Prisma (existing)
  const prismaResult = await prisma.family.create({ data });
  
  // Write to Supabase (new)
  const supabaseResult = await supabase
    .from('families')
    .insert(data)
    .select()
    .single();
  
  // Compare results
  if (!resultsMatch(prismaResult, supabaseResult.data)) {
    logger.error('Dual-write mismatch detected', {
      prisma: prismaResult,
      supabase: supabaseResult.data
    });
    // Alert on mismatch
  }
  
  return prismaResult; // Return Prisma result (existing behavior)
}
```

**Process:**
1. Keep Prisma as source of truth
2. Write to both systems
3. Compare results
4. Log any discrepancies
5. Fix bugs in Supabase implementation
6. Continue until zero discrepancies for 1 week

**Deliverables:**
- [ ] Dual-write wrapper implemented
- [ ] All writes go through wrapper
- [ ] Monitoring dashboard for discrepancies
- [ ] Zero discrepancies for 1 week straight
- [ ] Performance impact measured (<10% overhead)

---

### Phase 4: Auth Migration (Weeks 10-11)

**DECISION REQUIRED:** Cloud-only or dual deployment?

#### Option A: Cloud-Only (Recommended for first iteration)

```bash
# Simpler path - one auth system
npm install @supabase/ssr

# Keep NextAuth for now, add Supabase Auth alongside
# Feature flag: use Supabase for new users, NextAuth for existing
```

#### Option B: Dual Deployment

```bash
# More complex - requires auth adapter pattern
# Implement auth adapter interface
# Create both SupabaseAuthAdapter and NextAuthAdapter
```

**Recommended:** Start with Option A

**Deliverables:**
- [ ] Supabase Auth configured
- [ ] Middleware updated (tested)
- [ ] Sign-up flow using Supabase
- [ ] Sign-in flow using Supabase (new users)
- [ ] Existing users still use NextAuth
- [ ] All auth tests passing

---

### Phase 5: Data Layer Migration (Weeks 12-14)

**Module-by-module approach, NOT all at once**

**Priority Order:**
1. Weather (already done in POC)
2. Settings
3. Family/Members (critical path)
4. Chores
5. Meals
6. Calendar
7. ... (continue with remaining modules)

**Per-Module Process:**
1. Write Supabase tests first (TDD)
2. Implement Supabase queries
3. All tests pass
4. Code review
5. Deploy to staging
6. Validate in staging
7. Move to next module

**Feature Flag Pattern:**
```typescript
// lib/feature-flags.ts
export const USE_SUPABASE_FOR = {
  weather: true,   // Migrated
  settings: true,  // Migrated
  chores: false,   // Still using Prisma
  // ...
};
```

**Deliverables (per module):**
- [ ] Tests written using Supabase mocks
- [ ] Implementation complete
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Performance validated
- [ ] Deployed to staging

---

### Phase 6: RLS Implementation (Week 15)

**CRITICAL:** Test RLS policies thoroughly before production

```sql
-- Migration: Enable RLS on all tables
-- Do this AFTER data layer is working

BEGIN;

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
-- ... all tables

-- Create helper functions
CREATE OR REPLACE FUNCTION get_user_family_ids() ...

-- Create policies
CREATE POLICY "family_isolation" ON families ...

COMMIT;
```

**RLS Testing:**
```typescript
// __tests__/rls/family-isolation.test.ts
describe('RLS: Family Isolation', () => {
  it('should prevent cross-family data access', async () => {
    // User A from Family 1
    // User B from Family 2
    // User A should NOT see Family 2 data
  });
});
```

**Deliverables:**
- [ ] RLS enabled on all tables
- [ ] Helper functions created
- [ ] Policies implemented
- [ ] Comprehensive RLS tests written
- [ ] All RLS tests passing
- [ ] Penetration testing complete

---

### Phase 7: Cutover & Cleanup (Week 16)

**Production Deployment**

```bash
# 1. Final staging validation
npm test
npm run benchmark:api

# 2. Create production backup
pg_dump $PROD_DATABASE_URL > prod_backup_before_cutover.sql

# 3. Deploy to production
vercel --prod

# 4. Monitor closely for 48 hours
# Watch error rates, performance, user feedback

# 5. If stable, remove Prisma (1 week after deploy)
npm uninstall prisma @prisma/client
git rm -r prisma/
```

**Rollback Trigger Conditions:**
- Error rate > 5% increase
- API response time > 50% increase
- Any data corruption detected
- Critical security issue found

**Deliverables:**
- [ ] Production deployment successful
- [ ] Monitoring shows healthy metrics
- [ ] User acceptance testing passed
- [ ] 48-hour observation period complete
- [ ] Prisma removed (after 1 week of stability)
- [ ] Documentation updated

---

### Data Migration Script (Enhanced with Error Handling)

```typescript
// scripts/migrate-users-to-supabase.ts
import { createClient } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface MigrationResult {
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

async function migrateUsers(): Promise<MigrationResult> {
  const result: MigrationResult = { success: 0, failed: 0, errors: [] };
  
  // Get all family members with email (from Prisma DB)
  const members = await prisma.familyMember.findMany({
    where: { 
      email: { not: null },
      role: 'PARENT' // Migrate parents first
    }
  });

  logger.info(`Starting migration of ${members.length} users`);

  for (const member of members) {
    try {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const exists = existingUsers.users.find(u => u.email === member.email);
      
      if (exists) {
        logger.warn(`User already exists: ${member.email}`);
        result.success++;
        continue;
      }

      // Create Supabase Auth user
      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: member.email!,
        email_confirm: true,
        user_metadata: {
          name: member.name,
          migrated: true,
          migrated_at: new Date().toISOString()
        }
      });

      if (createError) throw createError;

      if (authUser?.user) {
        // Link to family_member
        const { error: updateError } = await supabaseAdmin
          .from('family_members')
          .update({ auth_user_id: authUser.user.id })
          .eq('id', member.id);

        if (updateError) throw updateError;

        // Send password reset email
        await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: member.email!
        });

        logger.info(`Migrated user: ${member.email}`);
        result.success++;
      }
    } catch (error) {
      logger.error(`Failed to migrate user: ${member.email}`, error);
      result.failed++;
      result.errors.push({
        email: member.email!,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Write migration report
  await writeMigrationReport(result);
  
  return result;
}

async function writeMigrationReport(result: MigrationResult) {
  const report = `
Migration Report - ${new Date().toISOString()}
==============================================
Total Attempted: ${result.success + result.failed}
Successful: ${result.success}
Failed: ${result.failed}

Errors:
${result.errors.map(e => `- ${e.email}: ${e.error}`).join('\n')}
`;

  await fs.writeFile('migration-report.txt', report);
  logger.info('Migration report written to migration-report.txt');
}

// Validation function
async function validateMigration() {
  const prismaCount = await prisma.familyMember.count({
    where: { email: { not: null } }
  });

  const { count: supabaseCount } = await supabaseAdmin
    .from('family_members')
    .select('*', { count: 'exact', head: true })
    .not('auth_user_id', 'is', null);

  if (prismaCount !== supabaseCount) {
    throw new Error(
      `Migration validation failed: Prisma count (${prismaCount}) != Supabase count (${supabaseCount})`
    );
  }

  logger.info('Migration validation passed');
}

// Main execution
async function main() {
  try {
    const result = await migrateUsers();
    await validateMigration();
    
    if (result.failed > 0) {
      logger.warn(`Migration completed with ${result.failed} failures. Review migration-report.txt`);
      process.exit(1);
    }
    
    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', error);
    process.exit(1);
  }
}

main();
```

---

## 11. Implementation Phases - REVISED

**⚠️ These phases correspond to the revised Migration Plan in Section 10**

**Total Timeline:** 12-16 weeks  
**Methodology:** Test-Driven Development throughout  
**Principle:** Never remove working code until replacement is proven stable

---

### Phase 0: Validation & POC (Weeks 1-3) ⚠️ REQUIRED FIRST

**Goal:** Validate approach before committing to full migration

#### Checklist:
- [ ] Create complete database backup (tested restore)
- [ ] Run full test suite - document baseline (all 202 tests passing)
- [ ] Benchmark API performance (p50, p95, p99 latencies)
- [ ] Document all auth flows (screenshots + journeys)
- [ ] Get stakeholder sign-off on 12-16 week timeline
- [ ] Decide: Cloud-only, Self-hosted only, or Dual?
- [ ] Install @supabase/ssr (don't remove Prisma yet)
- [ ] Create Supabase test mock utilities
- [ ] Migrate ONE simple module (weather) as POC
- [ ] Measure POC performance vs Prisma
- [ ] **GO/NO-GO DECISION:** Continue or abort?

**Success Criteria:**
- Tests pass with new mocks
- Performance within 20% of current
- Team comfortable with patterns
- No critical blockers

**If No-Go:** Document reasons, revisit in 6 months

---

### Phase 1: Test Infrastructure (Weeks 4-5)

**Goal:** Build comprehensive test utilities BEFORE migrating any production code

#### Checklist:
- [ ] Create `lib/test-utils/supabase-mock.ts` (complete)
- [ ] Create `lib/test-utils/supabase-auth-mock.ts`
- [ ] Create `lib/test-utils/rls-test-helpers.ts`
- [ ] Write example tests using all new mocks
- [ ] Document testing patterns for team
- [ ] All example tests passing
- [ ] Code review of test utilities
- [ ] Team training on new test patterns

**Deliverables:**
- Complete mock library
- RLS testing framework
- Documentation with examples
- Team trained and ready

---

### Phase 2: Schema Migration (Week 6)

**Goal:** Prepare database for dual-write period

#### Checklist:
- [ ] Write schema migration (additive only - no deletions)
- [ ] Test migration in local environment
- [ ] Write rollback script
- [ ] Test rollback script
- [ ] Write validation script
- [ ] Deploy to staging
- [ ] Run validation in staging
- [ ] Document any issues
- [ ] Fix issues
- [ ] Schema migration approved

**IMPORTANT:** Do NOT drop email/passwordHash columns yet!

---

### Phase 3: Dual-Write Period (Weeks 7-9)

**Goal:** Write to both Prisma AND Supabase, validate consistency

#### Checklist:
- [ ] Implement dual-write wrapper
- [ ] All writes go through wrapper
- [ ] Set up monitoring for discrepancies
- [ ] Deploy to staging
- [ ] Monitor for 1 week
- [ ] Fix any Supabase bugs causing discrepancies
- [ ] Zero discrepancies for 1 full week
- [ ] Performance impact < 10% overhead
- [ ] Deploy to production (dual-write mode)
- [ ] Monitor production for 1 week

**Success Criteria:**
- Zero write discrepancies for 2 weeks (1 staging + 1 prod)

---

### Phase 4: Auth Migration (Weeks 10-11)

**Goal:** Migrate authentication to Supabase (keep NextAuth for existing users)

#### Deployment Strategy Decision (Choose One):

**Recommended: Option A - Cloud-Only**
- [ ] Configure Supabase Auth
- [ ] Create sign-up flow (Supabase)
- [ ] Create sign-in flow (Supabase for new, NextAuth for existing)
- [ ] Update middleware (support both)
- [ ] Write auth tests
- [ ] All auth tests passing
- [ ] Deploy to staging
- [ ] Manual testing of all auth flows
- [ ] Deploy to production
- [ ] Monitor auth error rates

**Advanced: Option B - Dual Deployment**
- [ ] Implement AuthAdapter interface
- [ ] Create SupabaseAuthAdapter
- [ ] Create NextAuthAdapter  
- [ ] Update all auth calls to use adapter
- [ ] Test both modes
- [ ] ⚠️ Warning: Doubles complexity

---

### Phase 5: Data Layer Migration (Weeks 12-14)

**Goal:** Migrate data access layer module-by-module

#### Module Migration Priority:
1. ✅ Weather (done in POC)
2. Settings
3. Family/Members
4. Chores
5. Meals
6. Calendar
7. ... (all remaining modules)

#### Per-Module Checklist:
- [ ] Write Supabase tests FIRST (TDD)
- [ ] Tests failing (Red phase)
- [ ] Implement Supabase queries
- [ ] Tests passing (Green phase)
- [ ] Refactor for quality
- [ ] Code review
- [ ] Update feature flag (`USE_SUPABASE_FOR.moduleName = true`)
- [ ] Deploy to staging
- [ ] Validate in staging
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Move to next module

**Track Progress:**
- [ ] Module 1: Weather ✅
- [ ] Module 2: Settings
- [ ] Module 3: Family/Members
- [ ] Module 4: Chores
- [ ] Module 5: Meals
- [ ] Module 6: Calendar
- [ ] Module 7: Communication
- [ ] Module 8: Routines
- [ ] Module 9: Recipes
- [ ] Module 10: ... (continue)

**Success Criteria:**
- All modules migrated
- All tests passing (maintain 80%+ coverage)
- Performance acceptable

---

### Phase 6: RLS Implementation (Week 15)

**Goal:** Enable Row Level Security on all tables

#### Checklist:
- [ ] Write RLS helper functions
- [ ] Write RLS policies for all tables
- [ ] Create RLS test suite
- [ ] All RLS tests passing (positive and negative cases)
- [ ] Deploy to staging
- [ ] Manual security testing (try to access other family's data)
- [ ] Penetration testing (optional but recommended)
- [ ] Enable RLS in production
- [ ] Monitor for RLS-related errors
- [ ] Fix any policy bugs

**CRITICAL:** Test thoroughly - RLS errors are hard to debug

---

### Phase 7: Kiosk Migration (Week 15-16)

**Goal:** Update kiosk for new auth model

#### Checklist:
- [ ] Review new kiosk security model
- [ ] Write kiosk tests (with new auth model)
- [ ] Update kiosk session management
- [ ] Update PIN verification
- [ ] All kiosk tests passing
- [ ] Manual testing (full kiosk flow)
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor kiosk usage

---

### Phase 8: Production Cutover & Cleanup (Week 16+)

**Goal:** Complete migration and remove Prisma

#### Pre-Cutover Checklist:
- [ ] All modules migrated
- [ ] All tests passing
- [ ] All RLS policies working
- [ ] Performance validated
- [ ] Security review complete
- [ ] Create final production backup

#### Cutover:
- [ ] Deploy final version to production
- [ ] Monitor for 48 hours (close observation)
- [ ] Error rates normal
- [ ] Performance normal
- [ ] User feedback positive

#### Stability Period (1 week):
- [ ] 7 days of stable operation
- [ ] No rollback triggers hit
- [ ] Monitoring shows green

#### Cleanup (After 1 week of stability):
- [ ] Remove Prisma dependencies
- [ ] Remove dual-write code
- [ ] Remove feature flags
- [ ] Remove NextAuth (if cloud-only)
- [ ] Update documentation
- [ ] Archive old migration code
- [ ] Team celebration! 🎉

**Rollback Triggers:**
- Error rate increase > 5%
- API latency increase > 50%
- Data corruption detected
- Security incident
- Critical bug found

---

### Deployment Strategy Recommendation

**Recommendation:** **Start with Cloud-Only (Option A)**

**Rationale:**
1. Simpler - one auth system to maintain
2. Faster - fewer code paths to test
3. Lower risk - less complexity
4. Can add self-hosted mode later if needed

**If you absolutely need dual deployment:**
- Implement Auth Adapter pattern (adds 3-4 weeks)
- Test both modes thoroughly (adds 2-3 weeks)
- Document mode-specific behavior
- Accept 2x ongoing maintenance

**Timeline Impact:**
- Cloud-only: 12-16 weeks
- Dual deployment: 18-24 weeks

---

## 12. Security Considerations

### Authentication Security

| Threat | Mitigation |
|--------|------------|
| Credential stuffing | Supabase rate limiting, optional MFA |
| Session hijacking | httpOnly cookies, short JWT expiry, refresh tokens |
| XSS token theft | Tokens in httpOnly cookies, not localStorage |

### Data Isolation

| Threat | Mitigation |
|--------|------------|
| Cross-family data access | RLS policies enforce at database level |
| App bug leaks data | RLS is primary security, not app code |
| SQL injection | Supabase client uses parameterized queries |

### Kiosk Security

| Threat | Mitigation |
|--------|------------|
| PIN brute force | Rate limiting (5 attempts / 5 min) |
| Unauthorized kiosk start | Only parents can activate |
| Session expiry bypass | Server validates expiry on every request |
| Shoulder surfing PIN | PIN masked during entry |

### Rate Limiting

```typescript
// Apply to sensitive endpoints
const RATE_LIMITS = {
  'kiosk/unlock': { attempts: 5, windowMinutes: 5 },
  'auth/signin': { attempts: 5, windowMinutes: 15 },
}
```

---

## 13. Environment Variables

### Vercel Production

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# App
NEXT_PUBLIC_APP_URL=https://hearth.app

# External APIs (optional)
WEATHER_API_KEY=<openweathermap-key>

# OAuth (configure in Supabase dashboard)
# Google and Apple credentials are set in Supabase, not here
```

### Local Development

```env
# Supabase (local or cloud dev project)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Appendix A: Query Migration Examples

### Before (Prisma)

```typescript
// Get family with members
const family = await prisma.family.findUnique({
  where: { id: familyId },
  include: {
    members: {
      where: { isActive: true },
      orderBy: { name: 'asc' }
    }
  }
})

// Create chore with assignments
const chore = await prisma.choreDefinition.create({
  data: {
    familyId,
    name: 'Clean room',
    creditValue: 10,
    assignments: {
      create: [
        { memberId: member1Id },
        { memberId: member2Id }
      ]
    }
  },
  include: { assignments: true }
})

// Transaction
await prisma.$transaction(async (tx) => {
  const completion = await tx.choreCompletion.create({ ... })
  await tx.creditTransaction.create({ ... })
})
```

### After (Supabase)

```typescript
// Get family with members
const { data: family } = await supabase
  .from('families')
  .select(`
    *,
    members:family_members(*)
  `)
  .eq('id', familyId)
  .eq('members.is_active', true)
  .order('name', { foreignTable: 'members' })
  .single()

// Create chore with assignments
const { data: chore } = await supabase
  .from('chore_definitions')
  .insert({ family_id: familyId, name: 'Clean room', credit_value: 10 })
  .select()
  .single()

await supabase
  .from('chore_assignments')
  .insert([
    { chore_definition_id: chore.id, member_id: member1Id },
    { chore_definition_id: chore.id, member_id: member2Id }
  ])

// Transaction (via RPC)
const { data } = await supabase.rpc('complete_chore_with_credits', {
  p_assignment_id: assignmentId,
  p_completed_by: memberId
})
```

---

## Appendix B: Kiosk UI Wireframes

```
┌─────────────────────────────────────────────────────────────────┐
│                     KIOSK - LOCKED STATE                         │
│                                                                  │
│                    Tap to unlock                                 │
│                                                                  │
│     ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                          │
│     │ 👨 │  │ 👩 │  │ 👦 │  │ 👧 │                          │
│     │ Dad │  │ Mom │  │ Tom │  │ Sue │                          │
│     └─────┘  └─────┘  └─────┘  └─────┘                          │
│                                                                  │
│                    The Smith Family                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     KIOSK - PIN ENTRY                            │
│                                                                  │
│                      Hi, Tom! 👦                                 │
│                                                                  │
│                    Enter your PIN                                │
│                                                                  │
│                      ● ● ○ ○                                     │
│                                                                  │
│                   ┌───┬───┬───┐                                  │
│                   │ 1 │ 2 │ 3 │                                  │
│                   ├───┼───┼───┤                                  │
│                   │ 4 │ 5 │ 6 │                                  │
│                   ├───┼───┼───┤                                  │
│                   │ 7 │ 8 │ 9 │                                  │
│                   ├───┼───┼───┤                                  │
│                   │ ← │ 0 │ ✓ │                                  │
│                   └───┴───┴───┘                                  │
│                                                                  │
│                   [Change User]                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   KIOSK - UNLOCKED (Tom)                         │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ 👦 Tom                              [Switch] [Lock] │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │   My Chores      │  │   Calendar       │                     │
│  │                  │  │                  │                     │
│  │ □ Clean room     │  │ Soccer 3pm      │                     │
│  │ ✓ Feed dog       │  │ Dentist Tue     │                     │
│  │ □ Homework       │  │                  │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │   Credits: 45    │  │   Weather        │                     │
│  │   ⭐⭐⭐⭐          │  │   72°F Sunny     │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 14. Test Migration Strategy

**⚠️ CRITICAL:** This project follows strict TDD. Tests must be written BEFORE implementation throughout the migration.

### Current Test Infrastructure

```
Test Files: 202
Test Framework: Jest
Component Testing: React Testing Library
Current Mocks: Prisma client mocks (@/lib/test-utils/prisma-mock)
Coverage Requirement: 80%+
```

### Migration Approach

**Principle:** Never remove working tests until replacement tests are passing

#### Phase 1: Build New Test Utilities (Week 4-5)

```typescript
// lib/test-utils/supabase-mock.ts
import { jest } from '@jest/globals';

export interface MockSupabaseClient {
  from: jest.Mock;
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  // ... all Supabase client methods
}

export function createMockSupabaseClient(): MockSupabaseClient {
  const mockClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return mockClient as unknown as MockSupabaseClient;
}

// Helper to mock successful responses
export function mockSupabaseSelect<T>(client: MockSupabaseClient, data: T[]) {
  client.select.mockResolvedValue({ data, error: null });
  return client;
}

// Helper to mock errors
export function mockSupabaseError(client: MockSupabaseClient, error: string) {
  client.select.mockResolvedValue({ 
    data: null, 
    error: { message: error, code: 'ERROR' } 
  });
  return client;
}
```

```typescript
// lib/test-utils/supabase-auth-mock.ts
export function createMockAuthContext(userId: string, familyId: string) {
  return {
    user: {
      id: userId,
      email: 'test@example.com',
      app_metadata: { family_ids: [familyId] },
      user_metadata: { name: 'Test User' },
    },
    session: {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_at: Date.now() + 3600000,
    }
  };
}
```

```typescript
// lib/test-utils/rls-test-helpers.ts
/**
 * Test RLS policies by simulating different user contexts
 */
export async function testRLSPolicy(
  tableName: string,
  policy: {
    user1: { id: string; familyId: string };
    user2: { id: string; familyId: string };
  }
) {
  // Set up test: Create data for both users
  // Verify user1 can access their data
  // Verify user1 CANNOT access user2's data
  // Clean up
}

export function expectRLSViolation(error: any) {
  expect(error?.code).toBe('42501'); // PostgreSQL RLS violation code
}
```

#### Phase 2: Parallel Test Implementation

**DO NOT delete Prisma tests immediately. Run both in parallel.**

```typescript
// Example: __tests__/api/families.test.ts (during migration)

describe('Families API', () => {
  describe('GET /api/families (Prisma - OLD)', () => {
    // Keep existing Prisma tests
    it('should return family for authenticated user', async () => {
      // ... existing test using Prisma mocks
    });
  });

  describe('GET /api/families (Supabase - NEW)', () => {
    // Add new Supabase tests alongside
    it('should return family for authenticated user', async () => {
      const mockSupabase = createMockSupabaseClient();
      mockSupabaseSelect(mockSupabase, [{ id: '123', name: 'Test Family' }]);
      
      // ... test implementation
    });
  });
});
```

#### Phase 3: Test Coverage Validation

```bash
# Before removing any Prisma tests, validate coverage
npm test -- --coverage

# Coverage must be >= 80% before proceeding
# If below 80%, write more Supabase tests
```

#### Phase 4: Gradual Prisma Test Removal

**Only remove Prisma tests AFTER:**
1. ✅ Equivalent Supabase tests written
2. ✅ Supabase tests passing
3. ✅ Feature flag enabled for that module
4. ✅ Code review completed
5. ✅ Coverage still >= 80%

### RLS Policy Testing

**Critical:** RLS policies must be tested at the database level, not just application level.

```typescript
// __tests__/rls/family-isolation.test.ts
import { createClient } from '@supabase/supabase-js';

describe('RLS: Family Isolation', () => {
  let supabaseUser1: any;
  let supabaseUser2: any;
  
  beforeAll(async () => {
    // Create test users in different families
    // Set up test data
  });
  
  it('should prevent user from accessing other family data', async () => {
    // Authenticate as user1
    const client1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await client1.auth.signInWithPassword({
      email: 'user1@test.com',
      password: 'test123'
    });
    
    // Try to access user2's family data
    const { data, error } = await client1
      .from('families')
      .select('*')
      .eq('id', user2FamilyId);
    
    // Should return empty (RLS blocks it)
    expect(data).toHaveLength(0);
  });
  
  it('should allow user to access own family data', async () => {
    // Authenticate as user1
    const client1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await client1.auth.signInWithPassword({
      email: 'user1@test.com',
      password: 'test123'
    });
    
    // Access own family data
    const { data, error } = await client1
      .from('families')
      .select('*')
      .eq('id', user1FamilyId);
    
    // Should return data
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(user1FamilyId);
  });
  
  afterAll(async () => {
    // Clean up test data
  });
});
```

### Test Migration Checklist

**Before starting migration:**
- [ ] Create all test mock utilities
- [ ] Write example tests using new mocks
- [ ] Validate mocks work correctly
- [ ] Document test patterns for team

**During migration (per module):**
- [ ] Write Supabase tests FIRST (TDD)
- [ ] Keep Prisma tests running
- [ ] Both test suites passing
- [ ] Coverage >= 80%
- [ ] Remove Prisma tests after validation

**After migration complete:**
- [ ] All 202+ test files updated
- [ ] All tests using Supabase mocks
- [ ] No Prisma dependencies in tests
- [ ] Coverage >= 80%
- [ ] RLS tests added (new)

---

## 15. Performance Benchmarks

**⚠️ REQUIRED:** Measure performance BEFORE and AFTER migration to validate improvement claims.

### Baseline Metrics (Current State - Prisma)

**To establish baseline, run:**

```bash
# Create benchmark script
cat > scripts/benchmark-api.ts << 'EOF'
import { performance } from 'perf_hooks';

async function benchmarkEndpoint(url: string, iterations: number = 100) {
  const latencies: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fetch(url);
    const end = performance.now();
    latencies.push(end - start);
  }
  
  latencies.sort((a, b) => a - b);
  
  return {
    p50: latencies[Math.floor(latencies.length * 0.5)],
    p95: latencies[Math.floor(latencies.length * 0.95)],
    p99: latencies[Math.floor(latencies.length * 0.99)],
    avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    min: latencies[0],
    max: latencies[latencies.length - 1],
  };
}

async function main() {
  const endpoints = [
    '/api/families',
    '/api/chores',
    '/api/meals',
    '/api/calendar',
    // ... all critical endpoints
  ];
  
  console.log('Benchmarking current implementation (Prisma)...\n');
  
  for (const endpoint of endpoints) {
    const results = await benchmarkEndpoint(`http://localhost:3000${endpoint}`);
    console.log(`${endpoint}:`);
    console.log(`  p50: ${results.p50.toFixed(2)}ms`);
    console.log(`  p95: ${results.p95.toFixed(2)}ms`);
    console.log(`  p99: ${results.p99.toFixed(2)}ms`);
    console.log(`  avg: ${results.avg.toFixed(2)}ms`);
    console.log();
  }
}

main();
EOF

# Run baseline benchmark
npm run benchmark:api > benchmark-baseline-prisma.txt
```

**Target Metrics (After Migration - Supabase):**

| Endpoint | Current (Prisma) | Target (Supabase) | Improvement |
|----------|------------------|-------------------|-------------|
| GET /api/families | TBD | < Current | TBD |
| GET /api/chores | TBD | < Current | TBD |
| POST /api/chores | TBD | < Current | TBD |
| GET /api/meals | TBD | < Current | TBD |

**Acceptance Criteria:**
- No endpoint should be > 50% slower
- Ideally, all endpoints should be faster or within 10%
- p99 latency should not exceed 500ms for any endpoint

### Load Testing

**Test with multi-tenant data:**

```bash
# Generate test data for 100 families
npm run seed:load-test

# Run load test
npm run load-test:api

# Measure:
# - Query performance with 100 families
# - RLS overhead (compare with RLS disabled vs enabled)
# - Concurrent request handling
# - Database connection pooling
```

**RLS Overhead Test:**

```sql
-- Disable RLS temporarily
ALTER TABLE families DISABLE ROW LEVEL SECURITY;

-- Benchmark query
SELECT * FROM families WHERE id = '...';

-- Re-enable RLS
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Benchmark again
SELECT * FROM families WHERE id = '...';

-- Compare results to measure RLS overhead
-- Acceptable overhead: < 20%
```

### Database Query Analysis

```bash
# Enable PostgreSQL query logging
ALTER DATABASE hearth SET log_min_duration_statement = 100;

# Analyze slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

# Examine query plans for RLS policies
EXPLAIN ANALYZE 
SELECT * FROM chore_definitions WHERE family_id = '...';
```

### Monitoring Checklist

**Before migration:**
- [ ] Baseline API response times documented
- [ ] Database query performance measured
- [ ] Current error rates captured
- [ ] Memory usage profiled

**After migration:**
- [ ] Re-run all benchmarks
- [ ] Compare against baseline
- [ ] Investigate any regressions > 20%
- [ ] Optimize slow queries
- [ ] Update performance documentation

---

## 16. Monitoring & Observability

### Application Monitoring

**Recommended Tools:**
- **Vercel Analytics** (built-in)
- **Supabase Logs** (database queries, auth events)
- **Sentry** (error tracking)
- **LogTail** or **Datadog** (structured logging)

### Key Metrics to Track

#### API Performance
```typescript
// lib/metrics.ts
export function trackAPIMetrics(endpoint: string, duration: number, status: number) {
  // Log to monitoring service
  console.log(JSON.stringify({
    type: 'api_request',
    endpoint,
    duration,
    status,
    timestamp: new Date().toISOString(),
  }));
}

// Use in API routes
const start = performance.now();
// ... handle request
const duration = performance.now() - start;
trackAPIMetrics(req.url, duration, res.status);
```

#### Database Queries
```typescript
// Monitor Supabase query performance
const supabase = createClient();

const start = performance.now();
const { data, error } = await supabase
  .from('families')
  .select('*');
const duration = performance.now() - start;

if (duration > 500) {
  logger.warn('Slow query detected', {
    table: 'families',
    duration,
    query: 'select *',
  });
}
```

#### RLS Policy Errors
```typescript
// Catch and log RLS violations
if (error?.code === '42501') {
  logger.error('RLS policy violation', {
    table,
    userId,
    operation,
    error: error.message,
  });
  
  // Alert on repeated violations (potential security issue)
  alertSecurityTeam(error);
}
```

#### Auth Events
```typescript
// Track auth failures
if (authError) {
  logger.warn('Authentication failed', {
    email: credentials.email,
    provider: 'supabase',
    error: authError.message,
  });
  
  // Alert on brute force attempts
  if (failureCount > 5) {
    alertSecurityTeam({ type: 'brute_force', email });
  }
}
```

### Dashboards

**Create monitoring dashboards for:**

1. **API Health**
   - Request rate (requests/min)
   - Error rate (errors/min)
   - p50, p95, p99 latencies
   - Status code distribution

2. **Database Health**
   - Query performance
   - Connection pool usage
   - RLS overhead
   - Slow query count

3. **Auth Health**
   - Sign-up rate
   - Sign-in success/failure rate
   - Session duration
   - Auth provider breakdown

4. **Migration Progress** (during migration)
   - Modules migrated
   - Tests passing
   - Feature flag status
   - Dual-write discrepancies

### Alerting Rules

```yaml
# Example: Alerting configuration
alerts:
  - name: "High error rate"
    condition: error_rate > 5%
    window: 5 minutes
    severity: critical
    
  - name: "Slow API responses"
    condition: p95_latency > 1000ms
    window: 10 minutes
    severity: warning
    
  - name: "RLS policy violation"
    condition: rls_violations > 10
    window: 1 minute
    severity: critical
    
  - name: "Auth failures"
    condition: auth_failure_rate > 20%
    window: 5 minutes
    severity: warning
```

---

## 17. Rollback Procedures

**⚠️ CRITICAL:** Have a tested rollback plan BEFORE starting migration.

### When to Rollback

**Automatic rollback triggers:**
- Error rate increase > 5%
- API latency increase > 50%
- Data corruption detected
- Security incident (RLS bypass discovered)
- Database connection failures

**Manual rollback decision:**
- User complaints surge
- Critical feature broken
- Performance unacceptable
- Team consensus to abort

### Rollback Procedure

#### Phase 1-2: Schema Changes Only

**If only schema changes deployed (auth_user_id added):**

```bash
# 1. Stop application
vercel --prod --env MAINTENANCE_MODE=true

# 2. Rollback schema migration
psql $DATABASE_URL < migrations/rollback/002_remove_auth_user_id.sql

# 3. Verify database state
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'family_members';"

# 4. Redeploy previous version
git checkout pre-supabase-migration
vercel --prod

# 5. Verify application works
curl https://hearth.app/api/health

# 6. Exit maintenance mode
vercel --prod --env MAINTENANCE_MODE=false
```

#### Phase 3-5: Dual-Write or Partial Migration

**If dual-write or some modules migrated:**

```bash
# 1. Activate maintenance mode
vercel --prod --env MAINTENANCE_MODE=true

# 2. Stop all background jobs
# (prevents writes during rollback)

# 3. Create immediate backup
pg_dump $DATABASE_URL > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# 4. Disable feature flags (switch back to Prisma)
psql $DATABASE_URL << EOF
UPDATE system_config 
SET settings = jsonb_set(
  settings, 
  '{feature_flags, use_supabase}', 
  'false'::jsonb
);
EOF

# 5. Redeploy previous stable version
git checkout $(git describe --tags --abbrev=0) # Last tagged version
npm install
npm run build
vercel --prod

# 6. Verify rollback
npm test
curl https://hearth.app/api/health

# 7. Monitor for 1 hour
# Watch error logs, metrics

# 8. If stable, exit maintenance mode
vercel --prod --env MAINTENANCE_MODE=false

# 9. Post-mortem
# Document what went wrong
# Update migration plan
```

#### Phase 6+: Full Migration Complete

**If Prisma already removed:**

```bash
# ⚠️ This is harder - Prisma is gone!

# 1. Activate maintenance mode
vercel --prod --env MAINTENANCE_MODE=true

# 2. Restore database from last known good backup
# WARNING: This loses data created since backup!
pg_restore -d $DATABASE_URL backup_before_migration.dump

# 3. Restore code from git
git checkout pre-supabase-migration
npm install

# 4. Reinstall Prisma
npm install prisma @prisma/client

# 5. Generate Prisma client
npx prisma generate

# 6. Deploy
npm run build
vercel --prod

# 7. Verify
npm test

# 8. Communicate to users
# - Data may be lost (since backup)
# - Apologize for downtime
# - Explain next steps
```

### Data Recovery

**If data corruption detected:**

```sql
-- Identify affected records
SELECT * FROM families 
WHERE updated_at > '2026-01-09'  -- Migration date
AND (suspicious_condition);

-- Compare with backup
-- Restore specific rows if needed
INSERT INTO families 
SELECT * FROM backup.families 
WHERE id IN (...);
```

### Communication Plan

**During rollback:**

1. **Internal team:**
   - Notify immediately via Slack/Discord
   - Assign roles (DBA, deployer, communicator)
   - Set up war room

2. **Users:**
   - Post status page update ("Investigating issues")
   - Send email if downtime > 30 minutes
   - Update social media if public product

3. **Post-rollback:**
   - Send all-clear notification
   - Post-mortem meeting within 24 hours
   - Update documentation with lessons learned

### Rollback Checklist

**Before migration starts:**
- [ ] Rollback procedure documented and reviewed
- [ ] Backup and restore tested successfully
- [ ] Team trained on rollback process
- [ ] Monitoring/alerting configured
- [ ] Communication templates prepared

**During rollback:**
- [ ] Maintenance mode enabled
- [ ] Backup created
- [ ] Previous version deployed
- [ ] Tests passing
- [ ] Monitoring shows recovery
- [ ] Users notified

**After rollback:**
- [ ] Post-mortem completed
- [ ] Root cause identified
- [ ] Migration plan updated
- [ ] Decision: Retry or abandon?

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-09 | Original design document |
| 1.1 | 2026-01-09 | Added dual deployment strategy |
| 2.0 | 2026-01-09 | **Major revision**: Drop Prisma for Supabase client, simplified auth model, cloud-only focus, kiosk security model clarified |
| 2.1 | 2026-01-09 | Updated to Next.js 16 (from 14), added React Compiler and Turbopack notes |
| 2.2 | 2026-01-09 | Added full dual deployment support: Auth Adapter pattern, Docker Compose config, self-hosted RLS with PostgreSQL session variables |
| **3.0** | **2026-01-09** | **CRITICAL REVIEW EDITION**: Added implementation readiness review, risk analysis, pre-implementation requirements, revised migration plan (7 days → 12-16 weeks), comprehensive test migration strategy, performance benchmarking requirements, monitoring/observability guidelines, and rollback procedures. **Status changed to NOT READY FOR IMPLEMENTATION**. |
