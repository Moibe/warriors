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
  // Pick the battle by CLICKING ITS NAME, never by counting arrow presses.
  //
  // Two separate traps make the arrow-walk wrong, and both of them bit:
  //   1. The picker's rows carry `onmouseenter={() => (index = i)}`, so the
  //      parked mouse pointer silently selects whatever row happens to open
  //      underneath it. Add a stage, the list grows, the rows shift under the
  //      pointer, and a harness that worked yesterday now opens a different
  //      battle — which is exactly what happened the day Union Square arrived.
  //   2. Asking battle.svelte.ts which stage is installed does not work from
  //      here at all: a dynamic import inside page.evaluate returns a SECOND
  //      module instance, so it answers with the default rather than with what
  //      is on screen. stages.ts is safe to read that way because it is frozen
  //      data; battle state never is.
  //
  // A click needs neither the cursor's position nor the live module. It only
  // needs the name, which is on the button.
  const list = await page.evaluate(async () => {
    const stages = await import('/src/lib/stages.ts');
    return stages.STAGE_LIST.map((s) => ({ id: s.id, name: s.name }));
  });
  const wanted = list.find((s) => s.id === stageId);
  if (!wanted) {
    console.log(`no existe la escena "${stageId}". Hay: ${list.map((s) => s.id).join(', ')}`);
    await browser.close();
    process.exit(1);
  }
  await page.keyboard.press('m');
  await page.waitForTimeout(600);
  await page.locator('.panel button', { hasText: wanted.name }).first().click();
  await page.waitForTimeout(4000);
  // And prove it, because opening the wrong battle is a failure that looks
  // exactly like a successful screenshot.
  const got = ((await page.locator('.stage-name').first().textContent()) || '').trim();
  if (got !== wanted.name) {
    console.log(`pedí "${wanted.name}" y salió "${got}"`);
    await browser.close();
    process.exit(1);
  }
  // The pointer sat over the picker; park it somewhere that is only board.
  await page.mouse.move(720, 700);
  await page.waitForTimeout(400);
}

if (wide) {
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('-');
    await page.waitForTimeout(220);
  }
  await page.keyboard.press('c');
  await page.waitForTimeout(1600);
}

const name = ((await page.locator('.stage-name').first().textContent()) || 'escena').trim();
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const file = resolve(outDir, `${slug}${wide ? '-conjunto' : ''}.png`);
await page.screenshot({ path: file });

console.log(`${name} → ${file}`);
console.log(errors.length ? `errores: ${errors.slice(0, 5).join(' | ')}` : 'sin errores js');
await browser.close();
