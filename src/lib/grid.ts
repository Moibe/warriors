// Isometric tile grid with per-tile height — the geometric core of a Final
// Fantasy Tactics style battlefield.
//
// FFT maps are NOT a flat chessboard: every cell has an integer *height* in
// "levels" (half-tile steps in the original). That single number drives almost
// every rule in the game — whether you can walk somewhere (Salto), how far an
// arrow reaches, how much bonus damage high ground grants, and where the camera
// has to look. So height lives here, at the bottom of the stack, and everything
// else reads it from here.

/** World units per tile edge. Kept at 1 so grid coords ≈ world coords. */
export const TILE = 1;

/**
 * World units per height level. FFT counts height in half-tile steps; 0.25
 * gives four levels per tile-width, which reads as a comfortable stair rise
 * under the isometric camera without turning the map into a ladder.
 */
export const LEVEL = 0.25;

/**
 * How far every tile column extends *below* its top face. Neighbouring columns
 * hide each other's flanks, so only exposed cliff faces get drawn — the same
 * trick the original used to make a heightmap look like carved terrain.
 *
 * Deep enough to back the tallest cliff on the map, shallow enough that the
 * board's outer rim stays a lip of earth instead of a floating slab.
 */
export const COLUMN_DEPTH = 1.25;

export type Surface =
  | 'grass' // césped — the default green
  | 'dirt' // tierra — worn paths
  | 'stone' // piedra clara — paved road / plaza
  | 'dark' // piedra oscura — the stepped basalt platforms
  | 'sand' // arena
  | 'wood' // madera — bridges, decks
  | 'water'; // agua — impassable under the base rules

export type Facing = 'n' | 'e' | 's' | 'w';

export type Tile = {
  /** Grid column (west → east). */
  x: number;
  /** Grid row (north → south). */
  y: number;
  /** Height in levels. Multiply by LEVEL for the world Y of the walkable top. */
  height: number;
  surface: Surface;
  /**
   * False for water, building footprints and any cell a unit may never stand
   * on. Void cells (holes in the map) are absent from the array entirely.
   */
  walkable: boolean;
};

export type BattleMap = {
  name: string;
  width: number;
  depth: number;
  /** Row-major, length = width * depth. `null` = void (no tile at all). */
  tiles: (Tile | null)[];
};

export type Coord = { x: number; y: number };

/** Human-readable terrain names for the tile info window. */
export const SURFACE_NAMES: Record<Surface, string> = {
  grass: 'Pradera',
  dirt: 'Tierra',
  stone: 'Camino de piedra',
  dark: 'Roca basáltica',
  sand: 'Arena',
  wood: 'Tarima',
  water: 'Agua',
};

/**
 * Top-face color and cliff-side color per surface. Two tones per material is
 * what sells the look: FFT terrain is a bright, saturated top plate sitting on
 * a duller, darker flank.
 */
export const SURFACE_COLORS: Record<Surface, { top: string; side: string }> = {
  grass: { top: '#6f9e3f', side: '#7a6141' },
  dirt: { top: '#a08055', side: '#6f5738' },
  stone: { top: '#a9a396', side: '#79736a' },
  dark: { top: '#4b4f57', side: '#33363c' },
  sand: { top: '#d8c48b', side: '#a08d5e' },
  wood: { top: '#8a5f36', side: '#5d3f24' },
  water: { top: '#2f6f9e', side: '#1d4a6d' },
};

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

export function tileKey(x: number, y: number): string {
  return x + ',' + y;
}

export function parseKey(key: string): Coord {
  const [x, y] = key.split(',');
  return { x: Number(x), y: Number(y) };
}

export function tileAt(map: BattleMap, x: number, y: number): Tile | null {
  if (x < 0 || y < 0 || x >= map.width || y >= map.depth) return null;
  return map.tiles[y * map.width + x];
}

/**
 * World-space center of a tile's top face. The map is centred on the origin so
 * the camera can orbit around (0, ?, 0) without extra bookkeeping.
 */
export function tileToWorld(map: BattleMap, x: number, y: number, height: number) {
  return {
    x: (x - (map.width - 1) / 2) * TILE,
    y: height * LEVEL,
    z: (y - (map.depth - 1) / 2) * TILE,
  };
}

/** The four orthogonal neighbours. Tactics grids never move diagonally. */
export const NEIGHBORS: ReadonlyArray<Coord> = [
  { x: 0, y: -1 }, // n
  { x: 1, y: 0 }, // e
  { x: 0, y: 1 }, // s
  { x: -1, y: 0 }, // w
];

/** Manhattan distance — the tactical "distancia" shown in the UI. */
export function gridDistance(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Direction from `from` to `to`, snapped to the dominant axis. */
export function facingTo(from: Coord, to: Coord): Facing {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'e' : 'w';
  return dy >= 0 ? 's' : 'n';
}

/** Unit vector of a facing in grid space. */
export function facingVector(f: Facing): Coord {
  switch (f) {
    case 'n':
      return { x: 0, y: -1 };
    case 'e':
      return { x: 1, y: 0 };
    case 's':
      return { x: 0, y: 1 };
    case 'w':
      return { x: -1, y: 0 };
  }
}

export const FACING_NAMES: Record<Facing, string> = {
  n: 'Norte',
  e: 'Este',
  s: 'Sur',
  w: 'Oeste',
};

/**
 * Deterministic hash of (x, y, seed) → [0, 1). Used to dapple tile colors so a
 * field of grass doesn't read as one flat sheet of paint. The same coords
 * always give the same value, so nothing shimmers between re-renders.
 */
export function hash2D(x: number, y: number, seed = 1): number {
  let h = seed | 0;
  h = Math.imul(h ^ (x | 0), 0x85ebca6b);
  h = Math.imul(h ^ (y | 0), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// ASCII map authoring
// ---------------------------------------------------------------------------

/**
 * Maps are written as parallel layers of text — one character per tile — so a
 * whole battlefield stays editable by hand in a few dozen lines. Spaces inside
 * a row are ignored, which lets you space the grid out for legibility.
 *
 *   heights   '0'-'9' then 'a'-'z' → 0..35 levels, '.' → void (no tile)
 *   surfaces  see SURFACE_CHARS below
 *   blocked   '#' → tile exists and is drawn, but nobody may stand on it
 *             (building footprints, statues, rubble)
 */
export type MapSource = {
  name: string;
  heights: string[];
  surfaces: string[];
  blocked?: string[];
};

const SURFACE_CHARS: Record<string, Surface> = {
  g: 'grass',
  d: 'dirt',
  s: 'stone',
  k: 'dark',
  n: 'sand',
  m: 'wood',
  w: 'water',
};

function stripRow(row: string): string {
  return row.replace(/ /g, '');
}

function heightOf(ch: string | undefined): number | null {
  if (ch === undefined || ch === '.') return null;
  const code = ch.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48; // 0-9
  if (code >= 97 && code <= 122) return code - 97 + 10; // a-z
  return null;
}

export function parseMap(src: MapSource): BattleMap {
  const heightRows = src.heights.map(stripRow);
  const surfaceRows = src.surfaces.map(stripRow);
  const blockedRows = (src.blocked ?? []).map(stripRow);

  const depth = heightRows.length;
  const width = Math.max(...heightRows.map((r) => r.length));
  const tiles: (Tile | null)[] = [];

  for (let y = 0; y < depth; y++) {
    for (let x = 0; x < width; x++) {
      const height = heightOf(heightRows[y]?.[x]);
      if (height === null) {
        tiles.push(null);
        continue;
      }
      const surface = SURFACE_CHARS[surfaceRows[y]?.[x] ?? 'g'] ?? 'grass';
      const isBlocked = blockedRows[y]?.[x] === '#';
      tiles.push({
        x,
        y,
        height,
        surface,
        walkable: !isBlocked && surface !== 'water',
      });
    }
  }

  return { name: src.name, width, depth, tiles };
}
