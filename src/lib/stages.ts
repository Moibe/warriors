// The battles, as data.
//
// A stage is everything that changes between one fight and the next: the board,
// the scenery standing on it, who is waiting there, the colour of the night and
// what the game says when it is over. All of it immutable — the only thing that
// changes at runtime is *which* stage is installed, and that happens in exactly
// one place (`startStage` in battle.svelte.ts).
//
// Keeping the roster as a function rather than an array matters: restarting has
// to deal a fresh squad every time, never the bodies the last fight left behind
// and never a unit somebody already took the bat off.

import { tileKey, type BattleMap } from './grid';
import {
  coneyIsland,
  gunHillRoad,
  lizziePlace,
  orphanBlock,
  riversidePark,
  unionSquare,
  vanCortlandt,
} from './maps';
import {
  furies,
  lizzies,
  mercy,
  orphans,
  punks,
  riffs,
  rogues,
  turnbull,
  warriors,
  warriorsNamed,
  type Unit,
} from './units';

/** Which procedural prop draws it — one key per entry in Scene's PROPS map. */
export type PropKind =
  | 'comfortStation'
  | 'bus'
  | 'parkedCar'
  | 'furniture'
  | 'coneyIsland'
  | 'mensRoom'
  | 'conclave';

/**
 * The way out.
 *
 * A battle that has one is won by leaving it rather than by clearing it, and a
 * battle without one is a fight to the last man — which is why this is optional
 * and not a default nobody uses. Shaped like a prop footprint because it is the
 * same kind of thing: a rectangle of tiles that means something.
 *
 * Never make it narrower than about three tiles. One woman standing in a
 * one-tile doorway seals it, and a way out that can be corked is not one.
 */
export type Exit = {
  /** North-west corner of the doorway, in tiles. */
  x: number;
  y: number;
  w: number;
  d: number;
  /** How many of them have to get through it. */
  needed: number;
  /** Heading over the HUD counter. Player-facing, so Spanish. */
  label: string;
};

/**
 * A prop standing on the board. The map's `blocked` layer has to agree with the
 * footprint: the mesh is decoration, the '#' is the rule. Get them out of sync
 * and you have people walking through a bus.
 */
export type PropPlacement = {
  kind: PropKind;
  /** North-west corner of the footprint, in tiles. */
  x: number;
  y: number;
  /** Footprint size in tiles. The prop is centred on it. */
  w: number;
  d: number;
  /** Level it stands on. */
  height: number;
  /** Quarter turns clockwise. Props are authored facing south. */
  turns?: 0 | 1 | 2 | 3;
  /**
   * Which of a prop's looks to draw, for props that have more than one. Three
   * identical cars on one street would tell the player they are scenery; three
   * different ones read as a street where people park.
   */
  variant?: number;
};

/**
 * The backdrop behind the transparent canvas. Colours only — the *shape* of the
 * gradient stays in +page.svelte's CSS where it is readable, and a stage just
 * swaps the stops it is painted with.
 */
export type Sky = {
  zenith: string;
  upper: string;
  lower: string;
  horizon: string;
  /** The glow the city throws up along the bottom edge. */
  glow: string;
};

/** The 3D rig. A stage that omits it inherits the night-in-the-park lighting. */
export type Lighting = {
  ambient: { color: string; intensity: number };
  hemisphere: { sky: string; ground: string; intensity: number };
  key: { color: string; intensity: number; position: [number, number, number] };
};

/**
 * Night over the Hudson, which is also the default everywhere else: cold
 * moonlight from the east so the faces the camera sees stay lit and the ledges
 * keep throwing shadows, with a sodium tint in the ambient for the park lamps.
 */
/**
 * The only daylight in the game, and it is paid for in the sky rather than in
 * the rig.
 *
 * There are two layers here and only one of them is lit: the ground and the
 * props take the light, while everything the player reads the rules with — the
 * overlays, the cursor, the rings, the sprites, the numbers — is deliberately
 * unlit so it sits on top at night. Turn the rig up for a sunrise and the
 * terrain overtakes that layer: it does not vanish, it inverts, and stops being
 * lit glass to become a stain. So the rig stays inside the band the other four
 * battles use, and the morning happens in the CSS sky behind a transparent
 * canvas, which costs the renderer nothing.
 */
export const DAWN_SKY: Sky = {
  zenith: '#2b3f6b',
  upper: '#6d6f9c',
  lower: '#d59a72',
  horizon: '#f2c98a',
  glow: 'rgba(255, 196, 120, 0.42)',
};

/**
 * Sunrise over the water, low and from the east — along the beach rather than
 * into it or behind it, which is what the place actually does. Kept at y 13
 * even so: the shadow bias is calibrated for high keys, and a literally
 * grazing light gives back acne and shadows that fall out of the frustum.
 */
export const DAWN_RIG: Lighting = {
  ambient: { color: '#b9a898', intensity: 0.62 },
  hemisphere: { sky: '#c6b9c8', ground: '#8a6f52', intensity: 0.78 },
  key: { color: '#ffd9a8', intensity: 1.5, position: [17, 13, 2] },
};

export const NIGHT_RIG: Lighting = {
  ambient: { color: '#8fa4c8', intensity: 0.5 },
  hemisphere: { sky: '#7f9bd0', ground: '#4a4030', intensity: 0.75 },
  key: { color: '#cfd9f2', intensity: 1.55, position: [11, 15, 4] },
};

export type StageId =
  | 'van-cortlandt'
  | 'riverside-park'
  | 'gun-hill-road'
  | 'orphan-block'
  | 'lizzie-place'
  | 'union-square'
  | 'coney-island';

export type Stage = {
  id: StageId;
  /** HUD header and tab title. Player-facing, so Spanish. */
  name: string;
  /** Who is waiting there. One line, under the name. */
  rival: string;
  map: BattleMap;
  props: PropPlacement[];
  roster: () => Unit[];
  sky: Sky;
  light: Lighting;
  outcome: { victory: string; defeat: string };
  /**
   * What the battle report says before anybody has moved.
   *
   * A tutorial needs a voice and this game has no room for one: there is no
   * hint system, no tooltip, no overlay, and adding any of them for a single
   * board would be a whole subsystem paying rent on one stage. But there IS
   * already a window that prints sentences in Spanish and that the player is
   * going to read anyway, and putting the opening lines in it costs one
   * optional field.
   *
   * Player-facing, so Spanish. Written in reading order - the log shows newest
   * first, and `restart` reverses them so they come out the right way up.
   */
  brief?: string[];
  /** Present only on a battle that is won by getting out of it. */
  exit?: Exit;
  /** Present only on a battle that ends when one man goes down. */
  head?: Head;
};

/**
 * The one who matters.
 *
 * Shaped like {@link Exit} and for the same reason: it is a rule of THIS
 * battle, not a property of a person. Luther decides Coney Island and nothing
 * else — a flag on the unit would travel with him to boards where dropping him
 * means nothing, would have to be set inside a squad factory that knows nothing
 * about stages, and would be one more thing restarting has to remember. An id
 * named by the stage cannot go stale: the stage that names him is the one that
 * deals the roster.
 *
 * Never point it at somebody the board cannot reach, and never put it on a
 * stage that also has an `exit` — the door answers first and this would never
 * fire. There is a check for both in `restart`.
 */
export type Head = {
  /** Unit id on this stage's own roster. */
  id: string;
  /** Heading over the HUD window. Player-facing, so Spanish. */
  label: string;
  /** What the report prints on the beat he goes down. */
  line: string;
};

/** The doorway as tile keys, for the overlay. Empty on a stage without one. */
export function exitTiles(stage: Stage): Set<string> {
  const out = new Set<string>();
  const e = stage.exit;
  if (!e) return out;
  for (let y = e.y; y < e.y + e.d; y++) {
    for (let x = e.x; x < e.x + e.w; x++) out.add(tileKey(x, y));
  }
  return out;
}

export const STAGES: Record<StageId, Stage> = {
  'van-cortlandt': {
    id: 'van-cortlandt',
    name: 'Van Cortlandt Park',
    rival: 'Gramercy Riffs',
    map: vanCortlandt,
    // Piece indices come from PIECE in Conclave.svelte:
    //   0 arcade · 1 fence · 2 fenceGap · 3 cruiser · 4 cyrus
    //   5 lamp · 6 treeline · 7 litter · 8 bin
    //
    // Two contracts that will not fail loudly if they break. The `cyrus` tile
    // must stay BLOCKED or a unit can stand inside him; and the `fenceGap`
    // placement must stay exactly on the `exit` rectangle below, or the broken
    // fence stops being where the green tiles are.
    props: [
      // THE ARCADE along the north wall. Five bays of two tiles, hung off the
      // FLOOR row in front of the wall and never off the wall tiles themselves
      // — on the wall tile the terrain column swallows a wall piece whole, which
      // is the lesson the men's room paid for with three invisible fluorescent
      // tubes.
      { kind: 'conclave', x: 1, y: 1, w: 2, d: 1, height: 0, variant: 0 },
      { kind: 'conclave', x: 3, y: 1, w: 2, d: 1, height: 0, variant: 0 },
      { kind: 'conclave', x: 5, y: 1, w: 2, d: 1, height: 0, variant: 0 },
      { kind: 'conclave', x: 7, y: 1, w: 2, d: 1, height: 0, variant: 0 },
      { kind: 'conclave', x: 9, y: 1, w: 2, d: 1, height: 0, variant: 0 },
      // THE FENCE along the south rim, one tile per placement so each can bow on
      // its own hash and no post gets doubled where two bays meet. Six tiles
      // north of the hole and three south of it, so the player reads a boundary
      // before he reads the break in it.
      { kind: 'conclave', x: 5, y: 12, w: 1, d: 1, height: 5, turns: 2, variant: 1 },
      { kind: 'conclave', x: 6, y: 12, w: 1, d: 1, height: 5, turns: 2, variant: 1 },
      { kind: 'conclave', x: 7, y: 12, w: 1, d: 1, height: 5, turns: 2, variant: 1 },
      { kind: 'conclave', x: 8, y: 12, w: 1, d: 1, height: 5, turns: 2, variant: 1 },
      { kind: 'conclave', x: 9, y: 12, w: 1, d: 1, height: 5, turns: 2, variant: 1 },
      { kind: 'conclave', x: 10, y: 12, w: 1, d: 1, height: 5, turns: 2, variant: 1 },
      { kind: 'conclave', x: 15, y: 12, w: 1, d: 1, height: 5, turns: 2, variant: 1 },
      { kind: 'conclave', x: 16, y: 12, w: 1, d: 1, height: 5, turns: 2, variant: 1 },
      { kind: 'conclave', x: 17, y: 12, w: 1, d: 1, height: 5, turns: 2, variant: 1 },
      // THE WAY OUT — exactly the `exit` rectangle above, and the two must never
      // drift apart or the broken fence stops being where the green tiles are.
      // Nothing it draws inside that rectangle rises above 0.013, under all four
      // overlay layers: a prop that draws over the exit panel has destroyed the
      // one lesson of the board.
      // turns 3, NOT 2, and the component says so in its own comment: it is
      // authored as a run along local +Z with the cut fabric peeled out along
      // local +X, so only turns 3 swings the run east-west along the fence line
      // AND points the peeled flap south, off the last row the board has. Any
      // other turn lays that flap back inside the park, on top of the green
      // panel — which is exactly what it did the first time, covering two of
      // the four tiles that are the entire lesson of this board.
      { kind: 'conclave', x: 11, y: 13, w: 4, d: 1, height: 5, turns: 3, variant: 2 },
      // CYRUS, on the floor of the bowl, one tile south of the arches. The
      // battle starts the moment after. His tile stays BLOCKED or a unit can
      // stand inside him.
      { kind: 'conclave', x: 5, y: 2, w: 1, d: 1, height: 0, variant: 4 },
      // THE PATROL CAR, off the board behind the arcade, and the only thing here
      // that moves. The light is BEHIND you and the way out is the dark corner,
      // which is the truest thing this set can say without a line of dialogue.
      { kind: 'conclave', x: 11, y: -4, w: 2, d: 2, height: 5, turns: 3, variant: 3 },
      // THE TREELINE, north and west, both off the board and both under the line
      // the walls already cast.
      { kind: 'conclave', x: 2, y: -6, w: 12, d: 1, height: 5, variant: 6 },
      { kind: 'conclave', x: -6, y: 2, w: 1, d: 10, height: 5, turns: 1, variant: 6 },
      // LAMPS, all on blocked tiles at level 5 — a lamp head only clears a man's
      // hair while it stands level with him or above. One of them is three tiles
      // from the gate, because a light over the way out is the cheapest hint
      // this game is ever going to give a new player.
      { kind: 'conclave', x: 0, y: 3, w: 1, d: 1, height: 5, variant: 5 },
      { kind: 'conclave', x: 0, y: 8, w: 1, d: 1, height: 5, variant: 5 },
      { kind: 'conclave', x: 8, y: 12, w: 1, d: 1, height: 5, variant: 5 },
      // LITTER. Flat, free, and the only thing on the board that says a thousand
      // people were standing here ninety seconds ago. Nothing within one tile of
      // Cyrus: the crowd fell back from him, and the clean stone around a body
      // is the loudest thing this set does.
      { kind: 'conclave', x: 2, y: 1, w: 1, d: 1, height: 0, variant: 7 },
      { kind: 'conclave', x: 3, y: 4, w: 1, d: 1, height: 0, variant: 7 },
      { kind: 'conclave', x: 8, y: 3, w: 1, d: 1, height: 0, variant: 7 },
      { kind: 'conclave', x: 10, y: 4, w: 1, d: 1, height: 0, variant: 7 },
      { kind: 'conclave', x: 7, y: 6, w: 1, d: 1, height: 1, variant: 7 },
      { kind: 'conclave', x: 12, y: 10, w: 1, d: 1, height: 3, variant: 7 },
      // BINS, on the rim where people stood.
      { kind: 'conclave', x: 0, y: 6, w: 1, d: 1, height: 5, variant: 8 },
      { kind: 'conclave', x: 17, y: 12, w: 1, d: 1, height: 5, variant: 8 },
    ],
    // The hole in the fence, and the whole win condition.
    //
    // Four tiles, one more than the documented floor of three, because this is
    // the board where the way out has to be unmissable and uncorkable. It sits
    // in the corner of the map FURTHEST from Cleon - twenty steps of diagonal
    // between the way home and the man you are leaving - and the rest of row 13
    // is blocked so that it reads as a GAP, a thing with edges, instead of as a
    // green stripe somebody painted on the grass.
    //
    // Six of nine is what makes the decision survivable: the eight walk out and
    // you have won with two to spare, so Cleon is a cost you CAN pay and the
    // board never punishes you for paying it.
    exit: { x: 11, y: 13, w: 4, d: 1, needed: 6, label: 'Por la valla' },
    brief: [
      'Luther ha matado a Cyrus y os ha señalado a vosotros.',
      'Nadie vino armado: Cleon dio su palabra por los nueve.',
      'Salid por el hueco de la valla. Con seis basta.',
    ],
    // The nine, in squad order, and every one of them empty-handed.
    //
    // Eight are banked high and east, two moves from the gap. FOX IS THE ONLY
    // ONE FACING SOUTH: eight men are still watching the bowl and one has
    // turned round, he has the highest Charge Time on the board so he moves
    // first, and his ground wedge points straight at a gap three tiles away.
    // That is the entire tutorial delivered as a triangle on a tile, and it is
    // also true to him - he is the one who saw Luther fire.
    //
    // Cleon is on the floor of the bowl in the corner the arcade and the false
    // wall make, facing the arches, with his back to the way home. He acts
    // third, before any Riff, so the choice is his before it is theirs.
    roster: () => [
      ...warriors([
        { x: 10, y: 9, facing: 'w', ct: 44, weapon: 'none' },
        { x: 16, y: 10, facing: 'w', ct: 20, weapon: 'none' },
        { x: 2, y: 2, facing: 'n', ct: 40, weapon: 'none' },
        { x: 15, y: 9, facing: 'w', ct: 36, weapon: 'none' },
        { x: 13, y: 8, facing: 'w', ct: 26, weapon: 'none' },
        { x: 11, y: 8, facing: 'w', ct: 30, weapon: 'none' },
        { x: 16, y: 8, facing: 'w', ct: 16, weapon: 'none' },
        { x: 12, y: 10, facing: 's', ct: 56, weapon: 'none' },
        { x: 9, y: 10, facing: 'n', ct: 8, weapon: 'none' },
      ]),
      ...riffs(),
    ],
    sky: {
      // The same span as Riverside - and span reads as air, and air reads as
      // outdoors, which is the men's-room argument run forwards. This is the
      // most outdoors board in the game: no el roof, no walls, no dawn, and a
      // board sunk below its own horizon, so sky is most of what is behind it.
      // Every stop a shade darker and bluer, because Van Cortlandt is the top
      // of the Bronx and the furthest any board gets from a lit skyline.
      zenith: '#05070f',
      upper: '#0c1226',
      lower: '#1b2440',
      horizon: '#3a4360',
      // The weakest glow in the game, and that is a rule rather than a mood.
      // The glow paints the bottom edge of the screen; on this board the bottom
      // edge is where the gate is and where the green exit overlay lives, and
      // nothing behind that overlay may compete with it.
      glow: 'rgba(255, 170, 104, 0.24)',
    },
    light: {
      // NOT Riverside's NIGHT_RIG, and the two are the same real park. Three
      // things separate them and each one moves a number.
      //
      // RIVERSIDE IS A HILLSIDE AND THIS IS A BOWL. A raking key makes terraced
      // ledges readable on a slope and loses the whole far half of a concave
      // board to its own shade, because in a bowl every surface faces inward.
      // So this key stands at 31 degrees off vertical, the second steepest in
      // the game, and the one thing a tutorial cannot afford is a dark corner.
      //
      // NIGHT_RIG IS THE DARKEST RIG HERE. Its ambient sits on the floor of the
      // band, which it can afford because it is the fourth board anybody sees.
      // This one goes first, and the first board a player ever loads cannot be
      // the darkest one in the game.
      //
      // AND THE LIGHT IS NOT THE SAME OBJECT. Riverside's key is a moon. What
      // lights a conclave is park lamps, gate lights and headlights on the road
      // above - many weak sources from many directions, which in a rig is a
      // higher ambient and a wider hemisphere, not a stronger key.
      //
      // The key is warm against a cold fill because every rig in this file is
      // pushed away from its own surfaces, and the stone here is neutral: cold
      // on cold is one hue for the whole board, which is how a night goes to
      // tin. And it sits near the FLOOR of the band at 1.36, because the
      // overlays are unlit - light the terraces past them and the green stops
      // being lit glass and becomes a stain, on the one board whose entire
      // lesson is that the green tiles are the win.
      ambient: { color: '#93a6c0', intensity: 0.64 },
      hemisphere: { sky: '#8aa2c8', ground: '#3b3a2e', intensity: 0.74 },
      key: { color: '#e4e2d2', intensity: 1.36, position: [6, 18, 9] },
    },
    outcome: {
      victory: 'Fuera del parque. Ahora hay que cruzar la ciudad entera hasta casa.',
      defeat: 'No salisteis del parque. La noche se acaba donde empezó.',
    },
  },

  'riverside-park': {
    id: 'riverside-park',
    name: 'Riverside Park',
    rival: 'Baseball Furies',
    map: riversidePark,
    props: [{ kind: 'comfortStation', x: 1, y: 0, w: 3, d: 2, height: 3 }],
    roster: () => [...warriors(), ...furies()],
    sky: {
      zenith: '#070c1c',
      upper: '#111a36',
      lower: '#253356',
      horizon: '#4a4a63',
      glow: 'rgba(255, 176, 92, 0.3)',
    },
    light: NIGHT_RIG,
    outcome: {
      victory: 'El parque es vuestro. Los Furies se quedan tirados en el asfalto.',
      defeat: 'Los Warriors no salen de Riverside. Ninguno llega a Coney Island.',
    },
  },

  'gun-hill-road': {
    id: 'gun-hill-road',
    name: 'Gun Hill Road',
    rival: 'Turnbull A.C.',
    map: gunHillRoad,
    // Parked across the road, so it comes in with a quarter turn: the component
    // is authored nose-east and the street wants it nose-north. The footprint
    // below has to match the '#' block in the map exactly, or the pathfinder and
    // the mesh disagree about where the bus is.
    props: [{ kind: 'bus', x: 2, y: 3, w: 2, d: 5, height: 0, turns: 1 }],
    // The Warriors come up the road from the east; the Turnbull have just piled
    // out of the bus at the west end.
    roster: () => [
      ...warriors([
        { x: 8, y: 2, facing: 'w', ct: 20 },
        { x: 8, y: 3, facing: 'w', ct: 32 },
        { x: 7, y: 4, facing: 'w', ct: 12 },
        { x: 10, y: 4, facing: 'w', ct: 40 },
        { x: 8, y: 5, facing: 'w', ct: 44 },
        { x: 7, y: 6, facing: 'w', ct: 30 },
        { x: 10, y: 6, facing: 'w', ct: 24 },
        { x: 8, y: 8, facing: 'w', ct: 10 },
        { x: 8, y: 9, facing: 'w', ct: 0 },
      ]),
      ...turnbull(),
    ],
    sky: {
      // Almost no sky at all: the elevated line is overhead, so what little
      // shows through the steel is city glare rather than night.
      zenith: '#0a0a10',
      upper: '#141019',
      lower: '#2a2029',
      horizon: '#4a3a34',
      glow: 'rgba(255, 150, 70, 0.34)',
    },
    light: {
      // Sodium from the street lamps rather than moonlight — the el roof takes
      // the sky away — but only a hint of it. Pushed any warmer and the asphalt
      // stops reading as asphalt and the whole street turns to mud.
      ambient: { color: '#9e9390', intensity: 0.55 },
      hemisphere: { sky: '#7d8496', ground: '#3a352e', intensity: 0.62 },
      key: { color: '#f2dcbc', intensity: 1.4, position: [13, 11, 5] },
    },
    outcome: {
      victory: 'La calle queda abierta. El autobús se va vacío.',
      defeat: 'Los Turnbull cierran Gun Hill Road. Nadie pasa de aquí.',
    },
  },

  'orphan-block': {
    id: 'orphan-block',
    name: 'La calle de los Orphans',
    rival: 'Orphans',
    map: orphanBlock,
    // Three cars along the kerb, each a different look. Their footprints match
    // the '#' blocks in the map exactly — the mesh is decoration, the '#' is
    // what stops anybody walking through a car.
    // A quarter turn each: the car is authored nose-south and these are parked
    // along a street that runs east-west. Without it the bodywork lies across
    // its own footprint and overhangs the tiles either side, which is what put
    // people standing inside the sheet metal.
    props: [
      { kind: 'parkedCar', x: 1, y: 3, w: 4, d: 2, height: 1, turns: 1, variant: 0 },
      { kind: 'parkedCar', x: 10, y: 3, w: 4, d: 2, height: 1, turns: 1, variant: 1 },
      { kind: 'parkedCar', x: 5, y: 6, w: 4, d: 2, height: 1, turns: 1, variant: 2 },
    ],
    // The Warriors come up out of the east end of the block; the Orphans are
    // already in the doorways, on the lot and standing on the subway mouth.
    roster: () => [
      ...warriors([
        { x: 13, y: 6, facing: 'w', ct: 20 },
        { x: 13, y: 5, facing: 'w', ct: 32 },
        { x: 14, y: 6, facing: 'w', ct: 12 },
        { x: 13, y: 7, facing: 'w', ct: 40 },
        { x: 14, y: 7, facing: 'w', ct: 44 },
        { x: 14, y: 5, facing: 'w', ct: 30 },
        { x: 14, y: 4, facing: 'w', ct: 24 },
        { x: 12, y: 7, facing: 'w', ct: 10 },
        { x: 14, y: 8, facing: 'w', ct: 0 },
      ]),
      ...orphans(),
    ],
    sky: {
      // A residential block, so there is sky again — but low and brown, the
      // colour a city throws back at its own streetlights.
      zenith: '#0b0d18',
      upper: '#171a2a',
      lower: '#302a34',
      horizon: '#55423a',
      glow: 'rgba(255, 164, 86, 0.32)',
    },
    light: {
      // Warmer and flatter than the park: tenement windows and a couple of
      // lamps, nothing directional enough to carve the street up.
      ambient: { color: '#9a8c8a', intensity: 0.58 },
      hemisphere: { sky: '#7a7f92', ground: '#40342c', intensity: 0.66 },
      key: { color: '#e8d6bc', intensity: 1.3, position: [9, 14, 7] },
    },
    outcome: {
      victory: 'Los Orphans se meten en sus portales. La calle era suya hasta esta noche.',
      defeat: 'Tres manzanas y no las pasaste. Sully va a contarlo toda su vida.',
    },
  },

  'lizzie-place': {
    id: 'lizzie-place',
    name: 'El piso de las Lizzies',
    rival: 'Lizzies',
    map: lizziePlace,
    // Furniture indices come from PIECE in Furniture.svelte: 0 sofa, 1 armchair,
    // 2 mattress, 3 table, 5 stereo, 7 rug, 8 beads. The climbing ones sit on
    // the heights the map gives them and the rest of the walls are terrain.
    props: [
      { kind: 'furniture', x: 3, y: 4, w: 3, d: 2, height: 1, variant: 7 },
      { kind: 'furniture', x: 1, y: 4, w: 2, d: 1, height: 3, variant: 0 },
      { kind: 'furniture', x: 3, y: 4, w: 1, d: 1, height: 3, variant: 1 },
      { kind: 'furniture', x: 3, y: 5, w: 1, d: 1, height: 2, variant: 3 },
      { kind: 'furniture', x: 4, y: 5, w: 1, d: 1, height: 2, variant: 3 },
      { kind: 'furniture', x: 6, y: 5, w: 1, d: 1, height: 3, variant: 1 },
      { kind: 'furniture', x: 6, y: 6, w: 1, d: 1, height: 3, variant: 5 },
      { kind: 'furniture', x: 4, y: 7, w: 1, d: 1, height: 1, variant: 8 },
      { kind: 'furniture', x: 1, y: 8, w: 2, d: 2, height: 2, variant: 2 },
      { kind: 'furniture', x: 3, y: 8, w: 1, d: 1, height: 2, variant: 3 },
      { kind: 'furniture', x: 10, y: 8, w: 2, d: 2, height: 2, variant: 2 },
    ],
    // The doorway, and the only reason to be here.
    exit: { x: 4, y: 0, w: 3, d: 1, needed: 3, label: 'Salir' },
    // Three of them ever got up those stairs, and by this point in the night the
    // nine are scattered anyway. Each one starts walled off from the other two:
    // there is no front line here, and regrouping is the mistake.
    roster: () => [
      ...warriorsNamed(
        ['cochise', 'rembrandt', 'vermin'],
        [
          // Sunk into the sofa, with one of them either side of him.
          { x: 2, y: 4, facing: 's', ct: 30 },
          // Stood in the kitchen with his back to the window, and the only one
          // who can see the drawer being opened.
          { x: 10, y: 5, facing: 'w', ct: 0 },
          // On the edge of the mattress in the back room, furthest from the door.
          { x: 9, y: 9, facing: 'n', ct: 24 },
        ]
      ),
      ...lizzies(),
    ],
    sky: {
      // There is no sky: it is a room. What shows past the window is the
      // stairwell and the street, which at this hour is nothing much.
      zenith: '#0a0910',
      upper: '#12101a',
      lower: '#1a1c2c',
      horizon: '#2a2230',
      glow: 'rgba(192, 57, 43, 0.28)',
    },
    light: {
      // One red lampshade and a bulb in the hall: indoors is mostly the absence
      // of a moon. But a room lit only warm goes to mud — every surface here is
      // already brown — so the fill is pushed cool and the key kept strong
      // enough to keep the floor, the furniture and the walls on three separate
      // values. Atmosphere that costs you the board is not atmosphere.
      ambient: { color: '#9a8fa0', intensity: 0.66 },
      hemisphere: { sky: '#8a93b4', ground: '#4a3030', intensity: 0.72 },
      key: { color: '#f0c079', intensity: 1.5, position: [6, 13, 8] },
    },
    outcome: {
      victory: 'Fuera, y escaleras abajo. Nadie os preguntó de dónde erais por educación.',
      defeat: 'No salisteis los tres. La recompensa de los Riffs se cobra esta noche.',
    },
  },

  'union-square': {
    id: 'union-square',
    name: 'El baño de Union Square',
    rival: 'Punks',
    map: unionSquare,
    // Piece indices come from PIECE in MensRoom.svelte:
    //   0 stalls · 1 sinks · 2 urinal · 3 radiator · 4 bench · 5 tube
    //   6 tubeDead · 7 bin · 8 pipes · 9 graffiti · 10 wet
    props: [
      // The stall run, one placement per partition-and-its-pocket. The
      // partitions themselves are TERRAIN - blocked tiles at level 4 with an
      // ordinary surface - so the column already draws them solid and the prop
      // only hangs the doors. That matters: seven player units start behind
      // those doors, and a partition drawn by a prop on an 'x' tile would be a
      // slab floating over a hole.
      { kind: 'mensRoom', x: 1, y: 1, w: 2, d: 1, height: 1, variant: 0 },
      { kind: 'mensRoom', x: 3, y: 1, w: 2, d: 1, height: 1, variant: 0 },
      { kind: 'mensRoom', x: 5, y: 1, w: 2, d: 1, height: 1, variant: 0 },
      { kind: 'mensRoom', x: 7, y: 1, w: 2, d: 1, height: 1, variant: 0 },
      { kind: 'mensRoom', x: 9, y: 1, w: 2, d: 1, height: 1, variant: 0 },
      { kind: 'mensRoom', x: 11, y: 1, w: 2, d: 1, height: 1, variant: 0 },
      { kind: 'mensRoom', x: 13, y: 1, w: 2, d: 1, height: 1, variant: 0 },
      // The sinks and the cracked mirror, west wall, facing the room.
      { kind: 'mensRoom', x: 1, y: 3, w: 1, d: 3, height: 1, turns: 1, variant: 1 },
      // The trough, south wall, hung off the front of its own blocked pier.
      { kind: 'mensRoom', x: 5, y: 10, w: 1, d: 1, height: 1, turns: 2, variant: 2 },
      { kind: 'mensRoom', x: 6, y: 10, w: 1, d: 1, height: 1, turns: 2, variant: 2 },
      { kind: 'mensRoom', x: 7, y: 10, w: 1, d: 1, height: 1, turns: 2, variant: 2 },
      { kind: 'mensRoom', x: 8, y: 10, w: 1, d: 1, height: 1, turns: 2, variant: 2 },
      // The two islands you can actually climb, and they are made of the only
      // two materials in here that are not ceramic: black iron and pine. On a
      // board where the walls and the floor are the same tile, colour is the
      // only thing left to tell a man which safe square he is looking at.
      { kind: 'mensRoom', x: 14, y: 3, w: 1, d: 2, height: 1, turns: 3, variant: 3 },
      { kind: 'mensRoom', x: 13, y: 7, w: 1, d: 2, height: 1, turns: 3, variant: 4 },
      { kind: 'mensRoom', x: 1, y: 8, w: 1, d: 1, height: 1, turns: 1, variant: 7 },
      // WALL PIECES HANG OFF A FLOOR TILE WITH A WALL BEHIND IT, never off the
      // wall tile itself: placed on the wall, the terrain column swallows them
      // whole and the room comes out with no lighting at all. Learned the hard
      // way, in a screenshot with three invisible fluorescent tubes in it.
      { kind: 'mensRoom', x: 1, y: 6, w: 1, d: 2, height: 1, turns: 1, variant: 5 },
      { kind: 'mensRoom', x: 2, y: 10, w: 2, d: 1, height: 1, turns: 2, variant: 5 },
      // And one of them dead. A lit half and a dark half of the same room costs
      // nothing and is the only thing in here that says the MTA stopped coming.
      { kind: 'mensRoom', x: 11, y: 10, w: 2, d: 1, height: 1, turns: 2, variant: 6 },
      { kind: 'mensRoom', x: 1, y: 2, w: 1, d: 1, height: 1, turns: 1, variant: 8 },
      { kind: 'mensRoom', x: 14, y: 9, w: 1, d: 1, height: 1, turns: 3, variant: 8 },
      // 1979. This room is covered.
      { kind: 'mensRoom', x: 1, y: 9, w: 1, d: 1, height: 1, turns: 1, variant: 9 },
      { kind: 'mensRoom', x: 9, y: 10, w: 1, d: 1, height: 1, turns: 2, variant: 9 },
      { kind: 'mensRoom', x: 13, y: 10, w: 1, d: 1, height: 1, turns: 2, variant: 9 },
      { kind: 'mensRoom', x: 14, y: 2, w: 1, d: 1, height: 1, turns: 3, variant: 9 },
      // Wet floor. It blocks nothing, and it is the thesis of the board in
      // paint: the open middle is lit, wet, and theirs.
      { kind: 'mensRoom', x: 7, y: 5, w: 1, d: 1, height: 1, variant: 10 },
      { kind: 'mensRoom', x: 11, y: 8, w: 1, d: 1, height: 1, variant: 10 },
      { kind: 'mensRoom', x: 4, y: 7, w: 1, d: 1, height: 1, variant: 10 },
    ],
    // Six of them, and Mercy, already in the cubicles with the doors shut.
    //
    // The deployment IS the scene. Swan does not get cornered in that lavatory,
    // he walks them into it; the Punks come through the east door thinking they
    // are springing a trap. So the player opens the battle with seven units in
    // seven dead ends and the whole enemy squad in the open, and the first
    // decision of the board is the only one that matters on it: who steps out.
    //
    // Rembrandt has the highest Charge Time in the room because in the film he
    // is the starting gun - the leader pulls his door and takes the can in the
    // face at arm's length. Mercy is at the far end, as far from the way in as
    // the room allows, which is the most this board can do for somebody who
    // said she could not come in here.
    roster: () => [
      ...warriorsNamed(
        ['rembrandt', 'swan', 'snow', 'cowboy', 'cochise', 'vermin'],
        [
          { x: 10, y: 1, facing: 's', ct: 56 },
          { x: 8, y: 1, facing: 's', ct: 44 },
          { x: 14, y: 1, facing: 's', ct: 40 },
          { x: 12, y: 1, facing: 's', ct: 34 },
          { x: 6, y: 1, facing: 's', ct: 28 },
          { x: 4, y: 1, facing: 's', ct: 22 },
        ]
      ),
      ...mercy([{ x: 2, y: 1, facing: 's', ct: 12 }]),
      ...punks(),
    ],
    sky: {
      // The first board in the game with no sky at all, and the gradient says
      // so by having almost no span: four stops crawling from #070a09 to
      // #243029. Every other sky here is a DISTANCE - Riverside runs #070c1c to
      // #4a4a63, the dawn #2b3f6b to #f2c98a - and span reads as air, and air
      // reads as outdoors. What is behind this board is a tiled passage you
      // could put your hand on.
      zenith: '#070a09',
      upper: '#0e1412',
      lower: '#18211d',
      horizon: '#243029',
      // The only green-white glow in the game; every other one is sodium or
      // fire. It is the platform's own tubes further down the passage, and it
      // is the faintest here at 0.22 against a range of 0.28 to 0.42, because a
      // bright rim along the bottom edge reads as daylight outside and there is
      // none. It is a spill under a door, and it is the only thing in the frame
      // that says the way out exists.
      glow: 'rgba(214, 236, 214, 0.22)',
    },
    light: {
      // Cold white from overhead, and both halves of that are the point.
      //
      // COLD: the floor is #7d8a80, the walls are ceramic, the partitions are
      // ceramic - the room is green before a light touches it. Key it green too
      // and every value collapses onto one hue and the board goes to tin, which
      // is this room's version of the mud the Lizzies' rig was written against.
      // Every rig in this file is pushed AWAY from its own surfaces, so this
      // key is the palest thing in the frame with only a whisper of green in
      // it. The ambient is a dead neutral for the same reason: tint it amber
      // for the sodium off the platform and a ceramic room turns beige, at
      // which point it is the fourth brown board in a row.
      //
      // OVERHEAD: every other key in the game rakes, because every other key is
      // a moon or a sun - Gun Hill is 52 degrees off vertical, the Lizzies 38,
      // the dawn 53. This one is 27, by a distance the steepest here, because a
      // fluorescent tube in a ceiling is the first light in this project that
      // is genuinely above you. That one number is most of what makes the board
      // feel roofed, before a single hex is looked at.
      //
      // The hemisphere carries the widest sky/ground spread of any rig here and
      // it has to: this is the only board where a wall and a floor are THE SAME
      // MATERIAL, and without that gradient the room is one grey box with a
      // fighter standing in it.
      ambient: { color: '#8d928c', intensity: 0.6 },
      hemisphere: { sky: '#c3d2c6', ground: '#3b443f', intensity: 0.7 },
      key: { color: '#eef6ea', intensity: 1.45, position: [5, 17, 7] },
    },
    outcome: {
      victory: 'Los nueve en el suelo y los seis de pie. La única que ganáis a gusto.',
      defeat: 'Os pillaron en los retretes. Nadie coge el último tren.',
    },
  },

  'coney-island': {
    id: 'coney-island',
    name: 'Coney Island',
    rival: 'Rogues',
    map: coneyIsland,
    // Everything enormous stands off the board, north of the top edge, where
    // nobody walks and nothing collides. What is inside the field is knee-high
    // on purpose: the groyne posts, an upturned boat, driftwood, a stump, and
    // the car they came in — the only real cover on the beach belongs to them.
    props: [
      // The horizon hangs off the camera from the origin and lays out its own
      // rides internally, so it wants the middle of the board rather than a
      // corner behind it: placed off the north edge it drew itself another nine
      // tiles further back and walked out of frame.
      { kind: 'coneyIsland', x: 9, y: 6, w: 1, d: 1, height: 0, variant: 0 },
      { kind: 'coneyIsland', x: 0, y: 1, w: 20, d: 1, height: 5, variant: 1 },
      { kind: 'coneyIsland', x: 2, y: 1, w: 1, d: 1, height: 5, variant: 2 },
      { kind: 'coneyIsland', x: 17, y: 1, w: 1, d: 1, height: 5, variant: 2 },
      { kind: 'coneyIsland', x: 7, y: 1, w: 2, d: 1, height: 5, variant: 3 },
      { kind: 'coneyIsland', x: 12, y: 5, w: 1, d: 2, height: 1, variant: 4 },
      { kind: 'coneyIsland', x: 12, y: 9, w: 1, d: 2, height: 1, variant: 4 },
      { kind: 'coneyIsland', x: 13, y: 3, w: 1, d: 1, height: 1, variant: 5 },
      { kind: 'coneyIsland', x: 10, y: 2, w: 1, d: 1, height: 1, variant: 5 },
      { kind: 'coneyIsland', x: 0, y: 12, w: 20, d: 1, height: 0, variant: 6 },
      { kind: 'parkedCar', x: 6, y: 5, w: 4, d: 2, height: 1, turns: 1, variant: 2 },
    ],
    head: {
      id: 'luther',
      label: 'El que cuenta',
      line: 'Luther cae. Nadie levanta la mano por él.',
    },
    // Six of them made it, and they come down the east ramp: two still on the
    // planks, four already on the sand. It is a deployment of arrival, not of
    // formation — there is no front line left to form.
    roster: () => [
      ...warriorsNamed(
        ['swan', 'snow', 'cowboy', 'cochise', 'vermin', 'rembrandt'],
        [
          { x: 14, y: 8, facing: 'w', ct: 26 },
          { x: 16, y: 6, facing: 'w', ct: 40 },
          { x: 16, y: 9, facing: 'w', ct: 34 },
          { x: 17, y: 8, facing: 'w', ct: 18 },
          { x: 16, y: 4, facing: 'w', ct: 12 },
          { x: 16, y: 3, facing: 'w', ct: 0 },
        ]
      ),
      ...mercy(),
      ...rogues(),
    ],
    sky: DAWN_SKY,
    light: DAWN_RIG,
    outcome: {
      victory: 'Luther en la arena y los suyos quietos alrededor. Ya podéis ir a casa.',
      defeat: 'Amanece en Coney Island y no llegasteis a él. Nadie va a saber nunca la verdad.',
    },
  },
};

/**
 * The order the picker offers them, which is the order they happen: it starts
 * at the conclave in Van Cortlandt Park, where Cyrus is shot and the Warriors
 * are blamed for it, and from there it is the way home. The Turnbull catch
 * them on Gun Hill Road, the train dumps them on the
 * Orphans' block, the Furies are waiting further south in Riverside Park, and
 * the Lizzies ask them upstairs afterwards, and the Punks are waiting in the
 * lavatory at Union Square on the way to the last train. Coney Island is the
 * morning.
 */
export const STAGE_LIST: Stage[] = [
  STAGES['van-cortlandt'],
  STAGES['gun-hill-road'],
  STAGES['orphan-block'],
  STAGES['riverside-park'],
  STAGES['lizzie-place'],
  STAGES['union-square'],
  STAGES['coney-island'],
];

/**
 * And the game opens on the first one, which it did not before.
 *
 * It used to open on Riverside Park - the third fight, against a gang that
 * never says a word, with nine armed men against nine. That is a fine board
 * and a terrible first impression: it starts in the middle of a story with
 * every mechanic already switched on. The conclave is where the night starts
 * and it is the only board here that teaches, so it is the one the game hands
 * somebody who has never pressed a key.
 */
export const DEFAULT_STAGE: StageId = 'van-cortlandt';
