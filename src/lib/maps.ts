import { parseMap, type MapSource } from './grid';

// Battlefields are authored as parallel ASCII layers — one character per tile.
// Reading down a column of `heights` you can literally see the terrain profile,
// which makes hand-tuning a map (raise this ledge, cut those stairs) a text
// edit instead of a data-entry chore.
//
//   heights   '0'-'9','a'-'z' → levels, '.' → void (a hole in the map)
//   surfaces  g césped · d tierra · s concreto · k asfalto · n tierra batida ·
//             m tarima · w charco
//   blocked   '#' → the tile is drawn but nobody can stand on it
//
// Every layer must have the same number of rows and columns. Spaces are
// stripped, so the grid can be spaced out for legibility.

/**
 * "Riverside Park" — the night the Furies caught up with them.
 *
 * Riverside is a terraced park, and that is what this board is: everything
 * steps down west to east toward the field, so height is the whole tactical
 * story. North (row 0) at the top:
 *   · A lawn terrace at height 3 in the north-west, with the park's brick
 *     comfort station standing on it — the wall Rembrandt tags.
 *   · A stairwell gap splits that terrace from the handball courts in the
 *     north-east, where the Furies come in 5 levels up and walk down at you.
 *   · A concrete walkway crosses the middle at height 2. It is the fast way
 *     across and it is completely exposed.
 *   · The ball field at height 1 in the south — a dirt infield ringed by
 *     grass. Open ground, no cover, and the Warriors start on it.
 */
const RIVERSIDE_PARK: MapSource = {
  name: 'Riverside Park',
  heights: [
    '333333..555444',
    '333333..555444',
    '33333344444444',
    '22333344433333',
    '22223333333222',
    '11222222222222',
    '11222222222222',
    '11111111000011',
    '11111110000011',
    '11111100000111',
    '11111100001111',
    '11111100011111',
  ],
  surfaces: [
    'gggggg..kkkkkk',
    'gggggg..kkkkkk',
    'ggsssssskkkkkk',
    'ggssssssskkkkk',
    'gggsssssssskkk',
    'ggssssssssssss',
    'ggssssssssssss',
    'ggggggddddgggg',
    'ggggggdnnnddgg',
    'gggggddnnndggg',
    'gggggddnnddggg',
    'gggggdddddgggg',
  ],
  blocked: [
    '.###..........',
    '.###..........',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
  ],
};

export const riversidePark = parseMap(RIVERSIDE_PARK);

/**
 * Where the comfort station is planted: the north-west corner of its 3×2
 * blocked footprint, plus the height it stands on. Kept next to the map so
 * moving the building means editing one place, not two.
 */
export const BUILDING_ANCHOR = { x: 1, y: 0, w: 3, d: 2, height: 3 };

export const MAPS = { riversidePark };
