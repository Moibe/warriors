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
   * Has to see them. A wall or a piece of furniture between the two of you
   * refuses the shot outright.
   *
   * Optional, and nothing in the first three battles sets it, so their reach
   * maths comes out exactly as it was. It exists because a gun is the first
   * thing in this game that cannot be answered by facing, by height or by
   * closing the distance — take the wall away and there is no answer left.
   */
  sight?: boolean;
  /**
   * What the move throws. Its only job is to be watched flying: an ability
   * that names one waits for the thing to land before any damage is dealt, so
   * the hit reads as caused by the object rather than appearing beside it.
   */
  projectile?: ProjectileId;
  /** On a hit, takes the target's weapon — the signature street move. */
  disarm?: boolean;
  /**
   * Multiplier against a stage's barrier - the fence in Van Cortlandt. A boot
   * opens a thing a fist only dents, and this is the one number that says so.
   * Absent means 1: the punch works on the fence, it just takes longer.
   */
  barrierMul?: number;
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
export type WeaponId = 'bat' | 'knife' | 'pipe' | 'chain' | 'can' | 'pistol' | 'none';

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
    body:
      | 'plain'
      | 'warrior'
      | 'fury'
      | 'turnbull'
      | 'orphan'
      | 'lizzie'
      | 'rogue'
      | 'luther'
      | 'punk'
      | 'skater'
      | 'riff';
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
  | 'loudmouth'
  | 'gunhand'
  | 'wallflower'
  | 'hostess'
  | 'coward'
  | 'minder'
  | 'chaser'
  | 'tagalong'
  | 'roughneck'
  | 'chainman'
  | 'kingpin'
  | 'disciple'
  | 'lieutenant';

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

/**
 * The Warriors' kick, and the reason it is not another punch.
 *
 * Riverside is fought with legs and bats, not knuckles - Swan and Ajax kick
 * Furies off the path - so the Scrappers get one. But a kick that only hit
 * harder would be Golpear with a stamina cost, and nobody would take it. This
 * one is THE BEST BLOW FOR OPENING THINGS: twice the damage to a barrier, so
 * the fence in Van Cortlandt comes down in two kicks where a fist needs four.
 *
 * EVERY attack in the game can hit that fence - a thrown brick and a faceful
 * of spray included, because benching the men who throw, on the one board
 * whose first lesson is to hit something, would be absurd. So `barrierMul` is
 * not a key: it is a REASON. All nine can swing at the boards, and the two
 * wearing boots are the two worth walking over there.
 *
 * Against a man it is a punch and a half with a slightly worse aim, paid for
 * with the stamina a Scrapper would otherwise keep for Arrebatar.
 *
 * Declared liberty: in the film the hole was already there.
 */
const KICK: Ability = {
  id: 'kick',
  name: 'Patada',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 2,
  power: 2.8,
  vertical: 2,
  targets: 'enemy',
  accuracy: 78,
  barrierMul: 2,
  desc: 'Abre lo que un puño sólo abolla. Contra una valla, el doble.',
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
  power: 2.2,
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

/**
 * The Lizzies, who do not have gang colours.
 *
 * Every other palette here is the point of the gang: nine men in one coat. This
 * one only sets what they genuinely share — the outline, the jeans, the boots,
 * the eye makeup, and the red band that is the single repeated thing on any of
 * them. `A` is deliberately left at a neutral and overridden per woman, which
 * is the first time in this file that the gang slot varies. It is also the
 * whole tactical point of the room: this is the one battle the player cannot
 * read by colour, so he has to read the turn order instead.
 */
const LIZZIE_COLORS: Partial<Palette> = {
  O: '#1a141c',
  A: '#6b4a56',
  B: '#2a2220',
  C: '#3d4f6d',
  M: '#b9bdc6',
  W: '#6a4a2c',
  G: '#3350a8',
  F: '#b4304a',
};

// ---------------------------------------------------------------------------
// The Lizzies' moves
// ---------------------------------------------------------------------------
//
// Three gangs taught three answers — the clock, the arc, the angle — and
// everything below is built so that all three are worth nothing.
//
// A gun is not "the long-range move of this chapter". It is somebody breaking
// the rule the whole night runs on, and it has to read that way at the table:
// it does not fly, it does not care which way you are facing, and it does not
// switch off when you walk into it. The only thing it needs is to see you, and
// a wall is the one thing that can take that away.

/**
 * The nickel revolver. Six tiles, no dead zone, no flight.
 *
 * It is not long because of the number — the brick already reaches five. It is
 * long because it has no minimum: the brick covers a ring, this covers a disc,
 * and it is the part of the disc under your own feet that matters. Gun Hill
 * Road taught the player to walk into the arc. There is no arc.
 *
 * No `accuracy`, deliberately: `forecast` ignores it for thrown-and-shot moves
 * and pins the rate at 92 plus height. A number the engine never reads would be
 * a lie sitting in the data.
 *
 * Two of six stamina is the whole cylinder — three shots in a battle, countable
 * off the AGUANTE bar by anybody who thinks to look.
 */
const PISTOL_SHOT: Ability = {
  id: 'pistolshot',
  name: 'Disparar',
  kind: 'ranged',
  range: 6,
  minRange: 0,
  aoe: 0,
  mp: 2,
  power: 3.4,
  vertical: Infinity,
  targets: 'enemy',
  needsWeapon: true,
  sight: true,
  desc: 'No vuela, no se ve venir y le da igual hacia dónde mires. Sólo necesita verte.',
};

/**
 * The small automatic. Half the damage, a third of the reach, and legs behind
 * it. The revolver is answered with geometry; this one is answered with tempo.
 */
const AUTO_SHOT: Ability = {
  id: 'autoshot',
  name: 'Tiro corto',
  kind: 'ranged',
  range: 3,
  minRange: 0,
  aoe: 0,
  mp: 2,
  power: 2.2,
  vertical: Infinity,
  targets: 'enemy',
  needsWeapon: true,
  sight: true,
  desc: 'La pequeña, de cerca. Pega la mitad y le quedan el doble.',
};

/**
 * What is left when the chambers are empty, and the reason a gun on the floor
 * is still worth taking. Priced at nothing so the planner keeps her busy rather
 * than parking her: the shot drops out of her options by itself the moment she
 * runs dry, and she falls back to this.
 */
const PISTOL_WHIP: Ability = {
  id: 'whip',
  name: 'Culatazo',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 2.2,
  vertical: 2,
  targets: 'enemy',
  accuracy: 76,
  needsWeapon: true,
  desc: 'Se acabaron las balas. Sigue siendo un trozo de metal en la mano.',
};

/**
 * Not a punch. She hangs off you.
 *
 * Ninety-five accuracy and four points of damage is the most useless attack in
 * the game, on purpose: most of the women in this room cannot hurt anybody, and
 * the player has to work that out while they are all over him. What she is
 * actually doing is standing where he was going to walk — the movement search
 * refuses an enemy's tile outright — and no field on Ability can say that,
 * which is why this one does not try.
 */
const CLOSE_IN: Ability = {
  id: 'closein',
  name: 'Echarse encima',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 1.1,
  vertical: 2,
  targets: 'enemy',
  accuracy: 95,
  desc: 'No te pega: se te cuelga. Casi nunca falla y casi nunca duele.',
};

/**
 * The blade that was under the cushion she sat you on. One of them has it and
 * the rest have the row greyed out — the same role in two states, which is what
 * `needsWeapon` was already for.
 */
const CUSHION_KNIFE: Ability = {
  id: 'cushionknife',
  name: 'Navaja del cojín',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 3.4,
  vertical: 2,
  targets: 'enemy',
  accuracy: 74,
  needsWeapon: true,
  desc: 'Estaba debajo del sitio donde te sentó. Falla una de cada cuatro.',
};



/**
 * The Gramercy Riffs, at the conclave, which is the only night they are orange.
 *
 * Every other gang in this file is a garment the film repeats; this one is a
 * garment the film CHANGES. At Van Cortlandt they are in orange martial-arts
 * tops and sunglasses at night, and they go to black only after Cyrus is shot,
 * as mourning. So this is not "the Riffs" - it is the Riffs before, and if they
 * ever turn up again they want a second literal, not an edit of this one.
 *
 * Two slots are doing work no other palette here asks of them.
 *
 * `E` IS THE SUNGLASSES. Everywhere else it is a dark iris, one pixel either
 * side of a nose, and nobody has ever had to think about it. Run across the
 * whole head it stops being an eye and becomes a lens - the single most
 * remembered thing about these men, and the only place in this project where
 * the eye slot carries a garment.
 *
 * `G` GOES DARK, and it is the first one in this file that does. Here it is the
 * lapel band down the front of the top, and the obvious colour is bone, because
 * a gi has white trim. It must not be bone. The brightest thing on this board
 * is the Warriors' skull at #e6dcc4 and it is on their BACKS; a bone lapel on
 * the enemy would put that same value on the enemy's FRONT, at sixteen pixels,
 * on the one board where the player has never seen either silhouette before.
 * The tutorial is the last place anybody should have to look twice to find his
 * own man. So the trim is black, the gang reads orange-and-black, and the only
 * pale thing in the frame belongs to the player. That slot has now cost this
 * file four ships; this is the fifth time it mattered, and it mattered in a new
 * direction.
 *
 * `A` is the loudest colour any gang has been given, on purpose. The board is
 * grey stone under a cold night key and the Warriors' own gang slot is brown
 * leather; a muted orange would collapse into that at ten tiles. This will not.
 *
 * There is no separate palette for the lieutenant. Luther got his own because
 * he is a boss on a beach where nobody has colours; here the gang owns the
 * loudest colour in the game and splitting it would say he belongs to a
 * different one.
 */
const RIFF_COLORS: Partial<Palette> = {
  O: '#191319', // outline - warm-black. A cold line on an orange garment reads as a print error
  S: '#d8a878', // skin, a floor only; every Riff overrides it in units.ts
  K: '#ad8156', // and its shadow, which has to move with it or the face goes flat
  H: '#241c18', // hair - a floor. Undeclared, a Riff grows park-bench brown under his shades
  J: '#140f0c', // hair shadow. Same reason, same trap
  E: '#0b0b10', // THE SUNGLASSES. Flat, cold, near-black. Not an iris. Front templates only
  A: '#d0601c', // the orange top. The gang in one colour, and the hottest thing on any board here
  B: '#1c1619', // belt and boots. Near-black, so the feet anchor a man wearing a beacon
  C: '#262b39', // trousers. Dark blue-black on purpose: NOT the Warriors' denim, and darker
  M: '#8e949c', // cold steel - the frames of the shades. The only metal on them
  W: '#6a4a2c', // strap leather. Nothing on a Riff is wooden
  P: '#1e1a22', // headwear. Nobody at the conclave wears any; this is so the one who might is not brown
  G: '#17151a', // the lapel band and the collar. BLACK - see the note above
  F: '#26407e', // the band across the back. Their only cool colour, and why a Riff walking away still reads
};

// ---------------------------------------------------------------------------
// Van Cortlandt Park
// ---------------------------------------------------------------------------
//
// The first board, and the only one whose job is to be survived rather than
// won. The six gangs after this one teach six geometries - the terrace, the
// edge, the angle, the line of fire, the dead end, the name. This one teaches
// the four things that have to be true before any of those mean anything:
// WALKING IS A VERB · THE GREEN TILES ARE THE WIN · YOU DO NOT HAVE TO FIGHT ·
// and the one decision on the board is optional and costs you.
//
// The temptation with a tutorial enemy is to make him feeble, and it is wrong
// twice. It is wrong to the film - the Riffs are Cyrus's own gang, disciplined,
// and they put Cleon on the floor with kicks and elbows - and it is wrong to
// the player, because a feeble first enemy teaches him a number that is a lie
// about every board after it. So NOTHING BELOW IS WEAK. The disciple's elbow
// ties the Punk roughneck's boot for the hardest blow any rank-and-file enemy
// in this game throws.
//
// The board is safe for one reason and one only: SPEED 5. A disciple acts once
// every twenty ticks; a Warrior walking acts every eight to eleven. The gang is
// answered by the clock before it is answered by anything the player does, and
// the proof is a subtraction: the fastest Riff closes at 0.225 tiles per tick
// and the SLOWEST Warrior - Ajax, move 3, speed 7 - walks away at 0.263. Not
// one man in this gang can catch anybody who has decided to leave. That is why
// they are allowed to hit as hard as they do.
//
// TWO MORE RULES HOLD THE BOARD TOGETHER AND BOTH ARE NEGATIVE SPACE.
//
// Nothing here reaches past an arm. Every move below is range 1, and that is
// what keeps a crowd four men deep: only four tiles touch a man, so a mob
// throttles itself and the dozen closing over Cleon are in each other's way.
// Give any of them range 2 and the pocket he is pinned in stops being a pocket
// and the whole rescue window shuts.
//
// And nobody here has WEAPON_HIT. Cyrus's terms were nine delegates a gang and
// nobody packing; Luther broke that rule and that is the plot. The Orphans were
// the first gang with empty hands, but this is the first BATTLE with empty
// hands on both sides, and a greyed-out weapon row on either team would be a
// lie sitting in the data.

/**
 * A Riff's punch, and the reason `punch()` is not in this gang.
 *
 * Everybody else opens with the shared street swing: free, always there,
 * vertical 2, and it is what a man does with his hands when he has not been
 * taught anything. The most repeated fact about the Riffs is that they HAVE
 * been taught. So this sits in exactly the slot `punch()` occupies for everyone
 * else - mp 0, range 1, vertical 2, the row that is never greyed out - and it
 * is a kick, because a Riff does not throw a punch.
 *
 * VERTICAL 2 IS THE BOARD'S SAFETY VALVE. The bowl is terraces, and a gang that
 * could not reach a man one step up would hand the player a board he wins by
 * finding a kerb, which would teach him something false about Riverside, Gun
 * Hill and the Rogues' groyne all at once. Two levels means the step you are on
 * and the step above it. Not three: three levels up has to stay genuinely out
 * of reach or height stops being a lesson and becomes a decoration.
 *
 * It is also the gang's ONLY answer to height, because the elbow cannot look
 * up - so one tile of climbing takes their output from 15.4 to 11.6 a swing.
 * That is the height lesson, taught with a number, on the first board.
 */
const HIGH_KICK: Ability = {
  id: 'highkick',
  name: 'Patada alta',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 1.9,
  vertical: 2,
  targets: 'enemy',
  accuracy: 86,
  desc: 'Sube adonde el codo no llega. Dos escalones, y ni uno más.',
};

/**
 * The hard one, and it cannot look up.
 *
 * `vertical: 0` is the entire point of it and the only thing that makes the
 * terraces worth standing on. An elbow goes horizontally into a body at your
 * own height; a man one step up has his ribs at the Riff's eye line and there
 * is nothing to swing into. So on the flat this is what they all use - harder
 * than a Fury's bat - and one tile of climbing switches it off completely.
 *
 * Two of six stamina is a countable magazine, the same shape as Luther's
 * cylinder: three elbows in the whole battle and then he is a man kicking. It
 * is priced so the planner opens with it and fades, which is how a gang of
 * trained men is supposed to lose a long fight to nine street kids who do not
 * stop.
 */
const ELBOW: Ability = {
  id: 'elbow',
  name: 'Codazo',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 2,
  power: 2.4,
  vertical: 0,
  targets: 'enemy',
  accuracy: 80,
  desc: 'Corto, seco y a la altura de sus costillas. Si estás en un escalón, no existe.',
};

/**
 * What actually happened to Cleon, and the lieutenant's whole character in one
 * row.
 *
 * 94 to hit and almost nothing from the front; from behind it is nearly double,
 * and that split IS the man. He elbows you while you are looking at him and he
 * takes you down when you are not, and the planner picks between the two by
 * itself because it scores the square it would attack FROM. A player watching
 * him switch moves is being told, on the first board he ever loads, that the
 * angle he is standing at is a number.
 *
 * Backstab 1.8, not the Orphans' 3.4. The Orphans are nothing from the front
 * and everything from behind because they are a mob; this man is dangerous from
 * every side and worse from one, because he is a fighter. Never raise it - the
 * gang that owns the backstab is the gang with no other idea, and these have
 * three.
 */
const TAKEDOWN: Ability = {
  id: 'takedown',
  name: 'Derribo',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 3,
  power: 1.8,
  vertical: 0,
  targets: 'enemy',
  accuracy: 94,
  backstab: 1.8,
  desc: 'Así se llevaron a Cleon. De frente casi no duele; por detrás te pone en el suelo.',
};

/**
 * The most competent move in the game, pointed at his own side.
 *
 * This is the board's thesis written as one ability. The lieutenant is the best
 * enemy unit here by every number on his sheet, and his signature does not
 * touch the player at all: the planner only scores a rally on somebody already
 * well down his bar, so it never fires unless the player CHOSE to fight. Walk
 * out and the most dangerous man on the board spends the night kicking air.
 * Stay and trade, and he quietly undoes one of your swings. Nothing is hidden
 * and nothing is scripted; the move costs exactly as much as the player's own
 * decision costs him.
 *
 * Six of ten stamina, and he is the only one who has any to spare: ONE rally
 * for the whole battle, and the rest of the bar is swings.
 */
const CLOSE_RANKS: Ability = {
  id: 'closeranks',
  name: 'Cierren el corro',
  kind: 'rally',
  range: 3,
  minRange: 0,
  aoe: 1,
  mp: 6,
  power: 2.0,
  vertical: Infinity,
  targets: 'ally',
  desc: 'No pega a nadie. Levanta a los suyos, y sólo le da para una vez.',
};

/**
 * The Punks, and the first gang in the game wearing one garment from the
 * collar to the boot.
 *
 * The room chose this palette, not the film. `tile` lands at #7d8a80 -
 * institutional green gone grey, mid-value and cold - which is the first floor
 * here that is neither asphalt-dark nor beach-pale, and it swallows anything
 * neutral put on top of it. So the gang slot takes the one thing that floor
 * cannot absorb: a saturated indigo on the far side of the wheel from it. Seven
 * blue men in a green room. Nothing else on this board is blue above the waist
 * - the Warriors' blue is only their legs under a brown cut - so the two
 * silhouettes never collapse into each other.
 *
 * `A` is the bib and `C` the legs of the SAME garment, one step apart. That is
 * not decoration. One denim from collar to boot reads as a slab with a head on
 * it and the bib stops existing, and the bib is the whole point: a rectangle up
 * the chest with a strap over each shoulder is the thing no other body in this
 * game has.
 *
 * `G` and `F` are the shirt under it - base and hoop - and they are the two
 * slots every Punk overrides in units.ts, because the film puts the gang's
 * individuality exactly there. One cut of dungaree, nine different shirts:
 * four plain, five hooped, yellow and navy and red and green. These values are
 * a floor so that the one somebody forgets does not grow the base palette's
 * #ece4dc, which against this floor is not a shirt, it is a light switched on
 * inside the man. That slot has now bitten this file four times.
 *
 * `M` is on exactly one man. It is the trucks and the wheels under the leader,
 * and it is the only metal in the gang.
 */
const PUNK_COLORS: Partial<Palette> = {
  O: '#13151c', // outline - a hair bluer than the Turnbull's, for a tiled room
  S: '#e0b489',
  K: '#b98a63',
  E: '#241a2a',
  H: '#3f2c1e', // hair - a floor; every Punk overrides it
  J: '#261a11', // and it has to move with H or the head goes flat
  A: '#3a5f9c', // the dungarees: bib, straps, the back panel. The gang, in one colour
  B: '#33262a', // boots, and the belt of the bib. Dark, so the feet anchor the man
  C: '#2e4a7c', // the same denim below the belt, one step down so legs read as legs
  M: '#9aa2ad', // the trucks and the toe stop. The leader's alone
  W: '#8a5a32', // the leather of a skate boot, and the laces
  P: '#3b3d36', // a tweed flat cap. Maurice is the only one who wears anything
  G: '#c2b9a6', // the rugby shirt at the collar and down the sleeves
  F: '#b8863a', // and its hoops. Overridden per man; this is only the fallback
};

// ---------------------------------------------------------------------------
// Union Square
// ---------------------------------------------------------------------------
//
// Five gangs taught five geometries - the edge, the angle, the terrace, the
// line of fire, the name. This board teaches the one thing none of them could,
// because all five were fought in the open: A DEAD END IS THE BEST SQUARE ON
// THE BOARD. A stall is one tile with a wall behind it and a partition either
// side. Nobody flanks you in there, nobody gets behind you, and exactly one man
// at a time can reach you. For five battles cover has been something you stood
// behind and height something you stood on; here it is a hole you stand in.
//
// Which is also, exactly, how the scene goes: the Warriors do not get cornered
// in that lavatory. Swan walks them into it and they shut the doors, and the
// gang that came to spring a trap walks into one.
//
// The Punks' answer to a man in a hole is the only answer there is - something
// that reaches further than an arm - and that is what the chain is for.

/**
 * What they came in to do.
 *
 * They line up along the row and kick every door at once; the film opens the
 * fight on the sound of it. Two stamina and 74 to hit, so it is not free and it
 * is not reliable - a boot at a closed door swung by somebody who does not know
 * there is a man behind it braced to come out.
 */
const DOOR_KICK: Ability = {
  id: 'doorkick',
  name: 'Patada',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 2,
  power: 2.6,
  vertical: 2,
  targets: 'enemy',
  accuracy: 74,
  desc: 'Vinieron a echar abajo las puertas. Da igual si ya está abierta.',
};

/**
 * Two metres of chain, and the reason the stalls are not an exploit.
 *
 * Everything else in this game that reaches past arm's length is thrown - a
 * bottle, a brick, a bullet - and a man in a cubicle with a wall behind him is
 * safe from every one of them the moment the door frame breaks the line. This
 * is the exception: range 2, no minimum, and it is a SWING, so the angle still
 * counts. It reaches the back of a stall without stepping into it, which means
 * the player's best square costs him something to sit on after all.
 *
 * `needsWeapon`, so it dies the moment somebody takes the chain off him - and
 * taking it off him is what Cochise does in the film.
 */
const THE_CHAIN: Ability = {
  id: 'chain',
  name: 'Cadenazo',
  kind: 'physical',
  range: 2,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 2.2,
  vertical: 1,
  targets: 'enemy',
  accuracy: 72,
  needsWeapon: true,
  desc: 'Dos metros de cadena. Llega al fondo del retrete sin tener que entrar.',
};

/**
 * The chain at knee height, and the idea this gang was owed.
 *
 * It was designed on the first pass and cut, for a reason that was about the
 * engine and not about the Punks: the planner scored only the man it aimed at,
 * so an area swing in a lavatory with seven Punks in it was a move the enemy
 * would have used to club its own gang. The planner counts the whole burst now,
 * and prices a friendly caught in it above the damage it does — so the Cadenero
 * waits for a clean arc the way a man swinging two metres of chain in a crowded
 * room actually would.
 *
 * IT IS THE ANSWER TO THE ANSWER. That board's lesson is the cubicle: a hole
 * with a wall behind it and a partition either side, where nobody flanks you
 * and one man at a time can reach you. The chain's two tiles of reach is what
 * makes sitting in one cost something. This is what makes LEAVING one cost
 * something, because six men coming out of six doors into one aisle is a line
 * of bodies at arm's length from each other, and that is the shape a sweep is
 * for. Between the two of them the board stops having a safe answer and starts
 * having a choice.
 *
 * `minRange: 1` because you cannot swing a chain through your own square, and
 * it keeps the burst off the man throwing it. Power 1.6 against the straight
 * hit's 2.2: it is worth using on two and a waste on one. Four of six stamina,
 * so ONE of these in a battle and then he is a man with a chain again.
 */
const CHAIN_SWEEP: Ability = {
  id: 'chainsweep',
  name: 'Barrido',
  kind: 'physical',
  range: 2,
  minRange: 1,
  aoe: 1,
  mp: 4,
  power: 1.6,
  vertical: 1,
  targets: 'enemy',
  accuracy: 66,
  needsWeapon: true,
  desc: 'La hace girar a la altura de las rodillas. Atrapa a todo el que esté cerca, sea de quien sea.',
};

/**
 * The switchblade, and the only object in this game that outlives its battle.
 *
 * He drops it on that floor and Swan picks it up, and it is the knife Swan puts
 * through Luther's wrist on the beach two stages later. Nothing in the code
 * carries it across - the Warriors are dealt fresh every restart - but the
 * player who disarms him here is doing, move for move, the thing the film does,
 * and the description is the only place to say so.
 */
const SWITCHBLADE: Ability = {
  id: 'switchblade',
  name: 'Navaja',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 2.9,
  vertical: 0,
  targets: 'enemy',
  accuracy: 80,
  needsWeapon: true,
  desc: 'La misma que Swan recogerá del suelo y acabará en la muñeca de Luther.',
};

/**
 * Eight tiles of momentum arriving at once.
 *
 * `vertical: 0` is the whole man. A skate cannot step, so he cannot hit up and
 * he cannot hit down - not one level, not half of one. He owns the flat and
 * nothing else, and a kerb answers him. In the film his skates catch on a stall
 * door mid-kick and Cowboy drops him with one punch; this is that, as a number.
 */
const ROLL_IN: Ability = {
  id: 'rollin',
  name: 'Se viene encima',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 3,
  power: 2.5,
  vertical: 0,
  targets: 'enemy',
  accuracy: 70,
  desc: 'Cruza el cuarto sin dar un paso y llega con todo el peso encima.',
};

/** And the same limit on his fists: on wheels, a kerb is a wall. */
const WHEELED_PUNCH: Ability = {
  id: 'punch',
  name: 'Golpear',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 1.8,
  vertical: 0,
  targets: 'enemy',
  accuracy: 78,
  desc: 'Pega bien, mientras el suelo esté a la misma altura que él.',
};

/**
 * The Rogues, who have no colours.
 *
 * The other gangs are a garment repeated; these are five men in whatever they
 * had on, sun-bleached and grey, and the design is that there is nothing to
 * read. All the warmth on this board is spent on one wine-coloured vest, so the
 * eye finds Luther without being told to.
 *
 * `G` is the slot that bites here, for the third time in this file. In these
 * templates it is the collar of the shirt under the vest; left out it falls to
 * the base palette's near-white, and on pale sand at dawn that does not read as
 * a collar, it reads as a hole with a light behind it.
 */
const ROGUE_COLORS: Partial<Palette> = {
  O: '#16131a',
  A: '#4a443a',
  B: '#241f1b',
  C: '#35405a',
  G: '#6b6154',
  W: '#5a3d22',
  M: '#6e7480',
  P: '#2b2820',
  F: '#565046',
};

/** Luther. The same gang, and the only warm thing standing on the beach. */
const LUTHER_COLORS: Partial<Palette> = {
  ...ROGUE_COLORS,
  A: '#6d2f36',
  S: '#e9c9a8',
  K: '#c2a179',
  H: '#2a211c',
  J: '#17120f',
};

// ---------------------------------------------------------------------------
// Coney Island
// ---------------------------------------------------------------------------
//
// Four gangs taught four geometries — the arc, the angle, the clock, the line.
// This board takes all four away and does not put a fifth in their place. It
// puts a name. For the first time the win condition points at a person rather
// than at an empty board or a door, and for the first time the right thing to
// do is leave five men standing.

/**
 * The revolver that killed Cyrus, with what was left in it.
 *
 * A dead zone of three tiles is the whole boss. He is the weakest unit in the
 * game in contact and the most dangerous at six, so everything about him is the
 * question of where you are willing to stand — which is the question this game
 * has been asking for four battles and the only one a finale should ask.
 *
 * No `accuracy` on purpose: the maths ignores it for shots and pins the rate at
 * ninety-two plus height, and a number nothing reads would be a lie sitting in
 * the data.
 *
 * TWO BULLETS, for the whole battle, and they are Cyrus's leftovers. The count
 * is not written here — it is two of Luther's four stamina, and nothing in the
 * engine ever gives stamina back. His other two moves are free, so this is the
 * only thing he ever spends it on and the bar under his name is a magazine: it
 * goes half, empty, and then he is a man with a slap. Move the cost or move his
 * sheet and you have changed how many times the finale can shoot you, which is
 * most of what the finale is.
 */
const CYRUS_REVOLVER: Ability = {
  id: 'luthershot',
  name: 'El revólver',
  kind: 'ranged',
  range: 6,
  minRange: 3,
  aoe: 0,
  mp: 2,
  power: 3.6,
  vertical: Infinity,
  targets: 'enemy',
  needsWeapon: true,
  sight: true,
  desc: 'El mismo con el que mató a Cyrus, con lo que le sobró. De cerca no se atreve.',
};

/**
 * Three empty bottles between the fingers, and the most famous image in the
 * film. Free, because the shot drops out of his options by itself after two
 * turns and the planner has to keep having something to score or the last boss
 * stands still. The minimum range of two is the other half of the dead zone: a
 * man standing on top of Luther is facing a four-point slap.
 */
const COME_OUT_TO_PLAY: Ability = {
  id: 'bottles',
  name: 'Salgan a jugar',
  kind: 'ranged',
  range: 5,
  minRange: 2,
  aoe: 0,
  mp: 0,
  power: 1.1,
  vertical: Infinity,
  targets: 'enemy',
  projectile: 'bottle',
  desc: 'Tres botellas vacías entre los dedos. Hacen mucho más ruido que daño.',
};

/** What is left of the man who started all this, once the cylinder is empty. */
const FLAIL: Ability = {
  id: 'flail',
  name: 'Manotazo',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 0.9,
  vertical: 2,
  targets: 'enemy',
  accuracy: 70,
  desc: 'Manotea. Pega menos que cualquiera de los que le hacen de pared.',
};

/**
 * They brought nothing, so they take yours. Reach two with no minimum is a
 * shape this game has not used — the Turnbull chain is two-and-two and dies at
 * contact; this covers the square beside him as well — and it is what makes
 * walking past one cost blood on a board with nowhere else to walk. Vertical 1
 * hands the boardwalk back: up on the deck is the one place nobody frisks you.
 */
const GRAB: Ability = {
  id: 'grab',
  name: 'Echar mano',
  kind: 'physical',
  range: 2,
  minRange: 0,
  aoe: 0,
  mp: 0,
  power: 1.9,
  vertical: 1,
  targets: 'enemy',
  accuracy: 74,
  disarm: true,
  desc: 'Te alcanza desde donde está y se queda con lo que lleves. Ellos no trajeron nada.',
};

/** They have been behind you since Van Cortlandt Park. This is arriving. */
const RUN_DOWN: Ability = {
  id: 'rundown',
  name: 'Darte alcance',
  kind: 'physical',
  range: 1,
  minRange: 0,
  aoe: 0,
  mp: 3,
  power: 2.7,
  vertical: 2,
  targets: 'enemy',
  accuracy: 66,
  desc: 'Llevan toda la noche detrás de ustedes. Cuando por fin te pillan, se nota.',
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
    abilities: [punch(2.4, 'Corto y seco, como se aprende en la calle.'), KICK, WEAPON_HIT, LOW_BLOW, DISARM],
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

  // --- The Gramercy Riffs --------------------------------------------------
  //
  // The most competent-looking enemy in the game and the least dangerous one,
  // and the whole gap between those two is the clock. Speed 5 and 6 are the two
  // slowest sheets here - the previous floor was the Turnbull wrecker at 6 -
  // and Move 3 across the gang, because they are the hosts. They are not
  // chasing anybody. They are holding a bowl.
  //
  // Jump 3 across the gang, and that is deliberate generosity: they must be
  // ABLE to come up the terraces after you. A player who gets out has to learn
  // that he outran them, not that a step stopped them, or the first thing this
  // game teaches him is a lie about every board with a kerb on it.

  disciple: {
    id: 'disciple',
    name: 'Discípulo',
    tag: 'DIS',
    // 44 is measured, not rounded: two Golpe bajo from behind, or three
    // straight punches from anybody. The first enemy in the game is the one the
    // player can afford to experiment on, and the move that drops him fastest
    // is the move that teaches facing.
    stats: { hp: 44, mp: 6, pa: 8, ma: 2, speed: 5, move: 3, jump: 3 },
    // Two rows, the shortest command list in the game beside the Chusma's, and
    // the exact opposite meaning. A Chusma has two because he has no decision to
    // make. This man has two because both of his are right: one for a body on
    // the flat, one for a body up a step, and no third thing a trained man would
    // bother doing.
    abilities: [ELBOW, HIGH_KICK],
    sprite: {
      body: 'riff',
      hat: null,
      face: null,
      weapon: 'none',
      palette: palette(RIFF_COLORS),
    },
  },

  lieutenant: {
    id: 'lieutenant',
    name: 'Lugarteniente',
    tag: 'LUG',
    // PA 9 puts him level with Ajax and the Turnbull heavies - the hardest
    // single blow any enemy in this game throws that is not a gun - and he gets
    // it off six times per hundred ticks instead of nine.
    //
    // HP 52 and not the Turnbull's 62: lean men in cotton tops, not
    // thirty-five-year-olds in denim.
    stats: { hp: 52, mp: 10, pa: 9, ma: 6, speed: 6, move: 3, jump: 3 },
    // Four rows, one of them free, and that is not a style choice: a unit whose
    // whole list costs stamina runs dry and then walks in circles forever,
    // because the planner scores nothing and falls through to "close on the
    // nearest enemy". Patada alta is what he always has left.
    abilities: [TAKEDOWN, ELBOW, HIGH_KICK, CLOSE_RANKS],
    sprite: {
      body: 'riff',
      hat: null,
      face: null,
      weapon: 'none',
      palette: palette(RIFF_COLORS),
    },
  },

  // --- The Punks -----------------------------------------------------------
  //
  // The only gang in the game where EVERY man walks in holding something. The
  // Warriors arrive with fists and whatever the last fight left them, and the
  // difference is the fight: `Arrebatar` stops being a flourish and becomes the
  // opening move. Six of the seven are one role, because the film's Punks are
  // six interchangeable men in the same dungarees and one who is not.

  roughneck: {
    id: 'roughneck',
    name: 'Peto',
    tag: 'PET',
    // Fast for their weight and no better than that. Jump 2 gets them onto the
    // bench and the radiator but never onto the sinks, which is the one place
    // on this board that is genuinely out of everybody's reach.
    stats: { hp: 44, mp: 4, pa: 8, ma: 2, speed: 8, move: 5, jump: 2 },
    abilities: [DOOR_KICK, WEAPON_HIT, punch(1.9, 'Un chavo del Bowery con las manos grandes.')],
    sprite: {
      body: 'punk',
      hat: null,
      face: null,
      weapon: 'bat',
      palette: palette(PUNK_COLORS),
    },
  },

  chainman: {
    id: 'chainman',
    name: 'Cadenero',
    tag: 'CAD',
    // One point of PA below the others and two tiles of reach instead, which on
    // this board is the better trade and the player finds that out the first
    // time he sits in a cubicle thinking he is safe.
    stats: { hp: 42, mp: 6, pa: 7, ma: 3, speed: 8, move: 5, jump: 2 },
    abilities: [THE_CHAIN, CHAIN_SWEEP, punch(1.7, 'Sin la cadena es uno más, y más flojo.')],
    sprite: {
      body: 'punk',
      hat: null,
      face: null,
      weapon: 'chain',
      palette: palette(PUNK_COLORS),
    },
  },

  kingpin: {
    id: 'kingpin',
    name: 'El de los patines',
    tag: 'PAT',
    // Move 8 is the longest stride in the game by two tiles, and Jump 1 is the
    // shortest. He goes anywhere on the flat in one turn and he cannot get up a
    // kerb, which is the entire character: the fastest man on the board loses
    // to a step. Thirty-eight points of him, because he is not the big one.
    stats: { hp: 38, mp: 6, pa: 7, ma: 4, speed: 11, move: 8, jump: 1 },
    abilities: [SWITCHBLADE, ROLL_IN, WHEELED_PUNCH],
    sprite: {
      body: 'skater',
      hat: null,
      face: null,
      weapon: 'knife',
      palette: palette(PUNK_COLORS),
    },
  },

  // --- The Rogues ----------------------------------------------------------
  //
  // Five men with no signature move between them, and that is the design rather
  // than the shortcut. The Turnbull have their chain, the Orphans their back,
  // the Furies their bat, the Lizzies their line. The Rogues are the only gang
  // with no costume and they are the only gang with no trick: a fist and
  // whatever they took off you. Everything special on this beach belongs to one
  // man, which is exactly what the film says about them.

  coward: {
    id: 'coward',
    name: 'Luther',
    tag: 'LUT',
    // The weakest sheet of any enemy in the game, and the fastest man on the
    // board. Every point of his budget went on not being where you are.
    //
    // Four stamina, not six, and the four IS the cylinder: the revolver costs
    // two and both of his other moves are free, so his whole bar is bullets. At
    // six he was quietly getting a third shot nobody ever meant him to have.
    stats: { hp: 36, mp: 4, pa: 4, ma: 7, speed: 10, move: 3, jump: 2 },
    abilities: [CYRUS_REVOLVER, COME_OUT_TO_PLAY, FLAIL],
    sprite: {
      body: 'luther',
      hat: null,
      face: null,
      weapon: 'pistol',
      palette: palette(LUTHER_COLORS),
    },
  },

  minder: {
    id: 'minder',
    name: 'Parapeto',
    tag: 'PAR',
    stats: { hp: 56, mp: 4, pa: 8, ma: 2, speed: 7, move: 2, jump: 2 },
    abilities: [GRAB, WEAPON_HIT, punch(1.8, 'Está ahí para que no llegues, no para pegarte.')],
    sprite: {
      body: 'rogue',
      hat: null,
      face: null,
      weapon: 'none',
      palette: palette(ROGUE_COLORS),
    },
  },

  chaser: {
    id: 'chaser',
    name: 'Perseguidor',
    tag: 'PER',
    stats: { hp: 46, mp: 6, pa: 8, ma: 2, speed: 10, move: 4, jump: 3 },
    abilities: [RUN_DOWN, punch(2.0, 'Llevan toda la noche detrás de ti. Ahora ya no corres tú.')],
    sprite: {
      body: 'rogue',
      hat: null,
      face: null,
      weapon: 'none',
      palette: palette(ROGUE_COLORS),
    },
  },

  // Mercy. After four battles of hitting people, the last one has a unit whose
  // only verb is holding the others up.
  tagalong: {
    id: 'tagalong',
    name: 'Mercy',
    tag: 'MER',
    stats: { hp: 40, mp: 16, pa: 4, ma: 7, speed: 9, move: 4, jump: 3 },
    abilities: [RALLY, punch(1.2, 'No ha peleado en su vida y esta noche tampoco piensa empezar.')],
    sprite: {
      body: 'lizzie',
      hat: null,
      face: null,
      weapon: 'none',
      palette: palette(LIZZIE_COLORS),
    },
  },

  // --- The Lizzies ---------------------------------------------------------
  //
  // The frailest people in the game by a long way, and the only ones who can
  // kill you from across the room. Everything about them is that trade: a
  // Warrior who reaches one drops her in two or three, and a Warrior who spends
  // the night in the open never reaches anybody.

  gunhand: {
    id: 'gunhand',
    name: 'Pistolera',
    tag: 'PIS',
    stats: { hp: 32, mp: 6, pa: 4, ma: 7, speed: 7, move: 3, jump: 2 },
    abilities: [
      PISTOL_SHOT,
      PISTOL_WHIP,
      punch(1.3, 'Sin el hierro es una chica de casa dando manotazos.'),
    ],
    sprite: {
      body: 'lizzie',
      hat: null,
      face: null,
      weapon: 'pistol',
      palette: palette(LIZZIE_COLORS),
    },
  },

  wallflower: {
    id: 'wallflower',
    name: 'La del rincón',
    tag: 'RIN',
    stats: { hp: 34, mp: 8, pa: 4, ma: 6, speed: 8, move: 5, jump: 3 },
    abilities: [AUTO_SHOT, PISTOL_WHIP, punch(1.3, 'Callada también para esto.')],
    sprite: {
      body: 'lizzie',
      hat: null,
      face: null,
      weapon: 'pistol',
      palette: palette(LIZZIE_COLORS),
    },
  },

  hostess: {
    id: 'hostess',
    name: 'Anfitriona',
    tag: 'ANF',
    stats: { hp: 38, mp: 6, pa: 4, ma: 3, speed: 9, move: 4, jump: 2 },
    // The bottle is the Warriors' own, reused exactly as it stands — the same
    // precedent as the Orphans borrowing the brick.
    abilities: [CLOSE_IN, BOTTLE, CUSHION_KNIFE],
    sprite: {
      body: 'lizzie',
      hat: null,
      face: null,
      weapon: 'none',
      palette: palette(LIZZIE_COLORS),
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
    // A WALL THAT FOLDS, and every number here is that sentence.
    //
    // This gang is the only one in the game whose board changed underneath it.
    // Riverside Park used to be nine Warriors against nine Furies; the film has
    // FOUR - Swan, Ajax, Snow and Cowboy, the others being dead or on a train -
    // and four against nine with these old numbers was not a hard fight, it was
    // a loss with extra steps. Measured: 450 enemy points of life against 224,
    // and more than twice the actions per turn of the clock.
    //
    // The answer is not fewer of them. Nine bats coming down the terraces is the
    // image, and the film spends its whole build-up on how many there are and
    // how quiet they are. The answer is that they lose, because that is what
    // happens: four men go through the lot of them. So the count stays and the
    // men get thinner.
    //
    // HP 36 makes a Fury the second-frailest body in the game, between a Lizzie
    // and a Punk, and it is a costume rather than an excuse: these are lean men
    // in baseball flannel, not the Turnbull's denim.
    //
    // SPEED 6, NOT 8, is the number doing most of the work, because being
    // outnumbered in this engine is really being out-ACTED. Move stays at 4 -
    // they still run you down across the park, which is the whole chase - but
    // they swing on a slower clock, and a gang that arrives together and then
    // takes turns is exactly how that scene is staged: silent, ritual, in step.
    //
    // And the bat came down from 2.5 to 2.2, which is the smallest of the three
    // cuts on purpose. `Batazo` and `Golpe ancho` both need the weapon, so a
    // disarmed Fury drops to a 1.5 punch and stays there - and three of the four
    // men on that board carry `Arrebatar`. Taking the bats off them is the
    // player's real answer here, it is the film's answer too, and it only pays
    // if a bat was worth something in the first place.
    stats: { hp: 36, mp: 8, pa: 7, ma: 2, speed: 6, move: 4, jump: 3 },
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
  chain: 'la cadena',
  can: 'el spray',
  pistol: 'la pistola',
};
