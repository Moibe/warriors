import type { Facing } from './grid';
import { JOBS, type HatId, type JobId, type Palette, type WeaponId } from './jobs';

export type Team = 'ally' | 'enemy';

export type Unit = {
  id: string;
  name: string;
  job: JobId;
  team: Team;

  /** Grid position. Everyone stands on exactly one tile. */
  x: number;
  y: number;
  facing: Facing;

  hp: number;
  hpMax: number;
  /** Stamina. Shown as AGUANTE — there is no mana in a street fight. */
  mp: number;
  mpMax: number;

  pa: number;
  ma: number;
  speed: number;
  move: number;
  jump: number;

  /**
   * Charge Time, 0..100+. Every clock tick adds `speed`; at 100 you act. This is
   * the whole turn order — there are no rounds.
   */
  ct: number;

  /** Consumed within the active turn; reset when the turn ends. */
  hasMoved: boolean;
  hasActed: boolean;

  /** Flavour stats. AGALLAS drives nerve, CALLE is how street-smart you are. */
  brave: number;
  faith: number;

  /**
   * What this one is holding right now. It belongs to the person, not the role:
   * it can be knocked loose or taken off them mid-fight, and the sprite redraws
   * without it the moment it is gone.
   */
  weapon: WeaponId;

  /**
   * Overrides the role's headgear. A gang wears one uniform, so what sits on
   * each man's head is most of what tells nine of them apart.
   */
  hat?: HatId;

  /** Per-person recolor. Skin and hair only — never the gang's colors. */
  paletteOverride?: Partial<Palette>;

  /** Seconds left on the recoil reaction. Presentation only. */
  hurtFor: number;
  /** Seconds left on the going-down animation. Presentation only. */
  deathFor: number;
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

/** The headgear actually drawn: the person's, falling back to the role's. */
export function hatOf(u: Unit): HatId {
  return u.hat !== undefined ? u.hat : JOBS[u.job].sprite.hat;
}

/**
 * Where a stage wants a squad to stand. A squad carries its own default
 * deployment — the one it was written for — and a stage that needs it somewhere
 * else hands over one spot per member, in order. Nine entries, nine fighters.
 */
export type Spot = { x: number; y: number; facing?: Facing; ct?: number };

/**
 * Moves a squad onto a stage's deployment without touching anything else about
 * them. Who they are travels between battles; where they stand does not.
 */
function placeSquad(squad: Unit[], spots?: Spot[]): Unit[] {
  if (!spots) return squad;
  for (let i = 0; i < squad.length; i++) {
    const spot = spots[i];
    if (!spot) continue;
    squad[i].x = spot.x;
    squad[i].y = spot.y;
    if (spot.facing) squad[i].facing = spot.facing;
    if (spot.ct !== undefined) squad[i].ct = spot.ct;
  }
  return squad;
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
  hat?: HatId;
  weapon?: WeaponId;
  paletteOverride?: Partial<Palette>;
  /**
   * Starting CT. Spreading these out at deploy time is what makes the opening
   * feel staggered instead of everyone moving at once.
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
    weapon: seed.weapon ?? job.sprite.weapon,
    hat: seed.hat,
    paletteOverride: seed.paletteOverride,
    hurtFor: 0,
    deathFor: 0,
  };
}

// ---------------------------------------------------------------------------
// The Warriors
// ---------------------------------------------------------------------------
//
// The nine who went to the meeting. They all wear the same cut, the same denim
// and the same skull across the back — that is what a gang is — so not one of
// these recolors touches the uniform. What changes is skin, hair, and what each
// of them has on his head: Cochise's afro, Cowboy's hat, Fox's bandana.

const WARRIOR_SQUAD = () => [
  // Vanguardia
  createUnit({
    id: 'swan', name: 'Swan', job: 'warchief', team: 'ally',
    x: 5, y: 8, facing: 'e', ct: 20, brave: 84, faith: 80,
    paletteOverride: { H: '#2f2218', J: '#1b140e' },
  }),
  createUnit({
    id: 'ajax', name: 'Ajax', job: 'bruiser', team: 'ally',
    x: 5, y: 9, facing: 'e', ct: 32, brave: 92, faith: 52,
    paletteOverride: { H: '#9a7a44', J: '#6e5528' },
  }),

  // Segunda línea
  createUnit({
    id: 'cleon', name: 'Cleon', job: 'warchief', team: 'ally',
    x: 4, y: 7, facing: 'e', ct: 12, brave: 86, faith: 78,
    paletteOverride: { S: '#6b4426', K: '#4e3020', H: '#151212', J: '#0c0a0a' },
  }),
  createUnit({
    id: 'snow', name: 'Snow', job: 'scrapper', team: 'ally',
    x: 4, y: 8, facing: 'e', ct: 40, brave: 76,
    paletteOverride: { S: '#5f3c22', K: '#452916', H: '#181414', J: '#0d0b0b' },
  }),
  createUnit({
    id: 'cowboy', name: 'Cowboy', job: 'scrapper', team: 'ally',
    x: 4, y: 10, facing: 'e', ct: 44, brave: 66,
    hat: 'brim',
    paletteOverride: { H: '#b09050', J: '#7d6432', P: '#6f5230' },
  }),

  // Los que pegan de lejos
  createUnit({
    id: 'cochise', name: 'Cochise', job: 'scrapper', team: 'ally',
    x: 3, y: 8, facing: 'e', ct: 30, brave: 80,
    hat: 'afro',
    paletteOverride: { S: '#7a5030', K: '#5b3a22', H: '#1a1412', J: '#0e0b0a' },
  }),
  createUnit({
    id: 'vermin', name: 'Vermin', job: 'thrower', team: 'ally',
    x: 3, y: 10, facing: 'e', ct: 24, brave: 62, faith: 74,
    paletteOverride: { H: '#3a2e20', J: '#231c13' },
  }),

  // Retaguardia
  createUnit({
    id: 'fox', name: 'Fox', job: 'runner', team: 'ally',
    x: 2, y: 9, facing: 'e', ct: 10, brave: 70,
    hat: 'bandana',
    paletteOverride: { H: '#4a3122', J: '#2e1d14', P: '#c9402f' },
  }),
  createUnit({
    id: 'rembrandt', name: 'Rembrandt', job: 'artist', team: 'ally',
    x: 2, y: 11, facing: 'e', ct: 0, brave: 48, faith: 88,
    paletteOverride: { H: '#241c16', J: '#150f0c' },
  }),
];

// ---------------------------------------------------------------------------
// The Baseball Furies
// ---------------------------------------------------------------------------
//
// Nine bats and not one word. They are meant to read as a wall rather than as
// nine individuals, so they share a role as well as a uniform — the only thing
// that varies is the war paint, which is exactly how the film handles them. The
// turn-order list is where the player tells them apart.

const FURY_SQUAD = () => [
  // Los que llegan primero
  createUnit({
    id: 'fury-9', name: 'Furia 9', job: 'slugger', team: 'enemy',
    x: 8, y: 6, facing: 'w', ct: 25,
    paletteOverride: { F: '#20264a' },
  }),
  createUnit({
    id: 'fury-3', name: 'Furia 3', job: 'slugger', team: 'enemy',
    x: 8, y: 7, facing: 'w', ct: 28, brave: 88,
    paletteOverride: { F: '#a8232c' },
  }),
  createUnit({
    id: 'fury-14', name: 'Furia 14', job: 'slugger', team: 'enemy',
    x: 9, y: 6, facing: 'w', ct: 35, brave: 82,
    paletteOverride: { F: '#1a1a1e' },
  }),

  // El cuerpo central
  createUnit({
    id: 'fury-7', name: 'Furia 7', job: 'slugger', team: 'enemy',
    x: 10, y: 5, facing: 'w', ct: 38,
    paletteOverride: { F: '#a8232c', S: '#c99a6e', K: '#a67a52' },
  }),
  createUnit({
    id: 'fury-21', name: 'Furia 21', job: 'slugger', team: 'enemy',
    x: 10, y: 7, facing: 'w', ct: 15,
    paletteOverride: { F: '#20264a', S: '#6b4426', K: '#4e3020' },
  }),
  createUnit({
    id: 'fury-24', name: 'Furia 24', job: 'slugger', team: 'enemy',
    x: 11, y: 5, facing: 'w', ct: 45,
    paletteOverride: { F: '#1a1a1e' },
  }),

  // Los de atrás
  createUnit({
    id: 'fury-11', name: 'Furia 11', job: 'slugger', team: 'enemy',
    x: 11, y: 6, facing: 'w', ct: 8,
    paletteOverride: { F: '#a8232c' },
  }),
  createUnit({
    id: 'fury-32', name: 'Furia 32', job: 'slugger', team: 'enemy',
    x: 11, y: 8, facing: 'w', ct: 5,
    paletteOverride: { F: '#20264a', S: '#7a5030', K: '#5b3a22' },
  }),
  createUnit({
    id: 'fury-44', name: 'Furia 44', job: 'slugger', team: 'enemy',
    x: 12, y: 5, facing: 'w', ct: 18, brave: 90,
    paletteOverride: { F: '#1a1a1e' },
  }),
];

// ---------------------------------------------------------------------------
// The Turnbull A.C.
// ---------------------------------------------------------------------------
//
// Nine shaved heads in the same black denim cut, with the bull sewn across the
// back. Older and heavier than the Warriors, and they know it: they came down
// the block in a bus rather than walk. Same rule as the other two gangs — the
// uniform is untouchable, and what tells them apart is the man wearing it: how
// dark the skin, how recently the head was shaved, and which of them carries
// the scar.

const TURNBULL_SQUAD = () => [
  createUnit({
    id: 'bull', name: 'Bull', job: 'ringleader', team: 'enemy',
    x: 1, y: 5, facing: 'e', ct: 30, brave: 88, faith: 60,
    paletteOverride: { S: '#c99a6e', K: '#a67a52', H: '#bf8f66', J: '#8e6743' },
  }),
  createUnit({
    id: 'moose', name: 'Moose', job: 'wrecker', team: 'enemy',
    x: 1, y: 3, facing: 'e', ct: 12, brave: 84,
    paletteOverride: { S: '#e0b489', K: '#b98a63', H: '#cfa077', J: '#a17650' },
  }),
  createUnit({
    id: 'sledge', name: 'Sledge', job: 'wrecker', team: 'enemy',
    x: 1, y: 7, facing: 'e', ct: 8, brave: 86,
    paletteOverride: { S: '#7a5030', K: '#5b3a22', H: '#6d4629', J: '#4a3018' },
  }),
  createUnit({
    id: 'bruno', name: 'Bruno', job: 'enforcer', team: 'enemy',
    x: 2, y: 2, facing: 'e', ct: 34,
    paletteOverride: { S: '#d8a878', K: '#ad8156', H: '#c79a6c', J: '#9a7048' },
  }),
  createUnit({
    id: 'dutch', name: 'Dutch', job: 'enforcer', team: 'enemy',
    x: 3, y: 2, facing: 'e', ct: 20,
    // Nada de tocar G aquí: en esta plantilla es la camiseta que asoma por el
    // cuello, así que un rojo de cicatriz le sale como un cuello ensangrentado.
    paletteOverride: { S: '#e4bb92', K: '#bd8f68', H: '#d2a276', J: '#9e7550' },
  }),
  createUnit({
    id: 'hatch', name: 'Hatch', job: 'enforcer', team: 'enemy',
    x: 1, y: 2, facing: 'e', ct: 26,
    paletteOverride: { S: '#6b4426', K: '#4e3020', H: '#5e3b21', J: '#3f2715' },
  }),
  createUnit({
    id: 'tully', name: 'Tully', job: 'enforcer', team: 'enemy',
    x: 1, y: 8, facing: 'e', ct: 16,
    paletteOverride: { S: '#e8c19b', K: '#c0946d', H: '#d9b088', J: '#ab8058' },
  }),
  createUnit({
    id: 'rooster', name: 'Rooster', job: 'enforcer', team: 'enemy',
    x: 2, y: 8, facing: 'e', ct: 40, brave: 62,
    paletteOverride: { S: '#a87c58', K: '#835c3d', H: '#976d4a', J: '#6d4d33' },
  }),
  createUnit({
    id: 'angel', name: 'Angel', job: 'enforcer', team: 'enemy',
    x: 3, y: 9, facing: 'e', ct: 4,
    paletteOverride: { S: '#c08a5e', K: '#996a45', H: '#b07d52', J: '#8a5e3c' },
  }),
];

/** The nine who went to the meeting. They travel from one battle to the next. */
export function warriors(spots?: Spot[]): Unit[] {
  return placeSquad(WARRIOR_SQUAD(), spots);
}

/** The Baseball Furies, who only ever stand in Riverside Park. */
export function furies(spots?: Spot[]): Unit[] {
  return placeSquad(FURY_SQUAD(), spots);
}

/** The Turnbull A.C., who only ever block Gun Hill Road. */
export function turnbull(spots?: Spot[]): Unit[] {
  return placeSquad(TURNBULL_SQUAD(), spots);
}
