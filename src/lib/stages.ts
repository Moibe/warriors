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

import type { BattleMap } from './grid';
import { gunHillRoad, orphanBlock, riversidePark } from './maps';
import { furies, orphans, turnbull, warriors, type Unit } from './units';

/** Which procedural prop draws it — one key per entry in Scene's PROPS map. */
export type PropKind = 'comfortStation' | 'bus' | 'parkedCar';

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
export const NIGHT_RIG: Lighting = {
  ambient: { color: '#8fa4c8', intensity: 0.5 },
  hemisphere: { sky: '#7f9bd0', ground: '#4a4030', intensity: 0.75 },
  key: { color: '#cfd9f2', intensity: 1.55, position: [11, 15, 4] },
};

export type StageId = 'riverside-park' | 'gun-hill-road' | 'orphan-block';

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
};

export const STAGES: Record<StageId, Stage> = {
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
};

/**
 * The order the picker offers them, which is the order they happen on the way
 * home: the Turnbull catch them on Gun Hill Road, the train dumps them on the
 * Orphans' block, and the Furies are waiting further south in Riverside Park.
 */
export const STAGE_LIST: Stage[] = [
  STAGES['gun-hill-road'],
  STAGES['orphan-block'],
  STAGES['riverside-park'],
];

export const DEFAULT_STAGE: StageId = 'riverside-park';
