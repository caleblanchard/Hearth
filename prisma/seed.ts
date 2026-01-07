import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hash } from 'bcrypt';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.choreInstance.deleteMany();
  await prisma.choreAssignment.deleteMany();
  await prisma.choreSchedule.deleteMany();
  await prisma.choreDefinition.deleteMany();
  await prisma.screenTimeTransaction.deleteMany();
  await prisma.gracePeriodLog.deleteMany();
  await prisma.screenTimeGraceSettings.deleteMany();
  await prisma.screenTimeBalance.deleteMany();
  await prisma.screenTimeSettings.deleteMany();
  await prisma.creditTransaction.deleteMany();
  await prisma.creditBalance.deleteMany();
  await prisma.shoppingItem.deleteMany();
  await prisma.shoppingList.deleteMany();
  await prisma.todoItem.deleteMany();
  await prisma.calendarEventAssignment.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.moduleConfiguration.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.family.deleteMany();

  // Create a test family
  console.log('👨‍👩‍👧‍👦 Creating test family...');
  const family = await prisma.family.create({
    data: {
      name: 'The Smith Family',
      timezone: 'America/New_York',
      settings: {
        currency: 'USD',
        weekStartDay: 'SUNDAY',
      },
    },
  });

  // Mark onboarding as complete so we skip onboarding flow
  console.log('✓ Marking onboarding as complete...');
  await prisma.systemConfig.upsert({
    where: { id: 'system' },
    update: {
      onboardingComplete: true,
      setupCompletedAt: new Date(),
    },
    create: {
      id: 'system',
      onboardingComplete: true,
      setupCompletedAt: new Date(),
      version: '0.1.0',
    },
  });

  // Create parent account
  console.log('👤 Creating parent account...');
  const parentPasswordHash = await hash('password123', 12);
  const parent = await prisma.familyMember.create({
    data: {
      familyId: family.id,
      name: 'Sarah Smith',
      email: 'sarah@example.com',
      passwordHash: parentPasswordHash,
      role: 'PARENT',
      birthDate: new Date('1985-06-15'),
      isActive: true,
    },
  });

  // Create children accounts
  console.log('👧👦 Creating children accounts...');
  const childPin = await hash('1234', 12);

  const alice = await prisma.familyMember.create({
    data: {
      familyId: family.id,
      name: 'Alice Smith',
      email: null,
      pin: childPin,
      role: 'CHILD',
      birthDate: new Date('2015-03-20'),
      isActive: true,
    },
  });

  const bob = await prisma.familyMember.create({
    data: {
      familyId: family.id,
      name: 'Bob Smith',
      email: null,
      pin: childPin,
      role: 'CHILD',
      birthDate: new Date('2017-09-10'),
      isActive: true,
    },
  });

  // Enable modules
  console.log('⚙️  Enabling modules...');
  await prisma.moduleConfiguration.createMany({
    data: [
      { familyId: family.id, moduleId: 'CHORES', isEnabled: true, enabledAt: new Date() },
      { familyId: family.id, moduleId: 'SCREEN_TIME', isEnabled: true, enabledAt: new Date() },
      { familyId: family.id, moduleId: 'CREDITS', isEnabled: true, enabledAt: new Date() },
      { familyId: family.id, moduleId: 'SHOPPING', isEnabled: true, enabledAt: new Date() },
      { familyId: family.id, moduleId: 'CALENDAR', isEnabled: true, enabledAt: new Date() },
      { familyId: family.id, moduleId: 'TODOS', isEnabled: true, enabledAt: new Date() },
    ],
  });

  // Create chore definitions
  console.log('🧹 Creating chore definitions...');
  const makeYourBed = await prisma.choreDefinition.create({
    data: {
      familyId: family.id,
      name: 'Make Your Bed',
      description: 'Make your bed neatly with pillows arranged',
      instructions: '1. Pull up sheets\n2. Straighten comforter\n3. Arrange pillows',
      estimatedMinutes: 5,
      difficulty: 'EASY',
      creditValue: 5,
      minimumAge: 6,
      iconName: 'bed',
      isActive: true,
    },
  });

  const dishwasher = await prisma.choreDefinition.create({
    data: {
      familyId: family.id,
      name: 'Empty Dishwasher',
      description: 'Unload clean dishes and put them away',
      instructions: '1. Check dishes are clean\n2. Put dishes in cupboards\n3. Put silverware in drawer',
      estimatedMinutes: 10,
      difficulty: 'MEDIUM',
      creditValue: 10,
      minimumAge: 8,
      iconName: 'dishwasher',
      isActive: true,
    },
  });

  const trash = await prisma.choreDefinition.create({
    data: {
      familyId: family.id,
      name: 'Take Out Trash',
      description: 'Take trash bins to curb',
      instructions: '1. Collect all trash bags\n2. Put in bin\n3. Roll bin to curb',
      estimatedMinutes: 10,
      difficulty: 'MEDIUM',
      creditValue: 15,
      minimumAge: 10,
      iconName: 'trash',
      isActive: true,
    },
  });

  // Create chore schedules
  console.log('📅 Creating chore schedules...');
  const bedSchedule = await prisma.choreSchedule.create({
    data: {
      choreDefinitionId: makeYourBed.id,
      assignmentType: 'FIXED',
      frequency: 'DAILY',
      requiresApproval: false,
      requiresPhoto: false,
      isActive: true,
    },
  });

  const dishwasherSchedule = await prisma.choreSchedule.create({
    data: {
      choreDefinitionId: dishwasher.id,
      assignmentType: 'ROTATING',
      frequency: 'DAILY',
      requiresApproval: true,
      requiresPhoto: false,
      isActive: true,
    },
  });

  // Create chore assignments
  console.log('👷 Creating chore assignments...');
  await prisma.choreAssignment.createMany({
    data: [
      { choreScheduleId: bedSchedule.id, memberId: alice.id, isActive: true },
      { choreScheduleId: bedSchedule.id, memberId: bob.id, isActive: true },
      { choreScheduleId: dishwasherSchedule.id, memberId: alice.id, rotationOrder: 1, isActive: true },
      { choreScheduleId: dishwasherSchedule.id, memberId: bob.id, rotationOrder: 2, isActive: true },
    ],
  });

  // Create today's chore instances
  console.log('✅ Creating today\'s chore instances...');
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  await prisma.choreInstance.createMany({
    data: [
      {
        choreScheduleId: bedSchedule.id,
        assignedToId: alice.id,
        dueDate: today,
        status: 'PENDING',
      },
      {
        choreScheduleId: bedSchedule.id,
        assignedToId: bob.id,
        dueDate: today,
        status: 'PENDING',
      },
      {
        choreScheduleId: dishwasherSchedule.id,
        assignedToId: alice.id,
        dueDate: today,
        status: 'PENDING',
      },
    ],
  });

  // Set up screen time for children
  console.log('⏰ Setting up screen time...');
  await prisma.screenTimeSettings.createMany({
    data: [
      {
        memberId: alice.id,
        weeklyAllocationMinutes: 0, // No general allocation - only type-specific allowances
        resetDay: 'SUNDAY',
        rolloverType: 'CAPPED',
        rolloverCapMinutes: 60,
        isActive: true,
      },
      {
        memberId: bob.id,
        weeklyAllocationMinutes: 0, // No general allocation - only type-specific allowances
        resetDay: 'SUNDAY',
        rolloverType: 'NONE',
        isActive: true,
      },
    ],
  });

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  await prisma.screenTimeBalance.createMany({
    data: [
      {
        memberId: alice.id,
        currentBalanceMinutes: 380,
        weekStartDate: weekStart,
      },
      {
        memberId: bob.id,
        currentBalanceMinutes: 250,
        weekStartDate: weekStart,
      },
    ],
  });

  // Set up grace period settings
  await prisma.screenTimeGraceSettings.createMany({
    data: [
      {
        memberId: alice.id,
        gracePeriodMinutes: 15,
        maxGracePerDay: 1,
        maxGracePerWeek: 3,
        graceRepaymentMode: 'DEDUCT_NEXT_WEEK',
        lowBalanceWarningMinutes: 10,
        requiresApproval: false,
      },
      {
        memberId: bob.id,
        gracePeriodMinutes: 10,
        maxGracePerDay: 1,
        maxGracePerWeek: 2,
        graceRepaymentMode: 'DEDUCT_NEXT_WEEK',
        lowBalanceWarningMinutes: 15,
        requiresApproval: true,
      },
    ],
  });

  // Set up credits
  console.log('💰 Setting up credits...');
  await prisma.creditBalance.createMany({
    data: [
      {
        memberId: alice.id,
        currentBalance: 50,
        lifetimeEarned: 150,
        lifetimeSpent: 100,
      },
      {
        memberId: bob.id,
        currentBalance: 30,
        lifetimeEarned: 80,
        lifetimeSpent: 50,
      },
    ],
  });

  // Create shopping list
  console.log('🛒 Creating shopping list...');
  const shoppingList = await prisma.shoppingList.create({
    data: {
      familyId: family.id,
      name: 'Weekly Groceries',
      isActive: true,
    },
  });

  await prisma.shoppingItem.createMany({
    data: [
      {
        listId: shoppingList.id,
        name: 'Milk',
        quantity: 2,
        unit: 'gallon',
        category: 'Dairy',
        priority: 'NEEDED_SOON',
        status: 'PENDING',
        requestedById: alice.id,
        addedById: parent.id,
      },
      {
        listId: shoppingList.id,
        name: 'Bread',
        quantity: 1,
        unit: 'loaf',
        category: 'Bakery',
        priority: 'NORMAL',
        status: 'PENDING',
        requestedById: parent.id,
        addedById: parent.id,
      },
      {
        listId: shoppingList.id,
        name: 'Apples',
        quantity: 6,
        unit: 'count',
        category: 'Produce',
        priority: 'NORMAL',
        status: 'PENDING',
        requestedById: bob.id,
        addedById: parent.id,
      },
    ],
  });

  // Create to-do items
  console.log('📝 Creating to-do items...');
  await prisma.todoItem.createMany({
    data: [
      {
        familyId: family.id,
        title: 'Schedule dentist appointments',
        description: 'Book checkups for both kids',
        createdById: parent.id,
        assignedToId: parent.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        priority: 'HIGH',
        status: 'PENDING',
      },
      {
        familyId: family.id,
        title: 'Buy birthday present for grandma',
        createdById: parent.id,
        assignedToId: parent.id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        priority: 'MEDIUM',
        status: 'PENDING',
      },
      {
        familyId: family.id,
        title: 'Practice piano',
        description: '30 minutes daily',
        createdById: parent.id,
        assignedToId: alice.id,
        priority: 'MEDIUM',
        status: 'PENDING',
      },
    ],
  });

  // Create calendar events
  console.log('📆 Creating calendar events...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(15, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(16, 0, 0, 0);

  const soccerPractice = await prisma.calendarEvent.create({
    data: {
      familyId: family.id,
      title: 'Soccer Practice',
      description: 'Weekly soccer practice at the park',
      startTime: tomorrow,
      endTime: tomorrowEnd,
      location: 'City Park Field 3',
      eventType: 'INTERNAL',
      color: '#10b981',
      isAllDay: false,
      createdById: parent.id,
    },
  });

  await prisma.calendarEventAssignment.create({
    data: {
      eventId: soccerPractice.id,
      memberId: alice.id,
    },
  });

  console.log('✨ Seeding completed!');
  console.log('\n📊 Test Data Summary:');
  console.log('-------------------');
  console.log('✓ Onboarding marked as complete (will skip onboarding flow)');
  console.log('Family: The Smith Family');
  console.log('\nAccounts:');
  console.log('  Parent: sarah@example.com / password123');
  console.log('  Child: Alice Smith / PIN: 1234');
  console.log('  Child: Bob Smith / PIN: 1234');
  console.log('\nData Created:');
  console.log('  ✓ 3 Chore definitions');
  console.log('  ✓ 3 Chore instances for today');
  console.log('  ✓ Screen time balances');
  console.log('  ✓ Credit balances');
  console.log('  ✓ Shopping list with 3 items');
  console.log('  ✓ 3 To-do items');
  console.log('  ✓ 1 Calendar event');

  // Create rewards
  console.log('🎁 Creating rewards...');
  await prisma.rewardItem.createMany({
    data: [
      {
        familyId: family.id,
        name: '30 Minutes Extra Screen Time',
        description: 'Add 30 extra minutes to your screen time balance',
        category: 'SCREEN_TIME',
        costCredits: 10,
        status: 'ACTIVE',
        createdById: parent.id,
      },
      {
        familyId: family.id,
        name: 'Choose Tonight\'s Dinner',
        description: 'Pick what the family eats for dinner',
        category: 'PRIVILEGE',
        costCredits: 15,
        status: 'ACTIVE',
        createdById: parent.id,
      },
      {
        familyId: family.id,
        name: 'Movie Night Pick',
        description: 'Choose the movie for family movie night',
        category: 'PRIVILEGE',
        costCredits: 20,
        status: 'ACTIVE',
        createdById: parent.id,
      },
      {
        familyId: family.id,
        name: 'Ice Cream Trip',
        description: 'A special trip to get ice cream',
        category: 'EXPERIENCE',
        costCredits: 25,
        status: 'ACTIVE',
        createdById: parent.id,
      },
      {
        familyId: family.id,
        name: 'New Book',
        description: 'Pick a new book from the bookstore',
        category: 'ITEM',
        costCredits: 30,
        quantity: 5,
        status: 'ACTIVE',
        createdById: parent.id,
      },
      {
        familyId: family.id,
        name: 'Stay Up Late Pass',
        description: 'Stay up 1 hour past bedtime on a weekend',
        category: 'PRIVILEGE',
        costCredits: 35,
        status: 'ACTIVE',
        createdById: parent.id,
      },
      {
        familyId: family.id,
        name: 'Video Game',
        description: 'A new video game of your choice (up to $30)',
        category: 'ITEM',
        costCredits: 100,
        quantity: 2,
        status: 'ACTIVE',
        createdById: parent.id,
      },
    ],
  });

  console.log('  ✓ 7 Rewards');
  console.log('\n🎉 Ready to test!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
