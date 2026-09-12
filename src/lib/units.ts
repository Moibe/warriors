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

  /**
   * Seconds left on the recoil reaction. Presentation only — it decides which
   * sprite frame to draw and how hard to shake, and nothing in the rules reads
   * it. It lives on the unit rather than in a side table so the renderer can
   * find it without a lookup.
   */
  hurtFor: number;

  /**
   * Seconds left on the death animation. Presentation only, like `hurtFor`: the
   * rules treat a unit at 0 HP as gone the instant it happens — it stops
   * blocking squares and leaves the turn order — and this timer only keeps the
   * body on screen long enough to see it fall.
   */
  deathFor: number;

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
    hurtFor: 0,
    deathFor: 0,
    paletteOverride: seed.paletteOverride,
  };
}

/**
 * The opening roster for "Colina de la Capilla".
 *
 * Allies deploy in the southern meadow, enemies hold the eastern terraces and
 * the far end of the causeway. Starting CT is dealt out unevenly so the battle
 * opens with a staggered turn order rather than a simultaneous rush.
 *
 * The squad is laid out in depth rather than in a line, east being the way the
 * enemy lies: armour and fists at the front, bows a rank back, casters at the
 * rear where a goblin has to walk past three people to reach them. Duplicated
 * jobs carry a recolor — two knights in identical plate standing next to each
 * other are two units the player cannot tell apart at a glance.
 */
export function createRoster(): Unit[] {
  return [
    // ---- Tu escuadra ------------------------------------------------------
    // Vanguardia
    createUnit({ id: 'agata', name: 'Ágata', job: 'knight', team: 'ally', x: 5, y: 8, facing: 'e', ct: 20, brave: 82 }),
    createUnit({ id: 'bruno', name: 'Bruno', job: 'monk', team: 'ally', x: 5, y: 9, facing: 'e', ct: 32, brave: 88 }),

    // Segunda línea
    createUnit({
      id: 'gaspar',
      name: 'Gaspar',
      job: 'knight',
      team: 'ally',
      x: 4,
      y: 7,
      facing: 'e',
      ct: 12,
      brave: 74,
      // Latón y verde contra el acero y el morado de Ágata.
      // El yelmo también, o a distancia los dos caballeros son el mismo casco.
      paletteOverride: { A: '#c6b184', B: '#8d7a4e', C: '#3f5240', M: '#e0cf9c', F: '#4f8fbf', H: '#4a3320' },
    }),
    createUnit({ id: 'ramiro', name: 'Ramiro', job: 'squire', team: 'ally', x: 4, y: 8, facing: 'e', ct: 40, brave: 78 }),
    createUnit({
      id: 'inigo',
      name: 'Íñigo',
      job: 'thief',
      team: 'ally',
      x: 4,
      y: 10,
      facing: 'e',
      ct: 44,
      brave: 60,
      // Azul de noche, para no confundirlo con Harn en el bando contrario.
      paletteOverride: { A: '#4a6a8a', B: '#2e4356', C: '#26313f', H: '#5b3a1e' },
    }),

    // Arqueras
    createUnit({ id: 'tobias', name: 'Tobías', job: 'archer', team: 'ally', x: 3, y: 8, facing: 'e', ct: 30, brave: 65 }),
    createUnit({
      id: 'elena',
      name: 'Elena',
      job: 'archer',
      team: 'ally',
      x: 3,
      y: 10,
      facing: 'e',
      ct: 24,
      brave: 68,
      // Oliva y pluma dorada frente al pardo y la pluma verde de Tobías.
      paletteOverride: { A: '#6e7c50', B: '#4a5336', P: '#586043', F: '#d8a94a', H: '#c99a54', J: '#a07a3c' },
    }),

    // Retaguardia
    createUnit({ id: 'nerea', name: 'Nerea', job: 'blackmage', team: 'ally', x: 2, y: 9, facing: 'e', ct: 10, faith: 84 }),
    createUnit({ id: 'lucia', name: 'Lucía', job: 'whitemage', team: 'ally', x: 2, y: 11, facing: 'e', ct: 0, faith: 88 }),

    // ---- Los que te esperan: holding the near end of the causeway --------
    // Close enough that first contact lands in the opening round — a tactics
    // battle that spends three rounds walking teaches the player nothing.
    //
    // Nine a side, and between the two of them the enemy fields all eight jobs:
    // the point of matching the player's numbers is matching the player's
    // threats, not stacking nine of the same goblin.
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

    // Odo abre la carga y Bran la respalda; Vesna y Mirta se quedan detrás pero
    // sobre la calzada, NO en la terraza del fondo: probándolo, Mirta salía a
    // ocho casillas del combate con Mov 3 y se pasaba la batalla entera
    // caminando, sin curar una sola vez. Una sanadora que llega tarde no es una
    // sanadora. Desde aquí su alcance 4 cubre la línea desde el primer choque.
    createUnit({
      id: 'odo',
      name: 'Odo',
      job: 'monk',
      team: 'enemy',
      x: 8,
      y: 7,
      facing: 'w',
      ct: 28,
      brave: 90,
      // Faja azul en vez de roja, para no confundirlo con Bruno.
      paletteOverride: { A: '#b08a5c', B: '#3a5a7a', C: '#4a3a2c', H: '#1e1e22' },
    }),
    createUnit({
      id: 'bran',
      name: 'Bran',
      job: 'squire',
      team: 'enemy',
      x: 10,
      y: 5,
      facing: 'w',
      ct: 38,
      brave: 72,
      // Rojo oscuro y pelo moreno frente al azul y el rubio de Ramiro.
      paletteOverride: { A: '#8a4a42', B: '#c9a24a', C: '#4a2a26', H: '#3a2a20', J: '#241a14' },
    }),
    createUnit({
      id: 'vesna',
      name: 'Vesna',
      job: 'blackmage',
      team: 'enemy',
      x: 12,
      y: 5,
      facing: 'w',
      ct: 18,
      faith: 86,
      // Carmesí sobre negro, lejos del morado de Nerea.
      paletteOverride: { A: '#5a2838', B: '#c98a3a', C: '#3a1a24', P: '#4a1f2c', H: '#4a2030' },
    }),
    createUnit({
      id: 'mirta',
      name: 'Mirta',
      job: 'whitemage',
      team: 'enemy',
      x: 11,
      y: 6,
      facing: 'w',
      ct: 8,
      faith: 82,
      // Gris y violeta, para distinguirla del blanco de Lucía de un vistazo.
      paletteOverride: { A: '#b9aec6', B: '#6a4a7a', C: '#a89cb6', P: '#c6bcd0', H: '#6a5a4a' },
    }),
  ];
}
