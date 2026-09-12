// Role catalog — what a member is inside the gang, with the stats the rules
// read, the moves the order window offers, and the recipe the sprite generator
// paints.
//
// There is no magic in this game. Everything here is fists, whatever you picked
// up off the street, and nerve. Two ability kinds carry that: `physical` for
// anything that lands on a body, where the angle you come from matters, and
// `ranged` for things you throw, where skill matters more than the angle. The
// third, `rally`, is talking somebody back onto their feet.
//
// Everything a role is lives in one entry. Add a role by adding one object;
// nothing else needs to know about it.

export type AbilityKind = 'physical' | 'ranged' | 'rally';

export type Ability = {
  id: string;
  name: string;
  kind: AbilityKind;
  /** Maximum Manhattan range in tiles. 1 = you have to be on top of them. */
  range: number;
  /** Minimum range — you cannot throw a bottle at someone's chest. */
  minRange: number;
  /** Radius of the sweep around the target tile. 0 = one person. */
  aoe: number;
  /** Stamina it costs. Named AGUANTE in the UI; there is no mana here. */
  mp: number;
  /**
   * Multiplier on PA (fists and weapons) or MA (thrown, rallying). Rough scale:
   * 2.0 with PA 7 lands ~14 on a 50 HP body — four swings to put someone down.
   */
  power: number;
  /**
   * Height levels the move can span. A punch barely reaches above eye level;
   * something thrown does not care (Infinity).
   */
  vertical: number;
  targets: 'enemy' | 'ally' | 'any';
  /**
   * Base hit chance before facing and height. Defaults to 80 — the dial between
   * a measured jab and a wild haymaker.
   */
  accuracy?: number;
  /** Extra multiplier when it lands from behind. */
  backstab?: number;
  /** Greyed out unless the fighter is holding something. */
  needsWeapon?: boolean;
  /**
   * What the move throws. Its only job is to be watched flying: an ability
   * that names one waits for the thing to land before any damage is dealt, so
   * the hit reads as caused by the object rather than appearing beside it.
   */
  projectile?: ProjectileId;
  /** On a hit, takes the target's weapon — the signature street move. */
  disarm?: boolean;
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
  A: string; // the gang's colors — vest, shirt. Identical across a gang.
  B: string; // belt, boots, trim
  C: string; // trousers
  M: string; // metal / cap
  W: string; // wood, leather — bat handles, grips
  P: string; // headwear
  G: string; // face paint
  F: string; // accent — the logo on the back, stripes, bandanas
};

export type HatId = 'afro' | 'brim' | 'bandana' | 'cap' | null;
export type FaceId = 'fury' | null;
export type WeaponId = 'bat' | 'knife' | 'pipe' | 'can' | 'none';

/** Something that leaves the hand and is seen crossing the board to land. */
export type ProjectileId = 'bottle' | 'brick';

export type JobStats = {
  hp: number;
  /** Stamina. Shown as AGUANTE; gates the special moves. */
  mp: number;
  /** Fists and weapons. */
  pa: number;
  /** Skill — what you throw and how well you talk people up. */
  ma: number;
  /** Charge Time gained per clock tick — the whole turn order runs on this. */
  speed: number;
  move: number;
  jump: number;
};

export type Job = {
  id: JobId;
  name: string;
  /** Three-letter tag, for the tight corners of the UI. */
  tag: string;
  stats: JobStats;
  abilities: Ability[];
  sprite: {
    body: 'plain' | 'warrior' | 'fury' | 'turnbull' | 'orphan';
    hat: HatId;
    face: FaceId;
    /** What this role starts the fight holding. Can be lost, or taken. */
    weapon: WeaponId;
    palette: Palette;
  };
};

export type JobId =
  | 'warchief'
  | 'bruiser'
  | 'scrapper'
  | 'runner'
  | 'thrower'
  | 'artist'
  | 'slugger'
  | 'enforcer'
  | 'wrecker'
  | 'ringleader'
  | 'stray'
  | 'cornerboy'
  | 'loudmouth';

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

const BASE_PALETTE: Palette = {
  O: '#1c1620',
  S: '#e8bd93',
  K: '#c2946c',
  H: '#3a2a1e',
  J: '#241a12',
  E: '#241a2a',
  A: '#6b4a2e',
  B: '#2e2a28',
  C: '#3f4f6b',
  M: '#c9ced8',
  W: '#8a6038',
  P: '#3a2a1e',
  G: '#ece4dc',
  F: '#d8c48b',
};

function palette(overrides: Partial<Palette>): Palette {
  return { ...BASE_PALETTE, ...overrides };
}

/**
 * The Warriors' colors: brown leather cut over a bare chest, denim, and the
 * bone-white skull across the back. Identical for all nine — a gang wears one
 * thing, and telling the members apart is the job of skin, hair and whatever
 * each of them has on his head.
 */
const WARRIOR_COLORS: Partial<Palette> = {
  A: '#6d4b2c',
  B: '#2b2724',
  C: '#42536f',
  F: '#e6dcc4',
};

/**
 * The Turnbull A.C.: black denim vest buttoned shut over a shaved head. The
 * skull rides in the hair slots a shade cooler and duller than the skin, which
 * reads as three days unshaven rather than as a cartoon bald man. Nine of them
 * wear exactly this, and the gold of the bull patch is the only bright thing
 * on them.
 */
const TURNBULL_COLORS: Partial<Palette> = {
  O: '#15131a',
  // The shaved skull rides in the hair slots, a shade cooler and duller than
  // the skin. It belongs to the gang and not to the man: leave these out and a
  // Turnbull falls back to the base palette's dark brown and grows a full head
  // of hair, which is the one thing none of them has.
  H: '#d8ab80',
  J: '#a87c58',
  A: '#23283a',
  B: '#14151a',
  C: '#2f3a52',
  M: '#7c828c',
  W: '#6a4a2c',
  P: '#1b1d24',
  G: '#cdc6b8',
  F: '#c9932f',
};

/** The Furies: New York pinstripes, navy cap, and that painted face. */
const FURY_COLORS: Partial<Palette> = {
  A: '#e8e4dc',
  B: '#20264a',
  C: '#e8e4dc',
  M: '#20264a',
  F: '#20264a',
  G: '#f4efe6',
  W: '#c08a4a',
};

// ---------------------------------------------------------------------------
// Moves
// ---------------------------------------------------------------------------

/** The bare-knuckle swing everybody has as their first order. */
function punch(power: number, desc: string): Ability {
  return {
    id: 'punch',
    name: 'Golpear',
    kind: 'physical',
    range: 1,
    minRange: 0,
    aoe: 0,
    mp: 0,
    power,
    vertical: 2,
    targets: 'enemy',
    accuracy: 82,
    desc,
  };
}

/** Unlocked the moment you are holding something — including something stolen. */
const WEAPON_HIT: Ability = {
  id: 'weapon',
  name: 'Golpe con arma',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 3.0,
  vertical: 2,
  targets: 'enemy',
  accuracy: 76,
  needsWeapon: true,
  desc: 'Con lo que lleves en la mano. Pega mucho más que el puño.',
};

const DISARM: Ability = {
  id: 'disarm',
  name: 'Arrebatar',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 3,
  power: 0.9,
  vertical: 2,
  targets: 'enemy',
  accuracy: 74,
  disarm: true,
  desc: 'Le quitas el arma de las manos. Si tienes libres, te la quedas.',
};

const LOW_BLOW: Ability = {
  id: 'lowblow',
  name: 'Golpe bajo',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 2,
  power: 1.3,
  vertical: 2,
  targets: 'enemy',
  accuracy: 90,
  backstab: 2.7,
  desc: 'Poca cosa de frente. Por la espalda, se acabó.',
};

const BOTTLE: Ability = {
  id: 'bottle',
  name: 'Lanzar botella',
  kind: 'ranged',
  range: 4,
  minRange: 2,
  aoe: 0,
  mp: 3,
  power: 2.0,
  vertical: Infinity,
  targets: 'enemy',
  projectile: 'bottle',
  desc: 'Vuela por encima de todo. No hace falta acercarse.',
};

const BRICK: Ability = {
  id: 'brick',
  name: 'Ladrillo',
  kind: 'ranged',
  range: 5,
  minRange: 2,
  aoe: 0,
  mp: 6,
  power: 2.8,
  vertical: Infinity,
  targets: 'enemy',
  projectile: 'brick',
  desc: 'Pesa, llega lejos y tumba. Cuesta aguante lanzarlo.',
};

const RALLY: Ability = {
  id: 'rally',
  name: 'Arenga',
  kind: 'rally',
  range: 3,
  minRange: 0,
  aoe: 1,
  mp: 6,
  power: 2.2,
  vertical: Infinity,
  targets: 'ally',
  desc: 'Los levantas del suelo a gritos. Alcanza a los que estén al lado.',
};

const TAG_WALL: Ability = {
  id: 'tag',
  name: 'Pintar la pared',
  kind: 'rally',
  range: 2,
  minRange: 0,
  aoe: 2,
  mp: 8,
  power: 1.3,
  vertical: Infinity,
  targets: 'ally',
  desc: 'Marcas el terreno. Los tuyos pelean distinto en barrio propio.',
};

const EYE_SPRAY: Ability = {
  id: 'spray',
  name: 'Spray a los ojos',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 4,
  power: 1.2,
  vertical: 2,
  targets: 'enemy',
  accuracy: 96,
  desc: 'Casi nunca falla. Duele poco y ciega mucho.',
};

const CHARGE: Ability = {
  id: 'charge',
  name: 'Embestida',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 4,
  power: 2.8,
  vertical: 2,
  targets: 'enemy',
  accuracy: 68,
  desc: 'Te le echas encima entero. Si conecta, se entera.',
};

const BAT_SWING: Ability = {
  id: 'batswing',
  name: 'Batazo',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 2.5,
  vertical: 2,
  targets: 'enemy',
  accuracy: 76,
  needsWeapon: true,
  desc: 'El bate de frente. Para eso lo llevan.',
};

const WIDE_SWING: Ability = {
  id: 'wideswing',
  name: 'Bateo amplio',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 1,
  mp: 5,
  power: 1.9,
  vertical: 2,
  targets: 'enemy',
  accuracy: 66,
  needsWeapon: true,
  desc: 'Barre en círculo. Pilla a todo el que esté pegado, sea de quien sea.',
};

/**
 * The Orphans: a sleeveless vest in dirty oxblood over a three-wash undershirt,
 * work trousers, and their name painted on the back by hand.
 *
 * The rule this palette cares about is that it reads *cheaper* than the other
 * three at a glance. F is a dull off-white with far less contrast than the
 * Warriors' bone skull and none of the Turnbull gold — letters, not an emblem.
 * These are the only gang who look like ordinary men who put something on to
 * look like a gang.
 *
 * Every slot the nine share is declared here, including the two that bite: H/J
 * (left out, a Turnbull grows hair) and G (left out, it falls to the Furies'
 * face-paint white and nine Orphans get a glowing collar). In this template G
 * is the undershirt at the neck, not war paint — the same trap Dutch carries a
 * warning about in units.ts. Hair is the one slot that varies per man, because
 * they are the only gang wearing their own.
 */
const ORPHAN_COLORS: Partial<Palette> = {
  O: '#171319',
  H: '#4a3524',
  J: '#2e2016',
  A: '#6e3033',
  B: '#221d1c',
  C: '#4a4d42',
  M: '#8a8f95',
  W: '#6a4a2c',
  P: '#2b2f2c',
  G: '#cdc6b8',
  F: '#c6bca6',
};

// ---------------------------------------------------------------------------
// Turnbull A.C. moves
// ---------------------------------------------------------------------------
//
// The Furies were a race against the clock, won by taking their bats. These are
// a fight about space instead: they hand you the clock — they are the slowest
// men on the board — and take tiles away from you in exchange. Nothing below
// needs a new field on `Ability`. The whole identity is geometry.

/**
 * Two tiles of steel is the Turnbull's entire tactical claim: they advance less
 * than anybody and still take a square off you.
 *
 * `minRange: 2` is the counterplay, and it is deliberately the reverse of what
 * the Furies taught. Inside the arc the chain is dead weight, so the answer to
 * a Turnbull is to walk *into* him rather than back away — the player has to
 * unlearn the last fight, which is the whole point of a second one.
 */
const CHAIN_LASH: Ability = {
  id: 'chain',
  name: 'Cadenazo',
  kind: 'physical',
  range: 2,
  minRange: 2,
  aoe: 0,
  mp: 0,
  power: 2.0,
  vertical: 1,
  targets: 'enemy',
  accuracy: 72,
  needsWeapon: true,
  desc: 'Dos casillas de cadena. Pegado a él no puede usarla.',
};

/**
 * Everything he has, once. Priced at four of six stamina on purpose: the front
 * rank spends it on contact and then fades to bare knuckles, which is how a
 * gang of thirty-five-year-olds is supposed to lose a long fight.
 */
const BULL_RUSH: Ability = {
  id: 'bullrush',
  name: 'Cornada',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 4,
  power: 2.3,
  vertical: 1,
  targets: 'enemy',
  accuracy: 70,
  desc: 'Se te echa encima entero, hombro y cabeza. Le queda una para todo el combate.',
};

/** The two-by-four on edge, both hands. Lands like a truck, misses like a drunk. */
const PLANK_HIT: Ability = {
  id: 'plank',
  name: 'Estacazo',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 2.2,
  vertical: 1,
  targets: 'enemy',
  accuracy: 64,
  needsWeapon: true,
  desc: 'El tablón de canto. Cuando entra, entra; falla más de un tercio.',
};

/**
 * Aimed two tiles out and never at the next square along. A radius-1 burst
 * thrown at an adjacent tile would catch the swinger's own square — the same
 * flaw the Furies' wide swing has — so the minimum range keeps him outside his
 * own arc while his neighbours stay well inside it. That is the price of nine
 * men in a narrow street.
 */
const PLANK_SWEEP: Ability = {
  id: 'sweep',
  name: 'Barrido de tablón',
  kind: 'physical',
  range: 2,
  minRange: 2,
  aoe: 1,
  mp: 3,
  power: 1.9,
  vertical: 1,
  targets: 'enemy',
  accuracy: 78,
  needsWeapon: true,
  desc: 'Pasea el tablón en horizontal. Pilla a todo el que esté junto, sea de quien sea.',
};

/**
 * The mirror of the Warriors' Arrebatar, and the reason he is the man to drop
 * first. His hands are already full, so what he knocks loose is not taken: it
 * hits the floor and stays there. The disarm rides on a full-damage swing
 * because the planner scores expected damage and nothing else — a cheap utility
 * move would never once be picked.
 */
const MACHETE_CUT: Ability = {
  id: 'machete',
  name: 'Machetazo',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 2.0,
  vertical: 2,
  targets: 'enemy',
  accuracy: 74,
  needsWeapon: true,
  disarm: true,
  desc: 'Corta, y de paso te tira de las manos lo que lleves.',
};

/**
 * The only reach in the gang that answers height. Scored just under Machetazo,
 * so it stays holstered until the machete's vertical 2 falls short — which is
 * to say he pulls it out on the station stairs and nowhere else.
 */
const UPCUT: Ability = {
  id: 'upcut',
  name: 'Tajo de abajo arriba',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 4,
  power: 2.2,
  vertical: 3,
  targets: 'enemy',
  accuracy: 70,
  needsWeapon: true,
  desc: 'Alcanza al que se creía a salvo dos escalones más arriba.',
};

// ---------------------------------------------------------------------------
// Orphan moves
// ---------------------------------------------------------------------------
//
// The Furies were a fight about the clock; the Turnbull, a fight about tiles.
// These are a fight about which way you are facing.
//
// Not one number below is worth anything on its own. The whole gang lives on a
// rule the engine already runs: `angleOf` turns the same punch into three
// different punches depending on the side it comes in from, and a man faces one
// way at a time. Nine Orphans around one Warrior means one of them is always
// behind him — and the Warrior chooses which one every time he swings, because
// landing a hit turns him to look at what he hit.
//
// So "surrounded" is not a counter anything here has to keep. It is geometry,
// and it was in the rules before they arrived.
//
// Nobody in this gang is holding anything. That is the third thing the player
// has to unlearn: Arrebatar, the move the Furies taught him, has nothing to
// take here.

const SURROUND: Ability = {
  id: 'surround',
  name: 'Rodear',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 1.0,
  // Punch height. A Warrior three levels up a stoop is out of the mob's reach
  // altogether — which is the hole the Esquinero's thrown junk exists to close.
  vertical: 2,
  targets: 'enemy',
  accuracy: 72,
  /**
   * The widest front-to-back spread in the game, and the entire gang in one
   * field: five points from the front, seventeen from behind. Never raise
   * `power` to make them scarier — that would make them dangerous head-on,
   * which is the one thing an Orphan must never be.
   */
  backstab: 3.4,
  desc: 'Solo no es nada. Por detrás y entre varios, es otra cosa.',
};

/**
 * The answer to a Warrior who turtles up facing the right way, or who climbs a
 * stoop the mob's vertical 2 cannot follow. Thrown damage ignores the angle and
 * ignores height, so it is the one thing here that correct facing does not
 * switch off — and it is kept small on purpose, so facing correctly stays a
 * real defence instead of a lie.
 */
const STREET_JUNK: Ability = {
  id: 'junk',
  name: 'Lo que haya en la calle',
  kind: 'ranged',
  range: 4,
  minRange: 2,
  aoe: 0,
  mp: 4,
  power: 2.2,
  vertical: Infinity,
  targets: 'enemy',
  projectile: 'bottle',
  desc: 'Una botella del solar. Hace poco daño, pero le da igual hacia dónde mires.',
};

/**
 * Sully's whole scene as a move: the toll is that you cross his street without
 * your colors on.
 *
 * Nearly a dead move here by design — the Warriors bring a knife and a spray
 * can between the nine of them. When it does land, Sully's hands are empty, so
 * he keeps what he takes, and then he is the only armed Orphan on the board:
 * the one square inch of this battle where Arrebatar comes back to life.
 */
const TAKE_THE_COLORS: Ability = {
  id: 'colors',
  name: 'Quítate eso',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 2.0,
  vertical: 2,
  targets: 'enemy',
  accuracy: 78,
  disarm: true,
  desc: 'Te pone la mano encima y te quita lo que lleves. Es el precio de pasar.',
};

/**
 * The man who holds the block together, and the reason to go and get him.
 *
 * Sized against the rally the player already owns rather than against nothing:
 * Swan puts back 15.8, Sully 15.7. It is the number the player already knows,
 * handed to the other side. Radius 1 and not 2 — a wider burst inside a crowd
 * this dense would quietly double the length of the fight.
 */
const BLUSTER: Ability = {
  id: 'bluster',
  name: 'Bravata',
  kind: 'rally',
  range: 3,
  minRange: 0,
  aoe: 1,
  mp: 7,
  power: 2.0,
  vertical: Infinity,
  targets: 'ally',
  desc: 'Grita mucho más fuerte de lo que pega. Mientras siga de pie, los suyos no se van.',
};

// ---------------------------------------------------------------------------
// The catalog
// ---------------------------------------------------------------------------

export const JOBS: Record<JobId, Job> = {
  warchief: {
    id: 'warchief',
    name: 'Jefe de guerra',
    tag: 'JEF',
    stats: { hp: 54, mp: 14, pa: 7, ma: 6, speed: 9, move: 4, jump: 3 },
    abilities: [punch(2.3, 'El derechazo del que manda.'), WEAPON_HIT, RALLY, LOW_BLOW],
    sprite: {
      body: 'warrior',
      hat: null,
      face: null,
      weapon: 'knife',
      palette: palette(WARRIOR_COLORS),
    },
  },

  bruiser: {
    id: 'bruiser',
    name: 'Bruto',
    tag: 'BRU',
    stats: { hp: 66, mp: 8, pa: 9, ma: 3, speed: 7, move: 3, jump: 2 },
    abilities: [punch(2.6, 'Nudillos. Nada más hace falta.'), WEAPON_HIT, CHARGE, DISARM],
    sprite: {
      body: 'warrior',
      hat: null,
      face: null,
      weapon: 'none',
      palette: palette(WARRIOR_COLORS),
    },
  },

  scrapper: {
    id: 'scrapper',
    name: 'Peleador',
    tag: 'PEL',
    stats: { hp: 52, mp: 10, pa: 7, ma: 3, speed: 8, move: 4, jump: 3 },
    abilities: [punch(2.4, 'Corto y seco, como se aprende en la calle.'), WEAPON_HIT, LOW_BLOW, DISARM],
    sprite: {
      body: 'warrior',
      hat: null,
      face: null,
      weapon: 'none',
      palette: palette(WARRIOR_COLORS),
    },
  },

  runner: {
    id: 'runner',
    name: 'Corredor',
    tag: 'COR',
    stats: { hp: 48, mp: 12, pa: 6, ma: 4, speed: 11, move: 5, jump: 4 },
    abilities: [punch(2.1, 'Entra, pega y sale antes de que te vean.'), WEAPON_HIT, LOW_BLOW, BOTTLE],
    sprite: {
      body: 'warrior',
      hat: null,
      face: null,
      weapon: 'none',
      palette: palette(WARRIOR_COLORS),
    },
  },

  thrower: {
    id: 'thrower',
    name: 'Lanzador',
    tag: 'LAN',
    stats: { hp: 48, mp: 12, pa: 6, ma: 6, speed: 8, move: 4, jump: 4 },
    abilities: [punch(1.8, 'De cerca no es lo suyo.'), WEAPON_HIT, BOTTLE, BRICK],
    sprite: {
      body: 'warrior',
      hat: null,
      face: null,
      weapon: 'none',
      palette: palette(WARRIOR_COLORS),
    },
  },

  artist: {
    id: 'artist',
    name: 'Artista',
    tag: 'ART',
    stats: { hp: 46, mp: 16, pa: 5, ma: 7, speed: 8, move: 4, jump: 3 },
    abilities: [punch(1.4, 'Pega como quien no quiere pegar.'), EYE_SPRAY, TAG_WALL, RALLY],
    sprite: {
      body: 'warrior',
      hat: null,
      face: null,
      weapon: 'can',
      palette: palette(WARRIOR_COLORS),
    },
  },

  // --- The Orphans ---------------------------------------------------------
  //
  // Jump 4 across the gang, the exact inverse of the Turnbull who could not get
  // over a kerb. This is their block and they do not have to think about where
  // the stoops are. Nobody carries anything.
  //
  // Move 6 is not a round number, it is a measured one. Walking around a man on
  // a four-neighbour grid costs six steps, so at Move 5 they stopped one square
  // short every single time and settled for his flank — back hits came out at
  // 12% of their swings, in a gang whose entire damage lives behind you. The
  // sixth step is the difference between a mob that surrounds you and a mob
  // that stands next to you.

  stray: {
    id: 'stray',
    name: 'Chusma',
    tag: 'CHU',
    stats: { hp: 50, mp: 4, pa: 5, ma: 2, speed: 10, move: 6, jump: 4 },
    // Two rows in the order window, the shortest command list in the game. That
    // is the character: a Chusma has no decision to make. He only has a side of
    // you to stand on.
    abilities: [
      punch(1.4, 'Un manotazo de alguien que no ha pegado a nadie en su vida.'),
      SURROUND,
    ],
    sprite: {
      body: 'orphan',
      hat: null,
      face: null,
      weapon: 'none',
      palette: palette(ORPHAN_COLORS),
    },
  },

  cornerboy: {
    id: 'cornerboy',
    name: 'Esquinero',
    tag: 'ESQ',
    stats: { hp: 48, mp: 10, pa: 5, ma: 5, speed: 11, move: 6, jump: 4 },
    // The same fist as the rest — what he has is legs and whatever is lying in
    // the lot. The brick is the Warriors' own, reused exactly as it stands.
    abilities: [
      punch(1.5, 'Rápido y sin fuerza, como todo lo suyo.'),
      SURROUND,
      STREET_JUNK,
      BRICK,
    ],
    sprite: {
      body: 'orphan',
      hat: null,
      face: null,
      weapon: 'none',
      palette: palette(ORPHAN_COLORS),
    },
  },

  loudmouth: {
    id: 'loudmouth',
    name: 'Bocazas',
    tag: 'BOC',
    stats: { hp: 54, mp: 14, pa: 4, ma: 6, speed: 8, move: 4, jump: 3 },
    // No Rodear, deliberately: Sully is the one Orphan who never gets behind
    // anybody. He plants himself in front and talks. Which makes the leader the
    // safest enemy on the board to turn your back on — and the one you have to
    // walk into the middle of the crowd to reach.
    abilities: [
      punch(1.3, 'El golpe más flojo de la calle, y lo tira el que manda.'),
      TAKE_THE_COLORS,
      BLUSTER,
    ],
    sprite: {
      body: 'orphan',
      hat: null,
      face: null,
      weapon: 'none',
      palette: palette(ORPHAN_COLORS),
    },
  },

  // --- Turnbull A.C. -------------------------------------------------------
  //
  // Slow, heavy and short of breath. Jump 1 across the whole gang, and vertical
  // 1 on everything that actually hurts: they do not climb, and from below only
  // the fist reaches. On a street with station stairs, that is not a stat — it
  // is the way out.

  enforcer: {
    id: 'enforcer',
    name: 'Matón',
    tag: 'MAT',
    stats: { hp: 62, mp: 6, pa: 9, ma: 2, speed: 7, move: 3, jump: 1 },
    abilities: [
      punch(1.6, 'Nudillos de obra. Sin nada en la mano sigue siendo un martillo.'),
      CHAIN_LASH,
      BULL_RUSH,
    ],
    sprite: {
      body: 'turnbull',
      hat: null,
      face: null,
      weapon: 'pipe',
      palette: palette(TURNBULL_COLORS),
    },
  },

  wrecker: {
    id: 'wrecker',
    name: 'Demoledor',
    tag: 'DEM',
    stats: { hp: 66, mp: 8, pa: 9, ma: 2, speed: 6, move: 3, jump: 1 },
    abilities: [
      punch(1.6, 'Con el tablón en el suelo, vuelve a ser sólo un tipo grande.'),
      PLANK_HIT,
      PLANK_SWEEP,
    ],
    sprite: {
      body: 'turnbull',
      hat: null,
      face: null,
      weapon: 'bat',
      palette: palette(TURNBULL_COLORS),
    },
  },

  ringleader: {
    id: 'ringleader',
    name: 'Cabecilla',
    tag: 'CAB',
    stats: { hp: 58, mp: 8, pa: 10, ma: 3, speed: 8, move: 4, jump: 2 },
    abilities: [
      punch(1.7, 'El que manda no necesita levantar la voz.'),
      MACHETE_CUT,
      UPCUT,
    ],
    sprite: {
      body: 'turnbull',
      hat: null,
      face: null,
      weapon: 'knife',
      palette: palette(TURNBULL_COLORS),
    },
  },

  slugger: {
    id: 'slugger',
    name: 'Bateador',
    tag: 'BAT',
    stats: { hp: 50, mp: 8, pa: 7, ma: 2, speed: 8, move: 4, jump: 3 },
    abilities: [BAT_SWING, WIDE_SWING, punch(1.5, 'Sin el bate no son gran cosa.')],
    sprite: {
      body: 'fury',
      hat: 'cap',
      face: 'fury',
      weapon: 'bat',
      palette: palette(FURY_COLORS),
    },
  },
};

export const JOB_IDS = Object.keys(JOBS) as JobId[];

/** For the battle report, so it reads like a sentence and not like an enum. */
export const WEAPON_NAMES: Record<Exclude<WeaponId, 'none'>, string> = {
  bat: 'el bate',
  knife: 'la navaja',
  pipe: 'el tubo',
  can: 'el spray',
};
