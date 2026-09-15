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

  /**
   * Per-person recolor. Skin and hair, and for three gangs out of four that is
   * the whole of it: the cut is what makes them a gang, so nobody's is allowed
   * to differ. The Lizzies are the exception the rule needed — they have no
   * shared garment at all, so theirs reaches the gang slot too, and they are
   * the one battle where the board cannot be read by colour.
   */
  paletteOverride?: Partial<Palette>;

  /** Seconds left on the recoil reaction. Presentation only. */
  hurtFor: number;
  /** Seconds left on the going-down animation. Presentation only. */
  deathFor: number;

  /**
   * The turn he went down on, or null while he is still standing.
   *
   * Nothing reads it yet. It is here because it is the one thing about a body
   * that cannot be recovered afterwards — everything else survives on its own,
   * since a fallen unit is never removed from the roster: his square, his
   * facing, his name, whatever weapon he still had, even the Charge Time he
   * had banked when he dropped. If picking somebody back up ever comes with a
   * clock on it, this is the only field that would have had to exist from the
   * start.
   */
  fellOnTurn: number | null;

  /**
   * The turn he got through the door, or null while he is still in the room.
   *
   * The mirror of `fellOnTurn`, and deliberately shaped the same way: a man who
   * is out is out of the rules exactly like a man who is down — no turn, no
   * target, no vote on who has won — except that he counts for you instead of
   * against you, and nothing draws him.
   */
  leftOnTurn: number | null;
};

export function isAlive(u: Unit): boolean {
  return u.hp > 0;
}

/** Somebody who made it out. Out of the rules, and not a casualty. */
export function hasLeft(u: Unit): boolean {
  return u.leftOnTurn !== null;
}

/**
 * Standing, and still in the room. The only people the rules speak to.
 *
 * `isAlive` was enough while the only way to leave a battle was to be carried
 * out of it. A door makes two different kinds of gone, and almost everything
 * that used to ask "is he alive" was really asking this.
 */
export function inPlay(u: Unit): boolean {
  return isAlive(u) && !hasLeft(u);
}

export function unitAt(units: Unit[], x: number, y: number): Unit | undefined {
  return units.find((u) => inPlay(u) && u.x === x && u.y === y);
}

/**
 * The body lying on a square, if there is one. Kept separate from `unitAt` on
 * purpose: everything that asks "who is standing here" — targeting, the turn
 * order, the AI — must keep getting nobody, and only the parts that describe
 * the ground to the player should see a corpse.
 */
export function fallenAt(units: Unit[], x: number, y: number): Unit | undefined {
  return units.find((u) => !isAlive(u) && u.x === x && u.y === y);
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
    fellOnTurn: null,
    leftOnTurn: null,
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
    id: 'rizzo', name: 'Rizzo', job: 'enforcer', team: 'enemy',
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

// ---------------------------------------------------------------------------
// The Orphans
// ---------------------------------------------------------------------------
//
// Nine men from three blocks nobody else wants. They are the only gang here who
// look like people rather than like an army: the vest is cheap cloth with their
// name painted on the back by hand, and not one of them is carrying anything.
//
// Same rule as the other three, pointed somewhere new. The Warriors are told
// apart by what sits on their heads, the Furies by their war paint, the
// Turnbull by how recently each shaved — and the Orphans by their hair, because
// they are the only gang wearing their own.

const ORPHAN_SQUAD = () => [
  // Sully, plumb in the middle of the road. The one Orphan with a name in the
  // film, and the man the whole street stands up because of.
  createUnit({
    id: 'sully', name: 'Sully', job: 'loudmouth', team: 'enemy',
    x: 9, y: 5, facing: 'e', ct: 34, brave: 92, faith: 44,
    paletteOverride: { H: '#2a1d14', J: '#1a110b', S: '#d8a878', K: '#ad8156' },
  }),

  // Out of the doorways, above and behind the Warriors from the first tick.
  createUnit({
    id: 'chico', name: 'Chico', job: 'stray', team: 'enemy',
    x: 10, y: 1, facing: 's', ct: 8,
    paletteOverride: { H: '#1f1611', J: '#120c09', S: '#c08a5e', K: '#996a45' },
  }),
  createUnit({
    id: 'tino', name: 'Tino', job: 'cornerboy', team: 'enemy',
    x: 7, y: 1, facing: 's', ct: 22,
    paletteOverride: { H: '#6b4a2a', J: '#45301a', S: '#e0b489', K: '#b98a63' },
  }),
  createUnit({
    id: 'junior', name: 'Junior', job: 'stray', team: 'enemy',
    x: 13, y: 1, facing: 's', ct: 45, brave: 58,
    paletteOverride: { H: '#8a6a3c', J: '#5d4726', S: '#e8c19b', K: '#c0946d' },
  }),

  // The south sidewalk and the lot.
  createUnit({
    id: 'nickel', name: 'Nickel', job: 'stray', team: 'enemy',
    x: 9, y: 9, facing: 'e', ct: 16,
    paletteOverride: { H: '#3a2a1c', J: '#241a10', S: '#7a5030', K: '#5b3a22' },
  }),
  createUnit({
    id: 'pockets', name: 'Pockets', job: 'cornerboy', team: 'enemy',
    x: 5, y: 9, facing: 'e', ct: 28,
    paletteOverride: { H: '#5a4632', J: '#3a2c1e', S: '#e4bb92', K: '#bd8f68' },
  }),
  // On the rubble: the only high ground on the board, and the only Orphan who
  // starts on it.
  createUnit({
    id: 'spider', name: 'Spider', job: 'cornerboy', team: 'enemy',
    x: 7, y: 12, facing: 'n', ct: 4, brave: 80,
    paletteOverride: { H: '#151010', J: '#0b0808', S: '#6b4426', K: '#4e3020' },
  }),
  createUnit({
    id: 'lefty', name: 'Lefty', job: 'stray', team: 'enemy',
    x: 3, y: 11, facing: 'e', ct: 38,
    paletteOverride: { H: '#7a3f22', J: '#4f2814', S: '#e8c19b', K: '#c0946d' },
  }),
  // Planted in front of the subway mouth: the way out is already taken.
  createUnit({
    id: 'buster', name: 'Buster', job: 'stray', team: 'enemy',
    x: 2, y: 8, facing: 'e', ct: 12, brave: 84,
    paletteOverride: { H: '#4a3524', J: '#2e2016', S: '#a87c58', K: '#835c3d' },
  }),
];

// ---------------------------------------------------------------------------
// The Lizzies
// ---------------------------------------------------------------------------
//
// The one gang here with nothing in common to wear. Every other squad in this
// file overrides skin and hair and leaves the gang colour alone, because the
// coat is what makes them a gang; these override the gang colour too, and each
// one is dressed differently on purpose. It costs the player the thing he has
// leaned on for three battles — reading the board by colour — in the battle
// where the board is a room full of people who invited him in.
//
// Only one of them starts holding anything. The guns are hidden in the flat,
// not on them: if you could see the bulge in the street, nobody would have come
// upstairs.

const LIZZIE_SQUAD = () => [
  // On the sofa, on the cushion the revolver is under.
  createUnit({
    id: 'chrome', name: 'Chrome', job: 'gunhand', team: 'enemy',
    x: 1, y: 4, facing: 'e', ct: 52, brave: 74,
    paletteOverride: { A: '#241f27', H: '#17141f', J: '#0c0a11' },
  }),
  // Against the kitchen counter, between Rembrandt and the drawer.
  createUnit({
    id: 'mouse', name: 'Mouse', job: 'wallflower', team: 'enemy',
    x: 9, y: 5, facing: 'e', ct: 20, brave: 58,
    paletteOverride: { A: '#e6dbc6', H: '#d9d0ab', J: '#a89a72', S: '#e8bd93', K: '#c2946c' },
  }),
  // The one who talked to them in the street, perched on the low table.
  createUnit({
    id: 'starr', name: 'Starr', job: 'hostess', team: 'enemy',
    x: 3, y: 5, facing: 'n', ct: 36, brave: 82,
    paletteOverride: { A: '#8e2a3a', H: '#8d3b1e', J: '#5e2412' },
  }),
  // The one who decided who sat where, now sitting beside Vermin.
  createUnit({
    id: 'roxy', name: 'Roxy', job: 'hostess', team: 'enemy',
    x: 10, y: 9, facing: 'w', ct: 26,
    paletteOverride: { A: '#c8a34e', H: '#17141f', J: '#0c0a11', S: '#7a5030', K: '#5b3a22' },
  }),
  // In the back-room doorway, with no stash within reach of her.
  createUnit({
    id: 'dallas', name: 'Dallas', job: 'hostess', team: 'enemy',
    x: 8, y: 8, facing: 's', ct: 8,
    paletteOverride: { A: '#2f5e46', H: '#d9d0ab', J: '#a89a72' },
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

/** The Orphans, who never leave their three blocks. */
export function orphans(spots?: Spot[]): Unit[] {
  return placeSquad(ORPHAN_SQUAD(), spots);
}

// ---------------------------------------------------------------------------
// The Punks
// ---------------------------------------------------------------------------
//
// One cut of dungaree and seven different shirts, which is the exact inverse of
// every other gang in this file. The Warriors, the Furies and the Turnbull are
// told apart by skin and hair while the garment stays untouched; the Lizzies
// have no shared garment at all. These have the most uniform uniform in the
// game from the collar down and the loudest individuality from the collar up:
// four plain shirts and three hooped, yellow and navy and red and green, which
// is what the film puts on them. So the overrides here reach `G` and `F` - the
// shirt and its hoops - and never touch `A` or `C`, the denim.
//
// Every one of them walks in holding something, and that is the battle. The
// Warriors come in with fists; `Arrebatar` stops being a flourish here and
// becomes the opening move.
//
// TWO CHAINS, and the film gives one. That is a declared liberty and the reason
// is mechanical: the cubicles are safe from anything that swings at arm's
// length, so with a single chain six of the seven are free parking and the
// board stops being a decision. The second one is what keeps a hole in the wall
// honest.

const PUNK_SQUAD = () => [
  // The leader. Out in front of his own men because he is the only one who does
  // not have to walk, and the highest Charge Time on his side: he tailed Swan
  // through the station and he is the one who pulls the first door.
  createUnit({
    id: 'vance', name: 'Vance', job: 'kingpin', team: 'enemy',
    x: 11, y: 3, facing: 'n', ct: 48, brave: 76,
    // Black shirt with yellow bands round the upper sleeves - the only dark
    // shirt in the gang, and it finds him across the room without a marker.
    paletteOverride: { G: '#2f2f3a', F: '#d8b23a', H: '#4a3524', J: '#2e2016' },
  }),
  // Yellow with navy hoops, and the one everybody remembers as "the striped
  // one". Straight behind the leader, which is where he is in the frame.
  createUnit({
    id: 'hog', name: 'Hog', job: 'roughneck', team: 'enemy',
    x: 13, y: 3, facing: 'n', ct: 30,
    paletteOverride: { G: '#d9bf52', F: '#22314f', H: '#6b4a28', J: '#46301a' },
  }),
  // Plain red, and the big one. Bare hands: he did not think he would need
  // anything, which is why the bat ends up being Snow's.
  createUnit({
    id: 'ed', name: 'Ed', job: 'roughneck', team: 'enemy',
    x: 13, y: 4, facing: 'n', ct: 20, brave: 84, weapon: 'none',
    paletteOverride: { G: '#9e3128', F: '#7a241d', H: '#2a211c', J: '#17120f' },
  }),
  // Green over dark blue, with the chain.
  createUnit({
    id: 'hornet', name: 'Hornet', job: 'chainman', team: 'enemy',
    x: 12, y: 5, facing: 'n', ct: 26,
    paletteOverride: { G: '#4a7a45', F: '#1c2740', H: '#8d6a3a', J: '#5e4524' },
  }),
  // Royal blue under a grey tweed flat cap - the only Punk wearing anything on
  // his head, and on a board where seven men share one garment that cap is
  // worth more than any recolour.
  createUnit({
    id: 'maurice', name: 'Maurice', job: 'roughneck', team: 'enemy',
    x: 14, y: 6, facing: 'n', ct: 14, hat: 'cap', weapon: 'none',
    paletteOverride: { G: '#2f4ea0', F: '#2f4ea0', H: '#3a2f26', J: '#241c16' },
  }),
  // Plain green, at the back, and slow to get going.
  createUnit({
    id: 'lumpy', name: 'Lumpy', job: 'roughneck', team: 'enemy',
    x: 12, y: 7, facing: 'n', ct: 8,
    paletteOverride: { G: '#3f6b3a', F: '#2d4d2a', H: '#7a3f22', J: '#4f2814' },
  }),
  // Red, white and black barber stripes under a dark knit beanie, still in the
  // doorway when it starts. The second chain, and the one that reaches the far
  // end of the stall run once he gets there.
  createUnit({
    id: 'beanie', name: 'Beanie', job: 'chainman', team: 'enemy',
    x: 15, y: 6, facing: 'n', ct: 18,
    paletteOverride: { G: '#d8d2c4', F: '#9e2f2c', H: '#17141f', J: '#0c0a11' },
  }),
];

/** The Punks, who only ever come through one door. */
export function punks(spots?: Spot[]): Unit[] {
  return placeSquad(PUNK_SQUAD(), spots);
}

// ---------------------------------------------------------------------------
// The Rogues
// ---------------------------------------------------------------------------
//
// The gang that started the night, and the last one on the way home. Five men
// around a small one: the threat is not the squad, it is a name, and everything
// here is arranged so the eye finds him without being told. They are the only
// gang with nothing shared to wear, so the only warm colour on the beach is
// Luther's vest.

const ROGUE_SQUAD = () => [
  // Behind his own car, with the five of them in front. The highest Charge Time
  // on the board: he is the one who called them out, so he moves first, and the
  // first thing he does is step out from behind the sheet metal.
  createUnit({
    id: 'luther', name: 'Luther', job: 'coward', team: 'enemy',
    x: 5, y: 7, facing: 'e', ct: 52, brave: 34, faith: 60,
  }),
  // Stood on him. The first thing that has to be moved out of the way.
  createUnit({
    id: 'ratchet', name: 'Ratchet', job: 'minder', team: 'enemy',
    x: 6, y: 7, facing: 'e', ct: 20, brave: 78,
    paletteOverride: { H: '#3a2f26', J: '#241c16', S: '#c99a6e', K: '#a67a52' },
  }),
  createUnit({
    id: 'drano', name: 'Drano', job: 'minder', team: 'enemy',
    x: 10, y: 6, facing: 'e', ct: 38,
    paletteOverride: { H: '#5a4a3a', J: '#3a2f24', S: '#e0b489', K: '#b98a63' },
  }),
  // Corking the middle gap of the groyne, which is the short way through.
  createUnit({
    id: 'crow', name: 'Crow', job: 'minder', team: 'enemy',
    x: 10, y: 8, facing: 'e', ct: 30,
    paletteOverride: { H: '#17141f', J: '#0c0a11', S: '#7a5030', K: '#5b3a22' },
  }),
  createUnit({
    id: 'wire', name: 'Wire', job: 'chaser', team: 'enemy',
    x: 8, y: 3, facing: 'e', ct: 14,
    paletteOverride: { H: '#8d6a3a', J: '#5e4524', S: '#e8c19b', K: '#c0946d' },
  }),
  createUnit({
    id: 'kero', name: 'Kero', job: 'chaser', team: 'enemy',
    x: 9, y: 10, facing: 'e', ct: 8,
    paletteOverride: { H: '#2a211c', J: '#17120f', S: '#a87c58', K: '#835c3d' },
  }),
];

/** Luther and the five he hides behind. */
export function rogues(spots?: Spot[]): Unit[] {
  return placeSquad(ROGUE_SQUAD(), spots);
}

/**
 * Mercy, who is not one of them and comes anyway.
 *
 * Her falling is not a defeat. Making it one would turn the closing beat of the
 * game into the most hated mechanic in the genre, and it would be false to the
 * film besides: nobody on that beach ever threatens her. What she costs you if
 * she goes down is the rallying, and that is enough.
 */
export function mercy(spots?: Spot[]): Unit[] {
  return placeSquad(
    [
      createUnit({
        id: 'mercy', name: 'Mercy', job: 'tagalong', team: 'ally',
        x: 16, y: 1, facing: 'w', ct: 8, brave: 88, faith: 70,
        paletteOverride: { A: '#8e2a3a', H: '#8d3b1e', J: '#5e2412' },
      }),
    ],
    spots
  );
}

/** Some of the nine, in the order you name them.
 *
 * `warriors(spots)` hands out positions by index across the whole squad, which
 * is right when all nine turn up and useless when only three do — filtering
 * afterwards leaves the survivors holding somebody else's chair. This picks
 * first and places second, so the spots line up with the names you asked for.
 */
export function warriorsNamed(ids: string[], spots: Spot[]): Unit[] {
  const squad = WARRIOR_SQUAD();
  const picked = ids.map((id) => squad.find((u) => u.id === id)).filter((u): u is Unit => !!u);
  return placeSquad(picked, spots);
}

/** The Lizzies, at home, which is the only place they are dangerous. */
export function lizzies(spots?: Spot[]): Unit[] {
  return placeSquad(LIZZIE_SQUAD(), spots);
}
