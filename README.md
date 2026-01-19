# Hearth - Household ERP System

A family-first household management system that helps run a home the same way an ERP helps run a business: managing people, time, tasks, resources, and routines in one cohesive system.

## Features

### Core Modules
- **Family & Roles** - Define who exists in the system and what they can do
- **Chores** - Distribute household responsibilities fairly with rotating/fixed assignments
- **Screen Time** - Fair, transparent screen usage management (trust-based ledger) with types, allowances, and grace periods
- **To-Do List** - Capture non-routine household tasks
- **Shopping List** - Prevent duplicate buying and forgotten items
- **Calendar** - Time-based planning with Google Calendar sync and external calendar subscriptions (iCal)

### Extended Modules
- **Routines & Checklists** - Morning/evening routines with completion tracking
- **Meal Planning & Recipes** - Weekly meal planning, recipe management, and leftover tracking
- **Household Inventory** - Track household items with expiration dates and low-stock alerts
- **Health & Medications** - Medication schedules, health event tracking, and temperature logs
- **Projects** - Task management with dependencies, templates, and Gantt-style views
- **Family Communication Board** - Family-wide messaging and announcements
- **Transportation Tracker** - Carpool management, schedules, and location tracking
- **Pet Care** - Pet profiles, feeding schedules, and care tracking
- **Home Maintenance** - Maintenance schedules and task tracking
- **Document Vault** - Secure document storage with sharing and expiration tracking
- **Financial Tracking** - Budgets, transactions, savings goals, and analytics
- **Rewards System** - Credit-based rewards with redemption tracking
- **Leaderboard** - Gamification with achievement tracking
- **Automation Rules** - Rule engine for automating household tasks and notifications
- **Kiosk Mode** - Public dashboard for shared devices with PIN authentication
- **PWA Support** - Progressive Web App with offline support and push notifications

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), React 18+, Tailwind CSS
- **Backend:** Next.js API Routes / Server Actions
- **Database:** PostgreSQL 16+
- **ORM:** Prisma 7+
- **Authentication:** NextAuth.js v5
- **Containerization:** Docker, Docker Compose
- **Testing:** Jest, React Testing Library
- **Caching/Rate Limiting:** Redis (ioredis) with in-memory fallback
- **Calendar Integration:** Google Calendar API, iCal.js for external calendars
- **Push Notifications:** Web Push API with VAPID keys
- **PWA:** next-pwa with service worker support

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose (recommended)
- OR PostgreSQL 16+ installed locally

### Quick Start with Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd Hearth
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start the Supabase local environment:
```bash
supabase start
```

4. Apply database migrations:
```bash
supabase db push
```

5. Generate Supabase types:
```bash
supabase gen types typescript --local > lib/database.types.ts
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

### Alternative: Local Development (Without Docker)

1. Install dependencies:
```bash
npm install
```

2. Start the Supabase local environment:
```bash
supabase start
```

3. Apply database migrations:
```bash
supabase db push
```

4. Generate Supabase types:
```bash
supabase gen types typescript --local > lib/database.types.ts
```

5. Start the development server:
```bash
npm run dev
```

## Docker Commands

### Start all services (development):
```bash
docker-compose up -d
```

### Start only the database:
```bash
docker-compose up -d hearth-db
```

### Supabase Studio (database GUI):

Access Supabase Studio at [http://127.0.0.1:54323](http://127.0.0.1:54323) when running `supabase start`.

### View logs:
```bash
docker-compose logs -f hearth-app-dev
```

### Stop all services:
```bash
docker-compose down
```

### Stop and remove all data:
```bash
docker-compose down -v
```

### Rebuild containers:
```bash
docker-compose up -d --build
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run type-check` - Type check with TypeScript
- `npm run db:seed` - Seed the database with initial data

## Database Commands

### Create a new migration:
```bash
supabase migration new <migration-name>
```

### Apply migrations:
```bash
supabase db push
```

### Reset database (WARNING: deletes all data):
```bash
supabase db reset
```

### Generate Supabase types after schema changes:
```bash
supabase gen types typescript --local > lib/database.types.ts
```

## Project Structure

```
hearth/
├── app/                           # Next.js app directory
│   ├── api/                      # API routes (150+ endpoints)
│   ├── auth/                     # Authentication pages
│   ├── dashboard/                # Dashboard pages (30+ modules)
│   ├── kiosk/                    # Kiosk mode interface
│   ├── onboarding/               # Onboarding flow
│   └── layout.tsx                # Root layout
├── components/                   # React components
│   ├── auth/                     # Authentication components
│   ├── dashboard/                # Dashboard components & widgets
│   ├── kiosk/                    # Kiosk mode components
│   └── ui/                       # Reusable UI components
├── lib/                          # Utility functions
│   ├── integrations/             # External integrations (Google Calendar, iCal)
│   └── test-utils/               # Testing utilities
├── supabase/                     # Supabase configuration and migrations
├── hooks/                        # React hooks
├── public/                       # Static files (PWA manifest, service worker)
├── types/                        # TypeScript type definitions
├── __tests__/                    # Test files
│   ├── integration/              # API integration tests
│   ├── components/               # Component tests
│   └── unit/                     # Unit tests
├── docs/                         # Documentation
├── scripts/                      # Utility scripts
├── docker-compose.yml            # Docker services configuration
├── Dockerfile                    # Production Docker image
├── Dockerfile.dev                 # Development Docker image
└── .env.example                   # Environment variables template
```

## Environment Variables

See `.env.example` for all available environment variables. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - Secret for NextAuth.js (generate with `openssl rand -base64 32`)
- `REDIS_URL` - Redis connection string (optional, falls back to in-memory rate limiting)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (for Calendar sync)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - VAPID public key for push notifications
- `VAPID_PRIVATE_KEY` - VAPID private key for push notifications
- `CRON_SECRET` - Secret for cron job authentication

## Design Principles

- **Single Source of Truth** - One system for chores, meals, schedules, etc.
- **Modular** - Features can be enabled/disabled per family
- **Rule-driven** - Automation instead of manual micromanagement (8 trigger types, 8 action types)
- **Age-aware** - Features adapt based on child age
- **Cross-module integration** - Data flows between modules naturally
- **Trust-based** - System tracks and informs rather than enforces/blocks
- **Privacy-first** - Self-hostable, no external data sharing
- **Test-Driven Development** - Comprehensive test coverage with Jest and React Testing Library
- **PWA-First** - Offline support, push notifications, and installable as an app

## Testing

This project follows Test-Driven Development (TDD) methodology. See `CLAUDE.md` for detailed testing guidelines.

- **Integration Tests:** Comprehensive API endpoint testing (authentication, authorization, validation, error handling)
- **Component Tests:** UI component testing with React Testing Library
- **Unit Tests:** Utility function and hook testing

Run tests with:
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npx jest <path>             # Run specific test file
```

## Deployment

### Docker Production Build

The project includes a multi-stage Dockerfile optimized for production:

```bash
docker buildx build --platform linux/amd64 --file ./Dockerfile --tag hearth:latest .
```

### Environment Setup

1. Copy `.env.example` to `.env.production`
2. Configure all required environment variables
3. Generate VAPID keys for push notifications:
   ```bash
   node scripts/generate-vapid-keys.js
   ```
4. Run database migrations:
   ```bash
   supabase db push
   ```

See `DEPLOYMENT.md` and `DEPLOYMENT-PORTAINER.md` for detailed deployment instructions.

## Development Status

### ✅ Completed Features
- **Foundation**
  - [x] Project setup (Next.js, Tailwind, Supabase, Docker)
  - [x] Database schema for Family & Members
  - [x] Authentication (parent login, child PIN)
  - [x] Basic dashboard shell
  - [x] PWA manifest and service worker
  - [x] Push notifications with VAPID keys

- **Core Features**
  - [x] Chore definitions and scheduling
  - [x] Chore instances and completion flow
  - [x] Screen time tracking (balance, logging, types, allowances)
  - [x] Shopping list management
  - [x] Calendar (internal events + Google Calendar sync + external iCal subscriptions)
  - [x] To-do list management

- **Extended Features**
  - [x] Routines & Checklists
  - [x] Meal Planning & Recipes (with URL import)
  - [x] Household Inventory
  - [x] Health & Medications
  - [x] Projects (with dependencies and templates)
  - [x] Family Communication Board
  - [x] Transportation Tracker
  - [x] Pet Care
  - [x] Home Maintenance
  - [x] Document Vault
  - [x] Financial Tracking
  - [x] Rewards System
  - [x] Leaderboard
  - [x] Automation Rules Engine
  - [x] Kiosk Mode

- **Integration & Polish**
  - [x] Google Calendar sync
  - [x] Credits/allowance system
  - [x] Push notifications
  - [x] Kiosk mode with auto-lock
  - [x] Parent approval workflows
  - [x] Rules engine (8 trigger types, 8 action types)
  - [x] Rate limiting (Redis with in-memory fallback)
  - [x] Audit logging

### 🚧 In Progress / Future Enhancements
- [ ] Age-appropriate UI variants
- [ ] Celebration animations
- [ ] Advanced analytics dashboard
- [ ] Notification center UI
- [ ] File upload integration (photos for chores, recipes, pets, etc.)
- [ ] Advanced project features (Gantt charts, resource allocation)

## License

This project is licensed under the ISC License.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

For issues and questions, please open an issue on GitHub.
