import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures';
import { ROUTES } from '../helpers/test-data';

/**
 * Accessibility tests using axe-core.
 * Runs automated a11y checks on key pages to catch WCAG violations.
 */

const pagesToAudit = [
  { name: 'Dashboard', url: ROUTES.dashboard },
  { name: 'Chores', url: ROUTES.chores },
  { name: 'Shopping', url: ROUTES.shopping },
  { name: 'Todos', url: ROUTES.todos },
  { name: 'Communication', url: ROUTES.communication },
  { name: 'Meals', url: ROUTES.meals },
  { name: 'Profile', url: ROUTES.profile },
];

for (const { name, url } of pagesToAudit) {
  test(`${name} page should have no critical accessibility violations`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === 'critical'
    );

    if (critical.length > 0) {
      const summary = critical.map(
        (v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      ).join('\n');
      console.log(`Accessibility issues on ${name}:\n${summary}`);
    }

    expect(critical).toHaveLength(0);
  });
}
