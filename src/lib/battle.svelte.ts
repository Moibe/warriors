// Battle state and the turn engine.
//
// The whole game is driven by Charge Time: there are no rounds. A clock ticks,
// every living unit gains its Speed in CT, and whoever crosses 100 first acts.
// A fast unit simply gets more turns than a slow one, which is why Speed is the
// most valuable stat in the genre and why the turn-order list on the right is
// a prediction rather than a fixed rotation.
//
// Presentation state (walk animations, floating numbers) lives here too so the
// 3D scene stays a pure reader: it draws whatever this module says is true and
// advances the clocks once per frame.

import { forecast, rollAttack, type Angle } from './combat';
import {
  facingTo,
  gridDistance,
  parseKey,
  tileAt,
  tileKey,
  type BattleMap,
  type Coord,
  type Facing,
  type Tile,
} from './grid';
import { JOBS, WEAPON_NAMES, type Ability, type ProjectileId } from './jobs';
import { DEFAULT_STAGE, STAGES, type BriefLine, type Exit, type Stage, type StageId } from './stages';
import {
  bestApproach,
  computeReachable,
  findPath,
  landableTiles,
  stepToward,
  tilesInAbilityRange,
  tilesInBurst,
  type ReachMap,
} from './pathfinding';
import { hasLeft, inPlay, isAlive, unitAt, unitById, type Team, type Unit } from './units';

/**
 * Which battle is installed.
 *
 * `$state.raw` and not `$state`: the value it points at is a whole parsed board,
 * and a deep proxy over it would wrap every tile the pathfinder touches — a BFS
 * reads `tileAt()` thousands of times a turn on data that cannot change while a
 * fight is running. Raw state signals on reassignment, which is the only event
 * anybody needs to hear about.
 *
 * Exported as a function because Svelte 5 refuses to export a reassigned state
 * binding; reading `stage()` inside a `$derived` is what subscribes the scene.
 */
let stageId = $state.raw<StageId>(DEFAULT_STAGE);

export function stage(): Stage {
  return STAGES[stageId];
}

/**
 * The board itself, held as an ordinary binding on purpose. It is read a couple
 * of dozen times per turn from inside pathfinding loops, and the engine is
 * synchronous, so it can never observe a half-finished swap. `restart()` is the
 * only place it is installed, so it cannot drift from `stageId`.
 */
let map: BattleMap = boardFor(DEFAULT_STAGE, initBarrierHp(DEFAULT_STAGE));

/**
 * The board a stage is played on: its own map, or a copy with whichever of the
 * barrier's OWN tiles are still standing sealed. Takes `hp` as a parameter
 * rather than reading `battle.barrierHp` itself for two reasons: the very
 * first call above runs before `battle` exists, and every later call — one
 * per hit, not once at the end — passes the array that just changed rather
 * than trusting a global to be current.
 */
function boardFor(id: StageId, hp: number[]): BattleMap {
  const b = STAGES[id].exit?.barrier;
  return b ? sealed(STAGES[id].map, b, hp) : STAGES[id].map;
}

/**
 * One pool per tile of the barrier, not one pool for the whole run. A stage
 * declares `hp` as the cost of the WHOLE thing — the number every design
 * comment about this board is written against — and it is split evenly across
 * the footprint here, once, so every other function only ever deals in
 * per-tile pools and never has to re-derive the split.
 */
function initBarrierHp(id: StageId): number[] {
  const b = STAGES[id].exit?.barrier;
  if (!b) return [];
  const n = b.w * b.d;
  return Array.from({ length: n }, () => Math.round(b.hp / n));
}

/** A barrier tile's own index into its pool array, or -1 if (x, y) is not one. */
function barrierIndex(b: NonNullable<Exit['barrier']>, x: number, y: number): number {
  if (x < b.x || x >= b.x + b.w || y < b.y || y >= b.y + b.d) return -1;
  return (y - b.y) * b.w + (x - b.x);
}

/** The dialogue queued at the top of a stage, or none for a stage with no brief. */
function initIntro(id: StageId): Intro | null {
  const brief = STAGES[id].brief;
  return brief && brief.length ? { lines: brief, index: 0 } : null;
}

export type Phase =
  | 'intro' // the opening dialogue is up; the clock is held
  | 'clock' // CT is filling; nobody is acting
  | 'command' // the active unit's menu is open
  | 'move' // picking a destination
  | 'moving' // walking the chosen path
  | 'target' // aiming an ability
  | 'resolving' // the action is playing out
  | 'facing' // choosing which way to end the turn looking
  | 'over'; // one side is gone

/** Where the opening dialogue is, while it is up. */
export type Intro = {
  lines: BriefLine[];
  index: number;
};

export type Popup = {
  id: number;
  /** World anchor, taken at spawn time so the number stays put. */
  x: number;
  y: number;
  height: number;
  text: string;
  color: string;
  /** Seconds alive. */
  t: number;
};

export type WalkAnim = {
  unitId: string;
  path: Coord[];
  /** Progress along the path in tiles: 1.5 = halfway between path[1] and [2]. */
  t: number;
};

/** A thing in the air between the hand that threw it and where it will land. */
export type ThrowAnim = {
  projectile: ProjectileId;
  from: Coord & { height: number };
  to: Coord & { height: number };
  /** 0 at the hand, 1 at the landing. */
  t: number;
  /** Seconds of flight. Longer throws take longer, within reason. */
  duration: number;
  /** Peak of the arc above the straight line, in levels. */
  arc: number;
  /** Radians of tumble over the whole flight. */
  spin: number;
};

export const battle = $state({
  units: STAGES[DEFAULT_STAGE].roster(),
  phase: (initIntro(DEFAULT_STAGE) ? 'intro' : 'clock') as Phase,
  /**
   * The opening dialogue, line by line, or null on a stage with no brief.
   * Non-null holds the clock: `advanceClock` only ever runs in phase
   * `'clock'`, so a stage that opens on a line of dialogue cannot elect an
   * active unit until `advanceIntro` has walked every line and let go.
   */
  intro: initIntro(DEFAULT_STAGE) as Intro | null,
  activeId: null as string | null,
  /** Ability chosen from the menu, waiting for a target. */
  ability: null as Ability | null,
  /**
   * Destination being pointed at while choosing where to walk. Null outside the
   * move phase — this is the one moment the cursor stops being a turn indicator
   * and becomes a pointing device, because it is the one moment there is
   * something to point at.
   */
  moveTarget: null as Coord | null,
  /** Tile being aimed at while an ability is up. Null outside the target phase. */
  aim: null as Coord | null,
  /**
   * The tile under the mouse pointer, or null when it is off the board.
   *
   * Deliberately NOT the cursor. The cursor is the game's - the destination
   * while moving, the aim while targeting, the acting unit otherwise - and it
   * is what the terrain window and Enter obey. This is only where the pointer
   * happens to be, and the one thing that reads it is the unit window, so that
   * resting the mouse on a man tells you who he is.
   */
  hover: null as Coord | null,
  /**
   * The unit whose SPRITE the pointer is over, by id, or null.
   *
   * A second source for the same question, and it exists because a man is
   * taller than his tile. Rest the pointer on his chest and the ray goes
   * through the billboard to the plate BEHIND him, so the tile alone names the
   * wrong square. The sprites report themselves; the plates keep reporting the
   * ground; `hoveredUnit()` prefers the man. Two fields rather than one so the
   * two writers can never clobber each other in the same pointer event.
   */
  hoverUnit: null as string | null,
  /**
   * What the stage's barrier has left, ONE ENTRY PER TILE of it, empty when
   * there is no barrier. Each square opens on its own the moment ITS entry
   * hits zero — a fighter who keeps hitting the same board opens that board,
   * not the whole run, and the tile beside it stays sealed in `map` until
   * somebody spends the swings on it too.
   */
  barrierHp: initBarrierHp(DEFAULT_STAGE),
  walk: null as WalkAnim | null,
  /** Non-null only while something thrown is still in the air. */
  throw: null as ThrowAnim | null,
  popups: [] as Popup[],
  log: [] as string[],
  winner: null as Team | null,
  /** Turn counter, purely for the log. */
  turn: 0,
});

/**
 * How long a unit holds the recoil frame after being hit. Long enough to read
 * at a glance, short enough to finish inside the beat before the next action —
 * the resolve pause is 0.75s.
 */
export const HURT_TIME = 0.5;

/**
 * How long the drop itself takes. It used to be the length of a fade-out, back
 * when a body disappeared; now nothing disappears and this only has to cover
 * the beat between being hit and being on the floor, so it is shorter.
 */
export const DEATH_TIME = 0.35;

/** Seconds of dead air between one turn ending and the next beginning. */
const TURN_GAP = 0.35;
/** The beat held after an action lands, so the result can be read. */
const RESOLVE_PAUSE = 0.75;
/** Tiles walked per second during a move animation. */
const WALK_SPEED = 4.5;

let clockDelay = TURN_GAP;
let popupId = 0;
let resolveTimer = 0;

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function activeUnit(): Unit | undefined {
  return unitById(battle.units, battle.activeId);
}

export function unitsInPlay(): Unit[] {
  return battle.units.filter(inPlay);
}

export function tileOf(u: Unit): Tile {
  // Every unit is placed on a real tile at deploy time and only ever moves onto
  // tiles the pathfinder validated, so this is total in practice.
  return tileAt(map, u.x, u.y)!;
}

export function heightOf(u: Unit): number {
  return tileOf(u)?.height ?? 0;
}

export function isPlayerTurn(): boolean {
  const u = activeUnit();
  return !!u && u.team === 'ally';
}

/** The pointer moved onto a tile, or off the board. Written only on change. */
export function setHoverTile(c: Coord | null) {
  const h = battle.hover;
  if (c === null ? h === null : h !== null && h.x === c.x && h.y === c.y) return;
  battle.hover = c;
}

/**
 * The pointer entered a unit's sprite, or left it.
 *
 * Leaving only clears the field if it still names the man who is leaving.
 * Sliding from one sprite straight onto its neighbour delivers a leave and an
 * enter in the same pass, in an order this code does not get to choose, and
 * without the guard the leave could wipe the enter and the card would blink.
 */
export function setHoverUnit(id: string | null, leaving?: string) {
  if (id === null) {
    if (leaving !== undefined && battle.hoverUnit !== leaving) return;
    if (battle.hoverUnit === null) return;
    battle.hoverUnit = null;
    return;
  }
  if (battle.hoverUnit !== id) battle.hoverUnit = id;
}

/**
 * Whoever the mouse is resting on: the man whose sprite it is over, or failing
 * that the man standing on the tile under it. Only somebody still in the fight.
 */
export function hoveredUnit(): Unit | undefined {
  const byId = battle.hoverUnit ? unitById(battle.units, battle.hoverUnit) : undefined;
  if (byId && inPlay(byId)) return byId;
  const h = battle.hover;
  const byTile = h ? unitAt(battle.units, h.x, h.y) : undefined;
  return byTile && inPlay(byTile) ? byTile : undefined;
}

/**
 * Where the cursor frame sits: the destination being chosen while moving, the
 * acting unit the rest of the time. Derived, never stored — outside the move
 * phase there is nothing that could put it anywhere else.
 *
 * Null mid-walk, where the unit's tile is still its origin and a frame left
 * behind reads as a glitch.
 */
export function cursorCoord(): Coord | null {
  if (battle.phase === 'move' && battle.moveTarget) return battle.moveTarget;
  if (battle.phase === 'target' && battle.aim) return battle.aim;
  const u = activeUnit();
  if (!u || battle.phase === 'moving') return null;
  return { x: u.x, y: u.y };
}

/**
 * Walks a tile cursor one step within a permitted set.
 *
 * Staying inside the set is what makes every press land somewhere Enter will
 * accept — no dead confirmations. It skips onward past cells the set excludes
 * rather than stopping at the first one, so neither an ally blocking a square
 * nor an ability's dead zone at its own feet can trap the cursor.
 */
function stepWithin(from: Coord, dx: number, dy: number, allowed: Set<string>): Coord | null {
  let { x, y } = from;
  const limit = Math.max(map.width, map.depth);
  for (let step = 0; step < limit; step++) {
    x += dx;
    y += dy;
    if (x < 0 || y < 0 || x >= map.width || y >= map.depth) return null;
    if (allowed.has(tileKey(x, y))) return { x, y };
  }
  return null;
}

/** Steps the destination cursor, kept to squares the unit can stop on. */
export function stepMoveCursor(dx: number, dy: number): boolean {
  if (battle.phase !== 'move' || !battle.moveTarget) return false;
  const next = stepWithin(battle.moveTarget, dx, dy, landableTiles(activeReach()));
  if (next) battle.moveTarget = next;
  return !!next;
}

/** Steps the aiming cursor, kept inside the chosen ability's reach. */
export function stepAimCursor(dx: number, dy: number): boolean {
  if (battle.phase !== 'target' || !battle.aim) return false;
  const next = stepWithin(battle.aim, dx, dy, abilityRangeTiles());
  if (next) battle.aim = next;
  return !!next;
}

/**
 * Where the cursor should sit the moment an ability is chosen.
 *
 * The closest unit of the side the ability is meant for, so the common case —
 * hit the enemy in front of you — needs no aiming at all. Abilities with a dead
 * zone at their feet make the caster's own square an invalid start, which is
 * why this cannot simply begin under the unit the way movement does.
 */
function defaultAim(ability: Ability): Coord | null {
  const u = activeUnit();
  if (!u) return null;
  const range = tilesInAbilityRange(map, { x: u.x, y: u.y }, heightOf(u), ability);
  const wantsAlly = ability.targets === 'ally';

  let best: Coord | null = null;
  let bestDist = Infinity;
  for (const other of battle.units) {
    if (!inPlay(other) || other.id === u.id) continue;
    if (!range.has(tileKey(other.x, other.y))) continue;
    if (ability.targets !== 'any' && wantsAlly !== (other.team === u.team)) continue;
    const d = gridDistance(u, other);
    if (d < bestDist) {
      bestDist = d;
      best = { x: other.x, y: other.y };
    }
  }
  if (best) return best;

  // Nobody in reach, but the fence is: point at it. On the board this exists
  // for, that is what a man who opened the menu with nobody around meant to do
  // - whether he is going to punch it or throw something at it.
  if (ability.kind !== 'rally' && u.team === 'ally') {
    for (const key of range) {
      const c = parseKey(key);
      if (barrierAt(c.x, c.y)) return c;
    }
  }

  // Nobody worth pointing at: park on the nearest square in reach, but never
  // on the caster's own. An ability with no minimum range covers the square it
  // is cast from, so the plain nearest tile is the caster itself — opening the
  // attack menu already aimed at your own face.
  let fallback: Coord | null = null;
  let fallbackDist = Infinity;
  for (const key of range) {
    const c = parseKey(key);
    if (c.x === u.x && c.y === u.y) continue;
    const d = gridDistance(u, c);
    if (d < fallbackDist) {
      fallbackDist = d;
      fallback = c;
    }
  }
  return fallback ?? { x: u.x, y: u.y };
}

/**
 * Units the pending ability would actually touch if confirmed on (x, y) — the
 * whole burst, not merely the square under the cursor, so an area spell aimed at
 * bare ground still counts whoever stands beside it.
 */
export function abilityTargetsAt(x: number, y: number): Unit[] {
  const ability = battle.ability;
  if (!ability) return [];
  const cells =
    ability.aoe > 0 ? tilesInBurst(map, { x, y }, ability.aoe) : new Set([tileKey(x, y)]);
  return battle.units.filter((u) => inPlay(u) && cells.has(tileKey(u.x, u.y)));
}

/**
 * Whether the aim is allowed to be confirmed on this unit.
 *
 * YOU MAY HIT YOUR OWN MEN ON PURPOSE. This used to refuse it, and the refusal
 * was inherited from a different question: it was written to stop a new player
 * punching himself in the face, and it did that by demanding the aim land on
 * the other side — which also quietly forbade Swan from clubbing the man in
 * front of him to get at the one behind. An area swing has always caught your
 * own people; the forecast window has always carried a line that says "Fuego
 * amigo: esto va contra los tuyos" and a comment calling it *allowed, but
 * loud*; and `resolveHits` has always painted a friendly's damage number amber
 * instead of white. Every part of this game was built expecting it except the
 * one gate that said no.
 *
 * So the only thing still refused is the actor himself. Not out of caution —
 * a swing no longer catches the man swinging it anyway, so confirming on your
 * own square would spend a turn and do nothing at all, and an order that
 * silently does nothing is worse than one that is greyed out.
 *
 * A rally keeps its side. Shouting the other gang back onto its feet is not a
 * bold tactical option, it is nonsense, and `resolveHits` would drop it on the
 * floor even if this let it through.
 */
function isIntendedTarget(actor: Unit, other: Unit, ability: Ability): boolean {
  if (ability.targets === 'ally') return other.team === actor.team;
  return other.id !== actor.id;
}

/** Whether confirming the aim right now would hit anything worth hitting. */
export function aimHasTarget(): boolean {
  const actor = activeUnit();
  const aim = battle.aim;
  const ability = battle.ability;
  if (battle.phase !== 'target' || !aim || !actor || !ability) return false;
  if (aimsAtBarrier(actor, ability, aim.x, aim.y)) return true;
  return abilityTargetsAt(aim.x, aim.y).some((t) => isIntendedTarget(actor, t, ability));
}

/** Tiles the chosen ability could be aimed at from where the actor stands. */
export function abilityRangeTiles(): Set<string> {
  const u = activeUnit();
  if (!u || !battle.ability) return new Set<string>();
  return tilesInAbilityRange(map, { x: u.x, y: u.y }, heightOf(u), battle.ability);
}

/**
 * Commits what clicking this tile means in the current phase. The board is the
 * only input: there is no cursor to aim first.
 */
export function confirmTile(x: number, y: number) {
  if (battle.phase === 'move') confirmMove(x, y);
  else if (battle.phase === 'target') confirmAbility(x, y);
}

/** Movement options for the active unit, recomputed on demand. */
export function activeReach(): ReachMap {
  const u = activeUnit();
  if (!u) return new Map();
  return computeReachable(map, battle.units, u);
}

function log(line: string) {
  battle.log.unshift(line);
  if (battle.log.length > 40) battle.log.length = 40;
}

// ---------------------------------------------------------------------------
// The clock
// ---------------------------------------------------------------------------

/**
 * Next N units to act, assuming everyone takes a full turn.
 *
 * Pure simulation over copies — the real CT values are untouched. This is what
 * lets the player plan two or three turns ahead, which is most of the thinking
 * in a tactics game.
 */
export function upcomingTurns(count = 7): { unit: Unit; ct: number }[] {
  const sim = unitsInPlay().map((u) => ({ unit: u, ct: u.ct, speed: u.speed }));
  const out: { unit: Unit; ct: number }[] = [];
  // Guard against a pathological all-zero-speed roster rather than spinning.
  for (let guard = 0; guard < 2000 && out.length < count; guard++) {
    let ready = sim.filter((s) => s.ct >= 100);
    if (!ready.length) {
      for (const s of sim) s.ct += s.speed;
      continue;
    }
    // Highest CT acts first; Speed breaks the tie, as in the original.
    ready.sort((a, b) => b.ct - a.ct || b.speed - a.speed);
    const first = ready[0];
    out.push({ unit: first.unit, ct: first.ct });
    first.ct -= 100;
  }
  return out;
}

/**
 * Advances the CT clock. Called once per frame while nobody is acting.
 *
 * The clock resolves in a tight loop rather than in real time — waiting for
 * bars to fill is not gameplay. `clockDelay` keeps just enough of a beat
 * between turns for the handoff to register.
 */
export function advanceClock(dt: number) {
  if (battle.phase !== 'clock') return;
  if (clockDelay > 0) {
    clockDelay -= dt;
    return;
  }

  for (let guard = 0; guard < 1000; guard++) {
    const ready = unitsInPlay().filter((u) => u.ct >= 100);
    if (ready.length) {
      ready.sort((a, b) => b.ct - a.ct || b.speed - a.speed);
      beginTurn(ready[0]);
      return;
    }
    for (const u of unitsInPlay()) u.ct += u.speed;
  }
}

function beginTurn(u: Unit) {
  facingBeforePreview = null;
  battle.turn += 1;
  battle.activeId = u.id;
  battle.ability = null;
  battle.moveTarget = null;
  battle.aim = null;
  u.hasMoved = false;
  u.hasActed = false;

  if (u.team === 'ally') {
    battle.phase = 'command';
  } else {
    battle.phase = 'resolving';
    planAiTurn(u);
  }
}

/**
 * Ends the active unit's turn.
 *
 * CT bookkeeping is where restraint pays off: a unit that skipped its action
 * keeps more charge and therefore comes back sooner — the same trade the
 * original offers when you choose to just reposition.
 */
export function endTurn() {
  const u = activeUnit();
  if (u) {
    u.ct -= 100;
    if (!u.hasActed) u.ct += 20;
    if (!u.hasMoved) u.ct += 10;
  }
  battle.activeId = null;
  battle.ability = null;
  battle.moveTarget = null;
  battle.aim = null;
  if (checkVictory()) return;
  battle.phase = 'clock';
  clockDelay = TURN_GAP;
}

function decide(winner: Team, line: string): boolean {
  battle.winner = winner;
  battle.phase = 'over';
  log(line);
  return true;
}

/**
 * Who has won, if anybody has.
 *
 * Two battles in one function, because there are two kinds. A stage with no
 * door is a fight to the last man and comes out of the bottom branch exactly as
 * it always did. A stage with a door is won by walking out of it — and lost the
 * moment the count can no longer be filled, which is not the same as losing
 * when the last man drops. Saying so on the beat somebody goes down is the
 * whole point of a battle you are meant to run away from.
 */
function checkVictory(): boolean {
  const exit = stage().exit;
  const standing = battle.units.filter((u) => u.team === 'ally' && inPlay(u)).length;
  const out = battle.units.filter((u) => u.team === 'ally' && hasLeft(u)).length;
  const enemies = battle.units.some((u) => u.team === 'enemy' && inPlay(u));

  // One man decides it. Checked after the door because a battle has one kind of
  // ending and the door returns on every path it cares about; checked before
  // extermination because clearing the beach has to keep ending it too. Nobody
  // is going to manage that, but a board with nobody left standing must never
  // be a board where you are still looking for somebody.
  const head = stage().head;
  if (head) {
    const him = unitById(battle.units, head.id);
    if (import.meta.env.DEV && !him) {
      // Without this a typo turns the finale into an extermination and nothing
      // fails: the condition simply never fires.
      throw new Error(`La escena ${stage().id} nombra a "${head.id}", que no está en su reparto`);
    }
    if (him && !isAlive(him)) return decide('ally', head.line);
  }

  if (exit) {
    if (out >= exit.needed) return decide('ally', 'Fuera. La puerta queda atrás.');
    if (out + standing < exit.needed) {
      return decide('enemy', 'Ya no salen los que hacen falta.');
    }
    // Clearing the room still ends it. Nobody is expected to manage that
    // against guns, but a board with nobody left on it must never be a battle
    // you are still required to walk out of.
    if (!enemies) return decide('ally', 'No queda nadie disparando.');
    return false;
  }

  if (standing && enemies) return false;
  return decide(
    standing ? 'ally' : 'enemy',
    standing ? '¡Victoria! El campo es tuyo.' : 'Derrota. Tu escuadra ha caído.'
  );
}

// ---------------------------------------------------------------------------
// Player commands
// ---------------------------------------------------------------------------

export type CommandEntry =
  | { kind: 'move'; enabled: boolean }
  | { kind: 'ability'; ability: Ability; enabled: boolean }
  | { kind: 'wait'; enabled: boolean };

/**
 * The order menu for the acting unit, as data.
 *
 * Both the window that draws the rows and the keyboard that walks them read
 * this one list. Built twice, the highlight would eventually point at a
 * different row than the one it appears to sit on.
 */
export function commandList(): CommandEntry[] {
  const u = activeUnit();
  if (!u) return [];
  return [
    { kind: 'move', enabled: !u.hasMoved },
    ...JOBS[u.job].abilities.map((ability) => ({
      kind: 'ability' as const,
      ability,
      // Empty-handed moves stay greyed out until something is in that hand —
      // which is exactly what makes taking someone's bat worth a turn.
      enabled:
        !u.hasActed &&
        ability.mp <= u.mp &&
        (!ability.needsWeapon || u.weapon !== 'none'),
    })),
    { kind: 'wait', enabled: true },
  ];
}

/** Runs one row of {@link commandList}. Disabled rows do nothing. */
export function runCommand(entry: CommandEntry) {
  if (!entry.enabled) return;
  if (entry.kind === 'move') commandMove();
  else if (entry.kind === 'ability') commandAbility(entry.ability);
  else commandWait();
}

export function commandMove() {
  const u = activeUnit();
  if (!u || u.hasMoved) return;
  // Starts on the unit's own square, which is always landable, so the arrows
  // have a valid place to step out from.
  battle.moveTarget = { x: u.x, y: u.y };
  battle.phase = 'move';
}

export function commandAbility(ability: Ability) {
  const u = activeUnit();
  if (!u || u.hasActed) return;
  if (ability.mp > u.mp) return;
  battle.ability = ability;
  battle.aim = defaultAim(ability);
  battle.phase = 'target';
}

/**
 * The facing a unit had when the orientation menu opened.
 *
 * Pointing at a direction turns the unit on the map for real so the player can
 * see the choice before committing — but backing out has to restore it exactly,
 * because facing is a rule (flanking, back attacks), not decoration.
 */
let facingBeforePreview: Facing | null = null;

export function commandWait() {
  const u = activeUnit();
  if (!u) return;
  facingBeforePreview = u.facing;
  battle.phase = 'facing';
}

/**
 * Live preview while the pointer rests on a direction. Pass `null` to put the
 * unit back the way it was.
 */
export function previewFacing(facing: Facing | null) {
  const u = activeUnit();
  if (!u || battle.phase !== 'facing') return;
  const next = facing ?? facingBeforePreview;
  if (next) u.facing = next;
}

/** Back out of a submenu without spending anything. */
export function cancel() {
  if (battle.phase === 'facing') {
    // Undo whatever the preview left on the unit.
    previewFacing(null);
    facingBeforePreview = null;
  }
  if (battle.phase === 'move' || battle.phase === 'target' || battle.phase === 'facing') {
    battle.ability = null;
    battle.moveTarget = null;
    battle.aim = null;
    battle.phase = 'command';
  }
}

export function setFacing(facing: Facing) {
  const u = activeUnit();
  if (u) u.facing = facing;
}

export function confirmFacing(facing: Facing) {
  setFacing(facing);
  facingBeforePreview = null;
  endTurn();
}

/** Starts walking the active unit to (x, y). The animation finishes the job. */
export function confirmMove(x: number, y: number) {
  const u = activeUnit();
  if (!u || battle.phase !== 'move') return;
  const reach = computeReachable(map, battle.units, u);
  const entry = reach.get(tileKey(x, y));
  if (!entry || !entry.stoppable) return;

  battle.moveTarget = null;
  const path = findPath(reach, x, y);
  if (path.length < 2) {
    // Chose the tile it already stands on — treat as a no-op, not a move.
    battle.phase = 'command';
    return;
  }
  battle.walk = { unitId: u.id, path, t: 0 };
  battle.phase = 'moving';
}

/**
 * Where a unit should actually be drawn, accounting for a walk in progress.
 * Returns grid-space floats plus the interpolated height so the sprite climbs
 * stairs instead of teleporting up them.
 */
export function renderPosition(u: Unit): { x: number; y: number; height: number } {
  const walk = battle.walk;
  if (!walk || walk.unitId !== u.id) {
    return { x: u.x, y: u.y, height: heightOf(u) };
  }
  const i = Math.min(Math.floor(walk.t), walk.path.length - 1);
  const j = Math.min(i + 1, walk.path.length - 1);
  const f = Math.min(1, walk.t - i);
  const a = walk.path[i];
  const b = walk.path[j];
  const ha = tileAt(map, a.x, a.y)?.height ?? 0;
  const hb = tileAt(map, b.x, b.y)?.height ?? 0;
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    // Ease the vertical leg so a climb reads as a hop rather than a ramp.
    height: ha + (hb - ha) * (f * f * (3 - 2 * f)),
  };
}

/** Advances walk animations, floating numbers and action pauses. */
export function advanceAnimations(dt: number) {
  const walk = battle.walk;
  if (walk) {
    walk.t += dt * WALK_SPEED;
    const u = unitById(battle.units, walk.unitId);
    const legs = walk.path.length - 1;
    if (u) {
      // Face along the leg currently being walked.
      const i = Math.min(Math.floor(walk.t), legs - 1);
      u.facing = facingTo(walk.path[i], walk.path[i + 1]);
    }
    if (walk.t >= legs) {
      const dest = walk.path[legs];
      battle.walk = null;
      if (u) {
        u.x = dest.x;
        u.y = dest.y;
        u.hasMoved = true;
      }
      onWalkFinished();
    }
  }

  // Recoil frames tick down here rather than on a timer per unit: one clock,
  // and it stops dead when the tab is hidden like everything else.
  for (const u of battle.units) {
    if (u.hurtFor > 0) u.hurtFor = Math.max(0, u.hurtFor - dt);
    if (u.deathFor > 0) u.deathFor = Math.max(0, u.deathFor - dt);
  }

  for (const p of battle.popups) p.t += dt;
  if (battle.popups.length) {
    battle.popups = battle.popups.filter((p) => p.t < POPUP_LIFE);
  }

  // Something in the air holds everything else: the hit is not rolled, the
  // numbers do not pop and the turn does not move on until it lands.
  const fly = battle.throw;
  if (fly) {
    fly.t += dt / fly.duration;
    if (fly.t >= 1) {
      battle.throw = null;
      const land = pendingImpact;
      pendingImpact = null;
      land?.();
      resolveTimer = RESOLVE_PAUSE;
    }
  }

  if (resolveTimer > 0) {
    resolveTimer -= dt;
    if (resolveTimer <= 0) onResolveFinished();
  }
}

/**
 * What to do when the thrown thing arrives. Held here rather than on `battle`
 * because it is a closure, not state anything renders — and putting a function
 * inside a deep reactive proxy is asking for trouble.
 */
let pendingImpact: (() => void) | null = null;

const POPUP_LIFE = 1.5;

/** Whether ANY tile of the stage's barrier is still standing. */
export function barrierStanding(): boolean {
  return battle.barrierHp.some((hp) => hp > 0);
}

/** Remaining HP of one barrier tile. 0 if (x, y) is not part of one. */
export function barrierTileHp(x: number, y: number): number {
  const b = stage().exit?.barrier;
  if (!b) return 0;
  const i = barrierIndex(b, x, y);
  return i >= 0 ? (battle.barrierHp[i] ?? 0) : 0;
}

/** Whether THIS ONE square of the barrier is still standing. */
export function barrierTileStanding(x: number, y: number): boolean {
  return barrierTileHp(x, y) > 0;
}

/** What the barrier has left, summed — for the one HUD number that tracks it. */
export function barrierHpTotal(): number {
  return battle.barrierHp.reduce((sum, hp) => sum + hp, 0);
}

/**
 * What one blow from `actor` with `ability` takes off the barrier.
 *
 * The stat has to be the one `combat.ts` would have used on a man, or the
 * window lies: the forecast shown while aiming at the fence is drawn from this
 * function, and a thrown brick is scored on CALLE, not on fuerza. Reading `pa`
 * for everything was invisible while only fists could reach the fence, and
 * became wrong the moment a brick could.
 *
 * No angle, no height, no nerve: a fence has no back and does not stand on a
 * step. What is left is the same product the forecast prints, times whatever
 * the move is worth against something that does not dodge.
 */
export function barrierDamage(actor: Unit, ability: Ability): number {
  const stat = ability.kind === 'ranged' ? actor.ma : actor.pa;
  return Math.max(1, Math.round(stat * ability.power * (ability.barrierMul ?? 1)));
}

/** Whether the current aim is a swing at the barrier, for the forecast. */
export function aimingAtBarrier(): boolean {
  const actor = activeUnit();
  const aim = battle.aim;
  const ability = battle.ability;
  if (battle.phase !== 'target' || !aim || !actor || !ability) return false;
  return aimsAtBarrier(actor, ability, aim.x, aim.y);
}

/** Whether (x, y) is a square of the barrier that is STILL standing. */
export function barrierAt(x: number, y: number): boolean {
  return barrierTileStanding(x, y);
}

/**
 * The board with whichever of the barrier's tiles are still standing sealed.
 * A copy, never a write into the stage's own map: that one is shared, frozen
 * data that the scene draws from and the checker reads, and a rule that lasts
 * a few turns must not leak into it. Everything that decides where a man may
 * stand reads `map`, so swapping the copy in and out is the entire mechanism.
 *
 * Recomputed from `hp` on every hit, not swapped once at the very end: a tile
 * that just reached zero has to open on its own, whatever its neighbours still
 * have left.
 */
function sealed(m: BattleMap, b: NonNullable<Exit['barrier']>, hp: number[]): BattleMap {
  return {
    ...m,
    tiles: m.tiles.map((t) => {
      if (!t) return t;
      const i = barrierIndex(b, t.x, t.y);
      return i >= 0 && (hp[i] ?? 0) > 0 ? { ...t, walkable: false } : t;
    }),
  };
}

/**
 * Whether a blow aimed at (x, y) is a blow at the barrier.
 *
 * ANY ATTACK, from the player's side. It used to be `physical` only - fists and
 * whatever was in the hand - and that quietly left two of the nine unable to
 * touch the thing the whole board is about: Vermin throws and Rembrandt sprays,
 * so on the one stage where the first lesson is "hit it", the two of them could
 * only stand there. A brick is exactly what a fence is for.
 *
 * `rally` is the one kind that is not an attack, and excluding it excludes both
 * of the moves that would have been nonsense - shouting your gang back onto
 * their feet, and Rembrandt painting his name on something. Both are
 * `targets: 'ally'`, neither does damage to anybody, and neither opens a fence.
 * One condition, and it reads as what it means.
 */
function aimsAtBarrier(actor: Unit, ability: Ability, x: number, y: number): boolean {
  return actor.team === 'ally' && ability.kind !== 'rally' && barrierAt(x, y);
}

/**
 * A blow on the barrier. No roll: a fence does not dodge and has no back, so
 * the number is the straight PA times power the forecast would print against
 * a man, and every hit lands.
 *
 * IT ONLY EVER TOUCHES THE SQUARE AIMED AT. `aimsAtBarrier` already refused
 * anything else — you cannot target a board that already gave — so `i` below
 * is always the one tile this swing was for, and every OTHER tile's pool is
 * exactly what it was before this function ran.
 */
function hitBarrier(actor: Unit, ability: Ability, x: number, y: number) {
  const b = stage().exit!.barrier!;
  const i = barrierIndex(b, x, y);
  const dmg = barrierDamage(actor, ability);
  battle.barrierHp[i] = Math.max(0, battle.barrierHp[i] - dmg);
  const height = tileAt(map, x, y)?.height ?? heightOf(actor);
  pushPopupAt(x, y, height, String(dmg), '#ffe27a');
  // Same shape as a hit on a man, with the order named: the fence is the one
  // place where WHICH blow you used is the whole lesson.
  log(`${actor.name} → ${b.label.toLowerCase()} (${ability.name}): ${dmg} de daño.`);

  // Recomputed, not swapped: a run of four pools means four separate moments
  // a door can open, not one.
  map = boardFor(stageId, battle.barrierHp);
  if (battle.barrierHp[i] > 0) return;

  // Down to zero, THIS TILE only. If it took the last pool with it, the run is
  // whole open and gets the line the stage wrote for that; otherwise it is one
  // board out of four and gets a smaller beat that says exactly that.
  if (battle.barrierHp.every((hp) => hp <= 0)) {
    pushPopupAt(x, y, height, '¡ABIERTA!', '#79e07a');
    log(b.line);
  } else {
    pushPopupAt(x, y, height, '¡HUECO!', '#79e07a');
    log(`${actor.name} abre un hueco en ${b.label.toLowerCase()}.`);
  }
}

/** Whether this square is part of the way out. */
function onExitTile(u: Unit): boolean {
  const e = stage().exit;
  return !!e && u.x >= e.x && u.x < e.x + e.w && u.y >= e.y && u.y < e.y + e.d;
}

/**
 * Through the door, and out of the fight.
 *
 * It costs him the rest of his turn, which is the decision: you either shoot
 * back or you leave. He keeps his square so that everything doing `tileAt(...)!`
 * on a unit stays total — nothing draws him and nothing stands on him.
 */
function escapeThrough(u: Unit) {
  u.leftOnTurn = battle.turn;
  pushPopup(u, '¡FUERA!', '#79e07a');
  log(`${u.name} cruza la puerta.`);
  endTurn();
}

function onWalkFinished() {
  const u = activeUnit();
  if (!u) return;
  // Landing on the doorway is the whole decision: no order to confirm and no
  // key to learn. The tile is the verb.
  if (u.team === 'ally' && onExitTile(u)) return escapeThrough(u);
  if (u.team === 'ally') {
    battle.phase = 'command';
  } else {
    // The AI paused its plan to walk; pick it back up after a beat.
    battle.phase = 'resolving';
    resolveTimer = 0.25;
  }
}

// ---------------------------------------------------------------------------
// Resolving an ability
// ---------------------------------------------------------------------------

function pushPopup(unit: Unit, text: string, color: string) {
  pushPopupAt(unit.x, unit.y, heightOf(unit), text, color);
}

function pushPopupAt(x: number, y: number, height: number, text: string, color: string) {
  battle.popups.push({ id: popupId++, x, y, height, text, color, t: 0 });
}

const ANGLE_TAG: Record<Angle, string> = { front: '', side: ' (flanco)', back: ' (espalda)' };

/**
 * Applies `ability` centred on (x, y). Every unit inside the burst is rolled
 * separately, so an area spell can crit one target and glance off another.
 */
/**
 * Resolves the pending ability on (x, y). Returns false when the action was
 * refused and nothing was spent — the caller decides what to do about it.
 */
export function confirmAbility(x: number, y: number): boolean {
  const actor = activeUnit();
  const ability = battle.ability;
  if (!actor || !ability || battle.phase !== 'target') return false;
  // Enforced here rather than in the caller: mouse, keyboard and the AI all
  // reach this function, and only one of them used to check.
  if (!abilityRangeTiles().has(tileKey(x, y))) return false;

  const targets = abilityTargetsAt(x, y);
  // Nothing the move was meant for, so it does not happen at all. Spending a
  // turn on empty ground — or on your own face — is never a decision anybody
  // meant to make; it is a misfired click. The refusal comes before any stamina
  // or facing is touched, so the player is left exactly where they were, still
  // aiming.
  const barrier = aimsAtBarrier(actor, ability, x, y);
  if (!barrier && !targets.some((t) => isIntendedTarget(actor, t, ability))) return false;

  actor.facing = facingTo({ x: actor.x, y: actor.y }, { x, y });
  actor.mp -= ability.mp;
  actor.hasActed = true;
  battle.phase = 'resolving';
  battle.ability = null;
  battle.aim = null;

  // Thrown moves commit here but land later: the object has to cross the board
  // first, and only then is anything rolled. Everything else resolves on the
  // spot, the way a punch does.
  if (ability.projectile) {
    const to = { x, y, height: tileAt(map, x, y)?.height ?? heightOf(actor) };
    const from = { x: actor.x, y: actor.y, height: heightOf(actor) };
    const dist = gridDistance(from, to);
    battle.throw = {
      projectile: ability.projectile,
      from,
      to,
      t: 0,
      // Far throws take longer, but not proportionally — a five-tile lob that
      // took five times as long as a two-tile one would just feel slow.
      duration: Math.min(0.75, 0.34 + dist * 0.08),
      arc: 1.1 + dist * 0.3,
      // A bottle tumbles end over end; a brick is too heavy to spin much.
      spin: ability.projectile === 'bottle' ? Math.PI * 2.5 : Math.PI * 0.8,
    };
    // The SAME two steps the immediate path takes below, in the same order,
    // just deferred until the object lands. Leaving the barrier out of here was
    // the bug that made "any attack opens the fence" a half-truth: a thrown
    // brick would aim at it, print a forecast, spend the stamina, fly the whole
    // way across the board - and do nothing, because the deferred impact only
    // ever rolled against people. Anything that resolves on arrival has to
    // resolve ALL of it on arrival.
    pendingImpact = () => {
      if (barrier) hitBarrier(actor, ability, x, y);
      resolveHits(actor, ability, targets);
    };
    return true;
  }

  if (barrier) hitBarrier(actor, ability, x, y);
  resolveHits(actor, ability, targets);
  resolveTimer = RESOLVE_PAUSE;
  return true;
}

/**
 * Somebody watches the wrong man go down and stops being on his side.
 *
 * One assignment, and everything downstream is already looking at it. The team
 * ring and the ground wedge are painted inside an effect that reads `unit.team`,
 * the turn order colours its rows off the same field, the planner picks its
 * targets with `o.team !== u.team`, and `checkVictory` counts both sides fresh
 * every time it runs - so flipping the field flips the unit's colour, who wants
 * to hit her, who she wants to hit, and whether the battle is over. Nothing here
 * has to tell any of them.
 *
 * It fires from the one place a unit can reach zero, and it cannot catch the
 * acting unit: the trigger is somebody ELSE falling, and on this board the only
 * mover who can drop Sully is on the other side from him.
 */
function changeSides(fallen: Unit) {
  const rule = stage().turncoat;
  if (!rule || fallen.id !== rule.when) return;
  const who = unitById(battle.units, rule.id);
  if (import.meta.env.DEV && !who) {
    // Same guard as `head`: without it a typo means the rule simply never
    // fires, and a rule that silently does not exist is worse than a crash.
    throw new Error(`La escena ${stage().id} hace cambiar de bando a "${rule.id}", que no está en su reparto`);
  }
  if (!who || !inPlay(who) || who.team === rule.to) return;
  who.team = rule.to;
  log(rule.line);
  pushPopup(who, '¡SE PASA!', '#79e07a');
}

/** Rolls the ability against everyone caught in it and applies what happens. */
function resolveHits(actor: Unit, ability: Ability, targets: Unit[]) {
  const actorHeight = heightOf(actor);
  for (const target of targets) {
    const friendly = target.team === actor.team;

    // A WIDE SWING NEVER CATCHES THE MAN SWINGING IT.
    //
    // Three abilities in this game have an area — the Furies' bat, the Orphans'
    // plank and the Punks' chain — and all three are range 1 with a radius of
    // 1, so the square the swinger is standing on has always been inside his
    // own arc. Every one of them has been taking a full hit off its own user
    // since it was written, and the battle report has been printing lines like
    // "Furia 3 → Furia 3: 15 de daño" that nobody read as the bug they were.
    //
    // You swing a bat AROUND yourself. The cost of swinging wide is your own
    // PEOPLE, which is what the note below is about and which stays; it was
    // never meant to be your own ribs. A rally is left alone: shouting a gang
    // onto its feet can reasonably include your own, and that behaviour is old
    // and nobody asked for it to change.
    if (ability.kind !== 'rally' && target.id === actor.id) continue;

    // A wide swing catching your own people is a real cost of swinging wide,
    // and it stays. Shouting at your gang picking up the other gang is not a
    // cost, it is nonsense — Sully was rallying Swan back to his feet. A rally
    // only reaches the side it was shouted at.
    if (ability.kind === 'rally' && !friendly) continue;

    const result = rollAttack(actor, actorHeight, target, heightOf(target), ability);

    if (!result.hit) {
      pushPopup(target, 'Falla', '#d8d2c4');
      log(`${actor.name} falla contra ${target.name}.`);
      continue;
    }

    if (result.healing) {
      const before = target.hp;
      target.hp = Math.min(target.hpMax, target.hp + result.amount);
      const healed = target.hp - before;
      // A ZERO SAYS SO, and it used to say nothing at all. The argument for
      // silence was that a "+0" over a man at full health reads as a bug rather
      // than as a full bar, which is true about the number and false about the
      // turn: the aguante comes off the shouter whether or not anybody needed
      // picking up, and a player who watches six points go and sees NOTHING
      // over anybody cannot tell a rally he wasted from a rally that broke.
      // The cost staying is the deliberate part — reading who actually needs it
      // is the whole skill of the move — so the feedback has to be deliberate
      // too. Bone white, the same colour as a miss, because that is what this
      // is: it connected, and there was nothing to give.
      if (healed > 0) {
        pushPopup(target, '+' + healed, '#79e07a');
        log(`${actor.name} levanta a ${target.name}: +${healed} PV.`);
      } else {
        pushPopup(target, '0', '#d8d2c4');
        log(`${target.name} ya está entero: no le hace nada.`);
      }
      continue;
    }

    target.hp = Math.max(0, target.hp - result.amount);
    target.hurtFor = HURT_TIME;
    pushPopup(target, String(result.amount), friendly ? '#ffb35c' : '#ffffff');
    // The angle only means something to a swing. It was already lying about
    // bottles and bricks; on a gunshot it would teach the exact opposite of
    // what this battle exists to teach.
    const angle = ability.kind === 'physical' ? ANGLE_TAG[result.angle] : '';
    log(`${actor.name} → ${target.name}: ${result.amount} de daño${angle}.`);

    // Taking the weapon is the point of the move, not a side effect: with both
    // hands full you can still knock it loose, and either way the other one
    // loses everything that needed it.
    if (ability.disarm && target.weapon !== 'none') {
      const taken = target.weapon;
      target.weapon = 'none';
      if (actor.weapon === 'none') {
        actor.weapon = taken;
        log(`${actor.name} le arrebata ${WEAPON_NAMES[taken]} a ${target.name}.`);
        pushPopup(actor, '¡ARMA!', '#ffe27a');
      } else {
        log(`${actor.name} le tira ${WEAPON_NAMES[taken]} de las manos a ${target.name}.`);
      }
    }
    if (target.hp === 0) {
      target.deathFor = DEATH_TIME;
      target.fellOnTurn = battle.turn;
      log(`${target.name} cae.`);
      pushPopup(target, 'K.O.', '#ff6b6b');
      changeSides(target);
    }
  }
}

function onResolveFinished() {
  if (checkVictory()) return;
  const u = activeUnit();
  if (!u) {
    battle.phase = 'clock';
    return;
  }
  if (u.team === 'ally') {
    battle.phase = 'command';
  } else {
    runAiStep();
  }
}

// ---------------------------------------------------------------------------
// Enemy AI
// ---------------------------------------------------------------------------

type AiPlan = {
  moveTo: Coord | null;
  ability: Ability | null;
  target: Coord | null;
  /** Which stage of the plan runs next. */
  stage: 'move' | 'act' | 'end';
};

let aiPlan: AiPlan | null = null;

/**
 * What one swing is worth to the side throwing it, counting EVERYBODY it would
 * actually land on.
 *
 * The planner used to score the aimed man and nobody else, which was fine while
 * every enemy move was single-target and quietly wrong the moment one was not.
 * An area swing in enemy hands was scored as pure profit: the Baseball Furies
 * have had `Golpe ancho` since Riverside was built and have been clubbing each
 * other with it, because the two of their own men standing in the arc cost the
 * plan nothing. This is that bug, and it is the reason the Punks' Cadenero was
 * given two tiles of reach instead of the sweep he should always have had.
 *
 * So: walk the burst exactly the way `resolveHits` will walk it — same cells,
 * same rule that a rally reaches only its own side — and add up what happens to
 * each man in it.
 *
 * FRIENDLY FIRE IS PRICED ABOVE ITS OWN DAMAGE, at 1.5, and a friendly kill at
 * three times a kill is worth. That asymmetry is not pessimism, it is the
 * arithmetic of a fight: damage dealt to the enemy is worth what it says, but
 * damage dealt to your own man is worth that AND the swings he will not be
 * throwing, and a man you drop yourself is a man the other side never had to
 * pay for. A planner that prices them equally will happily trade one of its own
 * for one of yours, which no gang in this film would do and no player would
 * read as intelligence.
 */
function scoreBurst(
  actor: Unit,
  fromHeight: number,
  ability: Ability,
  aimX: number,
  aimY: number
): number {
  const cells =
    ability.aoe > 0 ? tilesInBurst(map, { x: aimX, y: aimY }, ability.aoe) : new Set([tileKey(aimX, aimY)]);
  let score = 0;
  for (const other of battle.units) {
    if (!inPlay(other)) continue;
    // THE ACTOR IS SCORED WHERE HE WILL BE STANDING, NOT WHERE HE IS.
    //
    // `actor` here is a hypothetical already moved onto the square it would
    // attack from; the copy of him inside `battle.units` is still on his old
    // tile, so reading the list position for him would score the wrong square.
    const self = other.id === actor.id;
    const ox = self ? actor.x : other.x;
    const oy = self ? actor.y : other.y;
    if (!cells.has(tileKey(ox, oy))) continue;
    // Mirrors `resolveHits`: a swing does not catch the man swinging it, so it
    // is not scored against him either. A rally still reaches him, because it
    // still reaches him when it resolves.
    if (ability.kind !== 'rally' && self) continue;
    const friendly = other.team === actor.team;
    // Mirrors `resolveHits`: a rally never reaches the other side, so it is not
    // scored against them either. Everything else catches whoever is standing
    // in it, which is the price of swinging wide and is exactly what this
    // function exists to make the planner feel.
    if (ability.kind === 'rally' && !friendly) continue;
    const tile = tileAt(map, ox, oy);
    if (!tile) continue;
    const f = forecast(actor, fromHeight, other, tile.height, ability);

    if (ability.kind === 'rally') {
      // Only worth shouting at somebody actually on the floor. A man near full
      // contributes nothing rather than vetoing the swing, so a burst aimed at
      // one hurt man is not spoiled by a healthy one standing beside him.
      const missing = other.hpMax - other.hp;
      if (missing < other.hpMax * 0.35) continue;
      score += Math.min(missing, f.max) * 1.1;
      continue;
    }

    const expected = ((f.min + f.max) / 2) * (f.hit / 100);
    if (friendly) {
      score -= expected * 1.5;
      if (f.max >= other.hp) score -= 120;
    } else {
      score += expected;
      if (f.max >= other.hp) score += 40; // finish the kill
    }
  }
  return score;
}

/**
 * Picks a plan for an enemy unit, then hands control back to the animation
 * clock — `runAiStep` walks through the stages with a beat between each so the
 * player can follow what happened.
 *
 * The heuristic is deliberately readable rather than clever: score every
 * (ability, target) pair it could reach this turn by expected damage, take the
 * best, and fall back to walking toward the nearest enemy when nothing is in
 * reach. Killing blows get a large bonus, which is enough to make it feel like
 * it is paying attention.
 */
function planAiTurn(u: Unit) {
  const reach = computeReachable(map, battle.units, u);
  const foes = battle.units.filter((o) => inPlay(o) && o.team !== u.team);
  const friends = battle.units.filter((o) => inPlay(o) && o.team === u.team);

  let best: { score: number; plan: AiPlan } | null = null;

  for (const ability of JOBS[u.job].abilities) {
    if (ability.mp > u.mp) continue;
    if (ability.needsWeapon && u.weapon === 'none') continue;
    const pool = ability.targets === 'ally' ? friends : foes;
    for (const target of pool) {
      const targetTile = tileAt(map, target.x, target.y);
      if (!targetTile) continue;
      const approach = bestApproach(map, reach, targetTile, ability, target);
      if (!approach) continue;

      // Score from the square it would actually attack from, so flanking and
      // height advantages are part of the decision, not an afterthought — and
      // score the WHOLE BURST from there, so a wide swing is judged on the
      // people it lands on rather than on the one it is pointed at.
      const hypothetical = { ...u, x: approach.x, y: approach.y } as Unit;
      const fromHeight = tileAt(map, approach.x, approach.y)?.height ?? 0;
      let score = scoreBurst(hypothetical, fromHeight, ability, target.x, target.y);

      // A rally that would put nobody back on their feet is a wasted turn, and
      // the old code refused it with a `continue`. Keep that: a zero here means
      // the burst found nobody worth shouting at.
      if (ability.kind === 'rally' && score <= 0) continue;
      score -= approach.cost * 0.5; // all else equal, don't wander
      score -= ability.mp * 0.4;

      if (!best || score > best.score) {
        best = {
          score,
          plan: {
            moveTo: approach.x === u.x && approach.y === u.y ? null : { x: approach.x, y: approach.y },
            ability,
            target: { x: target.x, y: target.y },
            stage: 'move',
          },
        };
      }
    }
  }

  if (!best) {
    // Nothing in reach — close the distance on the nearest enemy.
    let nearest: Unit | null = null;
    let nearestDist = Infinity;
    for (const f of foes) {
      const d = gridDistance(f, u);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = f;
      }
    }
    const step = nearest ? stepToward(map, reach, { x: nearest.x, y: nearest.y }) : null;
    aiPlan = {
      moveTo: step && (step.x !== u.x || step.y !== u.y) ? { x: step.x, y: step.y } : null,
      ability: null,
      target: nearest ? { x: nearest.x, y: nearest.y } : null,
      stage: 'move',
    };
  } else {
    aiPlan = best.plan;
  }

  resolveTimer = 0.4;
}

function runAiStep() {
  const u = activeUnit();
  const plan = aiPlan;
  if (!u || !plan) {
    endTurn();
    return;
  }

  if (plan.stage === 'move') {
    plan.stage = 'act';
    if (plan.moveTo) {
      const reach = computeReachable(map, battle.units, u);
      const path = findPath(reach, plan.moveTo.x, plan.moveTo.y);
      if (path.length >= 2) {
        battle.walk = { unitId: u.id, path, t: 0 };
        battle.phase = 'moving';
        return;
      }
    }
    runAiStep();
    return;
  }

  if (plan.stage === 'act') {
    plan.stage = 'end';
    if (plan.ability && plan.target) {
      const victim = unitAt(battle.units, plan.target.x, plan.target.y);
      // The target may have died to someone else between planning and acting.
      if (victim) {
        battle.ability = plan.ability;
        battle.phase = 'target';
        if (confirmAbility(plan.target.x, plan.target.y)) return;
        // Refused — whoever was there is gone. Unwind the aiming state before
        // falling through, or the turn would sit in `target` forever with no
        // timer left running to pull it out.
        battle.ability = null;
        battle.aim = null;
        battle.phase = 'resolving';
      }
    }
    runAiStep();
    return;
  }

  // Face whatever it was interested in, then hand the clock back.
  if (plan.target) u.facing = facingTo({ x: u.x, y: u.y }, plan.target);
  aiPlan = null;
  endTurn();
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function restart() {
  // Installing the stage comes first: everything below is torn down relative to
  // the board that is about to be in play, not the one that just ended.
  battle.barrierHp = initBarrierHp(stageId);
  map = boardFor(stageId, battle.barrierHp);
  battle.units = STAGES[stageId].roster();
  if (import.meta.env.DEV && STAGES[stageId].exit && STAGES[stageId].head) {
    // A stage carrying both would silently be a door battle: the door answers
    // first and the head would never come up.
    throw new Error(`La escena ${stageId} tiene puerta y cabeza a la vez`);
  }
  battle.phase = 'clock';
  battle.activeId = null;
  battle.ability = null;
  battle.moveTarget = null;
  battle.aim = null;
  battle.walk = null;
  battle.popups = [];
  battle.throw = null;
  pendingImpact = null;
  battle.log = [];
  battle.winner = null;
  battle.turn = 0;
  battle.hover = null;
  battle.hoverUnit = null;
  facingBeforePreview = null;
  aiPlan = null;
  resolveTimer = 0;
  clockDelay = TURN_GAP;
  log('Comienza la batalla en ' + map.name + '.');
  // Backwards, because `log` unshifts: the last line pushed is the one on top,
  // so a brief written in reading order has to go in tail first to come out
  // head first. Logged after the opener so the opener ends up underneath it,
  // which is where the oldest line belongs in a newest-first window. Every
  // line still lands here regardless of `intro` below — the log is the
  // written record, the dialogue is only the first read of it.
  const brief = stage().brief;
  if (brief) for (let i = brief.length - 1; i >= 0; i--) log(brief[i].text);
  battle.intro = initIntro(stageId);
  if (battle.intro) battle.phase = 'intro';
}

/** Steps the opening dialogue forward, or lets go of the clock on the last line. */
export function advanceIntro() {
  const intro = battle.intro;
  if (!intro) return;
  if (intro.index + 1 < intro.lines.length) {
    intro.index += 1;
    return;
  }
  battle.intro = null;
  battle.phase = 'clock';
}

/** Drops the whole dialogue in one beat and lets the clock run. */
export function skipIntro() {
  if (!battle.intro) return;
  battle.intro = null;
  battle.phase = 'clock';
}

/**
 * Tears down the current fight and deals a fresh one on another board. The only
 * writer of `stageId`, and it goes through `restart()` so every half-finished
 * animation, timer and AI plan from the old board dies with it — a thrown
 * bottle still in the air would otherwise land on a street that no longer has
 * the people it was aimed at.
 */
export function startStage(id: StageId) {
  stageId = id;
  restart();
}

log('Comienza la batalla en ' + map.name + '.');
