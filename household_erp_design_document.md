# Hearth – Design & Planning Document
### *A Household ERP System*

## 1. Vision & Goals

### Vision
Create a **centralized, family-first Household ERP system** that helps run a home the same way an ERP helps run a business: managing people, time, tasks, resources, and routines in one cohesive system.

### Core Goals
- Reduce parental mental load
- Improve fairness and transparency for kids
- Centralize household knowledge (meals, health, routines)
- Enable automation between household systems
- Be flexible enough for different family sizes and rules
- Privacy-first, self-hostable via Docker containers

### Target Users
- **Primary:** Families with children ages 5-18, with emphasis on younger children (5-12)
- **User Types:** Parents (administrators), Children (limited access), Guests (temporary access)

---

## 2. Core Design Principles

- **Single Source of Truth** – one system for chores, meals, schedules, etc.
- **Modular** – features can be enabled/disabled per family
- **Rule-driven** – automation instead of manual micromanagement
- **Age-aware** – features adapt based on child age (simplified UI for younger kids)
- **Cross-module integration** – data flows between modules naturally
- **Trust-based** – system tracks and informs rather than enforces/blocks
- **Test-Driven Development** – all features built with tests first

---

## 2.1 Technical Architecture

### Technology Stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router), React 18+, Tailwind CSS |
| Backend | Next.js API Routes / Server Actions |
| Database | PostgreSQL 16+ |
| ORM | Prisma |
| Authentication | NextAuth.js (credentials provider) |
| Testing | Jest, React Testing Library, Playwright (E2E) |
| Containerization | Docker, Docker Compose |
| Push Notifications | Web Push API (PWA) |

### Container Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
├─────────────────┬─────────────────┬─────────────────────┤
│   hearth-app    │   hearth-db     │   hearth-cache      │
│   (Next.js)     │  (PostgreSQL)   │  (Redis - future)   │
│   Port: 3000    │  Port: 5432     │  Port: 6379         │
└─────────────────┴─────────────────┴─────────────────────┘
```

### Data Refresh Strategy
- **Polling interval:** 30 seconds for dashboard data
- **On-demand refresh:** Pull-to-refresh on mobile, refresh button on desktop
- **Optimistic updates:** UI updates immediately, syncs in background

---

## 2.2 Authentication & Access Control

### Authentication Methods

#### Parents
- Username (email) + password
- Session-based authentication via NextAuth.js
- Password requirements: minimum 8 characters, complexity rules
- Password reset via email

#### Children
- 4-6 digit PIN entry
- PIN tied to family account (no email required)
- PIN can be reset by parent
- Simplified login screen with avatar selection

#### Kiosk Mode
- Persistent family dashboard session
- No individual login required to view
- Quick-switch between family members via PIN/avatar
- Auto-lock after configurable timeout (default: 15 minutes)
- Restricted to view-only actions unless user authenticates

### Role-Based Permissions

| Permission | Parent | Child (13+) | Child (5-12) | Guest |
|------------|--------|-------------|--------------|-------|
| View Dashboard | ✓ | ✓ | ✓ (simplified) | ✓ (limited) |
| Complete Own Chores | ✓ | ✓ | ✓ | ✗ |
| Assign Chores | ✓ | ✗ | ✗ | ✗ |
| Approve Chores | ✓ | ✗ | ✗ | ✗ |
| Manage Screen Time | ✓ | ✗ | ✗ | ✗ |
| Log Screen Time | ✓ | ✓ | ✓ | ✗ |
| Edit Shopping List | ✓ | ✓ | Request only | ✗ |
| View Calendar | ✓ | ✓ | ✓ | ✓ |
| Create Events | ✓ | Request only | ✗ | ✗ |
| Manage Family | ✓ | ✗ | ✗ | ✗ |
| View Credits | ✓ | Own only | Own only | ✗ |
| Award Credits | ✓ | ✗ | ✗ | ✗ |

---

## 2.3 Security

### Authentication Security

**PIN Brute-Force Protection:**
- Maximum 5 failed PIN attempts before lockout
- Progressive lockout: 1 min → 5 min → 15 min → 1 hour
- Parent notification after 3 failed attempts
- Lockout resets after successful parent intervention
- Failed attempts logged to audit trail

**Password Security:**
- Minimum 8 characters
- Must contain: uppercase, lowercase, number
- Special characters encouraged but not required
- Password hashing: bcrypt with cost factor 12
- No password reuse (last 5 passwords stored as hashes)

**Session Management:**
- JWT tokens with 15-minute access token expiration
- Refresh tokens with 7-day expiration (30 days for "remember me")
- Refresh token rotation on each use
- Secure, httpOnly cookies for token storage
- Session invalidation on password change
- Maximum 5 concurrent sessions per user
- Kiosk sessions: 24-hour tokens with activity-based refresh

### Data Encryption

**At Rest:**
- OAuth tokens: AES-256 encryption before database storage
- Child PINs: bcrypt hashed (never stored in plain text)
- Document vault files: AES-256 encrypted storage
- Sensitive fields encrypted: `CalendarConnection.accessToken`, `CalendarConnection.refreshToken`, `Document.documentNumber`

**In Transit:**
- TLS 1.3 required for all connections
- HSTS headers enabled
- Certificate pinning for mobile PWA (future)

### API Security

**Rate Limiting:**
| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication (login) | 5 requests | 1 minute |
| PIN attempts | 5 requests | 1 minute |
| Password reset | 3 requests | 15 minutes |
| General API | 100 requests | 1 minute |
| File uploads | 10 requests | 1 minute |
| Bulk operations | 20 requests | 1 minute |

**Input Validation:**
- Server-side validation on all inputs using Zod schemas
- Sanitize HTML in user-generated content (DOMPurify)
- Parameterized queries via Prisma (SQL injection prevention)
- File upload validation: type, size, malware scanning (optional)
- UUID validation for all ID parameters

**CSRF Protection:**
- SameSite=Strict cookies
- CSRF tokens for state-changing operations
- Origin header validation
- Double-submit cookie pattern for API routes

**Additional Protections:**
- Content Security Policy (CSP) headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### Security Monitoring

**Audit Events (logged automatically):**
- Login success/failure
- Password changes
- PIN changes
- Permission changes
- Family member additions/removals
- Sensitive data access (documents, health records)
- Failed authorization attempts
- Rate limit violations

**Alerting:**
- Multiple failed login attempts → Parent notification
- New device login → Email notification (optional)
- Permission escalation attempts → Admin alert
- Unusual activity patterns → Logged for review

---

## 2.4 File & Image Storage

### Storage Strategy

**Recommended: Cloud Storage (S3-Compatible)**

For production deployments, cloud storage is recommended:
- Primary: AWS S3 or compatible (MinIO for self-hosted)
- CDN: CloudFront or Cloudflare for global distribution
- Fallback: Local filesystem for development/small deployments

**Storage Structure:**
```
/hearth-storage/
├── /avatars/{familyId}/{memberId}/
│   └── avatar.{webp|png}
├── /chores/{familyId}/{choreInstanceId}/
│   └── proof-{timestamp}.{webp|jpg}
├── /documents/{familyId}/{documentId}/
│   ├── original/
│   └── versions/
├── /board/{familyId}/{messageId}/
│   └── image-{timestamp}.{webp|jpg}
├── /pets/{familyId}/{petId}/
│   └── photo.{webp|png}
└── /maintenance/{familyId}/{instanceId}/
    ├── before.{webp|jpg}
    └── after.{webp|jpg}
```

### Image Processing

**Upload Limits:**
| Image Type | Max Size | Max Dimensions |
|------------|----------|----------------|
| Avatar | 2 MB | 512x512 |
| Chore proof | 5 MB | 1920x1080 |
| Board photo | 5 MB | 1920x1080 |
| Pet photo | 2 MB | 1024x1024 |
| Maintenance photo | 10 MB | 2560x1440 |
| Documents (PDF) | 25 MB | N/A |
| Documents (image) | 10 MB | 3000x3000 |

**Processing Pipeline:**
1. Validate file type (magic bytes, not just extension)
2. Virus scan (ClamAV or cloud service)
3. Strip EXIF metadata (privacy)
4. Resize to max dimensions if exceeded
5. Convert to WebP for web display (keep original for documents)
6. Generate thumbnail (200x200 for avatars, 400x300 for photos)
7. Upload to storage with unique filename
8. Store URL in database

**Supported Formats:**
- Images: JPEG, PNG, WebP, HEIC (converted to WebP)
- Documents: PDF, JPEG, PNG

### CDN Configuration

**Cache Rules:**
- Avatars: 30 days (cache-busted on change via URL param)
- Chore proofs: 7 days
- Board photos: 7 days
- Documents: No CDN caching (served directly with auth)

**Signed URLs:**
- Document downloads require signed URLs (15-minute expiration)
- Prevents unauthorized access to sensitive files

### Data Model Addition

```
FileUpload
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── uploadedById: UUID (FK → FamilyMember)
├── entityType: Enum (AVATAR, CHORE_PROOF, BOARD_IMAGE, PET_PHOTO, MAINTENANCE_PHOTO, DOCUMENT)
├── entityId: UUID (reference to parent entity)
├── originalFilename: String
├── storagePath: String
├── storageProvider: Enum (LOCAL, S3, CLOUDFLARE)
├── mimeType: String
├── fileSizeBytes: Int
├── thumbnailPath: String?
├── isPublic: Boolean
├── uploadedAt: DateTime
└── deletedAt: DateTime?
```

---

## 2.5 Audit Logging

### Purpose
Track all significant actions for security, debugging, and family transparency.

### Data Model

```
AuditLog
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── memberId: UUID? (FK → FamilyMember, null for system actions)
├── sessionId: String? (for correlation)
├── action: Enum (see below)
├── entityType: String (e.g., "ChoreInstance", "CreditTransaction")
├── entityId: UUID?
├── previousValue: JSON? (for updates)
├── newValue: JSON? (for creates/updates)
├── metadata: JSON? (additional context)
├── ipAddress: String?
├── userAgent: String?
├── result: Enum (SUCCESS, FAILURE, DENIED)
├── errorMessage: String?
├── createdAt: DateTime
└── expiresAt: DateTime? (for retention policy)
```

### Audited Actions

| Category | Actions |
|----------|---------|
| Authentication | LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_CHANGE, PIN_CHANGE, SESSION_EXPIRED |
| Family Management | MEMBER_ADDED, MEMBER_REMOVED, MEMBER_UPDATED, ROLE_CHANGED |
| Chores | CHORE_COMPLETED, CHORE_APPROVED, CHORE_REJECTED, CHORE_ASSIGNED |
| Credits | CREDITS_AWARDED, CREDITS_DEDUCTED, REWARD_REDEEMED, REWARD_APPROVED |
| Screen Time | SCREENTIME_LOGGED, SCREENTIME_ADJUSTED, GRACE_PERIOD_USED |
| Health | MEDICATION_LOGGED, MEDICATION_OVERRIDE, SICK_MODE_ACTIVATED |
| Documents | DOCUMENT_UPLOADED, DOCUMENT_VIEWED, DOCUMENT_SHARED, DOCUMENT_DELETED |
| Settings | SETTINGS_CHANGED, MODULE_ENABLED, MODULE_DISABLED |
| Security | RATE_LIMIT_HIT, AUTH_DENIED, SUSPICIOUS_ACTIVITY |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/audit/logs | List audit logs (parent only, paginated) |
| GET | /api/audit/logs/:memberId | Logs for specific member |
| GET | /api/audit/logs/entity/:type/:id | Logs for specific entity |
| GET | /api/audit/security | Security-related events only |

### Retention Policy
- Security events: 1 year
- Financial/credit events: 1 year
- General events: 90 days
- Automatic cleanup via scheduled job

### Privacy Considerations
- Audit logs visible only to parents
- Sensitive values (passwords, PINs) never logged
- Personal data redacted in logs after account deletion

---

## 2.6 Error Handling

### Error Display Strategy

**Age-Appropriate Error Messages:**

| Age Group | Error Style | Example |
|-----------|-------------|---------|
| Ages 5-8 | Friendly character + simple text | 🦊 "Oops! Something went wrong. Let's try again!" |
| Ages 9-12 | Helpful explanation | "We couldn't save your chore. Check your internet and try again." |
| Ages 13+ / Parents | Technical but clear | "Unable to complete request. Error: Network timeout. Please retry." |

**Error Categories:**
- **Network errors:** "Can't reach Hearth right now. We'll keep trying!"
- **Validation errors:** "Hmm, that doesn't look right. [specific field message]"
- **Permission errors:** "You'll need a parent to help with this one."
- **Server errors:** "Our helpers are taking a break. Try again in a minute!"

### Error Logging & Monitoring

**Recommended Stack:**
- **Error tracking:** Sentry (self-hosted or cloud)
- **Log aggregation:** Loki + Grafana (self-hosted) or LogRocket
- **Uptime monitoring:** Uptime Kuma (self-hosted) or Better Uptime

**What Gets Logged:**
```
ErrorLog
├── timestamp: DateTime
├── level: Enum (ERROR, WARN, INFO)
├── message: String
├── stack: String?
├── userId: UUID? (anonymized)
├── familyId: UUID? (anonymized)
├── endpoint: String
├── method: String
├── statusCode: Int
├── requestId: String (correlation ID)
├── userAgent: String
├── context: JSON (sanitized, no PII)
└── environment: String
```

**PII Protection in Logs:**
- Never log: passwords, PINs, tokens, full names, emails
- Anonymize: user IDs → hashed IDs for external services
- Redact: request bodies containing sensitive data

### Offline Error Handling

**Queue Strategy:**
- Failed mutations queued in IndexedDB
- Visual indicator: "Pending changes" badge
- Auto-retry when connection restored
- Conflict resolution: Last-write-wins with notification
- Queue expiration: 7 days

**Offline-Capable Actions:**
- Mark chore complete (queued)
- Log screen time (queued)
- Add shopping item (queued)
- View cached data (immediate)

**Not Available Offline:**
- Login/authentication
- File uploads
- Real-time approvals
- Calendar sync

### User-Facing Error Components

```
// Error boundary wrapper
<ErrorBoundary fallback={<FriendlyError />}>
  <App />
</ErrorBoundary>

// Toast notifications for recoverable errors
<Toast type="error" ageGroup={user.ageGroup}>
  {getMessage(error, user.ageGroup)}
</Toast>

// Full-page error for critical failures
<ErrorPage
  code={500}
  character="fox"
  message="Something unexpected happened"
  retry={true}
/>
```

---

## 2.7 Accessibility (a11y)

### Compliance Target
**WCAG 2.1 Level AA** compliance for all interfaces.

### Requirements

**Visual:**
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- No information conveyed by color alone
- Support for high contrast mode
- Respect `prefers-reduced-motion` for animations
- Focus indicators visible on all interactive elements

**Keyboard Navigation:**
- All functionality accessible via keyboard
- Logical tab order
- Skip links for main navigation
- No keyboard traps
- Keyboard shortcuts for common actions (with visual hints)

**Screen Reader Support:**
- Semantic HTML throughout
- ARIA labels for icons and non-text elements
- Live regions for dynamic content updates
- Meaningful link text (not "click here")
- Form labels properly associated

**Age-Specific Considerations:**
- Younger kids (5-8): Large touch targets (min 48x48px), simple navigation
- All ages: Clear visual hierarchy, consistent layout

### Implementation Guidelines

**Component Requirements:**
```typescript
// All interactive components must include:
interface AccessibleProps {
  'aria-label'?: string;
  'aria-describedby'?: string;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (e: KeyboardEvent) => void;
}
```

**Testing Requirements:**
- Automated: axe-core in CI/CD pipeline
- Manual: Screen reader testing (NVDA, VoiceOver)
- Keyboard-only navigation testing
- Color contrast validation

**Focus Management:**
- Modal dialogs trap focus
- Focus returns to trigger after modal closes
- Page navigation announces new content
- Loading states announced to screen readers

---

## 2.8 Module Configuration System

### Purpose
Allow families to enable/disable features and configure module-specific settings.

### Data Model

```
ModuleConfiguration
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── moduleId: Enum (see below)
├── isEnabled: Boolean
├── enabledAt: DateTime?
├── disabledAt: DateTime?
├── settings: JSON (module-specific)
├── createdAt: DateTime
└── updatedAt: DateTime
```

### Available Modules

| Module ID | Name | Dependencies | Default |
|-----------|------|--------------|---------|
| CHORES | Chores & Tasks | None | Enabled |
| SCREEN_TIME | Screen Time Tracking | None | Enabled |
| CREDITS | Credits & Rewards | CHORES (optional) | Enabled |
| SHOPPING | Shopping Lists | None | Enabled |
| CALENDAR | Calendar | None | Enabled |
| TODOS | To-Do List | None | Enabled |
| ROUTINES | Routines & Checklists | None | Disabled |
| MEAL_PLANNING | Meal Planning | SHOPPING (optional) | Disabled |
| RECIPES | Recipe Management | MEAL_PLANNING (optional) | Disabled |
| INVENTORY | Household Inventory | SHOPPING (optional) | Disabled |
| HEALTH | Health & Medications | None | Disabled |
| PROJECTS | Projects | TODOS (optional) | Disabled |
| COMMUNICATION | Family Board | None | Disabled |
| TRANSPORT | Transportation | CALENDAR (optional) | Disabled |
| PETS | Pet Care | None | Disabled |
| MAINTENANCE | Home Maintenance | None | Disabled |
| DOCUMENTS | Document Vault | None | Disabled |

### Module Dependencies

**Hard Dependencies:**
- None currently (all modules work independently)

**Soft Dependencies (enhanced functionality when both enabled):**
- CREDITS + CHORES: Auto-award credits for chore completion
- CREDITS + SCREEN_TIME: Purchase screen time with credits
- MEAL_PLANNING + SHOPPING: Auto-add ingredients to shopping list
- MEAL_PLANNING + CALENDAR: Show meals on calendar
- TRANSPORT + CALENDAR: Link transport to events

### Module Settings Schema

Each module has its own settings shape:

```typescript
// Screen Time Settings
{
  defaultWeeklyMinutes: number;
  resetDay: 'SUNDAY' | 'MONDAY' | ...;
  enableGracePeriod: boolean;
  gracePeriodMinutes: number;
}

// Chores Settings
{
  requirePhotoProof: boolean;
  defaultApprovalRequired: boolean;
  enableStreakBonuses: boolean;
  streakBonusCredits: number;
}

// Credits Settings
{
  creditName: string;
  creditIcon: string;
  screenTimeExchangeRate: number;
  allowNegativeBalance: boolean;
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/modules | List all modules with status |
| GET | /api/modules/:moduleId | Get module configuration |
| PUT | /api/modules/:moduleId/enable | Enable module |
| PUT | /api/modules/:moduleId/disable | Disable module |
| PUT | /api/modules/:moduleId/settings | Update module settings |

### UI Components
- Module management page (Settings → Modules)
- Module toggle switches with dependency warnings
- Module-specific settings panels
- "Coming soon" indicators for planned modules

---

## 2.9 Guest Access

### Purpose
Allow temporary access for babysitters, grandparents, or other caregivers.

### Guest Invitation Flow

1. Parent navigates to Family → Invite Guest
2. Enters guest name and optional email
3. Selects access level (View Only, Limited, or Caregiver)
4. Sets expiration (4 hours, 24 hours, 1 week, custom)
5. System generates unique invite link or 6-digit code
6. Guest clicks link or enters code to access

### Access Levels

| Permission | View Only | Limited | Caregiver |
|------------|-----------|---------|-----------|
| View dashboard | ✓ | ✓ | ✓ |
| View calendar | ✓ | ✓ | ✓ |
| View today's chores | ✓ | ✓ | ✓ |
| Mark chores complete | ✗ | ✓ | ✓ |
| View shopping list | ✗ | ✓ | ✓ |
| Add shopping items | ✗ | ✗ | ✓ |
| Log screen time | ✗ | ✗ | ✓ |
| View health info | ✗ | ✗ | ✓ |
| Log medications | ✗ | ✗ | ✓ |
| Award credits | ✗ | ✗ | ✗ |
| Change settings | ✗ | ✗ | ✗ |

### Data Model

```
GuestInvite
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── invitedById: UUID (FK → FamilyMember)
├── guestName: String
├── guestEmail: String?
├── accessLevel: Enum (VIEW_ONLY, LIMITED, CAREGIVER)
├── inviteCode: String (6-digit, hashed)
├── inviteToken: String (for link-based access)
├── expiresAt: DateTime
├── maxUses: Int (default: 1)
├── useCount: Int
├── status: Enum (PENDING, ACTIVE, EXPIRED, REVOKED)
├── lastAccessedAt: DateTime?
├── createdAt: DateTime
└── revokedAt: DateTime?

GuestSession
├── id: UUID (PK)
├── guestInviteId: UUID (FK → GuestInvite)
├── sessionToken: String
├── ipAddress: String
├── userAgent: String
├── startedAt: DateTime
├── expiresAt: DateTime
└── endedAt: DateTime?
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/guests/invite | Create guest invitation |
| GET | /api/guests | List active guest invites |
| DELETE | /api/guests/:id | Revoke guest access |
| POST | /api/guests/access | Guest accesses via code/link |
| GET | /api/guests/session | Get guest session info |

### Security Considerations
- Guest sessions are device-bound
- No access to historical data (today only)
- Actions logged to audit trail with guest identifier
- Automatic cleanup of expired invites
- Parent notification when guest accesses (optional)

---

## 3. Core Modules (MVP ⭐)

### 3.1 Family & Roles (⭐ MVP)
**Purpose:** Define who exists in the system and what they can do.

**Features:**
- Family account creation and management
- Family members (parents, children, guests)
- Roles and permissions (see section 2.2)
- Age-based feature gating
- Parent approval workflows for child requests
- Family settings (timezone, currency, week start day)
- Member profiles with avatars (important for younger kids)

**Data Model:**
```
Family
├── id: UUID (PK)
├── name: String
├── timezone: String
├── createdAt: DateTime
└── settings: JSON

FamilyMember
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── email: String? (nullable for children)
├── passwordHash: String? (for parents)
├── pin: String? (hashed, for children)
├── role: Enum (PARENT, CHILD, GUEST)
├── birthDate: Date
├── avatarUrl: String?
├── isActive: Boolean
├── createdAt: DateTime
└── lastLoginAt: DateTime?
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/families | Create new family |
| GET | /api/families/:id | Get family details |
| PUT | /api/families/:id | Update family settings |
| POST | /api/families/:id/members | Add family member |
| PUT | /api/members/:id | Update member |
| DELETE | /api/members/:id | Deactivate member |
| POST | /api/auth/parent-login | Parent login |
| POST | /api/auth/child-login | Child PIN login |
| POST | /api/auth/kiosk | Enter kiosk mode |

**UI Components:**
- Family setup wizard (onboarding)
- Member management screen
- Avatar picker (kid-friendly icons)
- PIN setup/reset interface
- Kiosk mode toggle

---

### 3.2 Chores (⭐ MVP)
**Purpose:** Distribute household responsibilities fairly.

**Features:**
- Chore library (reusable definitions)
- Chore definitions (name, frequency, difficulty, estimated time, instructions)
- Assignment rules:
  - Fixed (always same person)
  - Rotating (round-robin among eligible members)
  - Age-based eligibility (minimum age requirement)
  - Opt-in (available for anyone to claim)
- Completion tracking with timestamps
- Parent approval (configurable per chore)
- Photo proof option (for verification)
- History & streaks
- Chore difficulty ratings (easy/medium/hard) affecting credit rewards

**Data Model:**
```
ChoreDefinition
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── description: String?
├── instructions: String?
├── estimatedMinutes: Int
├── difficulty: Enum (EASY, MEDIUM, HARD)
├── creditValue: Int
├── minimumAge: Int?
├── iconName: String
├── isActive: Boolean
└── createdAt: DateTime

ChoreSchedule
├── id: UUID (PK)
├── choreDefinitionId: UUID (FK → ChoreDefinition)
├── assignmentType: Enum (FIXED, ROTATING, OPT_IN)
├── frequency: Enum (DAILY, WEEKLY, BIWEEKLY, MONTHLY, CUSTOM)
├── customCron: String? (for custom schedules)
├── dayOfWeek: Int? (0-6, for weekly)
├── requiresApproval: Boolean
├── requiresPhoto: Boolean
├── isActive: Boolean
├── createdAt: DateTime
└── updatedAt: DateTime

ChoreAssignment
├── id: UUID (PK)
├── choreScheduleId: UUID (FK → ChoreSchedule)
├── memberId: UUID (FK → FamilyMember)
├── rotationOrder: Int? (for rotating chores)
├── isActive: Boolean
├── createdAt: DateTime
└── updatedAt: DateTime

ChoreInstance
├── id: UUID (PK)
├── choreScheduleId: UUID (FK → ChoreSchedule)
├── assignedToId: UUID (FK → FamilyMember)
├── dueDate: Date
├── status: Enum (PENDING, COMPLETED, APPROVED, REJECTED, SKIPPED)
├── completedAt: DateTime?
├── completedById: UUID? (FK → FamilyMember)
├── approvedById: UUID? (FK → FamilyMember)
├── approvedAt: DateTime?
├── photoUrl: String?
├── notes: String?
└── creditsAwarded: Int?
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/chores/definitions | List chore definitions |
| POST | /api/chores/definitions | Create chore definition |
| GET | /api/chores/schedules | List active schedules |
| POST | /api/chores/schedules | Create schedule |
| GET | /api/chores/instances | List chore instances (filterable) |
| POST | /api/chores/instances/:id/complete | Mark chore complete |
| POST | /api/chores/instances/:id/approve | Approve completion |
| POST | /api/chores/instances/:id/reject | Reject completion |
| GET | /api/chores/stats/:memberId | Get member chore statistics |

**UI Components:**
- Chore dashboard (today's chores per person)
- Chore library management
- Chore card (with big "Done" button for kids)
- Approval queue for parents
- Streak display and celebration animations
- Weekly chore calendar view

**Age-Appropriate UI:**
- Ages 5-8: Large buttons, icons, minimal text, celebration sounds
- Ages 9-12: Standard interface with gamification elements
- Ages 13+: Full interface with statistics

---

### 3.3 Screen Time (⭐ MVP)
**Purpose:** Fair, transparent screen usage management (trust-based ledger).

**Features:**
- Per-child screen time bank (balance in minutes)
- Configurable weekly allocation
- Weekly reset rules (full reset, rollover with cap, no rollover)
- Earn model (linked to chores, bonus awards)
- Spend model (self-reported usage logging)
- Manual parent adjustments (add/subtract with reason)
- Device type categorization (TV, tablet, phone, computer, gaming)
- Time-of-day restrictions (display only, not enforced)
- Sick-day/special occasion overrides
- **Grace Period / "Finish the Round"** feature (see below)

**Earning Model Clarification:**
Screen time can be earned in **addition to** the weekly allocation. Parents can configure:
1. **Allocation Only:** Child receives fixed weekly amount, no earning
2. **Allocation + Bonus Earning:** Base allocation + extra time earned from chores/credits
3. **Earn Only:** No automatic allocation; all screen time must be earned
4. **Hybrid:** Lower base allocation with opportunities to earn more

This is configurable per child in the module settings.

**Grace Period ("Finish the Round"):**
A child-friendly feature that prevents frustration when screen time runs out mid-activity.

*How it works:*
- When balance reaches zero (or low threshold), system shows warning
- Child can request a "Finish the Round" grace period
- Configurable grace amount per request (e.g., 10-15 minutes)
- Grace time is logged as "borrowed" and can either:
  - Be deducted from next week's allocation (default)
  - Accrue as "owed" time to be earned back via chores
  - Be forgiven (parent setting)
- Limited grace requests per day/week (parent configurable)
- Grace period auto-logs when activated

*Grace Period Settings:*
```
ScreenTimeGraceSettings
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── gracePeriodMinutes: Int (default: 15)
├── maxGracePerDay: Int (default: 1)
├── maxGracePerWeek: Int (default: 3)
├── graceRepaymentMode: Enum (DEDUCT_NEXT_WEEK, EARN_BACK, FORGIVE)
├── lowBalanceWarningMinutes: Int (default: 10)
├── requiresApproval: Boolean (default: false for older kids)
└── updatedAt: DateTime

GracePeriodLog
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── requestedAt: DateTime
├── minutesGranted: Int
├── reason: String? (e.g., "middle of movie")
├── approvedById: UUID? (FK → FamilyMember)
├── repaymentStatus: Enum (PENDING, DEDUCTED, EARNED_BACK, FORGIVEN)
├── repaidAt: DateTime?
└── relatedTransactionId: UUID? (FK → ScreenTimeTransaction)
```

*UI Components:*
- "Finish the Round" button (appears at low balance warning)
- Grace period countdown overlay
- "Borrowed time" indicator on balance display
- Weekly grace usage summary for parents
- Repayment status tracker

**Data Model:**
```
ScreenTimeSettings
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── weeklyAllocationMinutes: Int
├── resetDay: Enum (SUNDAY, MONDAY, etc.)
├── rolloverType: Enum (NONE, FULL, CAPPED)
├── rolloverCapMinutes: Int?
├── isActive: Boolean
└── updatedAt: DateTime

ScreenTimeBalance
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── currentBalanceMinutes: Int
├── weekStartDate: Date
└── updatedAt: DateTime

ScreenTimeTransaction
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── type: Enum (ALLOCATION, EARNED, SPENT, ADJUSTMENT, ROLLOVER)
├── amountMinutes: Int (positive or negative)
├── balanceAfter: Int
├── deviceType: Enum? (TV, TABLET, PHONE, COMPUTER, GAMING, OTHER)
├── reason: String?
├── relatedChoreInstanceId: UUID? (FK → ChoreInstance)
├── createdById: UUID (FK → FamilyMember)
├── createdAt: DateTime
└── notes: String?

ScreenTimeRestriction (display only)
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── deviceType: Enum
├── allowedStartTime: Time
├── allowedEndTime: Time
├── daysOfWeek: Int[] (bitmask or array)
└── isActive: Boolean
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/screentime/:memberId/balance | Get current balance |
| GET | /api/screentime/:memberId/transactions | Get transaction history |
| POST | /api/screentime/:memberId/log | Log screen time usage |
| POST | /api/screentime/:memberId/adjust | Parent adjustment |
| PUT | /api/screentime/:memberId/settings | Update settings |
| GET | /api/screentime/:memberId/stats | Usage statistics |

**UI Components:**
- Screen time balance display (visual meter for kids)
- Quick-log buttons (15min, 30min, 1hr increments)
- Device type selector with icons
- Transaction history (ledger view)
- Parent adjustment modal with reason
- Weekly summary chart
- Low balance warning indicators

---

### 3.4 To-Do List (⭐ MVP)
**Purpose:** Capture non-routine household tasks.

**Features:**
- Family-wide and personal to-dos
- Assignments (single person or shared)
- Due dates & reminders
- Recurring tasks
- Tags/categories and priorities
- Quick-add from anywhere in app
- Completion with optional notes

**Data Model:**
```
TodoItem
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── title: String
├── description: String?
├── createdById: UUID (FK → FamilyMember)
├── assignedToId: UUID? (FK → FamilyMember, null = family-wide)
├── dueDate: DateTime?
├── priority: Enum (LOW, MEDIUM, HIGH, URGENT)
├── category: String?
├── isRecurring: Boolean
├── recurrenceRule: String? (RRULE format)
├── status: Enum (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
├── completedAt: DateTime?
├── completedById: UUID?
├── createdAt: DateTime
└── updatedAt: DateTime

TodoReminder
├── id: UUID (PK)
├── todoItemId: UUID (FK → TodoItem)
├── remindAt: DateTime
├── sent: Boolean
└── sentAt: DateTime?
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/todos | List todos (filterable) |
| POST | /api/todos | Create todo |
| PUT | /api/todos/:id | Update todo |
| DELETE | /api/todos/:id | Delete todo |
| POST | /api/todos/:id/complete | Mark complete |
| GET | /api/todos/my | Get current user's todos |

**UI Components:**
- Todo list view (sortable, filterable)
- Quick-add input
- Todo detail/edit modal
- Due date picker with smart suggestions
- Category/tag management
- Family vs personal toggle

**Integrations:**
- Calendar (todos with due dates appear on calendar)
- Projects (link todos to projects)

---

### 3.5 Shopping List (⭐ MVP)
**Purpose:** Prevent duplicate buying and forgotten items.

**Features:**
- Multiple shared lists (Groceries, Hardware Store, etc.)
- Categories & store associations
- Quantities and units
- Priority/urgency flags
- Recently purchased history (for quick re-add)
- "Picked up" vs "Purchased" status
- Price tracking (optional)
- Child request workflow (younger kids can request items for parent approval)

**Data Model:**
```
ShoppingList
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── store: String?
├── isDefault: Boolean
├── sortOrder: Int
└── createdAt: DateTime

ShoppingItem
├── id: UUID (PK)
├── listId: UUID (FK → ShoppingList)
├── name: String
├── quantity: Decimal?
├── unit: String?
├── category: String?
├── priority: Enum (NORMAL, NEEDED_SOON, URGENT)
├── status: Enum (PENDING, IN_CART, PURCHASED, REMOVED)
├── requestedById: UUID (FK → FamilyMember)
├── isApproved: Boolean (for child requests)
├── approvedById: UUID?
├── estimatedPrice: Decimal?
├── actualPrice: Decimal?
├── notes: String?
├── createdAt: DateTime
└── purchasedAt: DateTime?

PurchaseHistory
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── itemName: String
├── lastPurchasedAt: DateTime
├── averagePrice: Decimal?
├── purchaseCount: Int
└── typicalStore: String?
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/shopping/lists | Get all lists |
| POST | /api/shopping/lists | Create list |
| GET | /api/shopping/lists/:id/items | Get items in list |
| POST | /api/shopping/lists/:id/items | Add item |
| PUT | /api/shopping/items/:id | Update item |
| POST | /api/shopping/items/:id/purchase | Mark purchased |
| DELETE | /api/shopping/items/:id | Remove item |
| GET | /api/shopping/history | Purchase history for quick-add |
| POST | /api/shopping/items/:id/approve | Approve child request |

**UI Components:**
- List selector tabs
- Item list with swipe actions (mobile)
- Quick-add with autocomplete from history
- Category grouping view
- "Shopping mode" (simplified checkout view)
- Child request badge for parents
- Price summary (optional)

---

### 3.6 Calendar Integration (⭐ MVP)
**Purpose:** Act as the backbone for time-based planning.

**Features:**
- Two-way sync with Google Calendar (MVP priority)
- Internal events (not synced externally)
- Color-coded by family member
- Event categories (school, sports, medical, travel, social, other)
- Conflict detection and warnings
- Event visibility controls (who can see what)
- Recurring event support
- All-day vs timed events
- Location and notes

**Future:** Apple Calendar and Outlook sync

**Data Model:**
```
CalendarConnection
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── memberId: UUID (FK → FamilyMember)
├── provider: Enum (GOOGLE, APPLE, OUTLOOK, INTERNAL)
├── externalCalendarId: String?
├── accessToken: String (encrypted)
├── refreshToken: String (encrypted)
├── syncEnabled: Boolean
├── lastSyncAt: DateTime?
└── createdAt: DateTime

CalendarEvent
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── externalId: String? (for synced events)
├── connectionId: UUID? (FK → CalendarConnection)
├── title: String
├── description: String?
├── location: String?
├── startTime: DateTime
├── endTime: DateTime
├── isAllDay: Boolean
├── category: Enum (SCHOOL, SPORTS, MEDICAL, TRAVEL, SOCIAL, WORK, OTHER)
├── color: String?
├── recurrenceRule: String? (RRULE)
├── createdById: UUID (FK → FamilyMember)
├── visibility: Enum (FAMILY, PARENTS_ONLY, PERSONAL)
├── syncStatus: Enum (LOCAL_ONLY, SYNCED, PENDING_SYNC, CONFLICT)
└── updatedAt: DateTime

EventAttendee
├── id: UUID (PK)
├── eventId: UUID (FK → CalendarEvent)
├── memberId: UUID (FK → FamilyMember)
├── status: Enum (ATTENDING, MAYBE, NOT_ATTENDING, PENDING)
└── updatedAt: DateTime
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/calendar/events | Get events (date range) |
| POST | /api/calendar/events | Create event |
| PUT | /api/calendar/events/:id | Update event |
| DELETE | /api/calendar/events/:id | Delete event |
| POST | /api/calendar/connections | Add calendar connection |
| POST | /api/calendar/sync | Trigger manual sync |
| GET | /api/calendar/conflicts | Get scheduling conflicts |

**UI Components:**
- Month/week/day calendar views
- Event creation/edit modal
- Member filter toggles
- Category filter
- Conflict warning indicators
- Google Calendar OAuth flow
- Sync status indicator

**Busy Day Detection (Advanced):**
- Score each day based on event count/duration
- Surface "busy day" indicator on dashboard
- Integration point for suggesting easy meals, reduced chores

---

## 4. Planning & Organization Modules

### 4.1 Meal Planning
**Purpose:** Reduce decision fatigue and food waste.

**Features:**
- Weekly meal planner
- Drag-and-drop meals
- Dietary & allergy tags
- Leftovers tracking (see detailed section below)
- Busy day meal suggestions (integrates with calendar)
- Meal type categorization (breakfast, lunch, dinner, snack)
- Family favorites marking

**Integrations:**
- Recipes (auto-link ingredients)
- Shopping list (auto-add missing ingredients)
- Calendar (show meals on day view)
- Sick Mode (suggest comfort foods when active)

**Leftover Tracking:**
Track cooked food that needs to be used before it spoils.

*Features:*
- Log leftovers after meals ("We have leftover chicken")
- Expiration countdown (configurable default: 3 days)
- "Use by" reminders via push notification
- Visual indicators (green → yellow → red as expiration approaches)
- Leftover meal suggestions ("Use your chicken in: Chicken salad, Chicken tacos")
- Quick "Used it" or "Tossed it" logging
- Food waste analytics (optional)

*Data Model:*
```
MealPlan
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── date: Date
├── mealType: Enum (BREAKFAST, LUNCH, DINNER, SNACK)
├── title: String
├── recipeId: UUID? (FK → Recipe)
├── notes: String?
├── servings: Int?
├── prepTimeMinutes: Int?
├── tags: String[] (quick, comfort, healthy, etc.)
├── createdById: UUID (FK → FamilyMember)
├── createdAt: DateTime
└── updatedAt: DateTime

Leftover
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── description: String?
├── sourceMealPlanId: UUID? (FK → MealPlan)
├── quantity: String? (e.g., "2 servings", "half pot")
├── storedAt: DateTime
├── expiresAt: DateTime
├── usedAt: DateTime?
├── disposedAt: DateTime?
├── status: Enum (AVAILABLE, USED, DISPOSED, EXPIRED)
├── storageLocation: Enum (FRIDGE, FREEZER, COUNTER)
├── reminderSent: Boolean
├── notes: String?
├── createdById: UUID (FK → FamilyMember)
└── createdAt: DateTime

LeftoverSuggestion (pre-populated suggestions)
├── id: UUID (PK)
├── ingredientKeywords: String[] (e.g., ["chicken", "poultry"])
├── suggestedMeals: String[]
├── isSystemDefault: Boolean
└── familyId: UUID? (FK → Family, null for system defaults)
```

*API Endpoints:*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/meals/plan | Get meal plan (date range) |
| POST | /api/meals/plan | Add meal to plan |
| PUT | /api/meals/plan/:id | Update meal |
| DELETE | /api/meals/plan/:id | Remove meal |
| GET | /api/leftovers | Get active leftovers |
| POST | /api/leftovers | Log leftover |
| PUT | /api/leftovers/:id | Update leftover |
| POST | /api/leftovers/:id/use | Mark as used |
| POST | /api/leftovers/:id/dispose | Mark as disposed |
| GET | /api/leftovers/:id/suggestions | Get meal suggestions |
| GET | /api/leftovers/expiring | Get expiring soon items |

*UI Components:*
- Weekly meal planner grid (drag-and-drop)
- "Log Leftover" quick action after dinner
- Leftover inventory card on dashboard
- Expiration countdown badges
- "What to make with leftovers" suggestion modal
- Food waste summary (monthly stats)
- Push notification: "Your leftover chicken expires tomorrow"

---

### 4.2 Recipe Management
**Purpose:** Centralize family cooking knowledge.

**Features:**
- Manual recipe entry
- Web import (URL scraping with recipe schema detection)
- Ingredients with quantities and units
- Prep/cook times
- Serving size with auto-scaling
- Family ratings and notes
- Photo attachments
- Dietary tags (vegetarian, gluten-free, dairy-free, etc.)
- Difficulty ratings
- Favorite marking
- Recipe categories (breakfast, lunch, dinner, dessert, snack)

**Advanced:**
- Auto-scaling ingredients by serving count
- Ingredient substitution suggestions
- Nutrition estimation (future)
- Recipe sharing (export/import)

**Data Model:**
```
Recipe
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── description: String?
├── sourceUrl: String? (for imported recipes)
├── imageUrl: String?
├── prepTimeMinutes: Int?
├── cookTimeMinutes: Int?
├── totalTimeMinutes: Int? (computed or override)
├── servings: Int
├── difficulty: Enum (EASY, MEDIUM, HARD)
├── category: Enum (BREAKFAST, LUNCH, DINNER, DESSERT, SNACK, APPETIZER, SIDE, BEVERAGE)
├── cuisine: String?
├── dietaryTags: String[] (vegetarian, vegan, gluten-free, etc.)
├── instructions: String (markdown supported)
├── notes: String?
├── isFavorite: Boolean
├── averageRating: Decimal?
├── ratingCount: Int
├── createdById: UUID (FK → FamilyMember)
├── createdAt: DateTime
└── updatedAt: DateTime

RecipeIngredient
├── id: UUID (PK)
├── recipeId: UUID (FK → Recipe)
├── name: String
├── quantity: Decimal?
├── unit: String? (cups, tbsp, oz, etc.)
├── preparation: String? (diced, minced, etc.)
├── isOptional: Boolean
├── sortOrder: Int
├── inventoryItemId: UUID? (FK → InventoryItem, for stock checking)
└── shoppingItemName: String? (override for shopping list)

RecipeRating
├── id: UUID (PK)
├── recipeId: UUID (FK → Recipe)
├── memberId: UUID (FK → FamilyMember)
├── rating: Int (1-5)
├── comment: String?
├── madeOn: Date?
├── createdAt: DateTime
└── updatedAt: DateTime
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/recipes | List recipes (filterable) |
| POST | /api/recipes | Create recipe |
| POST | /api/recipes/import | Import from URL |
| GET | /api/recipes/:id | Get recipe details |
| PUT | /api/recipes/:id | Update recipe |
| DELETE | /api/recipes/:id | Delete recipe |
| POST | /api/recipes/:id/rate | Rate recipe |
| GET | /api/recipes/:id/scaled/:servings | Get scaled ingredients |
| POST | /api/recipes/:id/to-shopping | Add ingredients to shopping list |

**UI Components:**
- Recipe list with filters and search
- Recipe detail view with ingredient scaling slider
- Recipe editor with ingredient builder
- URL import modal
- Rating stars component
- "Add to meal plan" action
- "Add ingredients to shopping" action
- Recipe card for meal planning drag-and-drop

---

## 5. Resource Management Modules

### 5.1 Household Inventory
**Purpose:** Track commonly used household items to prevent running out.

**Features:**
- Pantry and household staples tracking
- Quantity tracking with units
- Low-stock thresholds with alerts
- Auto-add to shopping list when low
- Barcode scanning (future)
- Expiration date tracking
- Location categorization (pantry, fridge, freezer, bathroom, garage)
- Consumption rate estimation
- Bulk purchase tracking

**Data Model:**
```
InventoryItem
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── category: Enum (PANTRY, FRIDGE, FREEZER, BATHROOM, CLEANING, GARAGE, OTHER)
├── subcategory: String?
├── currentQuantity: Decimal
├── unit: String (count, oz, lbs, liters, etc.)
├── minimumQuantity: Decimal (low-stock threshold)
├── reorderQuantity: Decimal? (amount to add to shopping list)
├── preferredBrand: String?
├── barcode: String?
├── expirationDate: Date?
├── location: String? (specific shelf/bin)
├── notes: String?
├── autoAddToShopping: Boolean
├── linkedShoppingListId: UUID? (FK → ShoppingList)
├── isActive: Boolean
├── createdAt: DateTime
└── updatedAt: DateTime

InventoryTransaction
├── id: UUID (PK)
├── inventoryItemId: UUID (FK → InventoryItem)
├── type: Enum (ADDED, USED, ADJUSTED, EXPIRED, TRASHED)
├── quantityChange: Decimal (positive for add, negative for use)
├── quantityAfter: Decimal
├── reason: String?
├── recordedById: UUID (FK → FamilyMember)
├── createdAt: DateTime
└── notes: String?

InventoryAlert
├── id: UUID (PK)
├── inventoryItemId: UUID (FK → InventoryItem)
├── alertType: Enum (LOW_STOCK, EXPIRING_SOON, EXPIRED)
├── triggeredAt: DateTime
├── acknowledgedAt: DateTime?
├── acknowledgedById: UUID?
├── autoActionTaken: Boolean (true if auto-added to shopping)
└── shoppingItemId: UUID? (FK → ShoppingItem, if auto-added)
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/inventory | List inventory items |
| POST | /api/inventory | Add inventory item |
| PUT | /api/inventory/:id | Update item |
| DELETE | /api/inventory/:id | Remove item |
| POST | /api/inventory/:id/use | Log usage |
| POST | /api/inventory/:id/restock | Log restock |
| GET | /api/inventory/low-stock | Get low-stock items |
| GET | /api/inventory/expiring | Get expiring items |
| POST | /api/inventory/:id/to-shopping | Add to shopping list |

**UI Components:**
- Inventory list with category filters
- Item card with quick quantity adjustment
- Low-stock dashboard widget
- Expiring soon alerts
- Barcode scanner integration (future)
- Bulk restock mode (after shopping trip)
- Usage trend charts

**Integration with Shopping:**
- When item drops below minimum, auto-create shopping item
- When shopping item is purchased, auto-restock inventory
- Suggested reorder quantities based on history

---

## 6. Health & Wellbeing Modules

### 6.1 Child Sickness Manager
**Purpose:** Safely track illness, symptoms, and medications.

**Features:**
- Per-child health event logs
- Symptom timeline with severity tracking
- Temperature logging with trend visualization
- Medication tracking (see Section 6.3 for detailed interlock)
- Doctor visit scheduling and notes
- Allergy and medical condition tracking
- Weight tracking for dosage calculations
- Photo documentation (rashes, symptoms)
- Shareable health summary for doctors

**Advanced:**
- Doctor-visit export (PDF with symptom timeline)
- Weight-based dosage calculator
- Sick-day automation (see Sick Mode below)
- Symptom pattern recognition (future)

**Data Model:**
```
HealthEvent
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── familyId: UUID (FK → Family)
├── eventType: Enum (ILLNESS, INJURY, CHECKUP, VACCINATION, ALLERGY_REACTION, OTHER)
├── title: String
├── description: String?
├── startDate: DateTime
├── endDate: DateTime?
├── severity: Enum (MILD, MODERATE, SEVERE)
├── status: Enum (ACTIVE, RECOVERING, RESOLVED)
├── doctorVisitDate: DateTime?
├── doctorNotes: String?
├── photoUrls: String[]
├── relatedSickModeId: UUID? (FK → SickModeInstance)
├── createdById: UUID (FK → FamilyMember)
├── createdAt: DateTime
└── updatedAt: DateTime

SymptomLog
├── id: UUID (PK)
├── healthEventId: UUID (FK → HealthEvent)
├── symptom: Enum (FEVER, COUGH, RUNNY_NOSE, SORE_THROAT, HEADACHE, STOMACH_ACHE, VOMITING, DIARRHEA, RASH, FATIGUE, CONGESTION, EAR_PAIN, OTHER)
├── customSymptom: String? (if OTHER)
├── severity: Enum (MILD, MODERATE, SEVERE)
├── notes: String?
├── loggedAt: DateTime
├── loggedById: UUID (FK → FamilyMember)
└── createdAt: DateTime

TemperatureLog
├── id: UUID (PK)
├── healthEventId: UUID? (FK → HealthEvent)
├── memberId: UUID (FK → FamilyMember)
├── temperature: Decimal
├── unit: Enum (FAHRENHEIT, CELSIUS)
├── measurementMethod: Enum (ORAL, EAR, FOREHEAD, UNDERARM, RECTAL)
├── loggedAt: DateTime
├── loggedById: UUID (FK → FamilyMember)
├── notes: String?
└── createdAt: DateTime

MedicalProfile
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── bloodType: String?
├── knownAllergies: String[]
├── chronicConditions: String[]
├── currentWeight: Decimal?
├── weightUnit: Enum (LB, KG)
├── weightUpdatedAt: DateTime?
├── primaryDoctorName: String?
├── primaryDoctorPhone: String?
├── insuranceInfo: String?
├── emergencyNotes: String?
├── createdAt: DateTime
└── updatedAt: DateTime

WeightLog
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── weight: Decimal
├── unit: Enum (LB, KG)
├── loggedAt: DateTime
├── loggedById: UUID (FK → FamilyMember)
└── notes: String?
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health/:memberId/events | List health events |
| POST | /api/health/events | Create health event |
| PUT | /api/health/events/:id | Update event |
| POST | /api/health/events/:id/symptoms | Log symptom |
| POST | /api/health/events/:id/temperature | Log temperature |
| GET | /api/health/:memberId/profile | Get medical profile |
| PUT | /api/health/:memberId/profile | Update medical profile |
| POST | /api/health/:memberId/weight | Log weight |
| GET | /api/health/:memberId/export | Export health summary (PDF) |
| GET | /api/health/:memberId/temperatures | Temperature history |

**UI Components:**
- Health event timeline
- Symptom logger with quick-select icons
- Temperature chart with fever threshold indicator
- Medical profile editor
- Doctor visit notes
- Health summary export button
- Active illness dashboard card
- Weight tracking chart

### 6.2 Sick Mode (Global Family State)
**Purpose:** When a family member is sick, automatically adjust household expectations and routines.

**Features:**
- One-click activation per family member
- Severity levels (MILD, MODERATE, SEVERE)
- Duration estimate (optional)
- Auto-adjustments when activated:
  - **Chores:** Suspends assigned chores, redistributes to others, or marks as skippable
  - **Screen Time:** Temporarily increases allowance or removes limits
  - **Routines:** Switches to "sick day" simplified routines
  - **Meal Planning:** Surfaces comfort food / easy meal suggestions
  - **Notifications:** Reduces non-essential reminders
- Recovery tracking and gradual return to normal
- Notification to other family members (configurable)

**Data Model:**
```
SickModeInstance
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── familyId: UUID (FK → Family)
├── severity: Enum (MILD, MODERATE, SEVERE)
├── symptoms: String[]
├── startedAt: DateTime
├── expectedEndDate: Date?
├── actualEndedAt: DateTime?
├── status: Enum (ACTIVE, RECOVERING, ENDED)
├── adjustments: JSON (snapshot of what was adjusted)
├── notes: String?
├── createdById: UUID (FK → FamilyMember)
└── updatedAt: DateTime

SickModeSettings
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── autoSuspendChores: Boolean (default: true)
├── choreRedistributionStrategy: Enum (SKIP, REDISTRIBUTE, PARENT_TAKES)
├── screenTimeMultiplier: Decimal (e.g., 1.5 = 50% more)
├── suppressRoutineReminders: Boolean
├── notifyFamily: Boolean
└── updatedAt: DateTime
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/health/sick-mode/activate | Activate sick mode for member |
| PUT | /api/health/sick-mode/:id | Update sick mode (severity, notes) |
| POST | /api/health/sick-mode/:id/end | End sick mode |
| GET | /api/health/sick-mode/active | Get active sick modes |
| GET | /api/health/sick-mode/settings | Get family settings |
| PUT | /api/health/sick-mode/settings | Update settings |

**UI Components:**
- Sick mode activation button (prominent on child profile)
- Severity selector with visual indicators
- Active sick mode banner on dashboard
- Affected adjustments summary
- Recovery timeline view
- Quick "feeling better" end button

**Cross-Module Integration:**
- Rules Engine trigger: `SICK_MODE_ACTIVATED`, `SICK_MODE_ENDED`
- Dashboard shows sick mode status prominently
- Chore module checks sick mode before assigning
- Calendar events show warning if sick member is attendee

### 6.3 Medication Safety Interlock with Countdown Timer
**Purpose:** Prevent accidental double-dosing of medications with enforced cooldown periods.

**Features:**
- Configurable minimum interval between doses
- Visual countdown timer showing "next dose available at"
- Hard lock preventing logging before cooldown expires
- Parent override capability (with confirmation and reason)
- Distinct timers per medication per child
- Push notification when dose becomes available
- Warning if approaching daily maximum doses

**Data Model:**
```
MedicationDefinition
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── dosageInstructions: String
├── minHoursBetweenDoses: Decimal (e.g., 4.0, 6.0, 8.0)
├── maxDosesPerDay: Int?
├── activeIngredient: String? (for cross-medication warnings)
├── warnings: String?
├── isOTC: Boolean (over-the-counter)
├── requiresParentLogging: Boolean
├── createdAt: DateTime
└── isActive: Boolean

MedicationAssignment
├── id: UUID (PK)
├── medicationDefinitionId: UUID (FK → MedicationDefinition)
├── memberId: UUID (FK → FamilyMember)
├── customDosage: String?
├── customMinHours: Decimal?
├── startDate: Date
├── endDate: Date?
├── notes: String?
├── isActive: Boolean
└── createdAt: DateTime

MedicationDoseLog
├── id: UUID (PK)
├── medicationAssignmentId: UUID (FK → MedicationAssignment)
├── givenAt: DateTime
├── dosageGiven: String
├── givenById: UUID (FK → FamilyMember)
├── nextAllowedAt: DateTime (calculated)
├── wasOverride: Boolean
├── overrideReason: String?
├── symptoms: String?
├── effectiveness: Enum? (HELPED, NO_CHANGE, MADE_WORSE)
└── notes: String?

MedicationLock
├── id: UUID (PK)
├── medicationAssignmentId: UUID (FK → MedicationAssignment)
├── lockedUntil: DateTime
├── lastDoseLogId: UUID (FK → MedicationDoseLog)
├── notificationScheduledAt: DateTime?
└── notificationSentAt: DateTime?
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/medications | List medication definitions |
| POST | /api/medications | Create medication definition |
| GET | /api/medications/:memberId/active | Active medications for member |
| POST | /api/medications/:assignmentId/dose | Log a dose (checks lock) |
| POST | /api/medications/:assignmentId/dose/override | Log with override (parent only) |
| GET | /api/medications/:assignmentId/lock-status | Get lock status and countdown |
| GET | /api/medications/:memberId/history | Dose history |

**UI Components:**
- Medication card with prominent countdown timer
- Visual lock indicator (red lock icon when locked)
- "Log Dose" button (disabled with countdown when locked)
- Countdown display formats:
  - "> 1 hour: "Next dose in 3h 45m"
  - "< 1 hour: "Next dose in 42 minutes"
  - "< 10 min: Countdown seconds with animation
- Override flow (parent only):
  - Warning modal explaining risks
  - Require reason selection (early symptom return, doctor instruction, etc.)
  - Confirmation step
- Daily dose counter (3/4 doses today)
- Notification preference toggle per medication

**Safety Features:**
- Cross-medication warnings (same active ingredient)
- Daily maximum tracking with hard stop option
- Dose history visible at a glance
- Export for doctor visits

---

## 7. Incentives & Economy

### 7.1 Credits / Allowance System
**Purpose:** Unified reward and consequence engine that ties together chores, screen time, and rewards.

**Features:**
- Virtual credit balance per child
- Multiple earning methods:
  - Chore completion (automatic on approval)
  - Bonus awards (parent discretionary)
  - Streak bonuses (via rules engine)
  - Special occasions (birthday, holidays)
- Spending/redemption options:
  - Screen time purchase (X credits = Y minutes)
  - Physical rewards catalog (toys, outings, privileges)
  - Savings goals (save up for bigger rewards)
- Ledger-style transaction history (full audit trail)
- Balance adjustments with required reason
- Configurable exchange rates (credits to screen time)
- Negative balance prevention (optional overdraft allowance)
- Weekly/monthly credit statements
- Parent-controlled reward catalog

**Credit Economy Settings:**
- Starting balance for new members
- Maximum balance cap (optional)
- Credit-to-screen-time exchange rate (e.g., 10 credits = 15 minutes)
- Minimum balance threshold (can go negative or not)
- Auto-allowance rules (weekly credit deposit)

**Data Model:**
```
CreditSettings
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── creditName: String (default: "Credits", customizable: "Stars", "Points", etc.)
├── creditIcon: String (emoji or icon name)
├── screenTimeExchangeRate: Int (credits per 15 min)
├── allowNegativeBalance: Boolean
├── maxBalance: Int?
├── weeklyAllowanceEnabled: Boolean
├── weeklyAllowanceAmount: Int?
├── weeklyAllowanceDay: Enum (SUNDAY, MONDAY, etc.)
└── updatedAt: DateTime

CreditBalance
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── currentBalance: Int
├── lifetimeEarned: Int
├── lifetimeSpent: Int
├── lastTransactionAt: DateTime?
└── updatedAt: DateTime

CreditTransaction
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── type: Enum (EARNED, SPENT, ADJUSTMENT, ALLOWANCE, BONUS, PENALTY)
├── amount: Int (positive for earn, negative for spend)
├── balanceAfter: Int
├── category: Enum (CHORE, SCREEN_TIME, REWARD, SAVINGS, ADJUSTMENT, ALLOWANCE, BONUS, OTHER)
├── description: String
├── createdById: UUID (FK → FamilyMember)
├── relatedChoreInstanceId: UUID? (FK → ChoreInstance)
├── relatedRewardId: UUID? (FK → Reward)
├── relatedScreenTimeTransactionId: UUID? (FK → ScreenTimeTransaction)
├── createdAt: DateTime
└── notes: String?

Reward
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── description: String?
├── creditCost: Int
├── category: Enum (PRIVILEGE, PHYSICAL, EXPERIENCE, SCREEN_TIME, OTHER)
├── imageUrl: String?
├── isAvailable: Boolean
├── requiresParentApproval: Boolean
├── limitPerWeek: Int? (null = unlimited)
├── minimumAge: Int?
├── sortOrder: Int
├── isActive: Boolean
└── createdAt: DateTime

RewardRedemption
├── id: UUID (PK)
├── rewardId: UUID (FK → Reward)
├── memberId: UUID (FK → FamilyMember)
├── creditTransactionId: UUID (FK → CreditTransaction)
├── status: Enum (PENDING_APPROVAL, APPROVED, FULFILLED, DENIED, CANCELLED)
├── requestedAt: DateTime
├── approvedById: UUID? (FK → FamilyMember)
├── approvedAt: DateTime?
├── fulfilledAt: DateTime?
├── denialReason: String?
└── notes: String?

SavingsGoal
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── name: String
├── description: String?
├── targetAmount: Int
├── currentAmount: Int
├── imageUrl: String?
├── targetDate: Date?
├── status: Enum (ACTIVE, ACHIEVED, CANCELLED)
├── achievedAt: DateTime?
├── createdAt: DateTime
└── updatedAt: DateTime

SavingsDeposit
├── id: UUID (PK)
├── savingsGoalId: UUID (FK → SavingsGoal)
├── creditTransactionId: UUID (FK → CreditTransaction)
├── amount: Int
├── createdAt: DateTime
└── notes: String?
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/credits/:memberId/balance | Get current balance |
| GET | /api/credits/:memberId/transactions | Get transaction history |
| POST | /api/credits/:memberId/award | Award credits (parent only) |
| POST | /api/credits/:memberId/deduct | Deduct credits (parent only) |
| POST | /api/credits/:memberId/purchase-screentime | Exchange credits for screen time |
| GET | /api/credits/settings | Get family credit settings |
| PUT | /api/credits/settings | Update credit settings |
| GET | /api/rewards | List available rewards |
| POST | /api/rewards | Create reward (parent only) |
| PUT | /api/rewards/:id | Update reward |
| DELETE | /api/rewards/:id | Remove reward |
| POST | /api/rewards/:id/redeem | Request reward redemption |
| POST | /api/rewards/redemptions/:id/approve | Approve redemption |
| POST | /api/rewards/redemptions/:id/fulfill | Mark as fulfilled |
| POST | /api/rewards/redemptions/:id/deny | Deny redemption |
| GET | /api/savings/:memberId/goals | Get savings goals |
| POST | /api/savings/goals | Create savings goal |
| POST | /api/savings/goals/:id/deposit | Deposit to savings |
| POST | /api/savings/goals/:id/withdraw | Withdraw from savings |

**UI Components:**

*Child View:*
- Credit balance display (large, prominent, with custom icon)
- Visual balance meter (progress bar or coin stack)
- Transaction history (simplified for younger kids)
- Reward catalog browser
- Reward redemption flow
- Savings goals with progress visualization
- "Buy Screen Time" quick action
- Celebration animation on earning

*Parent View:*
- Family credit overview (all children's balances)
- Award/deduct credits form
- Transaction ledger (filterable by child, type, date)
- Reward catalog management
- Redemption approval queue
- Credit settings configuration
- Exchange rate management
- Weekly allowance setup
- Credit economy analytics (earning vs spending trends)

**Age-Appropriate UI:**
- Ages 5-8: Visual coin/star display, simple reward cards with pictures, no numbers over 100
- Ages 9-12: Full balance display, transaction list, savings goals with progress bars
- Ages 13+: Complete ledger view, statistics, spending analytics

**Integration Points:**
- **Chores:** Auto-award credits on chore approval
- **Screen Time:** Spend credits to add screen time balance
- **Rules Engine:** Trigger bonus credits on streaks, birthdays, etc.
- **Routines:** Optional credit rewards for routine completion

**Example Reward Catalog:**
| Reward | Cost | Category | Notes |
|--------|------|----------|-------|
| 30 min extra screen time | 20 | SCREEN_TIME | Auto-fulfilled |
| Choose dinner meal | 50 | PRIVILEGE | Requires approval |
| Stay up 30 min late | 75 | PRIVILEGE | Weekend only |
| $5 to spend | 100 | PHYSICAL | Parent fulfills |
| Movie night pick | 60 | PRIVILEGE | |
| Friend sleepover | 200 | EXPERIENCE | Requires approval |
| New book | 150 | PHYSICAL | |
| Ice cream outing | 100 | EXPERIENCE | |

---

## 8. Projects & Life Admin

### 8.1 Projects
**Purpose:** Group complex, temporary efforts with task dependencies.

**Examples:**
- Back to school preparation
- Camping trip planning
- Birthday party organization
- Home renovation project
- Vacation planning

**Features:**
- Project overview with progress tracking
- Linked tasks with dependencies
- Shopping items linked to project
- Calendar events linked to project
- Budget tracking (optional)
- Notes and file attachments
- Project templates (reusable for recurring events)
- Assignees per task
- Due date tracking with timeline view

**Task Dependencies:**
Support for defining prerequisite relationships between tasks.

*Dependency Types:*
- **Finish-to-Start (FS):** Task B cannot start until Task A is complete
  - Example: "Buy supplies" must complete before "Pack bags"
- **Start-to-Start (SS):** Task B cannot start until Task A starts
  - Example: "Monitor RSVPs" starts when "Send invitations" starts
- **Blocking:** Task A explicitly blocks Task B regardless of order

*Dependency Features:*
- Visual dependency lines in timeline/Gantt view
- Blocked task indicators (grayed out, locked icon)
- Auto-notification when blocking task completes ("You can now start X")
- Dependency validation (prevent circular dependencies)
- Critical path highlighting (tasks that affect project end date)

**Data Model:**
```
Project
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── description: String?
├── status: Enum (PLANNING, ACTIVE, COMPLETED, ARCHIVED)
├── startDate: Date?
├── targetEndDate: Date?
├── actualEndDate: Date?
├── budgetAmount: Decimal?
├── actualSpent: Decimal?
├── templateId: UUID? (FK → ProjectTemplate, if created from template)
├── createdById: UUID (FK → FamilyMember)
├── createdAt: DateTime
└── updatedAt: DateTime

ProjectTask
├── id: UUID (PK)
├── projectId: UUID (FK → Project)
├── title: String
├── description: String?
├── assignedToId: UUID? (FK → FamilyMember)
├── status: Enum (NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED, SKIPPED)
├── priority: Enum (LOW, MEDIUM, HIGH, CRITICAL)
├── dueDate: Date?
├── estimatedMinutes: Int?
├── actualMinutes: Int?
├── sortOrder: Int
├── linkedTodoId: UUID? (FK → TodoItem)
├── completedAt: DateTime?
├── completedById: UUID?
├── notes: String?
├── createdAt: DateTime
└── updatedAt: DateTime

TaskDependency
├── id: UUID (PK)
├── predecessorTaskId: UUID (FK → ProjectTask)
├── successorTaskId: UUID (FK → ProjectTask)
├── dependencyType: Enum (FINISH_TO_START, START_TO_START, BLOCKING)
├── createdAt: DateTime
└── createdById: UUID (FK → FamilyMember)

ProjectShoppingItem
├── id: UUID (PK)
├── projectId: UUID (FK → Project)
├── shoppingItemId: UUID (FK → ShoppingItem)
├── linkedTaskId: UUID? (FK → ProjectTask)
└── createdAt: DateTime

ProjectEvent
├── id: UUID (PK)
├── projectId: UUID (FK → Project)
├── calendarEventId: UUID (FK → CalendarEvent)
├── linkedTaskId: UUID? (FK → ProjectTask)
└── createdAt: DateTime

ProjectNote
├── id: UUID (PK)
├── projectId: UUID (FK → Project)
├── content: String
├── createdById: UUID (FK → FamilyMember)
├── createdAt: DateTime
└── updatedAt: DateTime

ProjectTemplate
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── description: String?
├── category: Enum (TRAVEL, PARTY, SCHOOL, HOME, OTHER)
├── isBuiltIn: Boolean (system templates)
├── taskTemplates: JSON (serialized task list with dependencies)
├── createdAt: DateTime
└── updatedAt: DateTime
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project with tasks |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Archive project |
| POST | /api/projects/:id/tasks | Add task |
| PUT | /api/projects/tasks/:taskId | Update task |
| POST | /api/projects/tasks/:taskId/complete | Mark task complete |
| POST | /api/projects/tasks/:taskId/dependencies | Add dependency |
| DELETE | /api/projects/dependencies/:id | Remove dependency |
| GET | /api/projects/:id/timeline | Get timeline/Gantt data |
| GET | /api/projects/:id/critical-path | Calculate critical path |
| POST | /api/projects/from-template/:templateId | Create from template |
| GET | /api/projects/templates | List templates |

**UI Components:**
- Project list with status filters
- Project detail view with task list
- Timeline/Gantt chart view (showing dependencies)
- Task card with dependency indicators
- Dependency editor (drag to connect tasks)
- Blocked task visual (lock icon, grayed)
- Progress bar (based on completed tasks)
- Budget tracker widget
- Template selector for new projects
- Critical path highlight toggle

**Built-in Templates:**
- Birthday Party (invite list, decorations, cake, activities)
- School Year Start (supplies, forms, schedule setup)
- Vacation Planning (booking, packing, pet care, mail hold)
- Holiday Prep (gifts, decorations, meal planning, travel)

---

## 9. Family Life Modules (New)

### 9.1 Family Communication Board
**Purpose:** Central hub for family announcements, notes, and positive reinforcement.

**Features:**
- Family announcements (pinned messages from parents)
- Kudos/shout-outs (celebrate achievements, say thanks)
- Quick notes (reminders, FYIs)
- Photo sharing (family moments)
- Message expiration (auto-archive after X days)
- Reactions (emoji responses for engagement)

**Data Model:**
```
BoardMessage
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── authorId: UUID (FK → FamilyMember)
├── type: Enum (ANNOUNCEMENT, KUDOS, NOTE, PHOTO)
├── title: String?
├── content: String
├── imageUrl: String?
├── isPinned: Boolean
├── expiresAt: DateTime?
├── targetMemberId: UUID? (FK → FamilyMember, for kudos)
├── createdAt: DateTime
└── archivedAt: DateTime?

MessageReaction
├── id: UUID (PK)
├── messageId: UUID (FK → BoardMessage)
├── memberId: UUID (FK → FamilyMember)
├── emoji: String
└── createdAt: DateTime
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/board/messages | Get active messages |
| POST | /api/board/messages | Create message |
| PUT | /api/board/messages/:id | Update message |
| DELETE | /api/board/messages/:id | Archive message |
| POST | /api/board/messages/:id/react | Add reaction |
| GET | /api/board/kudos/:memberId | Get kudos for member |

**UI Components:**
- Message feed (card-based layout)
- Quick post composer
- Kudos picker with member selector
- Pinned announcements banner
- Photo upload with preview
- Reaction picker

**Age-Appropriate Features:**
- Younger kids: View-only with large reaction buttons
- Older kids: Can post kudos to siblings
- Parents: Full posting capabilities

---

### 9.2 Routines & Morning Checklists
**Purpose:** Step-by-step guides for daily routines, especially helpful for younger children.

**Features:**
- Routine templates (morning, bedtime, homework, etc.)
- Step-by-step task lists with icons
- Visual progress indicators
- Time estimates per step
- Audio/visual cues (optional sounds, animations)
- Completion tracking per day
- Different routines for weekday vs weekend
- Parent-defined routines per child

**Data Model:**
```
Routine
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── memberId: UUID (FK → FamilyMember)
├── name: String
├── type: Enum (MORNING, BEDTIME, AFTERSCHOOL, HOMEWORK, CUSTOM)
├── applicableDays: Int[] (0-6, days of week)
├── targetStartTime: Time?
├── targetEndTime: Time?
├── isActive: Boolean
└── createdAt: DateTime

RoutineStep
├── id: UUID (PK)
├── routineId: UUID (FK → Routine)
├── title: String
├── description: String?
├── iconName: String
├── estimatedMinutes: Int
├── sortOrder: Int
├── isOptional: Boolean
└── createdAt: DateTime

RoutineCompletion
├── id: UUID (PK)
├── routineId: UUID (FK → Routine)
├── date: Date
├── startedAt: DateTime?
├── completedAt: DateTime?
├── status: Enum (NOT_STARTED, IN_PROGRESS, COMPLETED, PARTIAL)
└── notes: String?

RoutineStepCompletion
├── id: UUID (PK)
├── routineCompletionId: UUID (FK → RoutineCompletion)
├── routineStepId: UUID (FK → RoutineStep)
├── completedAt: DateTime
├── skipped: Boolean
└── notes: String?
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/routines | Get routines (filterable by member) |
| POST | /api/routines | Create routine |
| PUT | /api/routines/:id | Update routine |
| GET | /api/routines/:id/steps | Get routine steps |
| POST | /api/routines/:id/start | Start routine for today |
| POST | /api/routines/:id/steps/:stepId/complete | Complete step |
| GET | /api/routines/:memberId/today | Get today's routines |
| GET | /api/routines/:memberId/stats | Routine completion stats |

**UI Components:**
- Routine builder (drag-and-drop steps)
- Step-by-step execution view (one step at a time, large buttons)
- Progress bar/visual indicator
- Celebration animation on completion
- Weekly completion calendar
- Routine template library

**Age-Appropriate UI:**
- Ages 5-8: One large step at a time, pictures, sounds, simple "Done!" button
- Ages 9-12: Checklist view with timer
- Ages 13+: Simple checklist, self-directed

---

### 9.3 Transportation & Carpool Tracker
**Purpose:** Track who is picking up/dropping off whom, coordinate carpools.

**Features:**
- Pickup/dropoff schedule per child
- Driver assignments (parents, grandparents, carpool members)
- Location presets (school, soccer practice, piano, etc.)
- Carpool groups with external families
- Driver confirmation workflow
- Day-of changes and notifications
- Weekly schedule view
- Integration with calendar events

**Data Model:**
```
TransportLocation
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── address: String?
├── locationType: Enum (SCHOOL, ACTIVITY, HOME, OTHER)
├── notes: String?
└── createdAt: DateTime

Driver
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── phone: String?
├── email: String?
├── relationship: String (e.g., "Grandma", "Carpool - Smith family")
├── isInternal: Boolean (true if FamilyMember)
├── memberId: UUID? (FK → FamilyMember, if internal)
└── isActive: Boolean

TransportSchedule
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── childId: UUID (FK → FamilyMember)
├── type: Enum (PICKUP, DROPOFF)
├── locationId: UUID (FK → TransportLocation)
├── driverId: UUID (FK → Driver)
├── dayOfWeek: Int (0-6)
├── scheduledTime: Time
├── linkedEventId: UUID? (FK → CalendarEvent)
├── notes: String?
└── isActive: Boolean

TransportInstance
├── id: UUID (PK)
├── scheduleId: UUID (FK → TransportSchedule)
├── date: Date
├── status: Enum (SCHEDULED, CONFIRMED, COMPLETED, CANCELLED, CHANGED)
├── actualDriverId: UUID? (FK → Driver, if different)
├── confirmedAt: DateTime?
├── completedAt: DateTime?
├── notes: String?
└── updatedAt: DateTime

CarpoolGroup
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── activityName: String?
├── locationId: UUID (FK → TransportLocation)
└── createdAt: DateTime

CarpoolMember
├── id: UUID (PK)
├── carpoolGroupId: UUID (FK → CarpoolGroup)
├── driverId: UUID (FK → Driver)
├── childNames: String[]
├── rotationOrder: Int?
└── isActive: Boolean
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/transport/schedule | Get transport schedule |
| POST | /api/transport/schedule | Create schedule entry |
| GET | /api/transport/today | Today's pickups/dropoffs |
| POST | /api/transport/instances/:id/confirm | Confirm transport |
| POST | /api/transport/instances/:id/change | Request change |
| GET | /api/transport/drivers | List drivers |
| POST | /api/transport/drivers | Add driver |
| GET | /api/transport/carpools | List carpool groups |

**UI Components:**
- Weekly transport calendar view
- Today's transport card on dashboard
- Driver quick-select
- Confirmation buttons
- Change request flow
- Carpool rotation manager
- Contact quick-dial for drivers

---

### 9.4 Pet Care Module
**Purpose:** Track pet care responsibilities, health, and schedules.

**Features:**
- Pet profiles (name, species, breed, birthday, photo)
- Feeding schedule and tracking
- Medication reminders (similar to child medications)
- Vet appointment tracking
- Grooming schedule
- Pet chore assignments (feeding as a rotating chore)
- Supply tracking (food, litter, etc.)
- Weight and health log

**Data Model:**
```
Pet
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── species: Enum (DOG, CAT, FISH, BIRD, HAMSTER, RABBIT, OTHER)
├── breed: String?
├── birthDate: Date?
├── adoptedDate: Date?
├── photoUrl: String?
├── weight: Decimal?
├── weightUnit: Enum (LB, KG)
├── notes: String?
├── isActive: Boolean
└── createdAt: DateTime

PetCareTask
├── id: UUID (PK)
├── petId: UUID (FK → Pet)
├── taskType: Enum (FEEDING, WATER, WALKING, LITTER, GROOMING, MEDICATION, OTHER)
├── name: String
├── description: String?
├── frequency: Enum (DAILY, TWICE_DAILY, WEEKLY, MONTHLY, CUSTOM)
├── scheduledTimes: Time[] (for daily tasks)
├── assignmentType: Enum (FIXED, ROTATING)
├── linkedChoreId: UUID? (FK → ChoreDefinition, if tracked as chore)
├── isActive: Boolean
└── createdAt: DateTime

PetCareLog
├── id: UUID (PK)
├── petCareTaskId: UUID (FK → PetCareTask)
├── completedById: UUID (FK → FamilyMember)
├── completedAt: DateTime
├── notes: String?
└── amount: String? (e.g., "1 cup", "30 min walk")

PetMedication
├── id: UUID (PK)
├── petId: UUID (FK → Pet)
├── name: String
├── dosage: String
├── frequency: String
├── startDate: Date
├── endDate: Date?
├── notes: String?
├── isActive: Boolean
└── createdAt: DateTime

PetMedicationLog
├── id: UUID (PK)
├── petMedicationId: UUID (FK → PetMedication)
├── givenById: UUID (FK → FamilyMember)
├── givenAt: DateTime
├── dosageGiven: String?
└── notes: String?

PetHealthLog
├── id: UUID (PK)
├── petId: UUID (FK → Pet)
├── date: Date
├── type: Enum (WEIGHT, VET_VISIT, SYMPTOM, NOTE)
├── weight: Decimal?
├── vetName: String?
├── notes: String
├── createdById: UUID (FK → FamilyMember)
└── createdAt: DateTime
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/pets | List pets |
| POST | /api/pets | Add pet |
| PUT | /api/pets/:id | Update pet |
| GET | /api/pets/:id/tasks | Get care tasks |
| POST | /api/pets/:id/tasks | Create care task |
| POST | /api/pets/tasks/:taskId/log | Log task completion |
| GET | /api/pets/:id/medications | Get medications |
| POST | /api/pets/:id/medications/:medId/log | Log medication |
| GET | /api/pets/:id/health | Get health log |
| POST | /api/pets/:id/health | Add health entry |

**UI Components:**
- Pet profile cards with photos
- Daily care checklist
- Feeding time reminders
- Medication tracker (with next-dose countdown)
- Vet appointment calendar integration
- Weight tracking chart
- Pet care assignment to kids (gamified)

---

### 9.5 Household Maintenance Tracker
**Purpose:** Track recurring home maintenance tasks and prevent forgotten upkeep.

**Features:**
- Maintenance task library (common tasks with recommended frequencies)
- Custom maintenance items
- Due date tracking with reminders
- Completion history
- Seasonal task suggestions
- Service provider contacts
- Cost tracking (optional)
- Photo documentation (before/after)

**Common Maintenance Items:**
- HVAC filter replacement (monthly/quarterly)
- Smoke detector battery check (bi-annual)
- Water heater flush (annual)
- Gutter cleaning (seasonal)
- Dryer vent cleaning (annual)
- Refrigerator coil cleaning (bi-annual)
- Lawn equipment maintenance (seasonal)
- Pest control treatments (quarterly)

**Data Model:**
```
MaintenanceTask
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── description: String?
├── category: Enum (HVAC, PLUMBING, ELECTRICAL, APPLIANCES, EXTERIOR, YARD, SAFETY, OTHER)
├── frequency: Enum (MONTHLY, QUARTERLY, BIANNUAL, ANNUAL, SEASONAL, CUSTOM)
├── customIntervalDays: Int?
├── seasonalMonths: Int[]? (for seasonal tasks)
├── estimatedCost: Decimal?
├── estimatedMinutes: Int?
├── diyOrProfessional: Enum (DIY, PROFESSIONAL, EITHER)
├── notes: String?
├── isActive: Boolean
└── createdAt: DateTime

MaintenanceInstance
├── id: UUID (PK)
├── taskId: UUID (FK → MaintenanceTask)
├── dueDate: Date
├── status: Enum (UPCOMING, DUE, OVERDUE, COMPLETED, SKIPPED)
├── completedAt: DateTime?
├── completedById: UUID? (FK → FamilyMember)
├── actualCost: Decimal?
├── serviceProviderId: UUID? (FK → ServiceProvider)
├── notes: String?
├── beforePhotoUrl: String?
├── afterPhotoUrl: String?
└── createdAt: DateTime

ServiceProvider
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── category: Enum (same as MaintenanceTask.category)
├── phone: String?
├── email: String?
├── website: String?
├── address: String?
├── notes: String?
├── rating: Int? (1-5 family rating)
└── createdAt: DateTime
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/maintenance/tasks | List maintenance tasks |
| POST | /api/maintenance/tasks | Create task |
| GET | /api/maintenance/upcoming | Get upcoming/due tasks |
| POST | /api/maintenance/instances/:id/complete | Mark complete |
| GET | /api/maintenance/history | Completion history |
| GET | /api/maintenance/providers | List service providers |
| POST | /api/maintenance/providers | Add provider |
| GET | /api/maintenance/costs | Cost summary report |

**UI Components:**
- Maintenance calendar view
- Upcoming tasks dashboard widget
- Overdue alerts (prominent warning)
- Task completion form with cost/notes
- Service provider directory
- Seasonal checklist view
- Cost tracking summary
- Photo documentation viewer

---

### 9.6 Document Vault
**Purpose:** Secure storage for important family and identity documents with expiration tracking.

**Features:**
- Secure document upload and storage
- Document categorization (identity, medical, financial, household, education)
- Expiration date tracking with advance reminders
- Per-document access controls (which family members can view)
- Document versioning (keep old copies)
- Quick-search and filtering
- Secure sharing links (time-limited)
- Mobile-friendly document viewer

**Document Categories:**
- **Identity:** Passports, driver's licenses, birth certificates, SSN cards, visas
- **Medical:** Insurance cards, vaccination records, allergy lists, medical history
- **Financial:** Insurance policies, warranties, vehicle titles, property deeds
- **Household:** Appliance manuals, home inspection reports, HOA documents
- **Education:** Report cards, diplomas, transcripts, IEPs
- **Legal:** Custody agreements, wills, power of attorney
- **Pets:** Vaccination records, registration, microchip info

**Data Model:**
```
Document
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── description: String?
├── category: Enum (IDENTITY, MEDICAL, FINANCIAL, HOUSEHOLD, EDUCATION, LEGAL, PET, OTHER)
├── subcategory: String?
├── relatedMemberId: UUID? (FK → FamilyMember, if applicable)
├── relatedPetId: UUID? (FK → Pet, if applicable)
├── fileUrl: String (encrypted storage path)
├── fileType: String (PDF, image, etc.)
├── fileSizeBytes: Int
├── thumbnailUrl: String?
├── expirationDate: Date?
├── reminderDaysBefore: Int? (e.g., 90 days before passport expires)
├── issueDate: Date?
├── documentNumber: String? (encrypted, e.g., passport number)
├── issuingAuthority: String?
├── tags: String[]
├── uploadedById: UUID (FK → FamilyMember)
├── createdAt: DateTime
├── updatedAt: DateTime
└── isArchived: Boolean

DocumentVersion
├── id: UUID (PK)
├── documentId: UUID (FK → Document)
├── versionNumber: Int
├── fileUrl: String
├── uploadedById: UUID (FK → FamilyMember)
├── uploadedAt: DateTime
├── changeNotes: String?
└── fileSizeBytes: Int

DocumentAccess
├── id: UUID (PK)
├── documentId: UUID (FK → Document)
├── memberId: UUID (FK → FamilyMember)
├── accessLevel: Enum (VIEW, EDIT, ADMIN)
├── grantedById: UUID (FK → FamilyMember)
└── grantedAt: DateTime

DocumentShareLink
├── id: UUID (PK)
├── documentId: UUID (FK → Document)
├── token: String (unique)
├── expiresAt: DateTime
├── accessCount: Int
├── maxAccesses: Int?
├── createdById: UUID (FK → FamilyMember)
├── createdAt: DateTime
└── lastAccessedAt: DateTime?

DocumentReminder
├── id: UUID (PK)
├── documentId: UUID (FK → Document)
├── remindAt: DateTime
├── reminderType: Enum (EXPIRING_SOON, RENEWAL_DUE, CUSTOM)
├── sent: Boolean
├── sentAt: DateTime?
└── notifyMemberIds: UUID[]
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/documents | List documents (filterable) |
| POST | /api/documents | Upload document |
| GET | /api/documents/:id | Get document details |
| PUT | /api/documents/:id | Update document metadata |
| DELETE | /api/documents/:id | Archive document |
| GET | /api/documents/:id/download | Download file |
| POST | /api/documents/:id/version | Upload new version |
| GET | /api/documents/:id/versions | List versions |
| POST | /api/documents/:id/share | Create share link |
| GET | /api/documents/expiring | Get expiring documents |
| GET | /api/documents/member/:memberId | Documents for member |

**UI Components:**
- Document list with category filters
- Upload modal with drag-and-drop
- Document detail view with inline preview
- Expiration timeline view
- "Expiring Soon" dashboard widget
- Member document quick-view
- Share link generator
- Document search with tag filtering
- Category icons and color coding
- Version history viewer

**Security Considerations:**
- Files stored with encryption at rest
- Document numbers masked in UI (show last 4 digits)
- Access logging for audit trail
- Share links use secure random tokens
- Automatic share link expiration
- Parent-only documents by default for sensitive categories

**Notification Triggers:**
- X days before document expires (configurable per document)
- 90 days, 30 days, 7 days reminders for identity documents
- Annual renewal reminders for insurance policies

---

## 10. Automation & Rules Engine

**Purpose:** Reduce manual management through configurable triggers and actions.

**Rule Structure:**
```
Rule
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── name: String
├── description: String?
├── triggerType: Enum (see below)
├── triggerConfig: JSON
├── actionType: Enum (see below)
├── actionConfig: JSON
├── isActive: Boolean
├── lastTriggeredAt: DateTime?
├── triggerCount: Int
└── createdAt: DateTime
```

**Trigger Types:**
| Trigger | Description | Config Example |
|---------|-------------|----------------|
| CHORE_COMPLETED | When a chore is marked done | `{ choreId: UUID, memberId?: UUID }` |
| CHORE_STREAK | When streak reaches threshold | `{ memberId: UUID, streakCount: 7 }` |
| SCREEN_TIME_LOW | Balance below threshold | `{ memberId: UUID, minutesBelow: 30 }` |
| INVENTORY_LOW | Item stock below threshold | `{ itemId: UUID, quantityBelow: 2 }` |
| CALENDAR_BUSY_DAY | Day exceeds event threshold | `{ eventCount: 4, duration: 360 }` |
| MEDICATION_GIVEN | When medication is logged | `{ medicationId: UUID }` |
| ROUTINE_COMPLETED | When routine is finished | `{ routineId: UUID }` |
| TIME_BASED | Cron-style schedule | `{ cron: "0 8 * * 1" }` |

**Action Types:**
| Action | Description | Config Example |
|--------|-------------|----------------|
| AWARD_CREDITS | Add credits to member | `{ memberId: UUID, amount: 10, reason: "Streak bonus" }` |
| SEND_NOTIFICATION | Push notification | `{ memberIds: [], title: "", body: "" }` |
| ADD_SHOPPING_ITEM | Add item to list | `{ listId: UUID, itemName: "", quantity: 1 }` |
| CREATE_TODO | Create a todo item | `{ title: "", assignedToId: UUID }` |
| LOCK_MEDICATION | Prevent next dose until time | `{ medicationId: UUID, lockUntil: DateTime }` |
| SUGGEST_MEAL | Surface easy meal suggestion | `{ mealTag: "quick" }` |
| REDUCE_CHORES | Mark optional chores as skippable | `{ difficulty: "HARD" }` |

**Pre-built Rule Templates:**
- Chore streak bonus (7-day streak = +10 credits)
- Low screen time warning (< 30 min = notify parent)
- Medication cooldown (lock next dose for X hours)
- Busy day = easy meals
- Weekly allowance distribution
- Birthday bonus credits

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/rules | List rules |
| POST | /api/rules | Create rule |
| PUT | /api/rules/:id | Update rule |
| DELETE | /api/rules/:id | Delete rule |
| POST | /api/rules/:id/test | Test rule (dry run) |
| GET | /api/rules/templates | Get pre-built templates |
| GET | /api/rules/history | Rule execution history |

---

## 11. Dashboards & Insights

### 11.1 Parent Dashboard
**Purpose:** Single view of household status for parents.

**Sections:**
- **Today's Overview**
  - Date, weather (optional integration)
  - Family calendar snapshot
  - Today's transport schedule

- **Chores Status**
  - Pending chores by child
  - Overdue chores (highlighted)
  - Awaiting approval queue

- **Screen Time Summary**
  - Balance per child (visual meters)
  - Today's usage

- **Alerts & Actions**
  - Health alerts (medications due)
  - Maintenance overdue
  - Shopping list requests pending
  - Low inventory warnings

- **Quick Actions**
  - Award bonus credits
  - Log screen time for child
  - Add shopping item
  - Create todo

### 11.2 Child Dashboard
**Purpose:** Age-appropriate view for children.

**Ages 5-8 (Simplified):**
- Large avatar and greeting
- Today's chores (big icons, one at a time)
- Current routine progress
- Screen time remaining (visual meter, no numbers)
- Kudos received (celebration display)

**Ages 9-12 (Standard):**
- My chores today (checklist)
- Screen time balance
- My credits balance
- Upcoming events (my activities)
- Family announcements

**Ages 13+ (Full):**
- Full chore list with history
- Screen time with detailed log
- Credit ledger
- Calendar view
- Todo list

### 11.3 Kiosk Dashboard
**Purpose:** Always-on family display (kitchen tablet, etc.)

**Features:**
- No login required to view
- Large, readable from distance
- Auto-rotating sections or configurable layout
- Quick-switch to individual views via avatar tap + PIN

**Sections:**
- Family calendar (week view)
- Today's chores by person
- Today's transport/pickups
- Shopping list (quick view)
- Communication board messages
- Weather (optional)

### 11.4 Analytics (Future Enhancement)

**Reports:**
- Chore fairness index (distribution across kids)
- Screen time trends (weekly/monthly)
- Chore completion rates by child
- Credit economy summary
- Routine completion rates
- Meal repetition analysis
- Maintenance cost tracking

### 11.5 Parent Approval UI Patterns
**Purpose:** Streamlined UI patterns for efficient parent approvals across the system.

**Approval Queue Types:**
- Chore completions awaiting verification
- Shopping list requests from children
- Reward redemption requests
- Calendar event requests (from older children)
- Grace period requests (screen time)
- Exception requests (routine skips, etc.)

**Swipe-to-Approve (Mobile):**
A touch-friendly pattern for quick individual approvals.

*Interaction:*
- Swipe right → Approve (green confirmation)
- Swipe left → Reject (red, prompts for reason)
- Tap → View details before deciding

*Visual Design:*
- Card-based list of pending items
- Avatar of requesting child
- Brief description of request
- Time since request
- Swipe hints on first use
- Haptic feedback on action

**Batch Approval:**
For handling multiple similar items at once.

*Features:*
- "Select All" / "Select None" toggle
- Individual item checkboxes
- Category filters (chores only, shopping only, etc.)
- Child filters (show only Emma's requests)
- Bulk approve button with count
- Bulk reject with single reason for all
- Review summary before confirming batch

*Implementation:*
```
ApprovalQueueItem (unified view)
├── id: UUID
├── type: Enum (CHORE, SHOPPING_REQUEST, REWARD, EVENT, GRACE_PERIOD, EXCEPTION)
├── sourceId: UUID (FK to original entity)
├── requesterId: UUID (FK → FamilyMember)
├── title: String
├── description: String?
├── requestedAt: DateTime
├── priority: Enum (NORMAL, URGENT)
├── expiresAt: DateTime? (some requests time out)
└── metadata: JSON (type-specific details)
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/approvals/queue | Get all pending approvals |
| GET | /api/approvals/queue?type=CHORE | Filter by type |
| POST | /api/approvals/:id/approve | Approve single item |
| POST | /api/approvals/:id/reject | Reject with reason |
| POST | /api/approvals/batch/approve | Approve multiple items |
| POST | /api/approvals/batch/reject | Reject multiple items |
| GET | /api/approvals/stats | Approval queue statistics |

**UI Components:**
- Unified approval queue page
- Approval badge count (header/nav)
- Swipeable card component
- Batch selection toolbar
- Rejection reason modal (with common reasons)
- Approval confirmation toast/animation
- Empty state when queue is clear

**Notification Integration:**
- Daily digest: "You have 5 items awaiting approval"
- Urgent items get immediate push
- Expiring requests highlighted

---

## 12. Notifications & PWA

### 12.1 Progressive Web App (PWA)

**PWA Features:**
- Installable on home screen (iOS, Android, Desktop)
- Offline capability (cached static assets, queued actions)
- Push notifications
- Full-screen mode
- App-like navigation

**manifest.json Configuration:**
```json
{
  "name": "Hearth",
  "short_name": "Hearth",
  "description": "Family household management system",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#f97316",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Service Worker Strategy:**
- Cache-first for static assets (JS, CSS, images)
- Network-first for API calls
- Background sync for offline actions

### 12.2 Push Notifications

**Implementation:** Web Push API with VAPID keys

**Notification Types:**
| Type | Recipients | Trigger |
|------|------------|---------|
| Chore reminder | Assigned child | X minutes before due |
| Chore awaiting approval | Parents | Child marks complete |
| Screen time low | Child + Parents | Balance < threshold |
| Medication due | Parents | Scheduled time |
| Medication available | Parents | Cooldown timer expires |
| Transport reminder | Parents | X minutes before pickup |
| Calendar reminder | Attendees | Configurable before event |
| Routine time | Child | Routine start time |
| Credit award | Child | Credits added |
| Shopping request | Parents | Child requests item |
| Maintenance due | Parents | Maintenance task due/overdue |
| Savings goal achieved | Child + Parents | Goal target reached |
| Pet care reminder | Assigned member | Feeding/medication time |
| Document expiring | Parents | X days before expiration |
| Leftover expiring | Parents | Leftover approaching expiration |
| Sick mode activated | Family | When sick mode turned on |
| Grace period used | Parents | Child uses screen time grace |
| Failed login attempts | Parents | 3+ failed PIN attempts |

**Data Model:**
```
PushSubscription
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── endpoint: String
├── p256dh: String
├── auth: String
├── deviceName: String?
├── createdAt: DateTime
└── lastUsedAt: DateTime

NotificationPreference
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── notificationType: Enum
├── enabled: Boolean
├── quietHoursStart: Time?
├── quietHoursEnd: Time?
└── updatedAt: DateTime

NotificationLog
├── id: UUID (PK)
├── memberId: UUID (FK → FamilyMember)
├── type: Enum
├── title: String
├── body: String
├── sentAt: DateTime
├── deliveredAt: DateTime?
├── clickedAt: DateTime?
└── relatedEntityId: UUID?
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/notifications/subscribe | Register push subscription |
| DELETE | /api/notifications/subscribe | Unsubscribe |
| PUT | /api/notifications/preferences | Update preferences |
| GET | /api/notifications/history | Get notification history |

---

## 13. Container Deployment

### 13.1 Docker Configuration

**Dockerfile (Next.js App):**
```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: hearth-app
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/hearth
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=http://localhost:3000
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - hearth-network

  db:
    image: postgres:16-alpine
    container_name: hearth-db
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=hearth
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - hearth-network

  # Optional: Database admin UI
  adminer:
    image: adminer
    container_name: hearth-adminer
    ports:
      - "8080:8080"
    depends_on:
      - db
    restart: unless-stopped
    networks:
      - hearth-network
    profiles:
      - dev

volumes:
  postgres_data:

networks:
  hearth-network:
    driver: bridge
```

**.env.example:**
```
# Database
DB_PASSWORD=your_secure_password_here

# NextAuth
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000

# Push Notifications (generate with web-push library)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Google Calendar OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 13.2 Deployment Commands

```bash
# Development
docker-compose --profile dev up -d

# Production
docker-compose up -d

# View logs
docker-compose logs -f app

# Database migrations
docker-compose exec app npx prisma migrate deploy

# Rebuild after code changes
docker-compose up -d --build app
```

---

## 14. Test-Driven Development Strategy

### 14.1 Testing Philosophy

- Write tests BEFORE implementation code
- Tests serve as living documentation
- Aim for high coverage on business logic, moderate on UI
- Fast unit tests, slower integration tests, few E2E tests (testing pyramid)

### 14.2 Testing Stack

| Type | Tool | Purpose |
|------|------|---------|
| Unit | Jest | Business logic, utilities, hooks |
| Component | React Testing Library | UI components in isolation |
| Integration | Jest + Supertest | API routes, database operations |
| E2E | Playwright | Critical user flows |
| Mocking | MSW (Mock Service Worker) | API mocking for frontend tests |

### 14.3 Test Structure

```
/tests
├── /unit
│   ├── /services         # Business logic tests
│   ├── /utils            # Utility function tests
│   └── /hooks            # Custom React hooks
├── /integration
│   ├── /api              # API route tests
│   └── /db               # Database operation tests
├── /components
│   ├── /common           # Shared component tests
│   └── /features         # Feature-specific components
├── /e2e
│   ├── auth.spec.ts
│   ├── chores.spec.ts
│   ├── screentime.spec.ts
│   └── shopping.spec.ts
└── /fixtures
    ├── families.ts
    ├── members.ts
    └── chores.ts
```

### 14.4 TDD Workflow

1. **Red:** Write a failing test
2. **Green:** Write minimal code to pass
3. **Refactor:** Clean up while keeping tests green

**Example - Chore Service:**
```typescript
// tests/unit/services/chore.service.test.ts

describe('ChoreService', () => {
  describe('completeChore', () => {
    it('should mark chore as completed with timestamp', async () => {
      // Arrange
      const choreInstance = createMockChoreInstance({ status: 'PENDING' });

      // Act
      const result = await choreService.completeChore(choreInstance.id, memberId);

      // Assert
      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toBeDefined();
      expect(result.completedById).toBe(memberId);
    });

    it('should require approval if chore schedule demands it', async () => {
      // Arrange
      const choreInstance = createMockChoreInstance({
        status: 'PENDING',
        schedule: { requiresApproval: true }
      });

      // Act
      const result = await choreService.completeChore(choreInstance.id, memberId);

      // Assert
      expect(result.status).toBe('COMPLETED'); // Not APPROVED yet
      expect(result.approvedAt).toBeNull();
    });

    it('should award credits when approval not required', async () => {
      // Arrange
      const choreInstance = createMockChoreInstance({
        schedule: { requiresApproval: false },
        definition: { creditValue: 10 }
      });

      // Act
      const result = await choreService.completeChore(choreInstance.id, memberId);

      // Assert
      expect(result.creditsAwarded).toBe(10);
      expect(creditService.award).toHaveBeenCalledWith(memberId, 10, expect.any(String));
    });

    it('should throw if chore already completed', async () => {
      // Arrange
      const choreInstance = createMockChoreInstance({ status: 'COMPLETED' });

      // Act & Assert
      await expect(choreService.completeChore(choreInstance.id, memberId))
        .rejects.toThrow('Chore already completed');
    });
  });
});
```

### 14.5 Coverage Targets

| Category | Target | Rationale |
|----------|--------|-----------|
| Services (business logic) | 90%+ | Core functionality, most critical |
| API Routes | 85%+ | Entry points, validation |
| Utilities | 95%+ | Pure functions, easy to test |
| React Hooks | 80%+ | State management logic |
| UI Components | 70%+ | Visual, harder to test edge cases |
| E2E Critical Paths | 100% | Auth, chore flow, screen time logging |

### 14.6 Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- chore.service.test.ts

# Run E2E tests
npm run test:e2e

# Run E2E in headed mode (visible browser)
npm run test:e2e -- --headed

# Watch mode for development
npm test -- --watch
```

### 14.7 CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: hearth_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/hearth_test

      - run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/hearth_test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 15. Setup Wizard & Onboarding

**Purpose:** Guide new families through initial setup with a friendly, step-by-step process that captures essential information without overwhelming users.

### 15.1 Setup Wizard Flow

**Step 1: Welcome & Family Creation**
- Welcome message explaining Hearth's purpose
- Family name input
- Timezone selection (auto-detect with manual override)
- Primary parent account creation (email, password)

**Step 2: Add Family Members**
- Add additional parents (optional, invite via email)
- Add children with:
  - Name
  - Birth date (for age-based features)
  - Avatar selection (fun icons for kids to choose)
  - PIN setup (or generate random, parent can change later)
- Visual family tree/group preview
- "Add another" or "Continue" options

**Step 3: Quick Preferences**
- Which features to enable at start:
  - [ ] Chores & Tasks (recommended)
  - [ ] Screen Time Tracking
  - [ ] Shopping Lists
  - [ ] Calendar
  - [ ] Credits/Rewards
- Week start day (Sunday/Monday)
- Currency preference (for allowance display)

**Step 4: Chore Quick-Start (if enabled)**
- Pre-populated chore suggestions based on children's ages
- Checkboxes to select which to create
- Quick assignment (or "assign later")
- Sample chores:
  - Ages 5-7: Make bed, Put toys away, Feed pet
  - Ages 8-10: + Empty dishwasher, Take out trash
  - Ages 11-13: + Vacuum, Do laundry, Mow lawn
  - Ages 14+: + Cook simple meal, Grocery shopping

**Step 5: Screen Time Setup (if enabled)**
- Per-child weekly allocation (with age-based suggestions)
- Quick presets: "Relaxed", "Moderate", "Strict"
- Reset day selection
- Grace period enable/disable

**Step 6: Calendar Connection (optional)**
- "Connect Google Calendar" button
- OAuth flow
- Select which calendars to sync
- "Skip for now" option

**Step 7: Kiosk Device Setup (optional)**
- "Do you have a family display device?"
- If yes: Generate kiosk pairing code
- QR code for easy setup
- "Skip for now" option

**Step 8: Review & Launch**
- Summary of what was configured
- Family member list
- Enabled modules
- "Start Using Hearth" button
- Confetti/celebration animation

### 15.2 Data Model

```
OnboardingProgress
├── id: UUID (PK)
├── familyId: UUID (FK → Family)
├── currentStep: Int
├── completedSteps: Int[]
├── skippedSteps: Int[]
├── startedAt: DateTime
├── completedAt: DateTime?
├── preferences: JSON (temporary storage during wizard)
└── updatedAt: DateTime
```

### 15.3 Post-Setup Contextual Tips

After setup, show contextual help tooltips on first visit to each section:
- Dashboard: "This is your family command center"
- Chores: "Tap a chore to mark it complete"
- Screen Time: "Log time using the quick buttons"
- Shopping: "Swipe right to mark items as purchased"

**Dismissable Tips:**
- "Got it" button hides tip permanently
- "Show tips" toggle in settings to re-enable

### 15.4 Re-Run Setup Option

- Available in Settings → Family → "Re-run Setup Wizard"
- Useful for:
  - Adding new modules
  - Major family changes
  - Starting fresh with configuration

### 15.5 UI Components

- Progress indicator (steps 1-8)
- Back/Next navigation
- Skip links for optional steps
- Animated transitions between steps
- Mobile-optimized layout
- Avatar picker with fun icons
- Age-appropriate chore suggestions engine
- Calendar OAuth integration component
- QR code generator for kiosk pairing

---

## 16. MVP Implementation Phases

### Phase 1: Foundation
- [ ] Project setup (Next.js, Tailwind, Prisma, Docker)
- [ ] Database schema for Family & Members
- [ ] Authentication (parent login, child PIN)
- [ ] Basic dashboard shell
- [ ] PWA manifest and service worker

### Phase 2: Core Features
- [ ] Chore definitions and scheduling
- [ ] Chore instances and completion flow
- [ ] Screen time tracking (balance, logging)
- [ ] Shopping list management
- [ ] Basic calendar (internal events)

### Phase 3: Integration
- [ ] Google Calendar sync
- [ ] Credits/allowance system
- [ ] Push notifications
- [ ] Kiosk mode
- [ ] Parent approval workflows

### Phase 4: Polish
- [ ] Age-appropriate UI variants
- [ ] Celebration animations
- [ ] Streak tracking and gamification
- [ ] Analytics dashboard
- [ ] Rules engine (basic)

### Phase 5: Extended Features
- [ ] Routines module
- [ ] Family communication board
- [ ] Transportation tracker
- [ ] Pet care module
- [ ] Maintenance tracker

---

## 17. Performance Considerations

### Database Indexing Strategy

**Primary Indexes (automatically created):**
- All `id` (UUID primary keys)
- All foreign key columns

**Recommended Composite Indexes:**
```sql
-- Chores: Get today's chores for family
CREATE INDEX idx_chore_instance_family_date
ON ChoreInstance(choreScheduleId, dueDate, status);

-- Screen Time: Balance lookups
CREATE INDEX idx_screentime_balance_member
ON ScreenTimeBalance(memberId, weekStartDate);

-- Transactions: History queries
CREATE INDEX idx_credit_transaction_member_date
ON CreditTransaction(memberId, createdAt DESC);

-- Calendar: Date range queries
CREATE INDEX idx_calendar_event_family_dates
ON CalendarEvent(familyId, startTime, endTime);

-- Audit: Security queries
CREATE INDEX idx_audit_log_family_action
ON AuditLog(familyId, action, createdAt DESC);

-- Shopping: Active items
CREATE INDEX idx_shopping_item_list_status
ON ShoppingItem(listId, status);
```

### Pagination Strategy

**Cursor-based pagination** (preferred for infinite scroll):
```typescript
// Request
GET /api/chores/instances?cursor=abc123&limit=20

// Response
{
  data: [...],
  nextCursor: "def456",
  hasMore: true
}
```

**Offset-based pagination** (for page numbers):
```typescript
// Request
GET /api/audit/logs?page=3&limit=50

// Response
{
  data: [...],
  page: 3,
  totalPages: 12,
  totalCount: 573
}
```

**Guidelines:**
- Use cursor pagination for real-time lists (chores, transactions)
- Use offset pagination for admin/report views
- Default limit: 20 items
- Maximum limit: 100 items

### Caching Strategy (Redis - Future)

**Cache Layers:**
| Data Type | TTL | Invalidation |
|-----------|-----|--------------|
| Family settings | 1 hour | On update |
| Member profiles | 1 hour | On update |
| Dashboard summary | 5 minutes | On any relevant action |
| Screen time balance | 1 minute | On transaction |
| Module configurations | 1 hour | On update |

**Cache Keys:**
```
family:{familyId}:settings
family:{familyId}:members
member:{memberId}:profile
member:{memberId}:screentime:balance
family:{familyId}:dashboard:{date}
```

### Query Optimization Guidelines

- Use `select` to limit returned fields
- Avoid N+1 queries (use `include` in Prisma)
- Implement query timeouts (30 seconds max)
- Use read replicas for analytics queries (future)
- Batch related queries where possible

---

## 18. Internationalization (i18n)

### Multi-Language Support

**Initial Languages:**
- English (en-US) - Primary
- Spanish (es) - Planned
- French (fr) - Planned

**Implementation:**
- next-intl or react-i18next for translations
- JSON translation files per language
- Browser language detection with manual override
- Per-family language preference

**Translation Structure:**
```
/locales
├── en-US/
│   ├── common.json
│   ├── chores.json
│   ├── screentime.json
│   └── ...
├── es/
│   └── ...
└── fr/
    └── ...
```

### Date/Time/Currency Localization

**Date Formats:**
- Stored: ISO 8601 (UTC)
- Displayed: User's locale format
- Timezone: Family setting (affects display only)

**Time Formats:**
- 12-hour (en-US default)
- 24-hour (configurable)

**Currency:**
- Display only (no payment processing)
- Family setting: USD, EUR, GBP, CAD, AUD
- Used in: Shopping lists, credits display, maintenance costs

**Number Formats:**
- Decimal separator: Locale-based
- Thousands separator: Locale-based

### RTL Language Support (Future)

**Planned for:**
- Arabic (ar)
- Hebrew (he)

**Requirements:**
- CSS logical properties
- `dir="rtl"` attribute support
- Mirrored layouts
- Bi-directional text handling

### Content Considerations

- Age-appropriate translations (simpler language for younger kids)
- Emoji support (universal across languages)
- Character set support (UTF-8 throughout)
- String interpolation for dynamic content

---

## 19. Data Retention & Privacy

### Data Retention Policy

| Data Type | Retention Period | After Expiry |
|-----------|------------------|--------------|
| Active family data | Indefinite | N/A |
| Audit logs (security) | 1 year | Deleted |
| Audit logs (general) | 90 days | Deleted |
| Completed chore history | 1 year | Archived/summarized |
| Screen time transactions | 1 year | Archived/summarized |
| Credit transactions | 1 year | Archived/summarized |
| Health events | Indefinite | Manual deletion only |
| Deleted member data | 30 days | Permanently deleted |
| Guest sessions | 30 days after expiry | Deleted |
| Error logs | 30 days | Deleted |

### GDPR Compliance

**Data Subject Rights:**

1. **Right to Access:**
   - Parent can export all family data (JSON/CSV)
   - API: `GET /api/family/export`
   - Includes: members, chores, transactions, settings

2. **Right to Rectification:**
   - All user data is editable
   - History preserved in audit log

3. **Right to Erasure ("Right to be Forgotten"):**
   - Account deletion request via Settings
   - 30-day grace period (can be cancelled)
   - After 30 days: permanent deletion
   - API: `POST /api/family/delete-request`

4. **Right to Portability:**
   - Export data in standard formats (JSON, CSV)
   - Machine-readable format

5. **Right to Object:**
   - No marketing communications
   - No profiling or automated decisions

### Account Deletion Process

**Steps:**
1. Parent initiates deletion request
2. Confirmation email sent
3. 30-day countdown begins
4. Warning emails at: 7 days, 1 day remaining
5. After 30 days:
   - All personal data deleted
   - Audit logs anonymized
   - Files removed from storage
   - Database records hard-deleted

**Data Anonymization:**
- Names → "Deleted User"
- Emails → null
- PINs → null
- Avatars → removed
- Transaction history → aggregated, anonymized

### Privacy by Design

- Minimal data collection (only what's needed)
- Data encryption at rest and in transit
- No third-party analytics without consent
- No selling or sharing of data
- Self-hosted option for full control
- Local-first data storage (PWA cache)

### Consent Management

**Cookie Consent:**
- Essential cookies: Always on
- Analytics cookies: Opt-in (if external analytics added)
- No advertising cookies

**Data Processing Consent:**
- Collected during signup
- Revisable in Settings
- Granular controls for notifications

---

## 20. Backup & Recovery

### Backup Strategy

**Database Backups:**
| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Full backup | Daily (2 AM UTC) | 30 days | Off-site storage |
| Incremental | Every 6 hours | 7 days | Off-site storage |
| Transaction log | Continuous | 24 hours | Local + replicated |

**File Storage Backups:**
- Daily sync to secondary storage
- Versioning enabled (keep 5 versions)
- 30-day retention for deleted files

### Point-in-Time Recovery

**Capabilities:**
- Recover to any point within last 24 hours
- Full database restore within last 30 days
- Individual table/record recovery possible

**Recovery Time Objectives:**
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 6 hours

### Backup Implementation

**Docker Compose Addition:**
```yaml
services:
  backup:
    image: prodrigestivill/postgres-backup-local
    container_name: hearth-backup
    environment:
      - POSTGRES_HOST=db
      - POSTGRES_DB=hearth
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - SCHEDULE=@daily
      - BACKUP_KEEP_DAYS=30
      - BACKUP_KEEP_WEEKS=4
      - BACKUP_KEEP_MONTHS=6
    volumes:
      - ./backups:/backups
    depends_on:
      - db
    networks:
      - hearth-network
```

### Disaster Recovery Plan

**Scenarios:**

1. **Database Corruption:**
   - Stop application
   - Restore from latest backup
   - Apply transaction logs
   - Verify data integrity
   - Resume application

2. **Complete Data Loss:**
   - Provision new infrastructure
   - Restore database from off-site backup
   - Restore file storage from backup
   - Update DNS/configuration
   - Verify and resume

3. **Ransomware/Security Breach:**
   - Isolate affected systems
   - Assess scope of breach
   - Restore from known-good backup
   - Security audit before resume
   - Notify affected users if required

### Self-Hosted Backup Recommendations

For families self-hosting Hearth:
- Enable automatic database backups
- Store backups on separate drive/NAS
- Consider cloud backup (encrypted) for off-site
- Test restore procedure quarterly
- Document backup locations and procedures

---

## 21. API Versioning

### Versioning Strategy

**URL-based versioning:**
```
/api/v1/chores
/api/v1/members
/api/v2/chores  (future)
```

**Current Version:** v1

### Version Lifecycle

| Stage | Duration | Description |
|-------|----------|-------------|
| Current | Active | Fully supported, receives updates |
| Deprecated | 6 months | Bug fixes only, migration warnings |
| Sunset | 3 months | Read-only, strong warnings |
| Retired | - | Returns 410 Gone |

### Breaking Change Policy

**What Constitutes a Breaking Change:**
- Removing an endpoint
- Removing a required field
- Changing field types
- Changing authentication requirements
- Changing error response structure

**Non-Breaking Changes (no version bump):**
- Adding new endpoints
- Adding optional fields
- Adding new enum values
- Performance improvements
- Bug fixes

### Deprecation Process

1. **Announcement:** 6 months before deprecation
2. **Warning Headers:** `Deprecation: true`, `Sunset: <date>`
3. **Documentation:** Migration guide published
4. **Monitoring:** Track usage of deprecated endpoints
5. **Communication:** Email to active users (if applicable)
6. **Sunset:** Endpoint returns 410 after sunset date

### API Response Envelope

```typescript
// Standard response format
{
  "success": true,
  "data": { ... },
  "meta": {
    "apiVersion": "v1",
    "requestId": "abc-123",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  },
  "meta": {
    "apiVersion": "v1",
    "requestId": "abc-123"
  }
}
```

### Internal vs External API

**Internal API (v1):**
- Used by Hearth web/PWA app
- May change more frequently
- Authentication via session cookies

**Public API (future):**
- Stable, versioned endpoints
- OAuth2 authentication
- Rate limited
- Documentation via OpenAPI/Swagger

---

## 22. Future Considerations

- **Offline-first:** Full offline support with conflict resolution
- **Multi-family:** Support for blended families, shared custody schedules
- **Voice integration:** Alexa/Google Home for hands-free logging
- **Apple/Outlook Calendar:** Additional calendar provider support
- **Public API:** Third-party integrations
- **Mobile native apps:** React Native for iOS/Android (if PWA insufficient)
- **AI suggestions:** Smart meal suggestions, chore optimization
- **Gamification expansion:** Badges, achievements, family challenges

---

## 23. Project Name

**Hearth** - Chosen as the official project name.

*The hearth represents the heart of the home - a place where family gathers, warmth is shared, and the household comes together. It reflects the app's purpose of being the central hub for family life.*

**Rejected alternatives:** HomeOps, FamilyOS, Nest ERP, Houseflow, FamBoard, HomeBase

---

*This document is intended to evolve alongside implementation and user feedback.*

