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
  tileAt,
  tileKey,
  type Coord,
  type Facing,
  type Tile,
} from './grid';
import { JOBS, type Ability } from './jobs';
import { chapelHill } from './maps';
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
import { createRoster, isAlive, unitAt, unitById, type Team, type Unit } from './units';

/** The battlefield. Static for now — swap in another map from `maps.ts`. */
export const map = chapelHill;

export type Phase =
  | 'clock' // CT is filling; nobody is acting
  | 'command' // the active unit's menu is open
  | 'move' // picking a destination
  | 'moving' // walking the chosen path
  | 'target' // aiming an ability
  | 'resolving' // the action is playing out
  | 'facing' // choosing which way to end the turn looking
  | 'over'; // one side is gone

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

export const battle = $state({
  units: createRoster(),
  phase: 'clock' as Phase,
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
  walk: null as WalkAnim | null,
  popups: [] as Popup[],
  log: [] as string[],
  winner: null as Team | null,
  /** Turn counter, purely for the log. */
  turn: 0,
});

/** Seconds of dead air between one turn ending and the next beginning. */
const TURN_GAP = 0.35;
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

export function livingUnits(): Unit[] {
  return battle.units.filter(isAlive);
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
  const u = activeUnit();
  if (!u || battle.phase === 'moving') return null;
  return { x: u.x, y: u.y };
}

/**
 * Steps the move cursor one tile. The caller has already rotated the delta into
 * the camera's frame.
 *
 * Restricted to tiles the unit could actually stop on, so every press lands
 * somewhere Enter will accept — no dead confirmations. It skips onward past
 * cells that are merely passable, which is what stops an ally standing in the
 * way from trapping the cursor against them.
 */
export function stepMoveCursor(dx: number, dy: number): boolean {
  if (battle.phase !== 'move' || !battle.moveTarget) return false;
  const landable = landableTiles(activeReach());

  let { x, y } = battle.moveTarget;
  const limit = Math.max(map.width, map.depth);
  for (let step = 0; step < limit; step++) {
    x += dx;
    y += dy;
    if (x < 0 || y < 0 || x >= map.width || y >= map.depth) return false;
    if (landable.has(tileKey(x, y))) {
      battle.moveTarget = { x, y };
      return true;
    }
  }
  return false;
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
  const sim = livingUnits().map((u) => ({ unit: u, ct: u.ct, speed: u.speed }));
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
    const ready = livingUnits().filter((u) => u.ct >= 100);
    if (ready.length) {
      ready.sort((a, b) => b.ct - a.ct || b.speed - a.speed);
      beginTurn(ready[0]);
      return;
    }
    for (const u of livingUnits()) u.ct += u.speed;
  }
}

function beginTurn(u: Unit) {
  facingBeforePreview = null;
  battle.turn += 1;
  battle.activeId = u.id;
  battle.ability = null;
  battle.moveTarget = null;
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
  if (checkVictory()) return;
  battle.phase = 'clock';
  clockDelay = TURN_GAP;
}

function checkVictory(): boolean {
  const allies = battle.units.some((u) => u.team === 'ally' && isAlive(u));
  const enemies = battle.units.some((u) => u.team === 'enemy' && isAlive(u));
  if (allies && enemies) return false;
  battle.winner = allies ? 'ally' : 'enemy';
  battle.phase = 'over';
  log(allies ? '¡Victoria! El campo es tuyo.' : 'Derrota. Tu escuadra ha caído.');
  return true;
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
      enabled: !u.hasActed && ability.mp <= u.mp,
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

  for (const p of battle.popups) p.t += dt;
  if (battle.popups.length) {
    battle.popups = battle.popups.filter((p) => p.t < POPUP_LIFE);
  }

  if (resolveTimer > 0) {
    resolveTimer -= dt;
    if (resolveTimer <= 0) onResolveFinished();
  }
}

const POPUP_LIFE = 1.5;

function onWalkFinished() {
  const u = activeUnit();
  if (!u) return;
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
  battle.popups.push({
    id: popupId++,
    x: unit.x,
    y: unit.y,
    height: heightOf(unit),
    text,
    color,
    t: 0,
  });
}

const ANGLE_TAG: Record<Angle, string> = { front: '', side: ' (flanco)', back: ' (espalda)' };

/**
 * Applies `ability` centred on (x, y). Every unit inside the burst is rolled
 * separately, so an area spell can crit one target and glance off another.
 */
export function confirmAbility(x: number, y: number) {
  const actor = activeUnit();
  const ability = battle.ability;
  if (!actor || !ability || battle.phase !== 'target') return;
  // Enforced here rather than in the caller: mouse, keyboard and the AI all
  // reach this function, and only one of them used to check.
  if (!abilityRangeTiles().has(tileKey(x, y))) return;

  const cells = ability.aoe > 0 ? tilesInBurst(map, { x, y }, ability.aoe) : new Set([tileKey(x, y)]);
  const targets = battle.units.filter((u) => isAlive(u) && cells.has(tileKey(u.x, u.y)));

  actor.facing = facingTo({ x: actor.x, y: actor.y }, { x, y });
  actor.mp -= ability.mp;
  actor.hasActed = true;
  battle.phase = 'resolving';
  battle.ability = null;

  if (!targets.length) {
    log(`${actor.name} usa ${ability.name} — sin blanco.`);
    resolveTimer = 0.4;
    return;
  }

  const actorHeight = heightOf(actor);
  for (const target of targets) {
    const friendly = target.team === actor.team;
    // A heal on an enemy or a fireball on a friend is possible with an area
    // effect; the roll simply applies to whoever is standing in it.
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
      pushPopup(target, '+' + healed, '#79e07a');
      log(`${actor.name} cura ${healed} PV a ${target.name}.`);
      continue;
    }

    target.hp = Math.max(0, target.hp - result.amount);
    pushPopup(target, String(result.amount), friendly ? '#ffb35c' : '#ffffff');
    log(
      `${actor.name} → ${target.name}: ${result.amount} de daño${ANGLE_TAG[result.angle]}.`
    );
    if (target.hp === 0) {
      log(`${target.name} cae.`);
      pushPopup(target, 'K.O.', '#ff6b6b');
    }
  }

  resolveTimer = 0.75;
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
  const foes = battle.units.filter((o) => isAlive(o) && o.team !== u.team);
  const friends = battle.units.filter((o) => isAlive(o) && o.team === u.team);

  let best: { score: number; plan: AiPlan } | null = null;

  for (const ability of JOBS[u.job].abilities) {
    if (ability.mp > u.mp) continue;
    const pool = ability.targets === 'ally' ? friends : foes;
    for (const target of pool) {
      const targetTile = tileAt(map, target.x, target.y);
      if (!targetTile) continue;
      const approach = bestApproach(map, reach, targetTile, ability);
      if (!approach) continue;

      // Score from the square it would actually attack from, so flanking and
      // height advantages are part of the decision, not an afterthought.
      const hypothetical = { ...u, x: approach.x, y: approach.y } as Unit;
      const fromHeight = tileAt(map, approach.x, approach.y)?.height ?? 0;
      const f = forecast(hypothetical, fromHeight, target, targetTile.height, ability);

      let score: number;
      if (ability.targets === 'ally') {
        // Only worth healing someone actually hurt.
        const missing = target.hpMax - target.hp;
        if (missing < target.hpMax * 0.35) continue;
        score = Math.min(missing, f.max) * 1.1;
      } else {
        score = ((f.min + f.max) / 2) * (f.hit / 100);
        if (f.max >= target.hp) score += 40; // finish the kill
      }
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
        confirmAbility(plan.target.x, plan.target.y);
        return;
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
  battle.units = createRoster();
  battle.phase = 'clock';
  battle.activeId = null;
  battle.ability = null;
  battle.moveTarget = null;
  battle.walk = null;
  battle.popups = [];
  battle.log = [];
  battle.winner = null;
  battle.turn = 0;
  facingBeforePreview = null;
  aiPlan = null;
  resolveTimer = 0;
  clockDelay = TURN_GAP;
  log('Comienza la batalla en ' + map.name + '.');
}

log('Comienza la batalla en ' + map.name + '.');
