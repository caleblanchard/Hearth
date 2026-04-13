/**
 * Mobile screenshot utility for Hearth UI review.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/mobile-screenshots.ts [before|after]
 *
 * Requires the dev server to be running on http://localhost:3000
 * Credentials: sarah@example.com / password123 (local seed data)
 */

import { chromium, devices } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const EMAIL = 'sarah@example.com';
const PASSWORD = 'password123';

const PHASE = process.argv[2] === 'after' ? 'after' : 'before';

const PAGES_TO_SCREENSHOT: { name: string; path: string; waitFor?: string }[] = [
  { name: 'dashboard',         path: '/dashboard' },
  { name: 'projects',          path: '/dashboard/projects' },
  { name: 'rewards',           path: '/dashboard/rewards' },
  { name: 'calendar',          path: '/dashboard/calendar' },
  { name: 'meals',             path: '/dashboard/meals' },
  { name: 'recipes',           path: '/dashboard/meals/recipes' },
  { name: 'recipe_new',        path: '/dashboard/meals/recipes/new' },
  { name: 'todos',             path: '/dashboard/todos' },
  { name: 'chores',            path: '/dashboard/chores' },
  { name: 'routines',          path: '/dashboard/routines' },
  { name: 'communication',     path: '/dashboard/communication' },
  { name: 'inventory',         path: '/dashboard/inventory' },
  { name: 'health',            path: '/dashboard/health' },
  { name: 'documents',         path: '/dashboard/documents' },
  { name: 'pets',              path: '/dashboard/pets' },
];

const VIEWPORTS = [
  { name: 'iphone13',  device: 'iPhone 13' },
  { name: 'pixel5',    device: 'Pixel 5' },
];

const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots', 'mobile', PHASE);

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  for (const viewport of VIEWPORTS) {
    console.log(`\n📱 Device: ${viewport.device}`);
    const context = await browser.newContext({
      ...devices[viewport.device],
    });
    const page = await context.newPage();

    // Authenticate
    console.log('  🔐 Logging in...');
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 20_000 });
    console.log('  ✅ Logged in');

    for (const pg of PAGES_TO_SCREENSHOT) {
      try {
        await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'networkidle', timeout: 15_000 });
        await page.waitForTimeout(500); // Let any animations settle

        // For recipes list, also capture the first recipe's edit page
        if (pg.name === 'recipes') {
          const editLink = page.locator('a[href*="/recipes/"][href*="/edit"]').first();
          const hasEditLink = await editLink.count() > 0;
          if (!hasEditLink) {
            // Try navigating to the first recipe via the pencil icon
            const pencilBtn = page.locator('[title="Edit Recipe"], [aria-label="Edit recipe"]').first();
            if (await pencilBtn.count() > 0) {
              await pencilBtn.click();
              await page.waitForURL(/\/recipes\/.*\/edit/, { timeout: 8_000 });
              await page.waitForTimeout(800);
              await page.screenshot({ path: path.join(OUTPUT_DIR, `${viewport.name}_recipe_edit.png`), fullPage: true });
              console.log(`  📸 ${viewport.name}_recipe_edit.png`);
              await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'networkidle', timeout: 15_000 });
            }
          } else {
            const href = await editLink.getAttribute('href');
            if (href) {
              await page.goto(`${BASE_URL}${href}`, { waitUntil: 'networkidle', timeout: 15_000 });
              await page.waitForTimeout(800);
              await page.screenshot({ path: path.join(OUTPUT_DIR, `${viewport.name}_recipe_edit.png`), fullPage: true });
              console.log(`  📸 ${viewport.name}_recipe_edit.png`);
            }
          }
        }

        const filename = `${viewport.name}_${pg.name}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: true });
        console.log(`  📸 ${filename}`);
      } catch (err) {
        console.error(`  ❌ Failed: ${viewport.name}/${pg.name}: ${err}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log(`\n✅ Screenshots saved to: ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
