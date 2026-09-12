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

const WARRIORS = () => [
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

const FURIES = () => [
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

/** The opening brawl: the Warriors against the Baseball Furies, nine a side. */
export function createRoster(): Unit[] {
  return [...WARRIORS(), ...FURIES()];
}
