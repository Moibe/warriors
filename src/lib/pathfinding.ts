import {
  NEIGHBORS,
  gridDistance,
  tileAt,
  tileKey,
  type BattleMap,
  type Coord,
  type Tile,
} from './grid';
import { angleOf } from './combat';
import type { Ability } from './jobs';
import { hasLeft, isAlive, type Unit } from './units';

/**
 * One reachable cell in a movement search.
 *
 * `stoppable` is the interesting field: a unit walks *through* its allies but
 * cannot end its move standing on one, so the blue movement panel has to know
 * the difference between "I can pass here" and "I can land here".
 */
export type ReachEntry = {
  x: number;
  y: number;
  /** Tiles spent to get here. */
  cost: number;
  /** Key of the previous cell, for path reconstruction. `null` at the origin. */
  from: string | null;
  stoppable: boolean;
};

export type ReachMap = Map<string, ReachEntry>;

/**
 * Every cell the unit could walk to this turn.
 *
 * Movement is uniform-cost (one point per tile, as in FFT — terrain doesn't
 * slow you down, height stops you), so a plain BFS is exact and there is no
 * need for a priority queue.
 *
 * The two rules that make it tactical rather than a flood fill:
 *   · Jump — a step is only legal if the height difference is within the
 *     unit's Jump stat, which is what turns cliffs into real walls.
 *   · Bodies — enemies block the cell outright; allies let you pass but not
 *     stop.
 */
export function computeReachable(map: BattleMap, units: Unit[], unit: Unit): ReachMap {
  const origin = tileAt(map, unit.x, unit.y);
  if (!origin) return new Map();

  const blockers = new Map<string, Unit>();
  /**
   * Squares with a body on them. You step over a man who is down — anybody's —
   * but you do not stop on him, which is the same deal a living team-mate
   * already gets. Two reasons it is not a plain wall: one body on a one-tile
   * staircase would seal it for a whole gang that can only climb a level at a
   * time, and a line of them between two melee-only gangs would leave a battle
   * that nobody can end, since victory only ever looks at hit points.
   * And one reason it is not nothing at all: with the body staying put, a
   * living man landing on the same square would put two people on one tile,
   * which is an assumption the cursor, the terrain window and `unitAt` all make
   * and none of them check. Refusing the landing is what keeps his square his.
   */
  const bodies = new Set<string>();
  for (const u of units) {
    if (u.id === unit.id) continue;
    // Somebody who already went through the door is not standing in it. Without
    // this the first man out plugs the doorway for the two behind him, which is
    // the opposite of what a way out is for.
    if (hasLeft(u)) continue;
    if (isAlive(u)) blockers.set(tileKey(u.x, u.y), u);
    else bodies.add(tileKey(u.x, u.y));
  }

  const reach: ReachMap = new Map();
  const startKey = tileKey(unit.x, unit.y);
  reach.set(startKey, { x: unit.x, y: unit.y, cost: 0, from: null, stoppable: true });

  // Frontier by cost. BFS order guarantees the first time we see a cell is via
  // a shortest path, so entries are never revisited.
  let frontier: ReachEntry[] = [reach.get(startKey)!];

  for (let step = 0; step < unit.move && frontier.length; step++) {
    const next: ReachEntry[] = [];
    for (const cur of frontier) {
      const curTile = tileAt(map, cur.x, cur.y)!;
      for (const n of NEIGHBORS) {
        const nx = cur.x + n.x;
        const ny = cur.y + n.y;
        const key = tileKey(nx, ny);
        if (reach.has(key)) continue;

        const tile = tileAt(map, nx, ny);
        if (!tile || !tile.walkable) continue;
        if (Math.abs(tile.height - curTile.height) > unit.jump) continue;

        const blocker = blockers.get(key);
        // An enemy body is a wall; you cannot even walk through the cell.
        if (blocker && blocker.team !== unit.team) continue;

        const entry: ReachEntry = {
          x: nx,
          y: ny,
          cost: cur.cost + 1,
          from: tileKey(cur.x, cur.y),
          stoppable: !blocker && !bodies.has(key),
        };
        reach.set(key, entry);
        next.push(entry);
      }
    }
    frontier = next;
  }

  return reach;
}

/** The cells a unit may actually finish its move on. */
export function landableTiles(reach: ReachMap): Set<string> {
  const out = new Set<string>();
  for (const [key, entry] of reach) {
    if (entry.stoppable) out.add(key);
  }
  return out;
}

/**
 * Walk the `from` chain back from a destination, returning the route in travel
 * order (origin first, destination last). Empty if the destination is outside
 * the reach map.
 */
export function findPath(reach: ReachMap, x: number, y: number): Coord[] {
  const path: Coord[] = [];
  let key: string | null = tileKey(x, y);
  while (key) {
    const entry: ReachEntry | undefined = reach.get(key);
    if (!entry) return [];
    path.push({ x: entry.x, y: entry.y });
    key = entry.from;
  }
  return path.reverse();
}

// ---------------------------------------------------------------------------
// Ability targeting
// ---------------------------------------------------------------------------

/**
 * Cells an ability could be aimed at from `origin`.
 *
 * Range is Manhattan (tactics grids have no diagonals) and bounded on both
 * ends — a bow has a dead zone at its feet. Height is checked against the
 * ability's vertical reach: a sword can't hit the top of a cliff, an arrow or a
 * spell doesn't care.
 */
export function tilesInAbilityRange(
  map: BattleMap,
  origin: Coord,
  originHeight: number,
  ability: Ability
): Set<string> {
  const out = new Set<string>();
  const r = ability.range;
  for (let dy = -r; dy <= r; dy++) {
    const span = r - Math.abs(dy);
    for (let dx = -span; dx <= span; dx++) {
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < ability.minRange || dist > r) continue;
      const x = origin.x + dx;
      const y = origin.y + dy;
      const tile = tileAt(map, x, y);
      if (!tile) continue;
      if (Math.abs(tile.height - originHeight) > ability.vertical) continue;
      if (ability.sight && !hasLineOfFire(map, origin, originHeight, { x, y }, tile.height)) {
        continue;
      }
      out.add(tileKey(x, y));
    }
  }
  return out;
}

/** Cells caught in an ability's burst, centred on the aimed tile. */
export function tilesInBurst(map: BattleMap, center: Coord, radius: number): Set<string> {
  const out = new Set<string>();
  for (let dy = -radius; dy <= radius; dy++) {
    const span = radius - Math.abs(dy);
    for (let dx = -span; dx <= span; dx++) {
      const x = center.x + dx;
      const y = center.y + dy;
      if (!tileAt(map, x, y)) continue;
      out.add(tileKey(x, y));
    }
  }
  return out;
}

/**
 * Nearest landable cell from which `attacker` could hit `target` with
 * `ability`. Returns null when no reachable cell works — the caller (the AI)
 * then just walks as close as it can.
 */
/** How much a move that cares about the angle wants each side of its target. */
const ANGLE_RANK = { back: 2, side: 1, front: 0 } as const;

/**
 * What one rank of angle is worth, measured in steps of walking.
 *
 * A tie-break is not enough, and that is a measured fact rather than a guess:
 * breaking only exact ties moved the Orphans' share of back hits from 13% to
 * 12%, because the square behind somebody almost never costs the *same* as the
 * square in front of him — it costs a detour, and the cheapest square wins
 * outright. Six steps a rank means getting behind a man is worth crossing the
 * street for, which is exactly what a gang whose damage triples back there
 * should be willing to do.
 */
const ANGLE_DETOUR = 6;

export function bestApproach(
  map: BattleMap,
  reach: ReachMap,
  targetTile: Tile,
  ability: Ability,
  /** Who is being attacked. Only needed for moves that care which side. */
  target?: Unit
): ReachEntry | null {
  let best: ReachEntry | null = null;
  // Only moves that actually pay for the angle go looking for it. The Furies
  // and the Turnbull have no `backstab`, so their planning comes out
  // byte-identical to what it was and the measured damage band cannot shift.
  const wantsAngle = ability.backstab !== undefined && target !== undefined;

  for (const entry of reach.values()) {
    if (!entry.stoppable) continue;
    const from = tileAt(map, entry.x, entry.y);
    if (!from) continue;
    const dist = gridDistance(entry, targetTile);
    if (dist < ability.minRange || dist > ability.range) continue;
    if (Math.abs(targetTile.height - from.height) > ability.vertical) continue;
    if (ability.sight && !hasLineOfFire(map, entry, from.height, targetTile, targetTile.height)) {
      continue;
    }

    if (wantsAngle) {
      // Trade steps for the angle. Everything else still prefers the cheapest
      // square it can shoot from.
      if (!best || approachScore(entry, target!) > approachScore(best, target!)) best = entry;
    } else if (!best || entry.cost < best.cost) {
      best = entry;
    }
  }
  return best;
}

function approachScore(entry: ReachEntry, target: Unit): number {
  return ANGLE_RANK[angleOf(entry, target)] * ANGLE_DETOUR - entry.cost;
}

/**
 * Whether a shot from one tile to another has anything in the way.
 *
 * Only the board blocks, and only a tile nobody can stand on that rises above
 * BOTH ends of the line: a partition, the back of the sofa, the bar. A kerb
 * does not, and neither does a mattress you could be standing on.
 *
 * Two consequences worth knowing before touching this. Climbing onto the
 * furniture raises your end of the line and gives away the cover that furniture
 * was giving you — the one board in the game where getting up high is the
 * mistake. And people never block: the AI plans a shot on one tick and fires it
 * on the next, with a walk in between, so a line that depended on who was
 * standing where could be legal when planned and illegal when taken, and she
 * would lose her turn with nothing on screen to explain it.
 *
 * When in doubt the wall wins. A player has to be able to trust a partition; a
 * bullet that clips a corner one time in twenty turns cover into a gamble.
 */
export function hasLineOfFire(
  map: BattleMap,
  from: Coord,
  fromHeight: number,
  to: Coord,
  toHeight: number
): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = (Math.abs(dx) + Math.abs(dy)) * 4;
  if (steps === 0) return true;
  const ceiling = Math.max(fromHeight, toHeight);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    // Both roundings, worst case wins: sampling one of them lets a bullet slip
    // through the corner of a wall on an exact diagonal.
    for (const x of [Math.floor(from.x + dx * t), Math.ceil(from.x + dx * t)]) {
      for (const y of [Math.floor(from.y + dy * t), Math.ceil(from.y + dy * t)]) {
        if ((x === from.x && y === from.y) || (x === to.x && y === to.y)) continue;
        const tile = tileAt(map, x, y);
        if (!tile) continue; // a hole in the floor is not a wall
        if (!tile.walkable && tile.height > ceiling) return false;
      }
    }
  }
  return true;
}

/**
 * The landable cell that gets closest to `goal`, used when the AI can't reach
 * its target this turn and simply advances.
 */
export function stepToward(map: BattleMap, reach: ReachMap, goal: Coord): ReachEntry | null {
  let best: ReachEntry | null = null;
  let bestScore = Infinity;
  for (const entry of reach.values()) {
    if (!entry.stoppable) continue;
    const dist = gridDistance(entry, goal);
    // Distance first, then fewest steps — no point burning movement to end up
    // the same distance away.
    const score = dist * 100 + entry.cost;
    if (score < bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best;
}
