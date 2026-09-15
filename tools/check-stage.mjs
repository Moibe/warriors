// Checks a battle before anybody has to look at it.
//
// Board mistakes are cheap to find with the pathfinder and expensive to spot by
// eye in a screenshot: a fighter deployed onto a wall, a corner of the map
// nothing can walk to, a prop whose mesh and whose '#' disagree about where it
// is. Every one of those has happened at least once here.
//
//   npm run check:stage                 -- every stage
//   npm run check:stage gun-hill-road   -- just that one
//
// The dev server has to be up: the script drives a real browser at it, so the
// modules it measures are the same ones the game runs.

import { chromium } from 'playwright-core';

const ORIGIN = process.env.WARRIORS_ORIGIN ?? 'http://localhost:3030/';
const wanted = process.argv.slice(2);

const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
await page.goto(ORIGIN, { waitUntil: 'networkidle', timeout: 60000 });

const ids = await page.evaluate(async () => {
  const stages = await import('/src/lib/stages.ts');
  return stages.STAGE_LIST.map((s) => s.id);
});

const targets = wanted.length ? wanted : ids;
const unknown = targets.filter((id) => !ids.includes(id));
if (unknown.length) {
  console.log(`no existe: ${unknown.join(', ')}`);
  console.log(`hay: ${ids.join(', ')}`);
}

let failed = 0;

for (const id of targets.filter((t) => ids.includes(t))) {
  const out = await page.evaluate(async (stageId) => {
    const stages = await import('/src/lib/stages.ts');
    const grid = await import('/src/lib/grid.ts');
    const pf = await import('/src/lib/pathfinding.ts');

    const stage = stages.STAGES[stageId];
    const m = stage.map;
    const problems = [];
    const notes = [];

    const walkable = m.tiles.filter((t) => t && t.walkable).length;
    const drawn = m.tiles.filter(Boolean).length;
    notes.push(`${m.width}×${m.depth} · ${drawn} casillas dibujadas · ${walkable} pisables`);

    // Everybody starts on a square that exists, that can be stood on, and that
    // nobody else is already standing on.
    const roster = stage.roster();
    const seen = new Map();
    for (const u of roster) {
      const at = `${u.x},${u.y}`;
      const t = grid.tileAt(m, u.x, u.y);
      if (!t) problems.push(`${u.name} sale en ${at}, que no existe`);
      else if (!t.walkable) problems.push(`${u.name} sale en ${at}, que no se pisa`);
      if (seen.has(at)) problems.push(`${u.name} y ${seen.get(at)} salen en la misma casilla ${at}`);
      seen.set(at, u.name);
    }
    const sides = new Set(roster.map((u) => u.team));
    notes.push(`${roster.length} unidades, ${sides.size} bandos`);
    // Room to manoeuvre, scaled to how many people are actually in it. A flat
    // threshold called the Lizzies' flat too small when the whole point of that
    // battle is three people in a room they cannot spread out in.
    const need = roster.length * 8;
    if (walkable < need) {
      problems.push(`${walkable} casillas pisables para ${roster.length} unidades: hacen falta ~${need}`);
    }
    if (sides.size !== 2) problems.push('una batalla necesita exactamente dos bandos');

    // A prop's mesh is decoration; the map's '#' is the rule. When they
    // disagree you get people walking through a bus, or an invisible hole in
    // the road. Walkable squares inside a footprint are fine on purpose — a car
    // gets climbed — so this reports rather than complains, and shows the
    // heights so a roof that is still at street level is obvious.
    for (const p of stage.props) {
      const open = [];
      for (let y = p.y; y < p.y + p.d; y++) {
        for (let x = p.x; x < p.x + p.w; x++) {
          const t = grid.tileAt(m, x, y);
          if (t && t.walkable) open.push(`${x},${y}@${t.height}`);
        }
      }
      notes.push(
        open.length
          ? `prop ${p.kind} en ${p.x},${p.y}: ${open.length} de ${p.w * p.d} se pisan (${open.join(' ')}), base ${p.height}`
          : `prop ${p.kind} en ${p.x},${p.y}: huella de ${p.w}×${p.d} bloqueada entera`
      );
    }

    // The two sides have to be able to walk to each other, and the board has to
    // be one piece: an island nobody can reach is a board that plays smaller
    // than it looks.
    const ally = roster.find((u) => u.team === 'ally');
    const foe = roster.find((u) => u.team === 'enemy');
    const reach = pf.computeReachable(m, [], { ...ally, move: 400, jump: 4 });
    const hit = reach.get(`${foe.x},${foe.y}`);
    if (!hit) problems.push(`${ally.name} no puede llegar andando hasta ${foe.name}`);
    else notes.push(`de ${ally.name} a ${foe.name}: ${hit.cost} pasos`);
    notes.push(`alcanzables desde ${ally.name}: ${reach.size} de ${walkable}`);
    if (reach.size < walkable * 0.8) {
      problems.push(`sólo ${reach.size} de ${walkable} casillas son alcanzables: hay zonas aisladas`);
    }

    // A door behind a barrier has to be a door once the barrier is gone and a
    // wall until then: every exit tile reachable only through barrier tiles,
    // and every barrier tile hittable from a walkable square beside it within
    // a punch's two levels. Otherwise the fence is either decoration or a
    // wall nobody can touch.
    const barrier = stage.exit?.barrier;
    if (barrier) {
      const inRect = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.d;
      const sealedTiles = m.tiles.map((t) => (t && inRect(barrier, t.x, t.y) ? { ...t, walkable: false } : t));
      const sealedReach = pf.computeReachable({ ...m, tiles: sealedTiles }, [], { ...ally, move: 400, jump: 4 });
      const leaks = [];
      const unhittable = [];
      for (let y = stage.exit.y; y < stage.exit.y + stage.exit.d; y++) {
        for (let x = stage.exit.x; x < stage.exit.x + stage.exit.w; x++) {
          if (sealedReach.has(`${x},${y}`)) leaks.push(`${x},${y}`);
        }
      }
      for (let y = barrier.y; y < barrier.y + barrier.d; y++) {
        for (let x = barrier.x; x < barrier.x + barrier.w; x++) {
          const t = grid.tileAt(m, x, y);
          const ok = grid.NEIGHBORS.some((n) => {
            const s = grid.tileAt(m, x + n.x, y + n.y);
            return s && s.walkable && !inRect(barrier, s.x, s.y) && Math.abs(s.height - t.height) <= 2;
          });
          if (!ok) unhittable.push(`${x},${y}`);
        }
      }
      if (leaks.length) problems.push(`la barrera no cierra la salida: se llega a ${leaks.join(' ')} con la valla entera`);
      if (unhittable.length) problems.push(`casillas de barrera sin sitio desde donde golpearlas: ${unhittable.join(' ')}`);
      notes.push(`barrera "${barrier.label}" de ${barrier.hp} PV sobre ${barrier.w}×${barrier.d}; sella la salida`);
    }

    // Anything blocked and taller than this stops being cover and becomes a
    // wall that hides your own people from the camera. Measured the hard way on
    // Gun Hill Road, where the elevated columns started at level 7.
    const tall = m.tiles
      .filter((t) => t && !t.walkable && t.height > 5)
      .map((t) => `${t.x},${t.y}@${t.height}`);
    if (tall.length) {
      problems.push(`bloqueos por encima del nivel 5, tapan el tablero: ${tall.join(' ')}`);
    }

    return { name: stage.name, rival: stage.rival, problems, notes };
  }, id);

  console.log(`\n=== ${out.name} · contra ${out.rival} ===`);
  for (const n of out.notes) console.log('  ·', n);
  if (out.problems.length) {
    failed++;
    console.log('  PROBLEMAS:');
    for (const p of out.problems) console.log('  ✗', p);
  } else {
    console.log('  sin problemas');
  }
}

await browser.close();
process.exit(failed ? 1 : 0);
