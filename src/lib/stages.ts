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
import { gunHillRoad, riversidePark } from './maps';
import { furies, turnbull, warriors, type Unit } from './units';

/** Which procedural prop draws it — one key per entry in Scene's PROPS map. */
export type PropKind = 'comfortStation' | 'bus';

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

export type StageId = 'riverside-park' | 'gun-hill-road';

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
};

/** In the order the picker offers them — the order they happen on the way home. */
export const STAGE_LIST: Stage[] = [STAGES['riverside-park'], STAGES['gun-hill-road']];

export const DEFAULT_STAGE: StageId = 'riverside-park';
