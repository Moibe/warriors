// Job catalog — the "clases" a unit can be, with their stats, their command
// list and the recipe used to draw their sprite.
//
// Everything a job is lives in one entry: stats the rules read, abilities the
// command menu offers, and the palette + gear the sprite generator paints. Add
// a job by adding one object here; nothing else needs to know about it.

export type AbilityKind = 'physical' | 'magic' | 'heal';

export type Ability = {
  id: string;
  name: string;
  kind: AbilityKind;
  /** Maximum Manhattan range in tiles. 1 = melee. */
  range: number;
  /** Minimum range — a bow can't be fired point blank. */
  minRange: number;
  /** Radius of the burst around the target tile. 0 = single target. */
  aoe: number;
  mp: number;
  /**
   * Multiplier on PA (physical) or MA (magic/heal). Rough scale: 2.0 with
   * PA 6 lands ~12 damage against a 45 HP body — four hits to drop someone.
   */
  power: number;
  /**
   * How many height levels the ability can span. Melee reaches barely above
   * eye level; arcing shots and spells ignore height entirely (Infinity).
   */
  vertical: number;
  targets: 'enemy' | 'ally' | 'any';
  /**
   * Base hit chance before facing and height are applied. Defaults to 80 — the
   * dial for "wild swing" versus "measured strike".
   */
  accuracy?: number;
  /** Extra multiplier when striking a target from behind (Puñalada). */
  backstab?: number;
  desc: string;
};

/** Color slots every sprite template paints with. See sprites.ts. */
export type Palette = {
  O: string; // outline
  S: string; // skin
  K: string; // skin shadow
  H: string; // hair
  J: string; // hair shadow
  E: string; // eye
  A: string; // primary — armour, tunic, robe
  B: string; // secondary — trim, belt, boots
  C: string; // cloth — trousers, skirt
  M: string; // metal — blades, helmets
  W: string; // wood / leather — hafts, bows
  P: string; // headwear
  G: string; // monster hide
  F: string; // accent — plumes, feathers
};

export type HatId = 'helm' | 'pointy' | 'brim' | 'hood' | null;
export type WeaponId = 'sword' | 'bow' | 'staff' | 'dagger' | 'club' | 'none';

export type JobStats = {
  hp: number;
  mp: number;
  /** Physical attack. */
  pa: number;
  /** Magic attack. */
  ma: number;
  /** Charge Time gained per clock tick — the whole turn order runs on this. */
  speed: number;
  /** Tiles of movement per turn. */
  move: number;
  /** Height levels the unit can climb in one step. */
  jump: number;
};

export type Job = {
  id: JobId;
  name: string;
  /** Three-letter tag, the way FFT abbreviates jobs in tight UI. */
  tag: string;
  stats: JobStats;
  abilities: Ability[];
  sprite: {
    body: 'human' | 'monster';
    hat: HatId;
    weapon: WeaponId;
    shield: boolean;
    palette: Palette;
  };
};

export type JobId =
  | 'squire'
  | 'knight'
  | 'archer'
  | 'blackmage'
  | 'whitemage'
  | 'monk'
  | 'thief'
  | 'goblin';

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

const BASE_PALETTE: Palette = {
  O: '#241a2b',
  S: '#f0c9a0',
  K: '#c99f78',
  H: '#7a4a24',
  J: '#563219',
  E: '#2b1c33',
  A: '#4d7ec8',
  B: '#e2c76a',
  C: '#3a4a6e',
  M: '#dfe6f2',
  W: '#7b4f2c',
  P: '#4d7ec8',
  G: '#7ab35a',
  F: '#d6534b',
};

function palette(overrides: Partial<Palette>): Palette {
  return { ...BASE_PALETTE, ...overrides };
}

// ---------------------------------------------------------------------------
// Shared abilities
// ---------------------------------------------------------------------------

/** The plain swing every job has as its first command. */
function meleeAttack(power: number, desc = 'Golpe cuerpo a cuerpo.'): Ability {
  return {
    id: 'attack',
    name: 'Atacar',
    kind: 'physical',
    range: 1,
    minRange: 0,
    aoe: 0,
    mp: 0,
    power,
    vertical: 2,
    targets: 'enemy',
    desc,
  };
}

// ---------------------------------------------------------------------------
// The catalog
// ---------------------------------------------------------------------------

export const JOBS: Record<JobId, Job> = {
  squire: {
    id: 'squire',
    name: 'Escudero',
    tag: 'ESC',
    stats: { hp: 46, mp: 14, pa: 6, ma: 4, speed: 9, move: 4, jump: 3 },
    abilities: [
      meleeAttack(2.0),
      {
        id: 'stone',
        name: 'Lanzar piedra',
        kind: 'physical',
        range: 4,
        minRange: 2,
        aoe: 0,
        mp: 0,
        power: 1.2,
        vertical: Infinity,
        targets: 'enemy',
        accuracy: 72,
        desc: 'Piedra en arco. Poco daño, pero llega lejos y no cuesta PM.',
      },
      {
        id: 'rally',
        name: 'Arengar',
        kind: 'heal',
        range: 2,
        minRange: 0,
        aoe: 1,
        mp: 6,
        power: 1.4,
        vertical: Infinity,
        targets: 'ally',
        desc: 'Un grito que reanima a los aliados cercanos.',
      },
    ],
    sprite: {
      body: 'human',
      hat: null,
      weapon: 'sword',
      shield: false,
      palette: palette({
        A: '#6d8ec9',
        B: '#d9b45c',
        C: '#39497a',
        H: '#e6c766',
        J: '#b6923c',
        M: '#c3cede',
      }),
    },
  },

  knight: {
    id: 'knight',
    name: 'Caballero',
    tag: 'CAB',
    stats: { hp: 62, mp: 8, pa: 8, ma: 3, speed: 7, move: 3, jump: 2 },
    abilities: [
      meleeAttack(2.2, 'Mandoble de acero.'),
      {
        id: 'breakarmor',
        name: 'Romper armadura',
        kind: 'physical',
        range: 1,
        minRange: 0,
        aoe: 0,
        mp: 4,
        power: 1.6,
        vertical: 2,
        targets: 'enemy',
        accuracy: 85,
        desc: 'Astilla la coraza: menos daño ahora, pero deja al blanco frágil.',
      },
    ],
    sprite: {
      body: 'human',
      hat: 'helm',
      weapon: 'sword',
      shield: true,
      palette: palette({
        A: '#b9c6d6',
        B: '#7d8ca0',
        C: '#5a3d6b',
        M: '#e6edf7',
        F: '#c0453f',
        H: '#8a5a2b',
      }),
    },
  },

  archer: {
    id: 'archer',
    name: 'Arquero',
    tag: 'ARQ',
    stats: { hp: 42, mp: 10, pa: 6, ma: 4, speed: 8, move: 4, jump: 4 },
    abilities: [
      {
        id: 'attack',
        name: 'Atacar',
        kind: 'physical',
        range: 4,
        minRange: 1,
        aoe: 0,
        mp: 0,
        power: 1.9,
        vertical: Infinity,
        targets: 'enemy',
        desc: 'Flecha en arco. Gana alcance desde lo alto.',
      },
      {
        id: 'charged',
        name: 'Disparo cargado',
        kind: 'physical',
        range: 6,
        minRange: 2,
        aoe: 0,
        mp: 6,
        power: 2.7,
        vertical: Infinity,
        targets: 'enemy',
        accuracy: 74,
        desc: 'Tensa el arco al límite: mucho más daño y alcance.',
      },
    ],
    sprite: {
      body: 'human',
      hat: 'brim',
      weapon: 'bow',
      shield: false,
      palette: palette({
        A: '#8a6a3f',
        B: '#5a4326',
        C: '#4a5a3a',
        P: '#6f5230',
        W: '#6b4526',
        H: '#5b3a1e',
        F: '#4f8f5a',
      }),
    },
  },

  blackmage: {
    id: 'blackmage',
    name: 'Maga negra',
    tag: 'MGN',
    stats: { hp: 34, mp: 42, pa: 3, ma: 9, speed: 7, move: 3, jump: 2 },
    abilities: [
      meleeAttack(1.1, 'Bastonazo. Mejor no llegar a esto.'),
      {
        id: 'fire',
        name: 'Fuego',
        kind: 'magic',
        range: 4,
        minRange: 0,
        aoe: 1,
        mp: 8,
        power: 2.1,
        vertical: Infinity,
        targets: 'enemy',
        desc: 'Estallido de llamas que alcanza a todo lo adyacente al blanco.',
      },
      {
        id: 'bolt',
        name: 'Rayo',
        kind: 'magic',
        range: 5,
        minRange: 0,
        aoe: 0,
        mp: 6,
        power: 2.9,
        vertical: Infinity,
        targets: 'enemy',
        desc: 'Un solo blanco, pero cae con toda la fuerza de la tormenta.',
      },
    ],
    sprite: {
      body: 'human',
      hat: 'pointy',
      weapon: 'staff',
      shield: false,
      palette: palette({
        A: '#3b3163',
        B: '#c94f4f',
        C: '#2a2348',
        P: '#2d2450',
        M: '#f2d06a',
        W: '#5f4126',
        H: '#33303f',
        J: '#22202b',
      }),
    },
  },

  whitemage: {
    id: 'whitemage',
    name: 'Clériga',
    tag: 'CLE',
    stats: { hp: 38, mp: 40, pa: 3, ma: 8, speed: 7, move: 3, jump: 2 },
    abilities: [
      meleeAttack(1.0, 'Un golpe de vara, sin convicción.'),
      {
        id: 'cure',
        name: 'Curar',
        kind: 'heal',
        range: 4,
        minRange: 0,
        aoe: 1,
        mp: 7,
        power: 2.6,
        vertical: Infinity,
        targets: 'ally',
        desc: 'Restaura PV al blanco y a quien esté a su lado.',
      },
      {
        id: 'holy',
        name: 'Luz',
        kind: 'magic',
        range: 3,
        minRange: 0,
        aoe: 0,
        mp: 12,
        power: 2.5,
        vertical: Infinity,
        targets: 'enemy',
        desc: 'Un haz sagrado. Caro en PM, contundente.',
      },
    ],
    sprite: {
      body: 'human',
      hat: 'hood',
      weapon: 'staff',
      shield: false,
      palette: palette({
        A: '#eae2d0',
        B: '#c04a4a',
        C: '#d6ccb6',
        P: '#f4efe3',
        M: '#7fd4e0',
        W: '#8a6a44',
        H: '#dcb45c',
        J: '#b18f3f',
      }),
    },
  },

  monk: {
    id: 'monk',
    name: 'Monje',
    tag: 'MNJ',
    stats: { hp: 56, mp: 12, pa: 9, ma: 4, speed: 9, move: 4, jump: 4 },
    abilities: [
      meleeAttack(2.4, 'Puño desnudo, más duro que muchos aceros.'),
      {
        id: 'kiwave',
        name: 'Onda de ki',
        kind: 'physical',
        range: 3,
        minRange: 1,
        aoe: 0,
        mp: 0,
        power: 1.8,
        vertical: 3,
        targets: 'enemy',
        accuracy: 78,
        desc: 'Proyecta el golpe a distancia. Sin coste.',
      },
      {
        id: 'chakra',
        name: 'Chakra',
        kind: 'heal',
        range: 1,
        minRange: 0,
        aoe: 1,
        mp: 0,
        power: 1.8,
        vertical: 2,
        targets: 'ally',
        desc: 'Reparte energía interna entre los aliados de al lado.',
      },
    ],
    sprite: {
      body: 'human',
      hat: null,
      weapon: 'none',
      shield: false,
      palette: palette({
        A: '#e8c49a',
        B: '#c0453f',
        C: '#6a5540',
        H: '#2e2e33',
        J: '#1d1d21',
      }),
    },
  },

  thief: {
    id: 'thief',
    name: 'Bandido',
    tag: 'BAN',
    stats: { hp: 40, mp: 10, pa: 6, ma: 3, speed: 11, move: 5, jump: 4 },
    abilities: [
      meleeAttack(1.8, 'Daga rápida.'),
      {
        id: 'backstab',
        name: 'Puñalada',
        kind: 'physical',
        range: 1,
        minRange: 0,
        aoe: 0,
        mp: 0,
        power: 1.3,
        vertical: 2,
        targets: 'enemy',
        accuracy: 88,
        backstab: 2.6,
        desc: 'Mediocre de frente. Letal por la espalda.',
      },
    ],
    sprite: {
      body: 'human',
      hat: null,
      weapon: 'dagger',
      shield: false,
      palette: palette({
        A: '#6b5b8a',
        B: '#3c3350',
        C: '#2f2a42',
        M: '#cfd6e2',
        H: '#4a3a2a',
        J: '#33271b',
      }),
    },
  },

  goblin: {
    id: 'goblin',
    name: 'Trasgo',
    tag: 'TRA',
    stats: { hp: 44, mp: 0, pa: 7, ma: 2, speed: 8, move: 4, jump: 3 },
    abilities: [
      meleeAttack(2.0, 'Garrote al bulto.'),
      {
        id: 'maul',
        name: 'Zarpazo',
        kind: 'physical',
        range: 1,
        minRange: 0,
        aoe: 0,
        mp: 0,
        power: 2.7,
        vertical: 2,
        targets: 'enemy',
        accuracy: 62,
        desc: 'Salvaje y torpe: pega fuerte pero falla más.',
      },
    ],
    sprite: {
      body: 'monster',
      hat: null,
      weapon: 'club',
      shield: false,
      palette: palette({
        G: '#7fae4a',
        A: '#7a5f3a',
        B: '#57422a',
        E: '#e8d24a',
        O: '#20211a',
        W: '#6b4526',
      }),
    },
  },
};

export const JOB_IDS = Object.keys(JOBS) as JobId[];
