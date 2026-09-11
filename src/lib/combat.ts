import { facingTo, type Coord, type Facing } from './grid';
import type { Ability } from './jobs';
import type { Unit } from './units';

/** Which side of the target you are standing on. */
export type Angle = 'front' | 'side' | 'back';

export const ANGLE_NAMES: Record<Angle, string> = {
  front: 'De frente',
  side: 'De flanco',
  back: 'Por la espalda',
};

const OPPOSITE: Record<Facing, Facing> = { n: 's', s: 'n', e: 'w', w: 'e' };

/**
 * Facing is the tactical heart of the genre: the same swing is worth very
 * different things depending on where you're standing. Attacking a unit from
 * behind is both far more likely to land and noticeably harder-hitting, which
 * is what makes movement matter as much as damage numbers.
 */
export function angleOf(attackerPos: Coord, target: Unit): Angle {
  // Direction the target would have to look to see the attacker.
  const toAttacker = facingTo({ x: target.x, y: target.y }, attackerPos);
  if (toAttacker === target.facing) return 'front';
  if (toAttacker === OPPOSITE[target.facing]) return 'back';
  return 'side';
}

const ANGLE_HIT: Record<Angle, number> = { front: 0, side: 10, back: 25 };
const ANGLE_DAMAGE: Record<Angle, number> = { front: 1, side: 1.1, back: 1.25 };

/** Height advantage, capped so a cliff never becomes an auto-win. */
function heightFactor(attackerHeight: number, targetHeight: number) {
  const diff = Math.max(-3, Math.min(3, attackerHeight - targetHeight));
  return { diff, hit: diff * 5, damage: 1 + diff * 0.06 };
}

/** Faith scales magic both ways — a devout caster hits harder. */
function faithFactor(u: Unit) {
  return Math.max(0.7, Math.min(1.4, u.faith / 70));
}

export type AttackForecast = {
  /** Percentage, 5..99. Magic and healing are shown as their own base. */
  hit: number;
  min: number;
  max: number;
  angle: Angle;
  heightDiff: number;
  /** True when the ability restores HP instead of removing it. */
  healing: boolean;
};

/**
 * The numbers shown in the confirmation window before an action is committed.
 * The same maths runs in {@link rollAttack}, so what the player is promised is
 * exactly what gets rolled.
 */
export function forecast(
  actor: Unit,
  actorHeight: number,
  target: Unit,
  targetHeight: number,
  ability: Ability
): AttackForecast {
  const h = heightFactor(actorHeight, targetHeight);
  const angle = angleOf({ x: actor.x, y: actor.y }, target);

  if (ability.kind === 'heal') {
    const base = actor.ma * ability.power * faithFactor(actor);
    return {
      hit: 100,
      min: Math.max(1, Math.round(base * 0.9)),
      max: Math.round(base * 1.1),
      angle,
      heightDiff: h.diff,
      healing: true,
    };
  }

  if (ability.kind === 'magic') {
    const base = actor.ma * ability.power * faithFactor(actor);
    return {
      hit: Math.max(5, Math.min(99, 92 + h.hit / 2)),
      min: Math.max(1, Math.round(base * 0.9)),
      max: Math.round(base * 1.1),
      angle,
      heightDiff: h.diff,
      healing: false,
    };
  }

  // Physical: angle and height move both the hit rate and the damage.
  const accuracy = ability.accuracy ?? 80;
  const hit = Math.max(5, Math.min(99, accuracy + ANGLE_HIT[angle] + h.hit));
  const angleMul = angle === 'back' && ability.backstab ? ability.backstab : ANGLE_DAMAGE[angle];
  const base = actor.pa * ability.power * angleMul * h.damage;
  return {
    hit,
    min: Math.max(1, Math.round(base * 0.9)),
    max: Math.round(base * 1.1),
    angle,
    heightDiff: h.diff,
    healing: false,
  };
}

export type AttackResult = {
  hit: boolean;
  amount: number;
  healing: boolean;
  angle: Angle;
};

/** Whether an ability is allowed to be pointed at this unit at all. */
export function isValidTarget(actor: Unit, target: Unit, ability: Ability): boolean {
  if (target.hp <= 0) return false;
  if (ability.targets === 'ally') return target.team === actor.team;
  if (ability.targets === 'enemy') return target.team !== actor.team;
  return true;
}

/** Rolls a single target's outcome using the same numbers the forecast showed. */
export function rollAttack(
  actor: Unit,
  actorHeight: number,
  target: Unit,
  targetHeight: number,
  ability: Ability
): AttackResult {
  const f = forecast(actor, actorHeight, target, targetHeight, ability);
  if (!f.healing && Math.random() * 100 > f.hit) {
    return { hit: false, amount: 0, healing: false, angle: f.angle };
  }
  const amount = Math.round(f.min + Math.random() * (f.max - f.min));
  return { hit: true, amount: Math.max(1, amount), healing: f.healing, angle: f.angle };
}
