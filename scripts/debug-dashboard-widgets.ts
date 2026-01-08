/**
 * Diagnostic script to debug dashboard widget visibility issue
 * Run with: npx tsx scripts/debug-dashboard-widgets.ts
 */

import prisma from '@/lib/prisma';
import { getAvailableWidgets } from '@/lib/dashboard/widget-registry';
import { generateDefaultLayout } from '@/lib/dashboard/layout-utils';

async function main() {
  console.log('=== Dashboard Widget Diagnostic ===\n');

  // Get the first family (or you can hardcode your familyId)
  const family = await prisma.family.findFirst({
    select: {
      id: true,
      name: true,
    },
  });

  if (!family) {
    console.error('No family found in database');
    return;
  }

  console.log(`Family: ${family.name} (${family.id})\n`);

  // Get all module configurations for this family
  const allModules = await prisma.moduleConfiguration.findMany({
    where: {
      familyId: family.id,
    },
    select: {
      moduleId: true,
      isEnabled: true,
    },
    orderBy: {
      moduleId: 'asc',
    },
  });

  console.log('All modules in database:');
  console.log(`Total: ${allModules.length}`);
  console.log(`Enabled: ${allModules.filter((m) => m.isEnabled).length}`);
  console.log(`Disabled: ${allModules.filter((m) => !m.isEnabled).length}\n`);

  allModules.forEach((m) => {
    console.log(`  ${m.isEnabled ? '✓' : '✗'} ${m.moduleId}`);
  });

  // Get enabled modules
  const enabledModules = new Set(
    allModules.filter((m) => m.isEnabled).map((m) => m.moduleId)
  );

  console.log('\n=== Widget Analysis ===\n');

  // Test with PARENT role (highest permissions)
  const role = 'PARENT';
  const availableWidgets = getAvailableWidgets(enabledModules, role);
  const defaultLayout = generateDefaultLayout(enabledModules, role);

  console.log(`Available widgets for ${role} role: ${availableWidgets.length}`);
  availableWidgets.forEach((w) => {
    const requiredModule = w.requiredModule || 'none';
    console.log(
      `  - ${w.id}: ${w.name} (requires: ${requiredModule})`
    );
  });

  console.log(`\nDefault layout widget count: ${defaultLayout.widgets.length}`);
  console.log(
    `Enabled in layout: ${defaultLayout.widgets.filter((w) => w.enabled).length}`
  );
  console.log(
    `Disabled in layout: ${defaultLayout.widgets.filter((w) => !w.enabled).length}\n`
  );

  defaultLayout.widgets.forEach((w) => {
    console.log(
      `  ${w.enabled ? '✓' : '✗'} [${w.order}] ${w.id}`
    );
  });

  // Check if user has a saved layout
  const member = await prisma.familyMember.findFirst({
    where: {
      familyId: family.id,
      role: 'PARENT',
    },
    select: {
      id: true,
      dashboardLayout: true,
    },
  });

  if (member) {
    console.log('\n=== User Layout ===\n');
    console.log(`Member ID: ${member.id}`);

    if (member.dashboardLayout) {
      const layout = member.dashboardLayout.layout as any;
      console.log(`Saved layout exists with ${layout.widgets?.length || 0} widgets`);
      if (layout.widgets) {
        layout.widgets.forEach((w: any) => {
          console.log(
            `  ${w.enabled ? '✓' : '✗'} [${w.order}] ${w.id}`
          );
        });
      }
    } else {
      console.log('No saved layout - will use default');
    }
  }

  console.log('\n=== End Diagnostic ===\n');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
