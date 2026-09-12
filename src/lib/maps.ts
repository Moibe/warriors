import { parseMap, type MapSource } from './grid';

// Battlefields are authored as parallel ASCII layers — one character per tile.
// Reading down a column of `heights` you can literally see the terrain profile,
// which makes hand-tuning a map (raise this ledge, cut those stairs) a text
// edit instead of a data-entry chore.
//
//   heights   '0'-'9','a'-'z' → levels, '.' → void (a hole in the map)
//   surfaces  g césped · d tierra · s concreto · k asfalto · n tierra batida ·
//             m tarima · x chapa · w charco
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
 * "Gun Hill Road" — the night the Turnbull A.C. came down the block.
 *
 * The exact opposite of the park. There the sky was open and the ground fell
 * away in terraces; here the ground is flat and everything is decided at the
 * edges. North (row 0) at the top:
 *   · A wall of shuttered storefronts along the north edge, five levels up and
 *     solid — except at x=5,6, where an alley opens. That alley is the one
 *     pocket on the board with its back covered, which matters in a game that
 *     pays for hitting people from behind.
 *   · Sidewalks one level up on both sides. Anybody down on the road has
 *     people above them on two flanks.
 *   · Six rows of asphalt between them: the roadway, and the fight.
 *   · Two rows of elevated-line columns planted in the middle of the road at
 *     x=5, 9 and 13. Hard cover that never moves — the thing Riverside has
 *     none of — spaced so three tiles fit between them, cover without a maze.
 *     Concrete, and no taller than a man: from this camera anything above that
 *     stops being a column and becomes a wall you cannot see your own people
 *     through.
 *   · The station stairs climbing out of the east end, 0→1→2→3 up to a wooden
 *     platform at level 5. The Turnbull cannot jump more than one level, so
 *     those steps are not scenery: they are the way out.
 *   · The bus parked across the road at the west end, blocking five of the six
 *     lanes. It can only be rounded at the north or south tip — eight steps
 *     either way, so neither is the obvious one.
 */
const GUN_HILL_ROAD: MapSource = {
  name: 'Gun Hill Road',
  heights: [
    '5555511555555555',
    '1111111111113555',
    '1111111111113334',
    '0000000000000033',
    '0000050005000522',
    '0000000000000011',
    '0000000000000000',
    '0000050005000500',
    '0000000000000000',
    '1111111111111111',
    '2222224444222222',
  ],
  surfaces: [
    'sssssddsssssmmmm',
    'ssssssssssssmmmm',
    'ssssssssssssmmmm',
    'kkkkkkkkkkkkkkmm',
    'kkkkkskkkskkksmm',
    'kkkkkkkkkkkkkkmm',
    'kkkkkkkkkkkkkkkk',
    'kkkkkskkkskkkskk',
    'kkkkkkkkkkkkkkkk',
    'ssssssssssssssss',
    'ddddddssssssssss',
  ],
  blocked: [
    '#####..#####....',
    '................',
    '................',
    '..##............',
    '..##.#...#...#..',
    '..##............',
    '..##............',
    '..##.#...#...#..',
    '................',
    '................',
    '......####......',
  ],
};

export const gunHillRoad = parseMap(GUN_HILL_ROAD);

/**
 * "La calle de los Orphans" — three blocks nobody else wants.
 *
 * The other two boards are places you fight across. This one is a place people
 * live in, which is the whole difference: the Orphans do not march in like the
 * Furies or pile out of a bus like the Turnbull. They come out of the doorways.
 * North (row 0) at the top:
 *   · A tenement face five levels up, solid, with stoops at level 3 punched
 *     through it every three doors. Half the gang starts standing in them,
 *     above and behind the Warriors from the first tick.
 *   · The sidewalk, then the roadway at level 1 with three cars parked along
 *     it. The cars are not walls any more: the hood and the boot stand at
 *     level 4 and you climb onto them, three levels over anybody still on the
 *     asphalt. Measured: straight off the road that takes a Jump of 3, so
 *     everyone manages it except Ajax, who at Jump 2 has to come at a car from
 *     the kerb like a grown man. The cabin between them stays blocked, so a car
 *     is a perch with two ends and no way through — you go up for the angle and
 *     you come back down the side you went up.
 *     They are also the only cover in the middle of the street rather than at
 *     the edges, which is what lets a Warrior put his back against something.
 *   · The south side opens into a vacant lot — rubble at level 4, the only
 *     high ground on the board, and a puddle nobody has drained.
 *   · The subway mouth drops to level 0 at the west end. In the film the
 *     Warriors do not win this street, they cross it.
 */
const ORPHAN_BLOCK: MapSource = {
  name: 'La calle de los Orphans',
  heights: [
    '555555555555555',
    '535535535535535',
    '222222222222222',
    '145541111145541',
    '145541111145541',
    '111111111111111',
    '111114554111111',
    '331114554111111',
    '012222222223322',
    '012222222223322',
    '332222442224422',
    '222222333222222',
    '222223343322222',
    '222222333222222',
  ],
  surfaces: [
    'sssssssssssssss',
    'sssssssssssssss',
    'sssssssssssssss',
    'kxxxxkkkkkxxxxk',
    'kxxxxkkkkkxxxxk',
    'kkkkkkkkkkkkkkk',
    'kkkkkxxxxkkkkkk',
    'sskkkxxxxkkkkkk',
    'kssssssssssddss',
    'kssssssssssddss',
    'ssddddssdddssdd',
    'ddwdddnnndddddd',
    'ddwwdnnnnnddddd',
    'ddddddnnndddddd',
  ],
  blocked: [
    '###############',
    '#.##.##.##.##.#',
    '...............',
    '..##.......##..',
    '..##.......##..',
    '...............',
    '......##.......',
    '##....##.......',
    '...........##..',
    '...........##..',
    '##....##...##..',
    '...............',
    '...............',
    '...............',
  ],
};

export const orphanBlock = parseMap(ORPHAN_BLOCK);
