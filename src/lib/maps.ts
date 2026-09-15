import { parseMap, type MapSource } from './grid';

// Battlefields are authored as parallel ASCII layers — one character per tile.
// Reading down a column of `heights` you can literally see the terrain profile,
// which makes hand-tuning a map (raise this ledge, cut those stairs) a text
// edit instead of a data-entry chore.
//
//   heights   '0'-'9','a'-'z' → levels, '.' → void (a hole in the map)
//   surfaces  g césped · d tierra · s concreto · k asfalto · n tierra batida ·
//             m tarima · x chapa · c moqueta · b arena de playa ·
//             p tarima de mar · w agua
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
 * "Van Cortlandt Park" - the meeting, and the board that goes first.
 *
 * Every other battle in this file is a fight. This one is a walk, and it is the
 * only board in the game whose job is to teach. The player has never moved a
 * man before, nobody on his side is carrying anything, and there is no hint
 * system to lean on - so the lesson has to be the terrain. Four of them, in
 * order: walking is a verb, the green band is how you win, you do not have to
 * fight, and the one decision on the board is optional and costs you. Not one
 * of them is written down anywhere.
 *
 * IT IS NOT A FIELD. The conclave is SET at Van Cortlandt and was SHOT at the
 * 97th Street playground in Riverside - the same park as the Furies board, four
 * battles later, which is a coincidence the film handed us and not one we
 * arranged. What is on screen is a stone amphitheatre, and that is what this is.
 * North (row 0) at the top:
 *   - THE ARCADE along the north wall: masonry arches at level 5, blocked, that
 *     the crowd perched in front of. The one built feature of the real location.
 *   - THE FLOOR OF THE BOWL at level 0, under it. Cyrus fell there and Cleon is
 *     pinned there, in the corner the arcade and the false wall make.
 *   - A FALSE WALL down the west side, blocked - built for the shoot to hide the
 *     playground, and here it is the side of the bowl you cannot run out of.
 *   - THE BANK: terraces stepping up east and south, 0 to 1 to 2 to 3 to 4, with
 *     two blocked parapets at x=4 and x=12 splitting the seating into wedges so
 *     nine men read as a crowd standing in it rather than as a rank.
 *   - THE FENCE along the south edge at level 5, blocked, EXCEPT FOR FOUR TILES.
 *     That gap is the hole they went through and the whole win condition, and it
 *     is in the corner furthest from Cleon: twenty steps of diagonal between the
 *     way home and the man you are leaving. The board is not symmetrical on
 *     purpose.
 *
 * WHAT MAKES IT A TUTORIAL IS THE DISTANCE, NOT THE ENEMY. The eight are banked
 * high and east, two or three moves from the gap. Cleon starts on the floor in
 * the far corner with six Riffs between him and everybody. Nothing is scripted
 * and no rule is hidden - the board simply tells his story with geometry, and
 * going back down for him is a real expedition the player may decline.
 */
const VAN_CORTLANDT: MapSource = {
  name: 'Van Cortlandt Park',
  heights: [
    '555555555555223344',
    '500000000011223344',
    '500000000011223344',
    '500000000011223344',
    '500000000011223344',
    '511151111111523344',
    '511151111111523344',
    '522252222222523344',
    '522252222222523344',
    '533333333333333344',
    '333333333333333344',
    '444444444444444444',
    '555555555555555555',
    '555555555555555555',
  ],
  surfaces: [
    'ssssssssssssgggggg',
    'sdnnnnnnndsssssssg',
    'sdnnnnnnndsssssssg',
    'sdnnnnnnndsssssssg',
    'sdddddddddsssssssg',
    'sgsssssssssssssssg',
    'sgsssssssssssssssg',
    'sgsssssssssssssssg',
    'sgsssssssssssssssg',
    'sssssssssssssssssg',
    'sssssssssssssssssg',
    'ggsssssssssssssssg',
    'ggsssssssssssssggg',
    'dddddddddddddddddd',
  ],
  blocked: [
    '############......',
    '#.................',
    '#.................',
    '#.................',
    '#.................',
    '#...#.......#.....',
    '#...#.......#.....',
    '#...#.......#.....',
    '#...#.......#.....',
    '#.................',
    '..................',
    '..................',
    '############....##',
    '############....##',
  ],
};

export const vanCortlandt = parseMap(VAN_CORTLANDT);


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

/**
 * "El piso de las Lizzies" — the only room in the game.
 *
 * The other three boards are places you fight across. This one is a place
 * people live in, and it is the first board that is won by leaving rather than
 * by clearing: the way out is the three tiles of landing at the top, and the
 * whole apartment is between you and them.
 *
 * It is small on purpose — twelve by ten, about seventy walkable squares
 * against a hundred and fifty outdoors — because a gun that reaches six tiles
 * turns anywhere bigger into one long corridor with nothing to hide behind.
 * What makes it playable is the partitions: walls at level 5, furniture at 3
 * and 4, and a pistol that cannot shoot through any of it. Every room has two
 * ways out, without exception — one woman standing in a single-tile doorway
 * would seal it, and there is no answer to that.
 *
 * North (row 0) at the top: the landing and the front door. Then the hall, the
 * living room with the sofa and the low table, the kitchen along the east wall,
 * the bedroom south-west and the back room south-east. The three Warriors start
 * one to a room, which is not a deployment so much as the trap already sprung.
 */
const LIZZIE_PLACE: MapSource = {
  name: 'El piso de las Lizzies',
  heights: [
    '555511155555',
    '544411111111',
    '511111111111',
    '544411444114',
    '533311445000',
    '511221343000',
    '511111343000',
    '544114444144',
    '522211441122',
    '522111111122',
  ],
  surfaces: [
    'ddddsssddddd',
    'dxxxmmmmmmmm',
    'dmmmmmmmmmmm',
    'ddddccdddssd',
    'dxxxccxdxsss',
    'dccxxcxdxsss',
    'dcccccxdxsss',
    'dddccddddcdd',
    'dxxxccxdccxx',
    'dxxcccccccxx',
  ],
  blocked: [
    '####...#####',
    '####........',
    '#...........',
    '####..###..#',
    '#.....###...',
    '#......##...',
    '#.....###...',
    '###..####.##',
    '#.....##....',
    '#...........',
  ],
};

export const lizziePlace = parseMap(LIZZIE_PLACE);

/**
 * "Coney Island" — the morning after, and the last board.
 *
 * The biggest and the emptiest, on purpose, right after the smallest and the
 * most walled-in. The beach faces south, so the boardwalk and everything behind
 * it run along the top, the sand fills the middle, and the water closes the
 * bottom — a hard edge that needs no wall.
 *
 * The problem this board had to solve is a revolver on open ground, where the
 * line of fire that saved the player in the Lizzies' flat has nothing to stop
 * it. The answer is that the cover here is knee-high. Every man on this beach
 * stands at level 1 and nobody ever climbs, so a blocked tile at level 3 — the
 * groyne posts, an upturned boat, driftwood, a concrete stump, the Rogues' own
 * car — is already taller than both ends of any shot and cuts the line dead.
 * It is the first board whose cover cannot hide a single sprite: spectacular
 * overhead, nothing at face height. Everything enormous — the Wonder Wheel, the
 * parachute jump, the Cyclone — stands off the board entirely, behind the
 * north edge, where it can be as big as it likes.
 */
const CONEY_ISLAND: MapSource = {
  name: 'Coney Island',
  heights: [
    '55555555555555555555',
    '55555555555555555555',
    '11144111113111144111',
    '11133111111113133111',
    '11122111111111122111',
    '11111145541131111111',
    '11111145541131111111',
    '11111111111111331111',
    '11111111111111111111',
    '11111111111131111111',
    '11111111111131111111',
    '11111111111111111111',
    '00000000000000000000',
    '00000000000000000000',
  ],
  surfaces: [
    'pppppppppppppppppppp',
    'pppppppppppppppppppp',
    'bbbppbbbbbsbbbbppbbb',
    'bbbppbbbbbbbbmbppbbb',
    'bbbppbbbbbbbbbbppbbb',
    'bbbbbbxxxxbbmbbbbbbb',
    'bbbbbbxxxxbbmbbbbbbb',
    'bbbbbbbbbbbbbbmmbbbb',
    'bbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbmbbbbbbb',
    'kkkkkkkkkkkkmkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkk',
    'wwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwww',
  ],
  blocked: [
    '....................',
    '....................',
    '..........#.........',
    '.............#......',
    '....................',
    '.......##...#.......',
    '.......##...#.......',
    '..............##....',
    '....................',
    '............#.......',
    '............#.......',
    '....................',
    '....................',
    '....................',
  ],
};

export const coneyIsland = parseMap(CONEY_ISLAND);

/**
 * "El baño de Union Square" - the night they stopped running and enjoyed it.
 *
 * The one board in this game with a roof, and the only one whose best square is
 * a hole. North (row 0) at the top:
 *   - A run of SEVEN CUBICLES along the north wall, each one tile, walled by a
 *     partition either side and by the wall behind. That is the whole board.
 *     Nobody flanks you in a cubicle, nobody gets behind you, and exactly one
 *     man at a time can reach you - which for a squad outnumbered in a room
 *     with no space is the best offer on the table. For five battles cover has
 *     been a thing you stand behind and height a thing you stand on. Here it is
 *     a hole you stand IN, and the only answer to a man in one is something
 *     that reaches further than an arm. That is what the chain is for.
 *   - THE WAY IN is three tiles of the east wall, and the Punks come through
 *     it. It is not an exit and nothing is won by using it; it is only where
 *     they are, so the room reads as a room with one end.
 *   - THE SINKS run down the WEST wall at level 3, and they are on that wall
 *     rather than the south for one reason: at the default camera the south and
 *     east faces are seen from behind. The cracked mirror is the best object in
 *     the room and it would have spent the whole battle facing away.
 *   - THE TROUGH takes the south wall instead, blocked, because a urinal read
 *     from behind loses nothing.
 *   - A RADIATOR and a BENCH at level 2: the two islands that CAN be climbed,
 *     so height is a choice rather than a bunker. The sinks at level 3 are the
 *     one place the leader can never follow you - Jump 1 does not do two steps
 *     - and they are deliberately at the far end from the door he comes in by.
 *
 * Everything else is open tiled floor, and it is big and dull on purpose. That
 * floor is where a man gets surrounded, and every good decision on this board
 * is about how long you can stay off it.
 *
 * The cubicles are not a clever reading of the scene, they are the scene: the
 * Warriors do not get cornered in that lavatory, Swan walks them into it and
 * they shut the doors. The gang that came to spring a trap walks into one.
 */
const UNION_SQUARE: MapSource = {
  name: 'El baño de Union Square',
  heights: [
    '5555555555555555',
    '5414141414141415',
    '5111111111111115',
    '5311111111111125',
    '5311111111111125',
    '5311111111111111',
    '5111111111111111',
    '5111111111111211',
    '5211111111111215',
    '5111111111111115',
    '5111133331111115',
    '5555555555555555',
  ],
  surfaces: [
    'ssssssssssssssss',
    'stttttttttttttts',
    'stttttttttttttts',
    'sxttttttttttttxs',
    'sxttttttttttttxs',
    'sxttttttttttttts',
    'stttttttttttttts',
    'sttttttttttttxts',
    'sttttttttttttxts',
    'stttttttttttttts',
    'stttttttttttttts',
    'ssssssssssssssss',
  ],
  blocked: [
    '################',
    '##.#.#.#.#.#.#.#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#...............',
    '#...............',
    '#...............',
    '##.............#',
    '#..............#',
    '#....####......#',
    '################',
  ],
};

export const unionSquare = parseMap(UNION_SQUARE);

