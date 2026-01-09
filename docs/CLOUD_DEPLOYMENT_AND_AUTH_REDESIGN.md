# Cloud Deployment and Authentication Redesign

## Document Information

- **Version:** 1.1
- **Created:** January 9, 2026
- **Status:** Design Complete - Ready for Implementation
- **Scope:** Authentication system redesign, dual deployment (cloud + self-hosted), multi-family support, SaaS preparation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals and Non-Goals](#2-goals-and-non-goals)
3. [Dual Deployment Strategy](#3-dual-deployment-strategy)
4. [Current State Analysis](#4-current-state-analysis)
5. [Authentication Redesign](#5-authentication-redesign)
6. [Data Model Changes](#6-data-model-changes)
7. [Multi-Family Support](#7-multi-family-support)
8. [Kiosk Mode Changes](#8-kiosk-mode-changes)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Landing Page and Signup Flow](#10-landing-page-and-signup-flow)
11. [API Changes](#11-api-changes)
12. [UI Changes](#12-ui-changes)
13. [Security Considerations](#13-security-considerations)
14. [Migration Plan](#14-migration-plan)
15. [Testing Strategy](#15-testing-strategy)
16. [Implementation Phases](#16-implementation-phases)

---

## 1. Executive Summary

### Problem Statement

The current Hearth application is designed for self-hosted deployment and uses a PIN-based authentication system for children. This approach is not secure enough for internet-facing deployments, and the current data model doesn't support users belonging to multiple families.

### Solution Overview

This design document outlines a comprehensive redesign that:

1. **Supports dual deployment modes** - Both cloud (Vercel/Supabase) and self-hosted (Docker) options
2. **Separates User identity from FamilyMember roles** - Allows one person to belong to multiple families
3. **Restricts PIN authentication to Kiosk mode only** - PINs are never exposed to the internet directly
4. **Enables cloud deployment** - Vercel for hosting, Supabase for database and auth
5. **Preserves self-hosted option** - Docker deployment with local PostgreSQL and NextAuth
6. **Prepares for SaaS offering** - Landing page, signup flow, multi-tenant architecture

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Deployment | Dual (Cloud + Self-hosted) | User choice: managed SaaS or privacy-focused local |
| Auth Provider (Cloud) | Supabase Auth | OAuth support, managed service, Vercel integration |
| Auth Provider (Self-hosted) | NextAuth.js | Works offline, no external dependencies |
| Database | PostgreSQL (both modes) | Same Prisma schema, consistent behavior |
| Hosting (Cloud) | Vercel | Edge functions, easy deployment, preview environments |
| Hosting (Self-hosted) | Docker | Portable, works on NAS, Raspberry Pi, home servers |
| PIN Security | Kiosk-only | PINs work within authenticated sessions on trusted devices |
| Multi-family | User → FamilyMember split | Clean separation of identity from family roles |
| Pricing | Free (initially) | Focus on adoption before monetization |

---

## 2. Goals and Non-Goals

### Goals

- [ ] Deploy Hearth to Vercel with Supabase backend (cloud option)
- [ ] Maintain Docker-based self-hosted deployment option
- [ ] Share maximum code between deployment modes
- [ ] Implement secure authentication suitable for internet-facing deployment
- [ ] Support OAuth providers (Google, Apple) for cloud deployment
- [ ] Enable users to belong to multiple families
- [ ] Maintain kid-friendly login experience via Kiosk mode
- [ ] Create landing page for public access (cloud)
- [ ] Enable self-service family signup (cloud)
- [ ] Preserve all existing functionality during migration

### Non-Goals (Out of Scope)

- Custom subdomains per family (e.g., smith.hearth.app)
- Paid subscription tiers or billing integration
- Mobile native apps (PWA continues to be the approach)
- SSO/SAML enterprise features
- White-labeling or custom branding per family
- Hybrid deployments (self-hosted app with cloud auth)

---

## 3. Dual Deployment Strategy

### Overview

Hearth supports two deployment modes to give users flexibility:

| Mode | Target Users | Infrastructure | Auth Provider |
|------|--------------|----------------|---------------|
| **Cloud** | Families wanting managed service | Vercel + Supabase | Supabase Auth |
| **Self-Hosted** | Privacy-focused users, tech enthusiasts | Docker + PostgreSQL | NextAuth.js |

### Architecture Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLOUD DEPLOYMENT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Internet ──▶ Vercel (Next.js) ──▶ Supabase Auth ──▶ Supabase PostgreSQL  │
│                      │                                        │             │
│                      └───────────── Upstash Redis ◀───────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         SELF-HOSTED DEPLOYMENT                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Local Network ──▶ Docker (Next.js) ──▶ NextAuth ──▶ PostgreSQL Container │
│                           │                                   │             │
│                           └──────────── Redis Container ◀─────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Code Sharing Strategy

The goal is to maximize shared code while allowing deployment-specific behavior.

#### Shared Code (95%+)

| Layer | Shared? | Notes |
|-------|---------|-------|
| Prisma Schema | ✅ Yes | Identical for both modes |
| Database Queries | ✅ Yes | Prisma client works the same |
| API Route Logic | ✅ Yes | Business logic is identical |
| React Components | ✅ Yes | UI is deployment-agnostic |
| Kiosk Mode | ✅ Yes | PIN validation works locally |
| Rate Limiting | ✅ Yes | Redis abstraction supports both |
| Input Validation | ✅ Yes | Same sanitization everywhere |

#### Divergent Code

| Component | Cloud | Self-Hosted | Abstraction |
|-----------|-------|-------------|-------------|
| Auth Provider | Supabase Auth | NextAuth.js | `AuthAdapter` interface |
| Auth Middleware | Supabase SSR | NextAuth middleware | `getAuthSession()` |
| OAuth Providers | Google, Apple | Optional (can configure) | Provider config |
| File Storage | Supabase Storage | Local filesystem | `StorageAdapter` interface |
| Landing Page | Shown | Hidden/optional | Feature flag |
| Signup Flow | Self-service | Onboarding wizard | Route config |

### Auth Adapter Pattern

To support both auth systems with minimal code duplication:

**File:** `/lib/auth/adapter.ts`

```typescript
// Common interface for auth operations
export interface AuthAdapter {
  // Session management
  getSession(): Promise<Session | null>;
  signIn(credentials: SignInCredentials): Promise<SignInResult>;
  signOut(): Promise<void>;

  // User management
  createUser(data: CreateUserData): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, data: UpdateUserData): Promise<User>;

  // OAuth (optional)
  getOAuthProviders(): OAuthProvider[];
  signInWithOAuth(provider: string): Promise<void>;
}

// Factory function
export function getAuthAdapter(): AuthAdapter {
  if (process.env.DEPLOYMENT_MODE === 'cloud') {
    return new SupabaseAuthAdapter();
  }
  return new NextAuthAdapter();
}
```

**File:** `/lib/auth/supabase-adapter.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export class SupabaseAuthAdapter implements AuthAdapter {
  private client = createClient(/* config */);

  async getSession() {
    const { data } = await this.client.auth.getSession();
    return data.session ? mapSupabaseSession(data.session) : null;
  }

  async signIn(credentials: SignInCredentials) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    // ... map result
  }

  // ... other methods
}
```

**File:** `/lib/auth/nextauth-adapter.ts`

```typescript
import { auth, signIn, signOut } from '@/lib/auth';

export class NextAuthAdapter implements AuthAdapter {
  async getSession() {
    const session = await auth();
    return session ? mapNextAuthSession(session) : null;
  }

  async signIn(credentials: SignInCredentials) {
    const result = await signIn('credentials', {
      email: credentials.email,
      password: credentials.password,
      redirect: false,
    });
    // ... map result
  }

  // ... other methods
}
```

### Environment Detection

**File:** `/lib/deployment.ts`

```typescript
export type DeploymentMode = 'cloud' | 'self-hosted';

export function getDeploymentMode(): DeploymentMode {
  return process.env.DEPLOYMENT_MODE as DeploymentMode || 'self-hosted';
}

export function isCloudDeployment(): boolean {
  return getDeploymentMode() === 'cloud';
}

export function isSelfHosted(): boolean {
  return getDeploymentMode() === 'self-hosted';
}

// Feature flags based on deployment
export const features = {
  oauth: isCloudDeployment(),
  landingPage: isCloudDeployment(),
  selfServiceSignup: isCloudDeployment(),
  childPinLogin: isSelfHosted(), // Only for self-hosted (still not recommended)
};
```

### Self-Hosted Security Considerations

For self-hosted deployments, security is different:

| Aspect | Cloud | Self-Hosted |
|--------|-------|-------------|
| Network exposure | Public internet | Local network (typically) |
| SSL/TLS | Always (Vercel) | User responsibility |
| PIN login | Kiosk only | Kiosk only (can enable legacy if desired) |
| OAuth | Supported | Optional (requires config) |
| Rate limiting | Distributed (Upstash) | Local Redis container |
| Updates | Automatic | Manual (docker pull) |

**Self-Hosted Security Options:**

```yaml
# docker-compose.yml options for self-hosted security
environment:
  # Strictest (recommended) - same as cloud
  ALLOW_CHILD_PIN_LOGIN: "false"

  # Legacy mode (for local-only networks)
  ALLOW_CHILD_PIN_LOGIN: "true"  # Not recommended

  # Network restrictions
  TRUSTED_NETWORKS: "192.168.0.0/16,10.0.0.0/8"
```

### Docker Compose for Self-Hosted

**File:** `/docker-compose.yml` (updated)

```yaml
version: '3.8'

services:
  hearth-app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DEPLOYMENT_MODE=self-hosted
      - DATABASE_URL=postgres://hearth:hearth@hearth-db:5432/hearth
      - REDIS_URL=redis://hearth-cache:6379
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      # Self-hosted specific
      - ALLOW_CHILD_PIN_LOGIN=false
      - LANDING_PAGE_ENABLED=false
    depends_on:
      - hearth-db
      - hearth-cache

  hearth-db:
    image: postgres:16-alpine
    volumes:
      - hearth-db-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=hearth
      - POSTGRES_PASSWORD=hearth
      - POSTGRES_DB=hearth

  hearth-cache:
    image: redis:7-alpine
    volumes:
      - hearth-cache-data:/data

volumes:
  hearth-db-data:
  hearth-cache-data:
```

### Feature Parity Matrix

| Feature | Cloud | Self-Hosted | Notes |
|---------|-------|-------------|-------|
| Email/Password Login | ✅ | ✅ | Both support |
| OAuth (Google/Apple) | ✅ | ⚠️ Optional | Requires OAuth app setup |
| Magic Link | ✅ | ⚠️ Optional | Requires email service |
| Kiosk Mode | ✅ | ✅ | Identical |
| Multi-Family | ✅ | ✅ | Identical |
| All Modules | ✅ | ✅ | Identical |
| Push Notifications | ✅ | ⚠️ Optional | Requires VAPID keys |
| File Storage | Supabase | Local disk | Adapter pattern |
| Automatic Backups | ✅ | ❌ Manual | User responsibility |
| Automatic Updates | ✅ | ❌ Manual | docker pull |
| Landing Page | ✅ | ❌ N/A | Not needed |
| Self-Service Signup | ✅ | ❌ N/A | Uses onboarding |

### Migration Between Modes

**Cloud → Self-Hosted:**
1. Export data from Supabase (pg_dump)
2. Set up Docker environment
3. Import data to local PostgreSQL
4. Users must reset passwords (NextAuth uses different hashing)

**Self-Hosted → Cloud:**
1. Export data from local PostgreSQL
2. Create Supabase project
3. Import data to Supabase
4. Create Supabase Auth users (password reset required)
5. Update DNS/deploy to Vercel

### Testing Strategy for Dual Deployment

```typescript
// Run tests in both modes
describe.each(['cloud', 'self-hosted'])('Authentication (%s mode)', (mode) => {
  beforeAll(() => {
    process.env.DEPLOYMENT_MODE = mode;
  });

  it('should authenticate user', async () => {
    const adapter = getAuthAdapter();
    const result = await adapter.signIn({
      email: 'test@example.com',
      password: 'password',
    });
    expect(result.success).toBe(true);
  });
});
```

---

## 4. Current State Analysis

### Current Authentication System

**File:** `/lib/auth.ts`

The application currently uses NextAuth.js v5 with two credential providers:

```typescript
// Current providers
Credentials({ id: 'parent-login' })  // Email + password for parents
Credentials({ id: 'child-pin' })      // Member ID + PIN for children
```

**Current Login Flow (`/app/auth/signin/page.tsx`):**
1. User selects "Parent Login" or "Child Login"
2. Parent: Email + password authentication
3. Child: Select avatar → Enter 4-6 digit PIN
4. Both create JWT session with 30-day expiry

**Problems with Current Approach:**
- Child PIN login is exposed to the internet
- 4-6 digit PINs are easily brute-forced
- No OAuth support (Google, Apple sign-in)
- Users can only belong to one family
- No rate limiting on PIN attempts per member

### Current Data Model

**FamilyMember (current):**
```prisma
model FamilyMember {
  id           String    @id @default(uuid())
  familyId     String    // Only ONE family per member
  name         String
  email        String?   @unique  // Parents only
  passwordHash String?             // Parents only
  pin          String?             // Children only (hashed)
  role         Role                // PARENT | CHILD | GUEST
  // ... other fields
}
```

**Issues:**
- `FamilyMember` conflates user identity with family membership
- A person cannot exist in multiple families
- Email uniqueness prevents same person in different families

### Current Kiosk Mode

**Files:**
- `/app/kiosk/page.tsx` - Kiosk route (requires parent auth first)
- `/components/kiosk/KioskPinModal.tsx` - PIN entry for member switching
- `/components/kiosk/KioskLayout.tsx` - Kiosk UI wrapper

**Current Kiosk Flow:**
1. Parent navigates to `/kiosk` (must be authenticated as PARENT)
2. Kiosk starts in locked state
3. Any family member can unlock with their PIN
4. Auto-lock after configurable timeout (default 15 minutes)

**What Works:**
- PIN-based switching within authenticated session
- Auto-lock functionality
- Widget-based dashboard
- Activity detection

---

## 4. Authentication Redesign

### New Authentication Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION LAYER                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐  │
│  │  Supabase Auth  │     │   User Table    │     │ FamilyMember │  │
│  │                 │────▶│                 │────▶│    Table     │  │
│  │ - Email/Pass    │     │ - id            │     │              │  │
│  │ - Google OAuth  │     │ - supabaseId    │     │ - userId     │  │
│  │ - Apple OAuth   │     │ - email         │     │ - familyId   │  │
│  │ - Magic Link    │     │ - defaultFamily │     │ - role       │  │
│  └─────────────────┘     └─────────────────┘     │ - pin        │  │
│                                                   └──────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Authentication Methods by Context

| Context | Method | Who Can Use |
|---------|--------|-------------|
| Personal Device | Email + Password | Parents, Children with email |
| Personal Device | Google OAuth | Parents, Children with email |
| Personal Device | Apple OAuth | Parents, Children with email |
| Personal Device | Magic Link | Parents, Children with email |
| Kiosk Mode | PIN (4-6 digits) | All family members |
| Guest Access | Invite Code | Invited guests |

### Child Authentication Rules

| Child Has Email? | Can Login Independently? | Kiosk PIN? |
|------------------|--------------------------|------------|
| Yes | Yes (email + password or OAuth) | Yes |
| No | No (kiosk PIN only) | Yes |

**Key Change:** Remove the `child-pin` provider from the public login page. Children without email can ONLY authenticate via Kiosk mode after a parent has initiated the kiosk session.

### Supabase Auth Integration

**New File:** `/lib/supabase-auth.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Auth methods
export const signInWithEmail = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({ provider: 'google' });

export const signInWithApple = () =>
  supabase.auth.signInWithOAuth({ provider: 'apple' });

export const signOut = () => supabase.auth.signOut();

export const getSession = () => supabase.auth.getSession();
```

### Session Management

Supabase Auth handles session management automatically:
- JWT tokens stored in cookies
- Automatic refresh
- Server-side validation via `@supabase/ssr`

**New middleware approach:**
```typescript
// /middleware.ts (updated)
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(/* config */);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && isProtectedRoute(request.pathname)) {
    return NextResponse.redirect('/auth/signin');
  }

  // Continue with existing rate limiting, etc.
}
```

---

## 5. Data Model Changes

### New User Model

**Add to `/prisma/schema.prisma`:**

```prisma
// ============================================
// USER IDENTITY (Supabase Auth Integration)
// ============================================

model User {
  id              String    @id @default(uuid())
  supabaseAuthId  String    @unique  // Links to Supabase Auth user
  email           String    @unique
  name            String?
  avatarUrl       String?
  defaultFamilyId String?            // User's preferred family
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastLoginAt     DateTime?

  // Relations
  defaultFamily   Family?        @relation("DefaultFamily", fields: [defaultFamilyId], references: [id], onDelete: SetNull)
  familyMembers   FamilyMember[] // User's memberships across families

  @@index([supabaseAuthId])
  @@index([email])
  @@map("users")
}
```

### Updated FamilyMember Model

```prisma
model FamilyMember {
  id           String    @id @default(uuid())
  familyId     String
  userId       String?   // NULL for kiosk-only children (no User record)
  name         String
  role         Role
  pin          String?   // Hashed PIN for kiosk mode (ALL members can have one)
  birthDate    DateTime?
  avatarUrl    String?
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  lastLoginAt  DateTime?

  // Relations
  family       Family       @relation(fields: [familyId], references: [id], onDelete: Cascade)
  user         User?        @relation(fields: [userId], references: [id], onDelete: SetNull)

  // ... all existing relations remain unchanged

  @@unique([familyId, userId])  // One membership per user per family
  @@index([familyId])
  @@index([userId])
  @@map("family_members")
}
```

### Updated Family Model

```prisma
model Family {
  id        String   @id @default(uuid())
  name      String
  timezone  String   @default("America/New_York")
  location  String?
  latitude  Float?
  longitude Float?
  settings  Json?    @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  members                       FamilyMember[]
  defaultForUsers               User[]          @relation("DefaultFamily")  // NEW
  // ... all existing relations remain unchanged

  @@map("families")
}
```

### Fields Removed from FamilyMember

The following fields move to the User model or are removed:

| Field | Action | Reason |
|-------|--------|--------|
| `email` | Moved to User | Email is user identity, not family-specific |
| `passwordHash` | Removed | Supabase handles password storage |

### Fields Added/Changed

| Model | Field | Type | Purpose |
|-------|-------|------|---------|
| User | `supabaseAuthId` | String | Links to Supabase Auth |
| User | `defaultFamilyId` | String? | User's preferred family |
| FamilyMember | `userId` | String? | Links to User (null for kiosk-only kids) |
| FamilyMember | `pin` | String? | Now available for ALL members (parents too) |

### Migration Considerations

When migrating existing data:

1. **Create User records** for all FamilyMembers with email addresses
2. **Link FamilyMember.userId** to the new User records
3. **Copy email** from FamilyMember to User
4. **Create Supabase Auth users** for each User record (password reset flow)
5. **Add pin** capability to parent FamilyMember records

---

## 6. Multi-Family Support

### User Experience

**Login Flow:**
```
User logs in (email/password or OAuth)
         │
         ▼
┌─────────────────────────────┐
│  How many families belong   │
│  to this user?              │
└─────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  One      Multiple
    │         │
    ▼         ▼
Dashboard  Has default family?
              │
         ┌────┴────┐
         │         │
         ▼         ▼
        Yes       No
         │         │
         ▼         ▼
    Dashboard   Family Picker
```

### Family Picker Component

**New File:** `/components/auth/FamilyPicker.tsx`

```typescript
interface FamilyPickerProps {
  families: Array<{
    familyId: string;
    familyName: string;
    role: Role;
    memberName: string;
  }>;
  defaultFamilyId?: string;
  onSelect: (familyId: string) => void;
  onSetDefault: (familyId: string) => void;
}
```

**Features:**
- Grid of family cards showing family name and user's role
- "Set as default" checkbox/toggle
- Visual indicator for current default
- Quick-switch available in header/sidebar

### Family Switching While Logged In

**New Component:** `/components/dashboard/FamilySwitcher.tsx`

Location: Header or sidebar dropdown

**Functionality:**
- Shows current family name
- Dropdown with other families
- "Set as default" option
- "Manage families" link

**State Management:**
- Current family stored in session/context
- Switching updates context and refreshes dashboard data
- URL can optionally include family ID for direct linking

### API Changes for Multi-Family

All family-scoped API routes need updating:

```typescript
// Before: Get familyId from session
const familyId = session.user.familyId;

// After: Get familyId from request or session context
const familyId = request.headers.get('x-family-id') || session.currentFamilyId;

// Verify user has access to this family
const membership = await prisma.familyMember.findFirst({
  where: {
    userId: session.userId,
    familyId: familyId,
  }
});

if (!membership) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 });
}
```

### Inviting Existing Users to a Family

**Flow:**
1. Parent enters email of person to invite
2. System checks if email exists in User table
3. **If exists:** Create FamilyMember linking to existing User
4. **If not exists:** Create GuestInvite with email, send invite

**Invitation Email (existing user):**
```
Subject: You've been added to the [Family Name] family on Hearth

Hi [Name],

[Inviter Name] has added you to their family "[Family Name]" on Hearth.

You can now access this family from your dashboard. Log in to switch families.

[Login Button]
```

**Invitation Email (new user):**
```
Subject: You've been invited to join [Family Name] on Hearth

Hi,

[Inviter Name] has invited you to join their family "[Family Name]" on Hearth.

Click below to create your account and join the family.

[Create Account Button]
```

---

## 7. Kiosk Mode Changes

### Updated Kiosk Flow

```
Parent logs in on communal device (iPad, Echo Show)
         │
         ▼
Navigates to /kiosk
         │
         ▼
┌─────────────────────────────┐
│  Kiosk Mode Initialized     │
│  (Parent's session active)  │
└─────────────────────────────┘
         │
         ▼
Kiosk shows locked state
         │
         ▼
Any family member taps screen
         │
         ▼
┌─────────────────────────────┐
│  Member Selection Grid      │
│  (All parents + children)   │
└─────────────────────────────┘
         │
         ▼
Member selected
         │
         ▼
PIN entry screen
         │
         ▼
PIN validated (bcrypt compare)
         │
         ▼
Kiosk unlocked as that member
         │
         ▼
Dashboard displays for member
         │
         ▼
Auto-lock after timeout
```

### PIN for All Members

**Change:** Both parents and children can now have PINs for kiosk switching.

**FamilyMember PIN field:**
```prisma
pin String? // Hashed, for kiosk mode - available to ALL members
```

**Parent PIN Setup:**
- Optional for parents
- Set in profile settings: `/dashboard/profile`
- Required if parent wants to use kiosk mode

**Child PIN Setup:**
- Required for all children (needed for kiosk)
- Set by parent in family management: `/dashboard/family`

### Updated KioskPinModal

**File:** `/components/kiosk/KioskPinModal.tsx`

**Changes:**
- Fetch ALL family members (not just children)
- Filter to members with `pin` set
- Show role indicator (Parent/Child) in member grid

```typescript
// Updated member fetch
const response = await fetch('/api/family/members?hasPin=true');
const members = await response.json();

// Members now include parents with PINs
```

### Kiosk Settings Updates

**Updated KioskSettings model:**
```prisma
model KioskSettings {
  id                     String   @id @default(uuid())
  familyId               String   @unique
  isEnabled              Boolean  @default(true)
  autoLockMinutes        Int      @default(15)
  sessionTimeoutHours    Int      @default(24)  // NEW: Parent re-auth required
  enabledWidgets         String[]
  allowGuestView         Boolean  @default(true)
  requirePinForSwitch    Boolean  @default(true)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  family Family @relation(fields: [familyId], references: [id], onDelete: Cascade)

  @@map("kiosk_settings")
}
```

**New Setting: `sessionTimeoutHours`**
- How long before parent must re-authenticate
- Default: 24 hours
- Configurable: 1-168 hours (1 hour to 1 week)
- After timeout, entire kiosk session ends (not just auto-lock)

### Family Switching in Kiosk

**Scenario:** Parent belongs to multiple families, wants to switch kiosk to different family.

**Flow:**
1. Parent is in kiosk mode for Family A
2. Parent locks kiosk (or waits for auto-lock)
3. Parent unlocks with their PIN
4. Parent sees "Exit Kiosk" button
5. Parent exits kiosk → Returns to `/dashboard`
6. Parent switches family in dashboard
7. Parent navigates to `/kiosk` again
8. Kiosk now shows Family B members

**Note:** Kiosk is always locked to one family at a time. Switching requires exiting and re-entering.

---

## 8. Deployment Architecture

### Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           VERCEL                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐  │
│  │  Next.js App    │     │  Edge Functions │     │  Serverless  │  │
│  │  (Frontend)     │     │  (Middleware)   │     │  Functions   │  │
│  │                 │     │                 │     │  (API)       │  │
│  └────────┬────────┘     └────────┬────────┘     └──────┬───────┘  │
│           │                       │                      │          │
└───────────┼───────────────────────┼──────────────────────┼──────────┘
            │                       │                      │
            ▼                       ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          SUPABASE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐  │
│  │  PostgreSQL     │     │  Auth           │     │  Storage     │  │
│  │  (Database)     │     │  (Supabase Auth)│     │  (Files)     │  │
│  │                 │     │                 │     │              │  │
│  └─────────────────┘     └─────────────────┘     └──────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Vercel Configuration

**File:** `/vercel.json` (updated)

```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key",
    "DATABASE_URL": "@database-url"
  },
  "build": {
    "env": {
      "SKIP_ENV_VALIDATION": "1"
    }
  }
}
```

### Supabase Setup

**Project Configuration:**

1. **Create Supabase Project**
   - Region: US East (matches Vercel)
   - Database password: Strong, stored securely

2. **Enable Auth Providers**
   - Email/Password: Enabled
   - Google OAuth: Enabled (configure in Google Cloud Console)
   - Apple OAuth: Enabled (configure in Apple Developer)

3. **Database Connection**
   ```
   DATABASE_URL=postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?pgbouncer=true
   DIRECT_URL=postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

4. **Storage Bucket**
   - Create `avatars` bucket for user/member avatars
   - Create `documents` bucket for document vault
   - Configure RLS policies

### Environment Variables

**Production (Vercel):**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Database
DATABASE_URL=postgres://...?pgbouncer=true
DIRECT_URL=postgres://...

# App
NEXT_PUBLIC_APP_URL=https://hearth.app
NEXTAUTH_SECRET=[generate-new-secret]

# External APIs
WEATHER_API_KEY=[openweathermap-key]
GOOGLE_CLIENT_ID=[google-oauth-client-id]
GOOGLE_CLIENT_SECRET=[google-oauth-client-secret]
```

### Prisma Configuration

**File:** `/prisma/schema.prisma` (updated)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // For migrations
}
```

**Connection Pooling:**
- Use `pgbouncer=true` in DATABASE_URL for serverless
- Use DIRECT_URL for Prisma migrations (bypasses pooler)

### Redis/Rate Limiting

**Options:**

1. **Upstash Redis** (Recommended)
   - Serverless Redis
   - Pay-per-request pricing
   - Vercel integration

2. **In-Memory Fallback**
   - Already implemented in `/lib/rate-limit-redis.ts`
   - Works but doesn't share state across serverless instances

**Upstash Setup:**
```env
UPSTASH_REDIS_REST_URL=https://[region].upstash.io
UPSTASH_REDIS_REST_TOKEN=[token]
```

---

## 9. Landing Page and Signup Flow

### Landing Page Structure

**Route:** `/` (root)

**New File:** `/app/page.tsx` (replace current redirect)

**Sections:**

1. **Hero Section**
   - Tagline: "Family-first household management"
   - Brief description
   - "Get Started Free" CTA
   - "Learn More" secondary CTA

2. **Features Overview**
   - Chores & Rewards
   - Screen Time Management
   - Meal Planning
   - Family Calendar
   - Health Tracking
   - And more...

3. **How It Works**
   - Step 1: Create your family
   - Step 2: Add family members
   - Step 3: Enable the features you need
   - Step 4: Manage your household together

4. **Screenshots/Demo**
   - Dashboard preview
   - Mobile/tablet views
   - Kiosk mode preview

5. **Footer**
   - Links: Privacy, Terms, Contact
   - "Sign In" link for existing users

### Signup Flow

**Route:** `/auth/signup`

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SIGNUP FLOW                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 1: Create Account                                             │
│  ─────────────────────                                              │
│  - Email address                                                    │
│  - Password (or OAuth: Google/Apple)                                │
│  - Name                                                             │
│                                                    [Continue →]     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 2: Create Family                                              │
│  ────────────────────                                               │
│  - Family name (e.g., "The Smith Family")                           │
│  - Timezone (auto-detected, editable)                               │
│  - Location (optional, for weather)                                 │
│                                                    [Continue →]     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 3: Add Family Members (Optional)                              │
│  ────────────────────────────────────                               │
│  - Add children (name, birthdate, optional email)                   │
│  - Add other parent/guardian (invite by email)                      │
│  - Can skip and add later                                           │
│                                        [Skip] [Add Members →]       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 4: Choose Features                                            │
│  ─────────────────────                                              │
│  - Toggle on/off: Chores, Screen Time, Credits, etc.                │
│  - Brief description of each                                        │
│  - Can change later in settings                                     │
│                                                    [Finish →]       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                        /dashboard
```

### Signup API

**New Endpoint:** `POST /api/auth/signup`

```typescript
interface SignupRequest {
  // Step 1
  email: string;
  password: string;
  name: string;

  // Step 2
  familyName: string;
  timezone: string;
  location?: string;
  latitude?: number;
  longitude?: number;

  // Step 3 (optional)
  members?: Array<{
    name: string;
    role: 'PARENT' | 'CHILD';
    email?: string;
    birthDate?: string;
  }>;

  // Step 4
  enabledModules: string[];
}
```

**Signup Process:**
1. Create Supabase Auth user
2. Create User record in database
3. Create Family record
4. Create FamilyMember for the signing-up user (PARENT role)
5. Create FamilyMember records for any added members
6. Create ModuleConfiguration records for enabled modules
7. Send welcome email
8. Redirect to dashboard

---

## 10. API Changes

### Authentication APIs

**Remove:**
- NextAuth route handler (`/app/api/auth/[...nextauth]/route.ts`)

**Add:**
- `/api/auth/signup` - New user registration
- `/api/auth/callback` - OAuth callback handler

**Update:**
- All API routes to use Supabase session validation

### Family APIs

**Update:** `/api/family/route.ts`

```typescript
// Before
const session = await auth();
const familyId = session?.user?.familyId;

// After
const { user, familyId } = await getAuthContext(request);
// familyId comes from header or user's current selection
```

**New Endpoint:** `GET /api/user/families`

Returns all families the current user belongs to:
```typescript
interface UserFamiliesResponse {
  families: Array<{
    familyId: string;
    familyName: string;
    role: Role;
    memberName: string;
    isDefault: boolean;
  }>;
}
```

**New Endpoint:** `PUT /api/user/default-family`

Sets user's default family:
```typescript
interface SetDefaultFamilyRequest {
  familyId: string;
}
```

### Member APIs

**Update:** `POST /api/family/members`

Now handles linking to existing users:

```typescript
interface CreateMemberRequest {
  name: string;
  role: Role;
  email?: string;      // If provided, check for existing User
  birthDate?: string;
  avatarUrl?: string;
}

// Logic:
// 1. If email provided:
//    a. Check if User exists with that email
//    b. If yes, link FamilyMember to existing User
//    c. If no, create invitation (or create User if immediate)
// 2. If no email:
//    a. Create FamilyMember with userId = null (kiosk-only)
```

### PIN APIs

**New Endpoint:** `PUT /api/family/members/[id]/pin`

Set or update member's kiosk PIN:

```typescript
interface SetPinRequest {
  pin: string;  // 4-6 digits, will be hashed
}

// Validation:
// - PIN must be 4-6 digits
// - Only PARENT can set other members' PINs
// - Member can set their own PIN
```

### Kiosk APIs

**Update:** `POST /api/kiosk/session/unlock`

Now validates PIN for any member (parent or child):

```typescript
// Before: Only checked children
if (member.role !== Role.CHILD) {
  return error;
}

// After: Check any member with a PIN
if (!member.pin) {
  return NextResponse.json({ error: 'Member has no PIN set' }, { status: 400 });
}
```

---

## 11. UI Changes

### Login Page Redesign

**File:** `/app/auth/signin/page.tsx`

**Remove:**
- "Child Login" button and `ChildPinLogin` component
- Child PIN login mode

**Update:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                           [Hearth Logo]                             │
│                                                                     │
│                      Welcome to your household                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Email                                                       │   │
│  │  [____________________________________________________]     │   │
│  │                                                               │   │
│  │  Password                                                     │   │
│  │  [____________________________________________________]     │   │
│  │                                                               │   │
│  │                              [Sign In]                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                           ─── or ───                                │
│                                                                     │
│             [🔵 Continue with Google]                              │
│             [🍎 Continue with Apple]                               │
│                                                                     │
│                    Don't have an account?                           │
│                         [Sign Up]                                   │
│                                                                     │
│                    [Guest Access →]                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Family Picker UI

**New File:** `/app/auth/select-family/page.tsx`

Shown after login if user has multiple families and no default:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                        Select a Family                              │
│                                                                     │
│  ┌─────────────────────┐    ┌─────────────────────┐                │
│  │                     │    │                     │                │
│  │    🏠 Smith Family  │    │   🏠 Work Team      │                │
│  │                     │    │                     │                │
│  │    Role: Parent     │    │    Role: Member     │                │
│  │                     │    │                     │                │
│  │ [☐ Set as default]  │    │ [☐ Set as default]  │                │
│  │                     │    │                     │                │
│  └─────────────────────┘    └─────────────────────┘                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Dashboard Header Update

**File:** `/components/dashboard/TopBar.tsx`

Add family switcher dropdown:

```
┌─────────────────────────────────────────────────────────────────────┐
│  [≡]  Hearth    │ The Smith Family ▼│    [🔔]  [👤 Profile ▼]     │
└─────────────────────────────────────────────────────────────────────┘
                          │
                          ▼ (dropdown)
                  ┌─────────────────────┐
                  │ ✓ The Smith Family  │
                  │   Work Team         │
                  │ ─────────────────── │
                  │   Manage Families   │
                  └─────────────────────┘
```

### Profile Page Update

**File:** `/app/dashboard/profile/page.tsx`

Add PIN management section for kiosk:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Profile Settings                                                   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Kiosk PIN                                                   │   │
│  │                                                               │   │
│  │  Set a PIN to unlock Kiosk mode on shared family devices.    │   │
│  │                                                               │   │
│  │  Current PIN: ****                                            │   │
│  │                                                               │   │
│  │  [Change PIN]                                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Family Management Update

**File:** `/app/dashboard/family/page.tsx`

Update member cards to show:
- Whether member has email (can login independently)
- Whether member has PIN set (can use kiosk)
- "Invite by email" action for members without accounts

```
┌─────────────────────────────────────────────────────────────────────┐
│  Tommy Smith                                           [Edit] [···] │
│  ─────────────────────────────────────────────────────────────────  │
│  Role: Child  │  Age: 10                                            │
│                                                                     │
│  ✓ Kiosk PIN set                                                   │
│  ✗ No email - Kiosk only                                           │
│                                                                     │
│  [Add Email & Enable Login]                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 12. Security Considerations

### Authentication Security

| Concern | Mitigation |
|---------|------------|
| PIN brute force | PINs only work in authenticated kiosk sessions |
| Session hijacking | Supabase JWT with short expiry, refresh tokens |
| OAuth token theft | Tokens stored server-side, encrypted at rest |
| Password security | Supabase handles hashing (bcrypt) |

### Rate Limiting

**Endpoint-Specific Limits:**

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/*` | 5 requests | 1 minute |
| `/api/kiosk/session/unlock` | 5 attempts | 5 minutes |
| `/api/*` (general) | 100 requests | 1 minute |

**PIN Attempt Limiting:**
```typescript
// In kiosk unlock endpoint
const attempts = await redis.incr(`pin-attempts:${memberId}`);
await redis.expire(`pin-attempts:${memberId}`, 300); // 5 minutes

if (attempts > 5) {
  return NextResponse.json(
    { error: 'Too many attempts. Try again in 5 minutes.' },
    { status: 429 }
  );
}
```

### Data Isolation

**Multi-Tenant Security:**
- All queries must include `familyId` filter
- API routes verify user membership before returning data
- Audit logging for cross-family access attempts

```typescript
// Helper function for all API routes
async function verifyFamilyAccess(userId: string, familyId: string): Promise<FamilyMember | null> {
  return prisma.familyMember.findFirst({
    where: {
      userId,
      familyId,
      isActive: true,
    },
  });
}
```

### HTTPS and Headers

**Middleware additions:**
```typescript
// Security headers
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('X-Frame-Options', 'DENY');
response.headers.set('X-XSS-Protection', '1; mode=block');
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
```

### Audit Logging

**New Audit Actions:**
```prisma
enum AuditAction {
  // ... existing actions

  // New authentication actions
  USER_CREATED
  USER_LOGGED_IN
  USER_LOGGED_OUT
  OAUTH_CONNECTED
  OAUTH_DISCONNECTED

  // New multi-family actions
  FAMILY_SWITCHED
  DEFAULT_FAMILY_SET
  MEMBER_LINKED_TO_USER

  // New kiosk actions
  KIOSK_PIN_SET
  KIOSK_PIN_CHANGED
  KIOSK_UNLOCK_FAILED
}
```

---

## 13. Migration Plan

### Phase 1: Database Migration

**Step 1.1: Add new tables/columns (non-breaking)**

```sql
-- Add User table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_auth_id TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  default_family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Add userId column to family_members (nullable initially)
ALTER TABLE family_members ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add unique constraint (deferred until data migrated)
-- CREATE UNIQUE INDEX family_members_family_user ON family_members(family_id, user_id) WHERE user_id IS NOT NULL;
```

**Step 1.2: Migrate existing data**

```typescript
// Migration script
async function migrateUsersAndMembers() {
  // Get all family members with email addresses
  const membersWithEmail = await prisma.familyMember.findMany({
    where: { email: { not: null } },
  });

  for (const member of membersWithEmail) {
    // Create User record
    const user = await prisma.user.create({
      data: {
        email: member.email!,
        name: member.name,
        avatarUrl: member.avatarUrl,
        defaultFamilyId: member.familyId,
      },
    });

    // Link FamilyMember to User
    await prisma.familyMember.update({
      where: { id: member.id },
      data: { userId: user.id },
    });

    // Create Supabase Auth user (will need password reset)
    // This is handled separately via Supabase Admin API
  }
}
```

**Step 1.3: Create Supabase Auth users**

```typescript
// Use Supabase Admin API
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createSupabaseAuthUsers() {
  const users = await prisma.user.findMany();

  for (const user of users) {
    // Create auth user with temporary password
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: { name: user.name },
    });

    if (data.user) {
      // Update User with Supabase Auth ID
      await prisma.user.update({
        where: { id: user.id },
        data: { supabaseAuthId: data.user.id },
      });

      // Send password reset email
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: user.email,
      });
    }
  }
}
```

### Phase 2: Application Updates

**Step 2.1: Add Supabase client**
- Install `@supabase/supabase-js` and `@supabase/ssr`
- Create Supabase client utilities
- Add environment variables

**Step 2.2: Update authentication**
- Replace NextAuth with Supabase Auth
- Update middleware for Supabase session
- Update all API routes for new auth

**Step 2.3: Update UI**
- Replace login page
- Add family picker
- Add family switcher to dashboard
- Update profile page with PIN management

### Phase 3: Deployment

**Step 3.1: Prepare Vercel**
- Create Vercel project
- Configure environment variables
- Set up preview deployments

**Step 3.2: Prepare Supabase**
- Create production Supabase project
- Configure auth providers
- Set up storage buckets
- Configure Row Level Security

**Step 3.3: Deploy**
- Deploy to Vercel
- Run database migrations
- Migrate existing users (if any)
- Send password reset emails

### Rollback Plan

**If migration fails:**

1. Keep NextAuth code in codebase (feature flagged)
2. Database changes are additive (no data loss)
3. Can revert to self-hosted deployment

```typescript
// Feature flag for auth system
const USE_SUPABASE_AUTH = process.env.USE_SUPABASE_AUTH === 'true';

if (USE_SUPABASE_AUTH) {
  // Use Supabase Auth
} else {
  // Use NextAuth (legacy)
}
```

---

## 14. Testing Strategy

### Unit Tests

**New test files:**
- `/tests/lib/supabase-auth.test.ts`
- `/tests/api/auth/signup.test.ts`
- `/tests/api/user/families.test.ts`
- `/tests/components/auth/FamilyPicker.test.tsx`

### Integration Tests

**Auth flow tests:**
```typescript
describe('Authentication', () => {
  it('should sign up new user and create family', async () => {
    // Test full signup flow
  });

  it('should sign in existing user', async () => {
    // Test email/password login
  });

  it('should handle OAuth login', async () => {
    // Test Google/Apple OAuth
  });

  it('should show family picker for multi-family user', async () => {
    // Test family selection
  });
});
```

**Kiosk tests:**
```typescript
describe('Kiosk Mode', () => {
  it('should allow parent to start kiosk session', async () => {});
  it('should allow any member with PIN to unlock', async () => {});
  it('should rate limit PIN attempts', async () => {});
  it('should auto-lock after timeout', async () => {});
  it('should require re-auth after session timeout', async () => {});
});
```

### E2E Tests

**Playwright tests:**
```typescript
// tests/e2e/auth.spec.ts
test('full signup flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Get Started');
  // ... complete signup flow
  await expect(page).toHaveURL('/dashboard');
});

test('kiosk mode flow', async ({ page }) => {
  // Login as parent
  await page.goto('/auth/signin');
  // ... login

  // Start kiosk
  await page.goto('/kiosk');

  // Unlock as child
  await page.click('[data-member-id="child-1"]');
  await page.fill('[data-pin-input]', '1234');
  await page.click('text=Unlock');

  // Verify unlocked
  await expect(page.locator('[data-kiosk-member]')).toContainText('Tommy');
});
```

### Load Testing

**Key endpoints to test:**
- `/api/auth/signup` - Registration under load
- `/api/kiosk/session/unlock` - PIN validation under load
- `/api/family` - Dashboard data fetch under load

---

## 15. Implementation Phases

### Phase 1: Foundation (Week 1-2)

- [ ] Set up Supabase project
- [ ] Add User model to schema
- [ ] Create Supabase Auth client utilities
- [ ] Write database migration scripts
- [ ] Update FamilyMember model
- [ ] Create basic tests

### Phase 2: Authentication (Week 2-3)

- [ ] Replace NextAuth with Supabase Auth
- [ ] Update middleware
- [ ] Update all API routes for new auth
- [ ] Create new signup flow
- [ ] Update login page (remove child PIN)
- [ ] Add OAuth providers

### Phase 3: Multi-Family (Week 3-4)

- [ ] Implement family picker
- [ ] Add family switcher to dashboard
- [ ] Update API routes for family context
- [ ] Add user families endpoint
- [ ] Update invitation system

### Phase 4: Kiosk Updates (Week 4)

- [ ] Add PIN support for parents
- [ ] Update kiosk settings
- [ ] Add session timeout configuration
- [ ] Update kiosk PIN modal
- [ ] Add PIN management to profile

### Phase 5: Landing & Signup (Week 5)

- [ ] Create landing page
- [ ] Build signup wizard
- [ ] Add onboarding flow updates
- [ ] Create welcome emails

### Phase 6: Deployment (Week 5-6)

- [ ] Configure Vercel project
- [ ] Set up production Supabase
- [ ] Run migrations
- [ ] Deploy to production
- [ ] Monitor and fix issues

### Phase 7: Polish (Week 6+)

- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Documentation updates
- [ ] User feedback integration

---

## Appendix A: Environment Variables Reference

### Cloud Deployment (Vercel + Supabase)

```env
# Deployment Mode
DEPLOYMENT_MODE=cloud

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Database (Supabase PostgreSQL)
DATABASE_URL=postgres://...?pgbouncer=true
DIRECT_URL=postgres://...

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://[region].upstash.io
UPSTASH_REDIS_REST_TOKEN=[token]

# Application
NEXT_PUBLIC_APP_URL=https://hearth.app

# OAuth
GOOGLE_CLIENT_ID=[google-client-id]
GOOGLE_CLIENT_SECRET=[google-client-secret]
APPLE_CLIENT_ID=[apple-client-id]
APPLE_CLIENT_SECRET=[apple-client-secret]

# External Services
WEATHER_API_KEY=[openweathermap-key]

# Feature Flags (Cloud defaults)
LANDING_PAGE_ENABLED=true
SELF_SERVICE_SIGNUP_ENABLED=true
ALLOW_CHILD_PIN_LOGIN=false
```

### Self-Hosted Deployment (Docker)

```env
# Deployment Mode
DEPLOYMENT_MODE=self-hosted

# Database (Local PostgreSQL)
DATABASE_URL=postgres://hearth:hearth@hearth-db:5432/hearth

# Redis (Local)
REDIS_URL=redis://hearth-cache:6379

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=[generate-with-openssl-rand-base64-32]

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# External Services (Optional)
WEATHER_API_KEY=[openweathermap-key]

# OAuth (Optional - requires setup)
# GOOGLE_CLIENT_ID=[google-client-id]
# GOOGLE_CLIENT_SECRET=[google-client-secret]

# Feature Flags (Self-hosted defaults)
LANDING_PAGE_ENABLED=false
SELF_SERVICE_SIGNUP_ENABLED=false
ALLOW_CHILD_PIN_LOGIN=false

# Security (Self-hosted specific)
# TRUSTED_NETWORKS=192.168.0.0/16,10.0.0.0/8
```

### Common Environment Variables

These variables work in both deployment modes:

```env
# External APIs
WEATHER_API_KEY=[openweathermap-key]

# Push Notifications (Optional)
VAPID_PUBLIC_KEY=[vapid-public-key]
VAPID_PRIVATE_KEY=[vapid-private-key]

# Timezone
TZ=America/New_York
```

---

## Appendix B: API Endpoint Summary

### New Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/signup` | Register new user and family |
| GET | `/api/user/families` | Get user's families |
| PUT | `/api/user/default-family` | Set default family |
| PUT | `/api/family/members/[id]/pin` | Set member's kiosk PIN |

### Updated Endpoints

| Method | Path | Changes |
|--------|------|---------|
| GET | `/api/family` | Accept family ID from header |
| GET | `/api/family/members` | Add `hasPin` filter option |
| POST | `/api/kiosk/session/unlock` | Support parent PINs |
| ALL | `/api/*` | New auth context |

### Removed Endpoints

| Method | Path | Reason |
|--------|------|--------|
| ALL | `/api/auth/[...nextauth]/*` | Replaced by Supabase Auth |

---

## Appendix C: Database Schema Diff

```diff
+ model User {
+   id              String    @id @default(uuid())
+   supabaseAuthId  String    @unique
+   email           String    @unique
+   name            String?
+   avatarUrl       String?
+   defaultFamilyId String?
+   createdAt       DateTime  @default(now())
+   updatedAt       DateTime  @updatedAt
+   lastLoginAt     DateTime?
+
+   defaultFamily   Family?        @relation("DefaultFamily", fields: [defaultFamilyId], references: [id], onDelete: SetNull)
+   familyMembers   FamilyMember[]
+
+   @@map("users")
+ }

  model FamilyMember {
    id           String    @id @default(uuid())
    familyId     String
+   userId       String?
    name         String
-   email        String?   @unique
-   passwordHash String?
-   pin          String?   // Was children only
+   pin          String?   // Now all members
    role         Role
    // ... rest unchanged

+   user         User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
+
+   @@unique([familyId, userId])
  }

  model Family {
    // ... existing fields
+   defaultForUsers User[] @relation("DefaultFamily")
  }

  model KioskSettings {
    // ... existing fields
+   sessionTimeoutHours Int @default(24)
  }
```

---

## Document Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-09 | Claude | Initial design document |
| 1.1 | 2026-01-09 | Claude | Added dual deployment strategy (cloud + self-hosted Docker support) |
