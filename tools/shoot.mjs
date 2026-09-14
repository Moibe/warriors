// Takes a picture of a battle, for looking at things a typecheck cannot see.
//
// Sprites that read wrong at night, a prop swallowed by the terrain, a gang
// whose colours collapse into each other at sixteen pixels — none of that shows
// up in a test. It shows up in a screenshot.
//
//   npm run shot                                -- the stage the game opens on
//   npm run shot -- gun-hill-road               -- switch to that one first
//   npm run shot -- orphan-block wide           -- zoom out to the whole board
//
// Writes into tools/shots/, which git ignores.

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = process.env.WARRIORS_ORIGIN ?? 'http://localhost:3030/';
const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'shots');
mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2);
const wide = args.includes('wide');
const stageId = args.find((a) => a !== 'wide');

const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 860 },
  deviceScaleFactor: 1.5,
});

const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));
page.on('console', (m) => {
  // The dev server's own 404 for a missing favicon is noise, not a fault.
  if (m.type() === 'error' && !/favicon|404/i.test(m.text())) errors.push(`CONSOLE ${m.text()}`);
});

await page.goto(ORIGIN, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3500);
// Park the pointer somewhere harmless: the HUD windows react to hover.
await page.mouse.move(720, 280);

if (stageId) {
  // The picker starts on whatever is installed, so walk to the one asked for
  // rather than assuming where the cursor is.
  const names = await page.evaluate(async () => {
    const stages = await import('/src/lib/stages.ts');
    return stages.STAGE_LIST.map((s) => s.id);
  });
  const current = await page.evaluate(async () => {
    const battle = await import('/src/lib/battle.svelte.ts');
    return battle.stage().id;
  });
  const from = names.indexOf(current);
  const to = names.indexOf(stageId);
  if (to < 0) {
    console.log(`no existe la escena "${stageId}". Hay: ${names.join(', ')}`);
    await browser.close();
    process.exit(1);
  }
  if (to !== from) {
    await page.keyboard.press('m');
    await page.waitForTimeout(600);
    const steps = (to - from + names.length) % names.length;
    for (let i = 0; i < steps; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(220);
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000);
  }
}

if (wide) {
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('-');
    await page.waitForTimeout(220);
  }
  await page.keyboard.press('c');
  await page.waitForTimeout(1600);
}

const name = ((await page.locator('.stage-name').textContent()) || 'escena').trim();
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const file = resolve(outDir, `${slug}${wide ? '-conjunto' : ''}.png`);
await page.screenshot({ path: file });

console.log(`${name} → ${file}`);
console.log(errors.length ? `errores: ${errors.slice(0, 5).join(' | ')}` : 'sin errores js');
await browser.close();
