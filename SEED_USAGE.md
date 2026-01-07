# Database Seed Usage Guide

## Running the Seed

```bash
npm run db:seed
```

## Important: Session Management

After running the seed script, you **must log out and log back in** because:

1. The seed script **deletes all existing data** (including families and members)
2. Your current browser session references the old (deleted) family/member IDs
3. API requests will fail with foreign key constraint errors until you re-login

## Steps After Seeding

1. **Log out** of the application (or clear cookies)
2. **Log in** with the new seeded credentials:
   - **Parent**: `sarah@example.com` / `password123`
   - **Child**: `Alice Smith` or `Bob Smith` / PIN: `1234`

## What the Seed Creates

- ✅ System marked as onboarded (skips onboarding flow)
- ✅ Test family: "The Smith Family"
- ✅ 1 Parent account (Sarah Smith)
- ✅ 2 Child accounts (Alice & Bob Smith)
- ✅ 3 Chore definitions with today's instances
- ✅ Screen time balances for each member
- ✅ Credit balances
- ✅ Shopping list with 3 items
- ✅ 3 To-do items
- ✅ 1 Calendar event (tomorrow's soccer practice)
- ✅ 7 Reward items

## Error: Foreign Key Constraint Violated

If you see this error after seeding:

```
Foreign key constraint violated on the constraint: `sick_mode_settings_familyId_fkey`
```

**Solution**: Log out and log back in with the new credentials.

## Development Workflow

For testing/development, this workflow is recommended:

```bash
# 1. Reset and seed database
npm run db:seed

# 2. Log out (or clear application cookies)

# 3. Log in with seeded credentials
# Parent: sarah@example.com / password123
# OR
# Child: Alice Smith / PIN: 1234

# 4. Test features
```

## Seed Script Location

The seed script is located at: `/prisma/seed.ts`

You can customize the test data by editing this file.
