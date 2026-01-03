export interface ProjectTaskTemplate {
  name: string;
  description: string;
  estimatedHours: number;
  daysFromStart?: number; // How many days after project start this task should be due
  dependsOn?: string[]; // Array of task names this task depends on
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'event' | 'home' | 'travel' | 'personal';
  estimatedDays: number;
  suggestedBudget: number;
  tasks: ProjectTaskTemplate[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'birthday-party',
    name: 'Birthday Party',
    description: 'Plan and execute a birthday party',
    category: 'event',
    estimatedDays: 30,
    suggestedBudget: 500,
    tasks: [
      {
        name: 'Choose theme and guest list',
        description: 'Decide on party theme and create initial guest list',
        estimatedHours: 2,
        daysFromStart: 3,
      },
      {
        name: 'Send invitations',
        description: 'Send invitations to all guests',
        estimatedHours: 1,
        daysFromStart: 21,
        dependsOn: ['Choose theme and guest list'],
      },
      {
        name: 'Book venue or prepare home',
        description: 'Reserve venue or prepare home for party',
        estimatedHours: 3,
        daysFromStart: 14,
        dependsOn: ['Choose theme and guest list'],
      },
      {
        name: 'Order cake',
        description: 'Order birthday cake from bakery',
        estimatedHours: 1,
        daysFromStart: 10,
      },
      {
        name: 'Plan activities and games',
        description: 'Plan party activities, games, and entertainment',
        estimatedHours: 2,
        daysFromStart: 14,
        dependsOn: ['Choose theme and guest list'],
      },
      {
        name: 'Buy decorations',
        description: 'Purchase party decorations',
        estimatedHours: 2,
        daysFromStart: 7,
        dependsOn: ['Choose theme and guest list'],
      },
      {
        name: 'Buy party supplies',
        description: 'Purchase plates, cups, napkins, utensils',
        estimatedHours: 1,
        daysFromStart: 5,
      },
      {
        name: 'Prepare food and drinks',
        description: 'Prepare or order food and beverages',
        estimatedHours: 4,
        daysFromStart: 1,
      },
      {
        name: 'Set up party area',
        description: 'Decorate and set up party space',
        estimatedHours: 3,
        daysFromStart: 0,
        dependsOn: ['Buy decorations', 'Book venue or prepare home'],
      },
      {
        name: 'Party day execution',
        description: 'Host the party and coordinate activities',
        estimatedHours: 4,
        daysFromStart: 0,
        dependsOn: ['Set up party area', 'Prepare food and drinks', 'Order cake'],
      },
    ],
  },
  {
    id: 'home-renovation',
    name: 'Home Renovation',
    description: 'Plan and execute a home renovation project',
    category: 'home',
    estimatedDays: 90,
    suggestedBudget: 10000,
    tasks: [
      {
        name: 'Define scope and budget',
        description: 'Determine what needs to be renovated and set budget',
        estimatedHours: 4,
        daysFromStart: 3,
      },
      {
        name: 'Research contractors',
        description: 'Research and shortlist potential contractors',
        estimatedHours: 6,
        daysFromStart: 10,
        dependsOn: ['Define scope and budget'],
      },
      {
        name: 'Get quotes',
        description: 'Get detailed quotes from multiple contractors',
        estimatedHours: 8,
        daysFromStart: 20,
        dependsOn: ['Research contractors'],
      },
      {
        name: 'Select contractor',
        description: 'Choose contractor and sign contract',
        estimatedHours: 3,
        daysFromStart: 25,
        dependsOn: ['Get quotes'],
      },
      {
        name: 'Obtain permits',
        description: 'Apply for and obtain necessary permits',
        estimatedHours: 4,
        daysFromStart: 30,
        dependsOn: ['Select contractor'],
      },
      {
        name: 'Order materials',
        description: 'Order all necessary materials and fixtures',
        estimatedHours: 6,
        daysFromStart: 35,
        dependsOn: ['Select contractor'],
      },
      {
        name: 'Prepare work area',
        description: 'Clear and prepare area for renovation',
        estimatedHours: 8,
        daysFromStart: 40,
        dependsOn: ['Obtain permits'],
      },
      {
        name: 'Demolition',
        description: 'Remove old fixtures and structures',
        estimatedHours: 16,
        daysFromStart: 45,
        dependsOn: ['Prepare work area', 'Order materials'],
      },
      {
        name: 'Rough work',
        description: 'Complete framing, plumbing, electrical rough-in',
        estimatedHours: 40,
        daysFromStart: 55,
        dependsOn: ['Demolition'],
      },
      {
        name: 'Installation',
        description: 'Install new fixtures, flooring, cabinets',
        estimatedHours: 32,
        daysFromStart: 70,
        dependsOn: ['Rough work'],
      },
      {
        name: 'Finishing touches',
        description: 'Paint, trim work, final installations',
        estimatedHours: 24,
        daysFromStart: 80,
        dependsOn: ['Installation'],
      },
      {
        name: 'Final inspection',
        description: 'Schedule and complete final inspection',
        estimatedHours: 2,
        daysFromStart: 90,
        dependsOn: ['Finishing touches'],
      },
    ],
  },
  {
    id: 'vacation-planning',
    name: 'Vacation Planning',
    description: 'Plan a family vacation from start to finish',
    category: 'travel',
    estimatedDays: 60,
    suggestedBudget: 3000,
    tasks: [
      {
        name: 'Choose destination',
        description: 'Research and decide on vacation destination',
        estimatedHours: 4,
        daysFromStart: 5,
      },
      {
        name: 'Set budget',
        description: 'Determine total budget and allocate to categories',
        estimatedHours: 2,
        daysFromStart: 7,
        dependsOn: ['Choose destination'],
      },
      {
        name: 'Book flights',
        description: 'Research and book airfare or transportation',
        estimatedHours: 3,
        daysFromStart: 45,
        dependsOn: ['Set budget'],
      },
      {
        name: 'Book accommodation',
        description: 'Reserve hotel, rental, or other lodging',
        estimatedHours: 4,
        daysFromStart: 45,
        dependsOn: ['Set budget'],
      },
      {
        name: 'Plan activities',
        description: 'Research and plan activities and attractions',
        estimatedHours: 6,
        daysFromStart: 30,
        dependsOn: ['Choose destination'],
      },
      {
        name: 'Make reservations',
        description: 'Book tours, restaurants, and activities',
        estimatedHours: 3,
        daysFromStart: 21,
        dependsOn: ['Plan activities'],
      },
      {
        name: 'Check travel documents',
        description: 'Verify passports, visas, and other documents',
        estimatedHours: 2,
        daysFromStart: 30,
      },
      {
        name: 'Arrange pet care',
        description: 'Arrange care for pets while away',
        estimatedHours: 2,
        daysFromStart: 14,
      },
      {
        name: 'Plan packing list',
        description: 'Create comprehensive packing list',
        estimatedHours: 2,
        daysFromStart: 10,
      },
      {
        name: 'Pack bags',
        description: 'Pack all luggage and carry-ons',
        estimatedHours: 3,
        daysFromStart: 1,
        dependsOn: ['Plan packing list'],
      },
      {
        name: 'Prepare home',
        description: 'Secure home, stop mail, adjust thermostats',
        estimatedHours: 2,
        daysFromStart: 0,
      },
    ],
  },
  {
    id: 'moving-house',
    name: 'Moving House',
    description: 'Organize and execute a household move',
    category: 'home',
    estimatedDays: 60,
    suggestedBudget: 2000,
    tasks: [
      {
        name: 'Create moving timeline',
        description: 'Plan out all moving tasks and deadlines',
        estimatedHours: 2,
        daysFromStart: 3,
      },
      {
        name: 'Research moving companies',
        description: 'Get quotes from multiple moving companies',
        estimatedHours: 4,
        daysFromStart: 45,
        dependsOn: ['Create moving timeline'],
      },
      {
        name: 'Book movers',
        description: 'Select and book moving company',
        estimatedHours: 2,
        daysFromStart: 40,
        dependsOn: ['Research moving companies'],
      },
      {
        name: 'Order packing supplies',
        description: 'Purchase boxes, tape, bubble wrap, labels',
        estimatedHours: 2,
        daysFromStart: 30,
      },
      {
        name: 'Declutter and donate',
        description: 'Sort through belongings and donate unwanted items',
        estimatedHours: 16,
        daysFromStart: 35,
      },
      {
        name: 'Notify utilities',
        description: 'Arrange disconnect/connect for utilities',
        estimatedHours: 3,
        daysFromStart: 30,
      },
      {
        name: 'Change address',
        description: 'Update address with postal service, banks, etc.',
        estimatedHours: 2,
        daysFromStart: 14,
      },
      {
        name: 'Pack non-essentials',
        description: 'Pack items not needed before move',
        estimatedHours: 20,
        daysFromStart: 20,
        dependsOn: ['Order packing supplies', 'Declutter and donate'],
      },
      {
        name: 'Pack essentials box',
        description: 'Pack box with items needed first day',
        estimatedHours: 2,
        daysFromStart: 2,
      },
      {
        name: 'Final packing',
        description: 'Pack remaining items',
        estimatedHours: 8,
        daysFromStart: 1,
        dependsOn: ['Pack non-essentials'],
      },
      {
        name: 'Clean old home',
        description: 'Deep clean the old residence',
        estimatedHours: 6,
        daysFromStart: 0,
      },
      {
        name: 'Moving day coordination',
        description: 'Coordinate movers and oversee move',
        estimatedHours: 8,
        daysFromStart: 0,
        dependsOn: ['Final packing'],
      },
    ],
  },
  {
    id: 'wedding-planning',
    name: 'Wedding Planning',
    description: 'Plan a wedding celebration',
    category: 'event',
    estimatedDays: 180,
    suggestedBudget: 15000,
    tasks: [
      {
        name: 'Set budget and guest count',
        description: 'Determine overall budget and approximate guest count',
        estimatedHours: 3,
        daysFromStart: 5,
      },
      {
        name: 'Choose wedding date',
        description: 'Select and confirm wedding date',
        estimatedHours: 2,
        daysFromStart: 7,
        dependsOn: ['Set budget and guest count'],
      },
      {
        name: 'Book venue',
        description: 'Research and book ceremony and reception venues',
        estimatedHours: 8,
        daysFromStart: 150,
        dependsOn: ['Choose wedding date'],
      },
      {
        name: 'Hire photographer',
        description: 'Research and book wedding photographer',
        estimatedHours: 4,
        daysFromStart: 140,
      },
      {
        name: 'Book caterer',
        description: 'Select and book catering service',
        estimatedHours: 6,
        daysFromStart: 130,
        dependsOn: ['Book venue'],
      },
      {
        name: 'Send save-the-dates',
        description: 'Design and send save-the-date cards',
        estimatedHours: 4,
        daysFromStart: 120,
        dependsOn: ['Choose wedding date'],
      },
      {
        name: 'Choose wedding party',
        description: 'Select bridesmaids, groomsmen, and other attendants',
        estimatedHours: 2,
        daysFromStart: 140,
      },
      {
        name: 'Book florist',
        description: 'Select and book florist for flowers',
        estimatedHours: 3,
        daysFromStart: 120,
      },
      {
        name: 'Order invitations',
        description: 'Design and order wedding invitations',
        estimatedHours: 4,
        daysFromStart: 90,
      },
      {
        name: 'Send invitations',
        description: 'Mail wedding invitations to guests',
        estimatedHours: 2,
        daysFromStart: 60,
        dependsOn: ['Order invitations'],
      },
      {
        name: 'Plan ceremony',
        description: 'Finalize ceremony details and music',
        estimatedHours: 6,
        daysFromStart: 45,
      },
      {
        name: 'Create seating chart',
        description: 'Organize reception seating arrangements',
        estimatedHours: 4,
        daysFromStart: 14,
      },
      {
        name: 'Final vendor confirmations',
        description: 'Confirm details with all vendors',
        estimatedHours: 3,
        daysFromStart: 7,
      },
      {
        name: 'Rehearsal',
        description: 'Conduct wedding rehearsal with wedding party',
        estimatedHours: 2,
        daysFromStart: 1,
      },
    ],
  },
  {
    id: 'garage-sale',
    name: 'Garage Sale',
    description: 'Organize and run a garage/yard sale',
    category: 'personal',
    estimatedDays: 21,
    suggestedBudget: 50,
    tasks: [
      {
        name: 'Choose sale date',
        description: 'Pick date and check local regulations',
        estimatedHours: 1,
        daysFromStart: 3,
      },
      {
        name: 'Gather items to sell',
        description: 'Collect all items for sale from around house',
        estimatedHours: 6,
        daysFromStart: 14,
      },
      {
        name: 'Clean and organize items',
        description: 'Clean items and organize by category',
        estimatedHours: 4,
        daysFromStart: 10,
        dependsOn: ['Gather items to sell'],
      },
      {
        name: 'Price items',
        description: 'Determine and mark prices on all items',
        estimatedHours: 3,
        daysFromStart: 7,
        dependsOn: ['Clean and organize items'],
      },
      {
        name: 'Get supplies',
        description: 'Buy price tags, change box, bags, signage materials',
        estimatedHours: 1,
        daysFromStart: 7,
      },
      {
        name: 'Create advertising',
        description: 'Make signs and post online listings',
        estimatedHours: 2,
        daysFromStart: 5,
        dependsOn: ['Choose sale date'],
      },
      {
        name: 'Set up sale area',
        description: 'Arrange tables and display items',
        estimatedHours: 3,
        daysFromStart: 0,
        dependsOn: ['Price items', 'Get supplies'],
      },
      {
        name: 'Run garage sale',
        description: 'Conduct the sale and handle transactions',
        estimatedHours: 6,
        daysFromStart: 0,
        dependsOn: ['Set up sale area', 'Create advertising'],
      },
      {
        name: 'Donate unsold items',
        description: 'Donate remaining items to charity',
        estimatedHours: 2,
        daysFromStart: 0,
        dependsOn: ['Run garage sale'],
      },
    ],
  },
];

export function getTemplateById(templateId: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === templateId);
}

export function getTemplatesByCategory(category: string): ProjectTemplate[] {
  return PROJECT_TEMPLATES.filter((t) => t.category === category);
}
