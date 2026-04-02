/**
 * Diagnostic script to debug dashboard widget visibility issue
 * Run with: npx tsx scripts/debug-dashboard-widgets.ts
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getAvailableWidgets } from '@/lib/dashboard/widget-registry';
import { generateDefaultLayout } from '@/lib/dashboard/layout-utils';

async function main() {
  console.log('=== Dashboard Widget Diagnostic ===\n');

  // Get the first family (or you can hardcode your familyId)
  const adminClient = createAdminClient();
  const { data: family, error: familyError } = await adminClient
    .from('families')
    .select('id, name')
    .limit(1)
    .maybeSingle();

  if (familyError) {
    throw new Error(`Failed to fetch family: ${familyError.message}`);
  }

  if (!family) {
    console.error('No family found in database');
    return;
  }

  console.log(`Family: ${family.name} (${family.id})\n`);

  // Get all module configurations for this family
  const { data: allModules, error: moduleError } = await adminClient
    .from('module_configurations')
    .select('module_id, is_enabled')
    .eq('family_id', family.id)
    .order('module_id', { ascending: true });

  if (moduleError) {
    throw new Error(`Failed to fetch modules: ${moduleError.message}`);
  }

  const modules = allModules ?? [];

  console.log('All modules in database:');
  console.log(`Total: ${modules.length}`);
  console.log(`Enabled: ${modules.filter((m) => m.is_enabled).length}`);
  console.log(`Disabled: ${modules.filter((m) => !m.is_enabled).length}\n`);

  modules.forEach((m) => {
    console.log(`  ${m.is_enabled ? '✓' : '✗'} ${m.module_id}`);
  });

  // Get enabled modules
  const enabledModules = new Set(
    modules.filter((m) => m.is_enabled).map((m) => m.module_id)
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
  const { data: member, error: memberError } = await adminClient
    .from('family_members')
    .select('id')
    .eq('family_id', family.id)
    .eq('role', 'PARENT')
    .limit(1)
    .maybeSingle();

  if (memberError) {
    throw new Error(`Failed to fetch member: ${memberError.message}`);
  }

  if (member) {
    console.log('\n=== User Layout ===\n');
    console.log(`Member ID: ${member.id}`);

    const { data: layoutRow, error: layoutError } = await adminClient
      .from('dashboard_layouts')
      .select('layout')
      .eq('member_id', member.id)
      .maybeSingle();

    if (layoutError) {
      throw new Error(`Failed to fetch layout: ${layoutError.message}`);
    }

    if (layoutRow?.layout) {
      const layout = layoutRow.layout as any;
      console.log(`Saved layout exists with ${layout.widgets?.length || 0} widgets`);
      if (layout.widgets) {
        layout.widgets.forEach((w: any) => {
          console.log(`  ${w.enabled ? '✓' : '✗'} [${w.order}] ${w.id}`);
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
  });
