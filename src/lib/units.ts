import type { Facing } from './grid';
import { JOBS, type JobId, type Palette } from './jobs';

export type Team = 'ally' | 'enemy';

export type Unit = {
  id: string;
  name: string;
  job: JobId;
  team: Team;

  /** Grid position. A unit always stands on exactly one tile. */
  x: number;
  y: number;
  facing: Facing;

  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;

  pa: number;
  ma: number;
  speed: number;
  move: number;
  jump: number;

  /**
   * Charge Time, 0..100+. Every clock tick adds `speed`; at 100 the unit takes
   * its turn. This is the whole turn order — there are no rounds.
   */
  ct: number;

  /** Consumed within the active turn; reset when the turn ends. */
  hasMoved: boolean;
  hasActed: boolean;

  /** Flavour stats, shown in the unit window the way FFT does. */
  brave: number;
  faith: number;

  /** Per-unit recolor, so two goblins don't have to be the same goblin. */
  paletteOverride?: Partial<Palette>;
};

export function isAlive(u: Unit): boolean {
  return u.hp > 0;
}

export function unitAt(units: Unit[], x: number, y: number): Unit | undefined {
  return units.find((u) => isAlive(u) && u.x === x && u.y === y);
}

export function unitById(units: Unit[], id: string | null): Unit | undefined {
  if (!id) return undefined;
  return units.find((u) => u.id === id);
}

type UnitSeed = {
  id: string;
  name: string;
  job: JobId;
  team: Team;
  x: number;
  y: number;
  facing?: Facing;
  brave?: number;
  faith?: number;
  paletteOverride?: Partial<Palette>;
  /**
   * Starting CT. Spreading these out at deploy time is what makes the first
   * few turns feel staggered instead of everyone acting at once.
   */
  ct?: number;
};

export function createUnit(seed: UnitSeed): Unit {
  const job = JOBS[seed.job];
  const s = job.stats;
  return {
    id: seed.id,
    name: seed.name,
    job: seed.job,
    team: seed.team,
    x: seed.x,
    y: seed.y,
    facing: seed.facing ?? (seed.team === 'ally' ? 'n' : 's'),
    hp: s.hp,
    hpMax: s.hp,
    mp: s.mp,
    mpMax: s.mp,
    pa: s.pa,
    ma: s.ma,
    speed: s.speed,
    move: s.move,
    jump: s.jump,
    ct: seed.ct ?? 0,
    hasMoved: false,
    hasActed: false,
    brave: seed.brave ?? 70,
    faith: seed.faith ?? 70,
    paletteOverride: seed.paletteOverride,
  };
}

/**
 * The opening roster for "Colina de la Capilla".
 *
 * Allies deploy in the southern meadow, enemies hold the eastern terraces and
 * the far end of the causeway. Starting CT is dealt out unevenly so the battle
 * opens with a staggered turn order rather than a simultaneous rush.
 */
export function createRoster(): Unit[] {
  return [
    // ---- Tu escuadra: the southern meadow, backs to the pond -------------
    createUnit({ id: 'ramiro', name: 'Ramiro', job: 'squire', team: 'ally', x: 4, y: 8, facing: 'e', ct: 40, brave: 78 }),
    createUnit({ id: 'agata', name: 'Ágata', job: 'knight', team: 'ally', x: 3, y: 9, facing: 'e', ct: 20, brave: 82 }),
    createUnit({ id: 'tobias', name: 'Tobías', job: 'archer', team: 'ally', x: 2, y: 8, facing: 'e', ct: 30, brave: 65 }),
    createUnit({ id: 'nerea', name: 'Nerea', job: 'blackmage', team: 'ally', x: 2, y: 10, facing: 'e', ct: 10, faith: 84 }),
    createUnit({ id: 'lucia', name: 'Lucía', job: 'whitemage', team: 'ally', x: 1, y: 10, facing: 'e', ct: 0, faith: 88 }),

    // ---- Los que te esperan: holding the near end of the causeway --------
    // Close enough that first contact lands in the opening round — a tactics
    // battle that spends three rounds walking teaches the player nothing.
    createUnit({
      id: 'zaide',
      name: 'Zaide',
      job: 'knight',
      team: 'enemy',
      x: 9,
      y: 6,
      facing: 'w',
      ct: 35,
      // Renegade colors: blackened plate with a blood-red plume.
      paletteOverride: { A: '#6e5560', B: '#4a3844', C: '#3a2a34', M: '#c8b8bd', F: '#c0453f' },
    }),
    createUnit({ id: 'harn', name: 'Harn', job: 'thief', team: 'enemy', x: 10, y: 7, facing: 'w', ct: 15 }),
    createUnit({ id: 'orco-1', name: 'Trasgo', job: 'goblin', team: 'enemy', x: 8, y: 6, facing: 'w', ct: 25 }),
    createUnit({
      id: 'orco-2',
      name: 'Trasgo',
      job: 'goblin',
      team: 'enemy',
      x: 11, y: 8,
      facing: 'w',
      ct: 5,
      paletteOverride: { G: '#9aa84a' },
    }),
    createUnit({ id: 'vex', name: 'Vex', job: 'archer', team: 'enemy', x: 11, y: 5, facing: 'w', ct: 45, paletteOverride: { A: '#6a4a4a', P: '#553434' } }),
  ];
}
