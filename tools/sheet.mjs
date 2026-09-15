// A sheet of one man from every gang, on his feet and on the floor.
//
// Sprites are the one part of this game a typecheck cannot judge: whether a
// gang still reads at sixteen pixels in the dark, whether a palette slot fell
// back to the wrong default — which has happened twice — or whether a body
// still looks like the man it was. Those show up here and nowhere else.
//
//   npm run sheet                      ->  one man from every gang
//   npm run sheet -- vance hog beanie  ->  exactly those, by unit id
//
// Writes tools/shots/hoja.png.
//
// The dev server has to be up: it draws with the game's own modules, so what
// you are looking at is what the board will show.

import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';

const ORIGIN = process.env.WARRIORS_ORIGIN ?? 'http://localhost:3030/';
const dir = 'tools/shots';
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 600 } });

// Naming ids on the command line draws those instead of the default sheet.
// A new gang is always the reason you are running this, and hard-coding the
// cast meant editing the tool every time one arrived.
const wanted = process.argv.slice(2);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(ORIGIN, { waitUntil: 'networkidle', timeout: 60000 });

const url = await page.evaluate(async (wanted) => {
  const sprites = await import('/src/lib/sprites.ts');
  const units = await import('/src/lib/units.ts');
  const jobs = await import('/src/lib/jobs.ts');

  // Everybody in the game, so an id is enough to find a man and the job comes
  // off the unit instead of being repeated here and going stale.
  const roster = [
    ...units.warriors(),
    ...units.furies(),
    ...units.turnbull(),
    ...units.orphans(),
    ...units.lizzies(),
    ...units.punks(),
    ...units.rogues(),
    ...units.mercy(),
  ];

  // The default sheet: one man per body type. Both Turnbull roles, because the
  // bald head is the slot most likely to go wrong, and both Punk bodies,
  // because the only thing between them is a pair of skates.
  const DEFAULT = ['swan', 'fury-3', 'bull', 'moose', 'tino', 'starr', 'hog', 'vance', 'luther'];
  const ids = wanted.length ? wanted : DEFAULT;
  const missing = ids.filter((id) => !roster.some((r) => r.id === id));
  const pick = ids
    .filter((id) => !missing.includes(id))
    .map((id) => [id, roster.find((r) => r.id === id).job]);

  const S = 6;
  const W = 20 * S;
  const H = 32 * S;
  const PAD = 12;
  const TOP = 26;
  const rows = ['front', 'back', 'down'];

  const out = document.createElement('canvas');
  out.width = PAD + pick.length * (W + PAD);
  out.height = TOP + rows.length * (H + PAD) + PAD;
  const g = out.getContext('2d');
  g.imageSmoothingEnabled = false;
  // Mid slate rather than black: a body is painted toward the night, and on a
  // black sheet it would look fine and then vanish on the actual ground.
  g.fillStyle = '#2b2f36';
  g.fillRect(0, 0, out.width, out.height);

  pick.forEach(([id, job], i) => {
    const u = roster.find((r) => r.id === id);
    void job;
    const base = jobs.JOBS[job].sprite.palette;
    const palette = u?.paletteOverride ? { ...base, ...u.paletteOverride } : base;
    const hat = u && u.hat !== undefined ? u.hat : jobs.JOBS[job].sprite.hat;
    const x = PAD + i * (W + PAD);

    g.fillStyle = '#cfe0ea';
    g.font = '12px monospace';
    g.fillText(u?.name ?? job, x, 18);

    rows.forEach((pose, r) => {
      const c = sprites.renderUnitCanvas(job, palette, pose, false, false, u?.weapon ?? 'none', hat);
      const y = TOP + r * (H + PAD);
      g.fillStyle = '#3a4048';
      g.fillRect(x, y, W, H);
      g.drawImage(c, 0, 0, c.width, c.height, x, y, W, H);
    });
  });

  return { url: out.toDataURL('image/png'), missing };
}, wanted);

writeFileSync(dir + '/hoja.png', Buffer.from(url.url.split(',')[1], 'base64'));
if (url.missing.length) console.log('no existen: ' + url.missing.join(', '));
console.log(errors.length ? 'ERRORES: ' + errors.join(' | ') : dir + '/hoja.png');
await browser.close();
