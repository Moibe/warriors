import { parseMap, type MapSource } from './grid';

// Battlefields are authored as parallel ASCII layers — one character per tile.
// Reading down a column of `heights` you can literally see the terrain profile,
// which makes hand-tuning a map (raise this ledge, cut those stairs) a text
// edit instead of a data-entry chore.
//
//   heights   '0'-'9','a'-'z' → levels, '.' → void (a hole in the map)
//   surfaces  g grass · d dirt · s stone · k dark rock · n sand · m wood · w water
//   blocked   '#' → the tile is drawn but nobody can stand on it
//
// Every layer must have the same number of rows and columns. Spaces are
// stripped, so the grid can be spaced out for legibility.

/**
 * "Colina de la Capilla" — the opening skirmish.
 *
 * Layout, north (row 0) at the top:
 *   · A grass plateau at height 3 in the north-west, crowned by a chapel whose
 *     footprint is blocked.
 *   · A void gap (a ravine) splits the plateau from the basalt terraces in the
 *     north-east, where the enemy deploys 5 levels up.
 *   · A paved causeway crosses the middle at height 2, the natural approach.
 *   · A low southern meadow at height 1 around a pond — the player's staging
 *     ground. The pond is impassable, so the south flank funnels around it.
 */
const CHAPEL_HILL: MapSource = {
  name: 'Colina de la Capilla',
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
    'ggggggdwwwddgg',
    'gggggddwwwdggg',
    'gggggddwwddggg',
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

export const chapelHill = parseMap(CHAPEL_HILL);

/**
 * Where the chapel prop is planted: the north-west corner of its 3×2 blocked
 * footprint, plus the height it stands on. Kept next to the map so moving the
 * building means editing one place, not two.
 */
export const CHAPEL_ANCHOR = { x: 1, y: 0, w: 3, d: 2, height: 3 };

export const MAPS = { chapelHill };
