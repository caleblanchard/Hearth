# Hearth - Household ERP System

A family-first household management system that helps run a home the same way an ERP helps run a business: managing people, time, tasks, resources, and routines in one cohesive system.

## Features

### Core Modules (MVP)
- **Family & Roles** - Define who exists in the system and what they can do
- **Chores** - Distribute household responsibilities fairly with rotating/fixed assignments
- **Screen Time** - Fair, transparent screen usage management (trust-based ledger)
- **To-Do List** - Capture non-routine household tasks
- **Shopping List** - Prevent duplicate buying and forgotten items
- **Calendar** - Time-based planning with Google Calendar sync

### Extended Modules (Future)
- Routines & Checklists
- Meal Planning & Recipes
- Household Inventory
- Health & Medications
- Projects
- Family Communication Board
- Transportation Tracker
- Pet Care
- Home Maintenance
- Document Vault

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), React 18+, Tailwind CSS
- **Backend:** Next.js API Routes / Server Actions
- **Database:** PostgreSQL 16+
- **ORM:** Prisma
- **Authentication:** NextAuth.js
- **Containerization:** Docker, Docker Compose
- **Testing:** Jest, React Testing Library, Playwright

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

3. Start the development environment:
```bash
docker-compose up -d hearth-db
```

4. Run database migrations:
```bash
npm install
npx prisma migrate dev --name init
```

5. Generate Prisma Client:
```bash
npx prisma generate
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

2. Set up PostgreSQL database and update `.env` with your database URL:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/hearth_db?schema=public"
```

3. Run database migrations:
```bash
npx prisma migrate dev --name init
```

4. Generate Prisma Client:
```bash
npx prisma generate
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

### Start with Prisma Studio (database GUI):
```bash
docker-compose --profile tools up -d
```

Access Prisma Studio at [http://localhost:5555](http://localhost:5555)

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

## Database Commands

### Create a new migration:
```bash
npx prisma migrate dev --name <migration-name>
```

### Reset database (WARNING: deletes all data):
```bash
npx prisma migrate reset
```

### Open Prisma Studio (database GUI):
```bash
npx prisma studio
```

### Generate Prisma Client after schema changes:
```bash
npx prisma generate
```

## Project Structure

```
hearth/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── (auth)/            # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── layout.tsx         # Root layout
├── components/            # React components
├── lib/                   # Utility functions
├── prisma/               # Prisma schema and migrations
│   └── schema.prisma     # Database schema
├── public/               # Static files
├── types/                # TypeScript type definitions
├── docker-compose.yml    # Docker services configuration
├── Dockerfile            # Production Docker image
├── Dockerfile.dev        # Development Docker image
└── .env.example          # Environment variables template
```

## Environment Variables

See `.env.example` for all available environment variables. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - Secret for NextAuth.js (generate with `openssl rand -base64 32`)

## Design Principles

- **Single Source of Truth** - One system for chores, meals, schedules, etc.
- **Modular** - Features can be enabled/disabled per family
- **Rule-driven** - Automation instead of manual micromanagement
- **Age-aware** - Features adapt based on child age
- **Cross-module integration** - Data flows between modules naturally
- **Trust-based** - System tracks and informs rather than enforces/blocks
- **Privacy-first** - Self-hostable, no external data sharing

## Development Roadmap

### Phase 1: Foundation ✅
- [x] Project setup (Next.js, Tailwind, Prisma, Docker)
- [x] Database schema for Family & Members
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

## License

This project is licensed under the ISC License.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

For issues and questions, please open an issue on GitHub.
