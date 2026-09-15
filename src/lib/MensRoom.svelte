<script module lang="ts">
  // El baño de Union Square — the whole lavatory, as one prop.
  //
  // Same house rules as the comfort station, the car, the flat and the beach:
  // three.js primitives only, no texture files, flat shading, high roughness,
  // metalness 0, and NOT ONE REAL LIGHT. What glows is emissive. And the same
  // reason as Furniture.svelte for being ONE component with eleven pieces on
  // `variant` rather than eleven files:
  //
  //   · One palette. A room lit by two fluorescent tubes has to agree with
  //     itself about what that light does to porcelain, to cast iron and to
  //     wood. Eleven files drift apart the first time somebody nudges a hex.
  //   · One PROPS key. A stage furnishes a whole lavatory by repeating one kind
  //     with different variants, the way the Orphans' block parks three cars.
  //   · One set of materials and geometries for the entire room. This board
  //     places about thirty of these — seven stall bays alone — and the Svelte
  //     compiler does NOT hoist a `new MeshStandardMaterial()` out of a plain
  //     <script>. So everything static lives in <script module> and every
  //     placement shares it. That is only safe because NOTHING in this file
  //     ever writes to a material: the car may do that (its fire gutters every
  //     frame) and this may not. There is no useTask here at all — a men's room
  //     does not move, so the room costs zero per-frame CPU.
  //
  // Authored FACING SOUTH (+Z), the way stages.ts documents props, so `turns`
  // means what it says. Every wall fixture in here has its BACK on local −Z and
  // projects toward +Z, which reads as: at turns 0 it hangs on the north wall.
  // The stage turns it — the sinks go against the south wall with turns 2, the
  // urinal against the west wall with turns 1, the radiator against the east
  // wall with turns 3. The three RUNS (sinks, radiator, bench) are authored
  // along local +X and the stage's `turns` swings the run north–south.
  //
  // `position` puts the group at the CENTRE of its footprint, at height·LEVEL,
  // and LOCAL y = 0 is that plane. Every piece here is placed at height 1 — the
  // floor of the room, world 0.25 — INCLUDING the pieces that dress a taller
  // terrain column (the partitions, the urinal pier, the bin) and the pieces
  // that cap an 'x' tile (the sinks, the radiator, the bench). That is the same
  // contract the parked cars use: the prop stands on the floor, and the map
  // raises the tiles its roof reaches. Authoring at +0.5 instead of 0 is the
  // documented past bug; do not.
  //
  // ---- WHAT 'x' (chapa) COSTS THIS FILE ------------------------------------
  //
  // Surface 'x' tells Terrain to skip its column entirely and sink a thin plate
  // 0.02 INTO the prop's own mesh. So the sinks, the radiator and the bench are
  // load-bearing: each must have a solid CLOSED body and a solid CLOSED top at
  // exactly the level the map claims, or the board shows straight through them.
  // That is why the bench carries an apron under its slats and the radiator a
  // cap over its columns, and it is why the basins are shallow lips proud of a
  // continuous counter instead of holes in it. A hole in an 'x' tile is a hole
  // in the board.
  //
  // Blocked tiles with a normal surface get a real terrain column, so the stall
  // partitions, the urinal pier and the bin are already solid masonry before
  // this file draws anything. Those three pieces are SKINS: they dress a face
  // the column cannot say anything about, and they never out-top it.
  //
  // ---- HEIGHTS, AND THIS IS THE IMPORTANT PART -----------------------------
  //
  // A fighter is 1.55. The camera sits at 30° by default and 53° raised, at 45°
  // of yaw, so a tile step toward the camera drops the sight line by
  // 0.707 · tan(30°) = 0.40 (0.93 raised). Read it as: a piece H tall hides, of
  // a man standing ONE TILE BEHIND it, everything below H − 0.40.
  //
  // H below is height above the floor the piece stands on — which is the floor
  // the man behind it is standing on too, so the subtraction is honest. The
  // world column is that plus 0.25, and it is there so the 1.00 ceiling can be
  // checked at a glance.
  //
  //   piece            H     world top   hides, of a man one tile behind
  //   wet             0.01     0.26      nothing. It is water on the floor.
  //   radiator        0.25     0.50      nothing (0.25 − 0.40 < 0). Stood ON.
  //   bench           0.25     0.50      nothing. Stood ON.
  //   bin             0.27     0.52      nothing
  //   urinal          0.34     0.59      nothing
  //   sinks           0.50     0.75      his ankles (0.10). Stood ON.
  //   stall door      0.60     0.85      his boot tops (0.20)
  //   stall partition 0.75     1.00      mid-thigh (0.35) — and this is TERRAIN
  //   tube            0.93     1.18      nothing: flat on a 1.25 wall
  //   graffiti        0.98     1.23      nothing: paint on a 1.25 wall
  //   pipes           1.00     1.25      a 0.14 column, flush with the wall head
  //
  // and the wires, which are the only things that break the 0.62 line without
  // being flat on a wall. Each is listed with the width that buys it the pass:
  //
  //   tap / spout     0.62   0.036 across   sinks
  //   flush feed      0.72   0.030 across   urinal
  //   hinge post      0.75   0.044 across   stalls
  //   mop handle      0.92   0.036 across   bin
  //
  // At the raised 53° every one of those numbers goes negative except the
  // partitions (0.75 − 0.93 < 0 too). Raise the camera and this room hides
  // nobody at all, which is the correct answer for a board whose whole subject
  // is where you may stand.
  //
  // THE RULE THIS FILE HOLDS: nothing above 0.62 may be WIDE, and nothing wide
  // may be above 0.62. The only things allowed past it are WIRES — a pipe, a
  // tap, a flush feed, a mop handle, a hinge post — each a few centimetres
  // across, and each cleared by one camera rotation. The 1.00 world ceiling is
  // inherited, not chosen: the terrain already draws the partitions at level 4,
  // and NOTHING of mine may out-top what the board itself put there.
  //
  // The one exemption, and it is geometric rather than a favour: a thing lying
  // FLAT ON A WALL THAT IS TALLER THAN IT cannot hide anybody, because the wall
  // already owns that silhouette and owns more of it. The four perimeter walls
  // are level 5 = 1.25. So the mirror, the tubes, the graffiti and the riser
  // are allowed their height on the strict condition that they stay inside
  // 1.25 and stay pinned to a wall face. Nothing here floats over the room.
  //
  // ---- THE HANGING DOORS, WHICH ARE THE HARD CASE --------------------------
  //
  // The doors matter more than anything else in this file — the Warriors are
  // behind them, and the Punks' leader puts a skate through one — and a door is
  // wide AND tall by nature, which is exactly what the rule forbids. Three
  // things solve it together:
  //
  //   1. LOW. The leaf runs 0.14 to 0.60 and no further. That is not a
  //      compromise, it is what a cubicle door actually is: a gap at the floor
  //      and a gap at the head. The gap at the floor is the point of the scene —
  //      it is where you see their boots — and the gap at the head is what
  //      keeps a 0.86-wide panel under the 0.62 line.
  //   2. SWUNG BACK. The hinge is on the partition's south-east corner and the
  //      door opens INTO the cubicle, so an open leaf lies flat against the
  //      partition's east face, in the western fifth of a tile that a player
  //      unit is standing in. Not into the aisle: a leaf swung into the aisle
  //      would lie across the one corridor nine men have to walk down.
  //   3. THE SWING RANGE IS BOUNDED BY THE SPRITE, NOT BY TASTE. Seven player
  //      units START inside these cubicles. Past 90° the leaf is inside the
  //      partition column; below about 74° its free edge starts crossing the
  //      tile centre where a sprite stands. So the open doors live in 74°–90°,
  //      and the variety comes from elsewhere: one bay in five is left barely
  //      AJAR instead (14°–25°), which puts the leaf across the opening at
  //      shin height with a man's boots showing under it, and one door in
  //      seven hangs sagging off its bottom hinge, caught.
  //
  // ---- PALETTE -------------------------------------------------------------
  //
  // A 1970s New York subway lavatory under fluorescent tubes. The floor is
  // given: grid.ts paints 'tile' at #7d8a80 over #4e5852, institutional green
  // gone grey, black in the grout lines. The danger is that the room reads as
  // one grey box, and the answer is that the three NON-CERAMIC families each
  // land on their own island, far apart in value, because a player has to tell
  // his safe squares apart at a glance and two of those three are squares he
  // can stand on:
  //
  //   porcelain  #d9d3bc   the lightest thing in the room by a distance. White
  //                        gone yellow — fifteen years of it. The sinks read
  //                        from the far end of the board.
  //   cast iron  #26272b   the darkest. The radiator, the riser, the bench
  //                        frame. Near-black, never black.
  //   pine       #a87c45   the only warm thing in here besides rust. Pushed a
  //                        step lighter than a real bench slat would be, because
  //                        at #8a6237 it lands on the floor's own value and a
  //                        bench you can stand on must not share a value with
  //                        the floor you are standing on. The black frame under
  //                        it does the rest of the work.
  //
  // The ceramic sits between them at #8a968c (wall) over #6d7a71 (dado), a step
  // lighter than the floor because the wall is what the tubes actually hit. The
  // stall enamel #4c6a5c is the same green pushed saturated and dark: it is the
  // only large painted surface in here, and it has to read AGAINST the ceramic
  // rather than with it, or the cubicles disappear into the walls they are
  // bolted to. Rust #7d452a is the joint between the iron island and the wood
  // one, which is why it is allowed on both.

  import {
    BoxGeometry,
    CylinderGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
    RingGeometry,
  } from 'three';
  import { hash2D } from './grid';

  /** Variant index per piece, so a stage names a urinal instead of guessing a 2. */
  export const PIECE = {
    stalls: 0,
    sinks: 1,
    urinal: 2,
    radiator: 3,
    bench: 4,
    tube: 5,
    tubeDead: 6,
    bin: 7,
    pipes: 8,
    graffiti: 9,
    wet: 10,
  } as const;

  /**
   * What the map has to agree with. The mesh is decoration, the '#' is the rule
   * — so `w`/`d` here are the footprint the PropPlacement must declare, `top` is
   * the height of the highest solid part ABOVE THE FLOOR IT STANDS ON (add 0.25
   * for world, since every one of these is placed at height 1), and `steps` says
   * whether the piece was built to be stood on.
   *
   * `caps` marks the three pieces that are the top of an 'x' tile: their map
   * tiles must be raised to exactly `top` in levels (sinks → 3, radiator and
   * bench → 2) and marked 'x', or the terrain draws a column through them.
   *
   * `wall` marks the pieces that are flat on a wall face and therefore have no
   * silhouette of their own; they need no footprint of their own either, only a
   * floor tile to hang from with the wall behind it.
   */
  export const PIECE_SPECS = {
    stalls: { name: 'Cubículos', w: 2, d: 1, top: 0.75, steps: false, caps: false, wall: false },
    sinks: { name: 'Lavabos', w: 3, d: 1, top: 0.5, steps: true, caps: true, wall: false },
    urinal: { name: 'Urinario', w: 1, d: 1, top: 0.34, steps: false, caps: false, wall: false },
    radiator: { name: 'Radiador', w: 1, d: 2, top: 0.25, steps: true, caps: true, wall: true },
    bench: { name: 'Banco', w: 1, d: 2, top: 0.25, steps: true, caps: true, wall: false },
    tube: { name: 'Fluorescente', w: 2, d: 1, top: 0.93, steps: false, caps: false, wall: true },
    tubeDead: { name: 'Fluorescente fundido', w: 2, d: 1, top: 0.93, steps: false, caps: false, wall: true },
    bin: { name: 'Bote de basura', w: 1, d: 1, top: 0.27, steps: false, caps: false, wall: false },
    pipes: { name: 'Bajante', w: 1, d: 1, top: 1.0, steps: false, caps: false, wall: true },
    graffiti: { name: 'Pintas', w: 1, d: 1, top: 0.98, steps: false, caps: false, wall: true },
    wet: { name: 'Charco', w: 1, d: 1, top: 0.01, steps: true, caps: false, wall: false },
  } as const;

  const PIECE_COUNT = Object.keys(PIECE).length;

  // ---- Materials ----------------------------------------------------------
  // One set for the whole room. Two tones on everything with a horizontal face,
  // for the reason the car's roof taught us: from this camera the tops of things
  // are most of what you see, so the tops carry the shape and the flanks carry
  // the colour. metalness is written out even where three would default it,
  // because a men's room full of chrome is exactly the file where somebody
  // would eventually be tempted.

  const ceramic = new MeshStandardMaterial({
    color: '#8a968c',
    roughness: 0.85,
    metalness: 0,
    flatShading: true,
  });
  // The dado course, waist-high, darker — the band every one of these rooms had
  // so the splashes did not show. It is also what stops a wall being one flat
  // sheet of paint when there is nothing else on it.
  const ceramicDado = new MeshStandardMaterial({
    color: '#6d7a71',
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
  const grout = new MeshStandardMaterial({
    color: '#2a3130',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  // Porcelain, and the lightest thing on the board. Three tones: the lit top,
  // the flank, and the stain that collects under every lip in the room.
  const porcelain = new MeshStandardMaterial({
    color: '#d9d3bc',
    roughness: 0.6,
    metalness: 0,
    flatShading: true,
  });
  const porcelainShade = new MeshStandardMaterial({
    color: '#bdb59a',
    roughness: 0.7,
    metalness: 0,
    flatShading: true,
  });
  const porcelainStain = new MeshStandardMaterial({
    color: '#9a8f72',
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });

  const iron = new MeshStandardMaterial({
    color: '#26272b',
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });
  const ironTop = new MeshStandardMaterial({
    color: '#3a3c42',
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
  const rust = new MeshStandardMaterial({
    color: '#7d452a',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  const plank = new MeshStandardMaterial({
    color: '#a87c45',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const plankSide = new MeshStandardMaterial({
    color: '#6b4c28',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  // Stall enamel, in two ages. Every bay picks one of the two from its own
  // position, so a run of seven cubicles is not seven copies of one door.
  const enamel = new MeshStandardMaterial({
    color: '#4c6a5c',
    roughness: 0.8,
    metalness: 0,
    flatShading: true,
  });
  const enamelWorn = new MeshStandardMaterial({
    color: '#5c7366',
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
  const enamelDark = new MeshStandardMaterial({
    color: '#3b5449',
    roughness: 0.85,
    metalness: 0,
    flatShading: true,
  });
  const ENAMELS = [enamel, enamelWorn];

  const galv = new MeshStandardMaterial({
    color: '#8d9298',
    roughness: 0.55,
    metalness: 0,
    flatShading: true,
  });
  // Every hole in the room shares one near-black: the mouth of the bin, the
  // trough's water line, the shard missing out of the mirror. Never pure black —
  // that reads as a tear in the board rather than as a dark place.
  const gloom = new MeshStandardMaterial({ color: '#141719', roughness: 1, metalness: 0 });

  // Mirror glass. Not a real reflection and it must not pretend to be one: it is
  // the one low-roughness surface in the room, which under this rig makes it
  // read as glass and nothing else.
  const mirrorGlass = new MeshStandardMaterial({
    color: '#9fb0ae',
    roughness: 0.18,
    metalness: 0,
    flatShading: true,
  });
  const crackLine = new MeshStandardMaterial({ color: '#232b2d', roughness: 1, metalness: 0 });

  // ---- What is lit --------------------------------------------------------
  // Emissive, never a light. Tuned for NoToneMapping, which is what the canvas
  // runs: a fluorescent tube is the coldest light in this game and the only one
  // allowed to clip, because that is what a bare tube does — it is a white line
  // with a green cast, not a lamp with a glow around it.

  const tubeGlow = new MeshStandardMaterial({
    color: '#f2fbee',
    emissive: '#cfe6d2',
    emissiveIntensity: 1.55,
    roughness: 0.4,
    metalness: 0,
  });
  // The dead one. Same fitting, same cage, no emissive at all — a cold grey rod
  // with blackened ends. A lit half of the room and a dark half costs nothing
  // and says everything, and it says it without one extra draw call.
  const tubeDeadSkin = new MeshStandardMaterial({
    color: '#4a5450',
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
  const tubeBurnt = new MeshStandardMaterial({
    color: '#1e2422',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  // ---- Paint on the tile --------------------------------------------------
  // Marker, spray and scratched-in. 1979 New York: this room is covered, and
  // every one of these is a flat quad 12 mm proud of a wall that is taller than
  // it — zero silhouette, zero cost, and the single loudest thing in the file.

  const MARK_COLORS = ['#1a1a1e', '#b9bec4', '#c0392b', '#e8c33c', '#3f7fb0', '#c25a84'];
  const markMaterials = MARK_COLORS.map(
    (c) => new MeshStandardMaterial({ color: c, roughness: 1, metalness: 0 })
  );

  // ---- The wet floor ------------------------------------------------------
  // Unlit plates, the same trick the burning car uses for its reach and the
  // lampshade for its pool. THE HEIGHT IS A CONTRACT, not a taste: the game's
  // own tile overlays lift at 0.02 (movement), 0.03 (reach), 0.045 (burst) and
  // 0.055 (the way out), and a prop that draws over a blue movement panel has
  // broken the board. So the puddle lives at 0.010–0.013, under all four, with
  // depthWrite off so it never punches a hole in what is drawn after it, and
  // renderOrder 0 against the overlays' 1 so the sort order agrees with the
  // geometry instead of arguing with it.
  const WET_ORDER = 0;

  const wetFilm = new MeshBasicMaterial({
    color: '#2f4a52',
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const wetSheen = new MeshBasicMaterial({
    color: '#8fb0b4',
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const wetPrint = new MeshBasicMaterial({
    color: '#243338',
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });

  // ---- Cubículos (2×1: one partition + the pocket east of it) -------------
  // The stage repeats this bay at x = 1, 3, 5 … 13 on row 1. Local x = −0.5 is
  // the partition (terrain, blocked, level 4); local x = +0.5 is the pocket a
  // player unit starts in. Everything below is a SKIN on that column or a door
  // hung off its corner — the masonry is already there.

  const PART_TOP = 0.75; // the terrain column's top, in local units. World 1.00.
  const DOOR_BOTTOM = 0.14; // the gap their boots show in
  const DOOR_TOP = 0.6; // and the gap over the head that keeps this legal
  const DOOR_W = 0.86;
  const DOOR_H = DOOR_TOP - DOOR_BOTTOM;
  const DOOR_MID = (DOOR_BOTTOM + DOOR_TOP) / 2;
  // The hinge stands 30 mm off the partition face so a door swung to a full 90°
  // lies BESIDE the panel skin instead of inside it.
  const HINGE_X = 0.03;

  const partitionSkinGeometry = new BoxGeometry(0.96, PART_TOP - 0.12, 0.03);
  const partitionSideGeometry = new BoxGeometry(0.03, PART_TOP - 0.12, 0.96);
  const partitionKickGeometry = new BoxGeometry(0.96, 0.12, 0.05);
  // A head rail flush with the column top — it gives the partition a lip
  // without adding a millimetre to the silhouette the board already drew.
  const partitionRailGeometry = new BoxGeometry(0.99, 0.05, 0.08);

  // The leaf is pushed +X off the origin so the mesh's own rotation.y reads as
  // the swing angle instead of as an arithmetic puzzle. Same trick as the
  // record player's lid.
  const doorLeafGeometry = new BoxGeometry(DOOR_W, DOOR_H, 0.045).translate(DOOR_W / 2, 0, 0);
  const doorRailGeometry = new BoxGeometry(DOOR_W - 0.05, 0.055, 0.062).translate(DOOR_W / 2, 0, 0);
  const doorTagGeometry = new BoxGeometry(0.3, 0.1, 0.012).translate(DOOR_W / 2, 0, 0);
  const doorLatchGeometry = new CylinderGeometry(0.022, 0.022, 0.05, 6).rotateX(Math.PI / 2);
  const hingePostGeometry = new CylinderGeometry(0.022, 0.022, PART_TOP - 0.12, 6);
  const hingeKnuckleGeometry = new CylinderGeometry(0.034, 0.034, 0.045, 6);
  const hookGeometry = new BoxGeometry(0.035, 0.05, 0.035);

  // ---- Lavabos (3×1, capping level 3) -------------------------------------
  // Deck at exactly 0.50 local = world 0.75 = level 3, where the chapa plate
  // sinks 20 mm in. The body under it is CLOSED, because the map has told the
  // terrain not to draw a column here and an open pedestal would be a window
  // through the board.
  //
  // The basins are lips 16 mm proud of a continuous counter rather than holes
  // in it, for the same reason. A man is going to stand on this.

  const SINK_DECK = 0.5;
  const SINK_W = 2.92;
  const SINK_D = 0.62;

  const sinkBodyGeometry = new BoxGeometry(SINK_W - 0.12, SINK_DECK - 0.08, SINK_D - 0.1);
  const sinkDeckGeometry = new BoxGeometry(SINK_W, 0.08, SINK_D);
  const sinkStainGeometry = new BoxGeometry(SINK_W + 0.02, 0.07, 0.05);
  const bowlRimGeometry = new CylinderGeometry(0.21, 0.21, 0.03, 14);
  const bowlWellGeometry = new CylinderGeometry(0.16, 0.16, 0.012, 12);
  const spoutGeometry = new CylinderGeometry(0.018, 0.018, 0.11, 6);
  const spoutArmGeometry = new BoxGeometry(0.028, 0.028, 0.1);
  const tapHeadGeometry = new CylinderGeometry(0.034, 0.028, 0.022, 6);
  const tapStemGeometry = new CylinderGeometry(0.014, 0.014, 0.05, 6);

  const SINK_BOWLS = [-0.96, 0, 0.96];

  // The dado behind the run, and the mirror over it. Both are flat on a wall
  // that is level 5 = 1.25, so both are free: the wall already owns every pixel
  // of silhouette they could ever take.
  const splashbackGeometry = new BoxGeometry(SINK_W, 0.12, 0.025);
  const mirrorFrameGeometry = new BoxGeometry(2.62, 0.4, 0.04);
  const mirrorGlassGeometry = new BoxGeometry(2.52, 0.34, 0.02);
  const MIRROR_Y = 0.8; // 0.60 → 1.00 local, world 0.85 → 1.25, flush with the wall head

  /**
   * Vermin goes through this in the film, so it is authored already broken: one
   * impact point and the star out of it. Kept inside ±0.45 rad so no arm of the
   * star runs out of a glass only 0.34 tall.
   */
  const CRACKS = [
    { x: 0.04, y: 0.0, len: 0.7, a: 0.26 },
    { x: -0.02, y: 0.01, len: 0.62, a: -0.34 },
    { x: 0.1, y: -0.02, len: 0.5, a: 0.45 },
    { x: -0.16, y: 0.03, len: 0.44, a: -0.08 },
    { x: 0.36, y: -0.03, len: 0.36, a: 0.18 },
    { x: -0.42, y: 0.04, len: 0.3, a: -0.42 },
  ];
  const crackGeometries = CRACKS.map((c) => new BoxGeometry(c.len, 0.016, 0.012));
  const shardGeometry = new BoxGeometry(0.17, 0.13, 0.014);

  // ---- Urinario (1×1, hung off a blocked level-3 pier) --------------------
  // The map draws a solid tile column at x = 1 for four rows, and that column
  // fills its square from edge to edge up to 0.50. So this is the one piece in
  // the file whose mounting face is its OWN tile's +Z boundary rather than the
  // wall at −Z: a trough recessed into the pier would be buried inside it, so
  // the trough hangs off the pier's front and overhangs the tile in front of it
  // by 0.26 — which is what a wall urinal does, and it stops 0.24 short of the
  // square's centre, so it never lands on a sprite. Authored full-tile wide, so
  // four of them butt up into one continuous run.

  const PIER_TOP = 0.5; // world 0.75, the blocked column's top
  const TROUGH_RIM = 0.34;
  const PIER_FACE = 0.5; // local z of the pier's front, where all of this hangs

  const troughBackGeometry = new BoxGeometry(0.98, PIER_TOP - 0.04, 0.03);
  const troughBodyGeometry = new BoxGeometry(0.98, 0.24, 0.22);
  const troughLipGeometry = new BoxGeometry(0.98, 0.05, 0.28);
  const troughWellGeometry = new BoxGeometry(0.88, 0.02, 0.18);
  const troughFootGeometry = new BoxGeometry(0.98, 0.05, 0.2);
  const flushRunGeometry = new BoxGeometry(0.98, 0.03, 0.03);
  const flushRiserGeometry = new CylinderGeometry(0.02, 0.02, 0.24, 6);
  const flushSpreaderGeometry = new BoxGeometry(0.9, 0.022, 0.022);

  // ---- Radiador (1×2, capping level 2) ------------------------------------
  // Authored as a run along local +X; the stage turns it so the run lies
  // north–south against the east wall. Cap at exactly 0.25 local = world 0.50 =
  // level 2, because somebody stands on this. The columns are decoration ON a
  // closed box, not the box itself — cast iron sections with daylight between
  // them would be a hole in an 'x' tile.

  const RAD_TOP = 0.25;
  const RAD_LEN = 1.9;
  const RAD_D = 0.42;

  const radBodyGeometry = new BoxGeometry(RAD_LEN, RAD_TOP - 0.06, RAD_D);
  const radCapGeometry = new BoxGeometry(RAD_LEN + 0.08, 0.06, RAD_D + 0.08);
  const radColumnGeometry = new CylinderGeometry(0.048, 0.048, RAD_TOP - 0.07, 8);
  const radFootGeometry = new BoxGeometry(0.1, 0.035, RAD_D + 0.06);
  const radValveGeometry = new CylinderGeometry(0.028, 0.028, 0.09, 6);
  const radHandleGeometry = new CylinderGeometry(0.045, 0.045, 0.024, 6);
  const radFeedGeometry = new CylinderGeometry(0.026, 0.026, 0.3, 6);
  const radRustGeometry = new BoxGeometry(0.22, 0.1, 0.014);

  const RAD_COLUMNS = Array.from({ length: 13 }, (_, i) => -0.84 + i * 0.14);
  const RAD_RUST = [
    { x: -0.62, y: 0.07 },
    { x: 0.1, y: 0.11 },
    { x: 0.71, y: 0.06 },
  ];

  // ---- Banco (1×2, capping level 2) ---------------------------------------
  // Also a run along local +X, also capped at 0.25. Pine slats on an iron
  // frame over a CLOSED apron — the apron is not styling, it is the thing that
  // stops the board showing through an 'x' tile from underneath.
  //
  // The slat gaps are 22 mm and they open onto a sub-deck 60 mm down, so the
  // deck is closed twice over. The terrain's own chapa plate sits in that gap
  // at 0.23, and the plate's colour is #14161b — which means the board draws
  // the shadow line between the planks for free.

  const BENCH_TOP = 0.25;
  const BENCH_LEN = 1.9;
  const BENCH_D = 0.56;

  const benchApronGeometry = new BoxGeometry(BENCH_LEN - 0.14, 0.11, BENCH_D - 0.14);
  const benchSubDeckGeometry = new BoxGeometry(BENCH_LEN - 0.02, 0.06, BENCH_D);
  const benchPlankGeometry = new BoxGeometry(BENCH_LEN - 0.14, 0.06, 0.16);
  const benchCheekGeometry = new BoxGeometry(0.07, BENCH_TOP, BENCH_D);
  const benchBraceGeometry = new BoxGeometry(BENCH_LEN, 0.035, 0.05);
  const benchPlankEndGeometry = new BoxGeometry(0.03, 0.06, 0.16);

  const BENCH_PLANKS = [-0.18, 0, 0.18];

  // ---- Fluorescente (2×1, on a wall) --------------------------------------
  // The light of the scene, and it hangs on a WALL, never over the room. A
  // strip slung across the aisle at head height would put a bar through every
  // man's chest at two of the four yaws; a strip bolted to a 1.25 wall at 1.18
  // cannot hide anybody at all, because the wall behind it is taller. That is
  // the whole argument, and it is why the fitting is flat-backed.

  const TUBE_Y = 0.85;
  const TUBE_LEN = 1.66;

  const tubeChannelGeometry = new BoxGeometry(1.8, 0.1, 0.05);
  const tubeStripGeometry = new BoxGeometry(TUBE_LEN, 0.075, 0.075);
  const tubeCapGeometry = new BoxGeometry(0.05, 0.09, 0.09);
  const tubeHoopSideGeometry = new BoxGeometry(0.014, 0.13, 0.014);
  const tubeHoopBarGeometry = new BoxGeometry(0.014, 0.014, 0.16);
  const tubeGuardGeometry = new BoxGeometry(TUBE_LEN, 0.014, 0.014);
  const tubeConduitGeometry = new CylinderGeometry(0.016, 0.016, 0.2, 6);

  const TUBE_HOOPS = [-0.7, -0.35, 0, 0.35, 0.7];

  // ---- Bote de basura (1×1, skinning a blocked level-2 column) ------------
  // A tapered square hopper sized to swallow the column whole — 0.99 across the
  // flats against the terrain plate's 0.965, so no corner of masonry shows
  // under a galvanised bin.
  //
  // The mop leans OUT of the bin rather than standing in a bucket beside it,
  // and that is a rule rather than a flourish: a bucket would be a solid object
  // standing on a walkable tile with nothing in the blocked layer to back it
  // up, which is the exact mismatch stages.ts warns about. A handle over the
  // rim is a 36 mm wire and lies about nothing.

  const BIN_TOP = 0.27;

  const binBodyGeometry = new CylinderGeometry(0.7, 0.62, BIN_TOP, 4)
    .rotateY(Math.PI / 4)
    .translate(0, BIN_TOP / 2, 0);
  const binRimGeometry = new CylinderGeometry(0.72, 0.72, 0.035, 4).rotateY(Math.PI / 4);
  const binMouthGeometry = new CylinderGeometry(0.6, 0.6, 0.02, 4).rotateY(Math.PI / 4);
  const binBandGeometry = new CylinderGeometry(0.69, 0.69, 0.025, 4).rotateY(Math.PI / 4);
  const sackGeometry = new BoxGeometry(0.34, 0.18, 0.28);
  const mopHandleGeometry = new CylinderGeometry(0.018, 0.018, 0.78, 6);
  const mopHeadGeometry = new BoxGeometry(0.15, 0.13, 0.11);

  // ---- Bajante (1×1, a corner) --------------------------------------------
  // A wire, by the rule: 140 mm across. It runs to exactly 1.00 local = world
  // 1.25, flush with the head of the walls, which is what a riser does — it
  // goes up through the ceiling and out of the scene. One camera rotation
  // clears it, and it is the only thing in the room that touches the ceiling
  // line at all.

  const PIPE_TOP = 1.0;

  const stackGeometry = new CylinderGeometry(0.07, 0.07, PIPE_TOP, 12).translate(
    0,
    PIPE_TOP / 2,
    0
  );
  const feedGeometry = new CylinderGeometry(0.026, 0.026, PIPE_TOP - 0.1, 8).translate(
    0,
    (PIPE_TOP - 0.1) / 2,
    0
  );
  const collarGeometry = new CylinderGeometry(0.086, 0.086, 0.06, 12);
  // Reaches from the stack's back all the way to the wall face, so the riser
  // reads as bolted to the tile rather than as leaning against it.
  const bracketGeometry = new BoxGeometry(0.05, 0.035, 0.15);
  const pipeBaseGeometry = new BoxGeometry(0.22, 0.03, 0.22);
  const bossGeometry = new CylinderGeometry(0.055, 0.055, 0.075, 8).rotateZ(Math.PI / 2);
  const weepGeometry = new BoxGeometry(0.17, 0.66, 0.012);

  const PIPE_COLLARS = [0.18, 0.54, 0.9];

  // ---- Pintas (1×1, on a wall) --------------------------------------------
  // Ten marks in the pool; each bay takes five of them by its own position, so
  // four graffiti bays differ from each other and are identical on every
  // reload. That last half is the point: this is the board about learning where
  // you can stand, and a room that reshuffles between restarts cannot be
  // learned.

  const MARKS = [
    { w: 0.54, h: 0.09, x: -0.06, y: 0.72, tilt: -0.06, c: 0 },
    { w: 0.3, h: 0.14, x: 0.24, y: 0.52, tilt: 0.1, c: 1 },
    { w: 0.42, h: 0.07, x: -0.18, y: 0.4, tilt: 0.04, c: 2 },
    { w: 0.2, h: 0.2, x: 0.28, y: 0.8, tilt: -0.12, c: 3 },
    { w: 0.36, h: 0.05, x: 0.02, y: 0.28, tilt: 0.02, c: 4 },
    { w: 0.16, h: 0.11, x: -0.34, y: 0.62, tilt: 0.18, c: 5 },
    { w: 0.46, h: 0.12, x: 0.08, y: 0.9, tilt: 0.05, c: 1 },
    { w: 0.24, h: 0.08, x: -0.28, y: 0.86, tilt: -0.08, c: 2 },
    { w: 0.12, h: 0.24, x: 0.36, y: 0.36, tilt: 0.0, c: 0 },
    { w: 0.32, h: 0.06, x: -0.1, y: 0.2, tilt: -0.03, c: 3 },
  ];
  const markGeometries = MARKS.map((m) => new BoxGeometry(m.w, m.h, 0.012));
  const MARK_PICKS = 5;
  // Somebody from the MTA painted over this bay once, in fresh ceramic green
  // that never matched the tile around it, and then it got tagged again inside
  // a fortnight. Two bays in five carry the patch — it is the cheapest way to
  // say the room is not merely dirty, it is losing.
  const patchGeometry = new BoxGeometry(0.72, 0.56, 0.01);
  const scratchGeometry = new BoxGeometry(0.34, 0.01, 0.01);
  const SCRATCHES = [
    { x: -0.24, y: 0.56 },
    { x: 0.12, y: 0.66 },
    { x: 0.2, y: 0.34 },
  ];

  // ---- Charco (1×1) -------------------------------------------------------
  // Three flat discs and two boot prints, all under 0.013. See WET_ORDER above
  // for why that number is not negotiable.

  const puddleGeometries = [
    new RingGeometry(0, 0.44, 12).rotateX(-Math.PI / 2),
    new RingGeometry(0, 0.3, 10).rotateX(-Math.PI / 2),
    new RingGeometry(0, 0.19, 9).rotateX(-Math.PI / 2),
  ];
  const sheenGeometry = new RingGeometry(0.1, 0.22, 12).rotateX(-Math.PI / 2);
  const printGeometry = new BoxGeometry(0.16, 0.004, 0.26);

  // ---- The rolls ----------------------------------------------------------
  // Keyed exactly the way Furniture keys its trim: the placement's own world
  // position, quantised to quarter-tiles. Same square, same room, every time.
  const SEEDS = [19, 23, 29, 31, 37, 41, 43, 47];
</script>

<script lang="ts">
  import { T } from '@threlte/core';

  let {
    position = [0, 0, 0],
    rotation = 0,
    variant = 0,
  }: {
    position?: [number, number, number];
    rotation?: number;
    variant?: number;
  } = $props();

  const piece = $derived(((variant % PIECE_COUNT) + PIECE_COUNT) % PIECE_COUNT);

  /** The two tube variants share every mesh; only the rod and its end caps
      change, so a dead fitting costs exactly nothing over a live one. */
  const tubeLit = $derived(piece === PIECE.tube);

  /** Eight deterministic rolls for this placement, from where it stands. */
  const roll = $derived.by(() => {
    const kx = Math.round(position[0] * 4);
    const kz = Math.round(position[2] * 4);
    return SEEDS.map((s) => hash2D(kx, kz, s));
  });

  /**
   * This bay's door. Two populations rather than one spread: mostly swung back
   * flat against the partition (74°–90°, the only band that clears a sprite
   * standing in the cubicle), and one bay in five left barely ajar instead —
   * which is the door with a man still behind it.
   *
   * `sag` is the one the Punks' leader caught a skate on: it hangs off its
   * bottom hinge, so the free edge drops 45 mm and swings out. Nested inside
   * the swing group, because a tilt has to happen about the LEAF's own axis and
   * a single Euler cannot say that.
   */
  const door = $derived.by(() => {
    const ajar = roll[0] < 0.2;
    return {
      swing: ajar ? 0.24 + roll[1] * 0.2 : 1.3 + roll[1] * 0.27,
      sag: roll[2] < 0.15 ? -0.1 : 0,
      skin: ENAMELS[roll[3] < 0.5 ? 0 : 1],
      hook: roll[4] < 0.55,
      tag: markMaterials[Math.floor(roll[5] * MARK_COLORS.length) % MARK_COLORS.length],
    };
  });

  /** Which five marks this bay of wall wears, and how far each one slid. */
  const marks = $derived.by(() => {
    const start = Math.floor(roll[0] * MARKS.length) % MARKS.length;
    return Array.from({ length: MARK_PICKS }, (_, k) => {
      const i = (start + k * 3) % MARKS.length;
      const j = roll[(k + 1) % roll.length];
      return {
        i,
        x: MARKS[i].x + (j - 0.5) * 0.08,
        y: MARKS[i].y + (roll[(k + 3) % roll.length] - 0.5) * 0.07,
        tilt: MARKS[i].tilt + (j - 0.5) * 0.12,
      };
    });
  });

  /** Where this puddle spilled to, and which way somebody walked out of it. */
  const puddle = $derived.by(() =>
    puddleGeometries.map((g, i) => ({
      g,
      x: (roll[i] - 0.5) * 0.34,
      z: (roll[i + 3] - 0.5) * 0.34,
      y: 0.01 + i * 0.0015,
    }))
  );
</script>

<T.Group {position} rotation.y={rotation}>
  {#if piece === PIECE.stalls}
    <!-- The partition is terrain. These four meshes are its clothes: an enamel
         panel on the face the aisle sees, one on each cubicle side, an iron
         kick at the floor and a head rail flush with the column top. Nothing
         here adds a millimetre to what the board already drew. -->
    <T.Mesh geometry={partitionKickGeometry} material={iron} position={[-0.5, 0.06, 0.52]} />
    <T.Mesh
      geometry={partitionSkinGeometry}
      material={door.skin}
      position={[-0.5, 0.435, 0.515]}
      castShadow
    />
    <T.Mesh geometry={partitionSideGeometry} material={enamelDark} position={[-0.015, 0.435, 0]} />
    <T.Mesh geometry={partitionSideGeometry} material={enamelDark} position={[-0.985, 0.435, 0]} />
    <T.Mesh geometry={partitionRailGeometry} material={ironTop} position={[-0.5, 0.725, 0.48]} />

    <T.Mesh geometry={hingePostGeometry} material={iron} position={[HINGE_X, 0.435, 0.5]} />
    <T.Mesh geometry={hingeKnuckleGeometry} material={ironTop} position={[HINGE_X, 0.2, 0.5]} />
    <T.Mesh geometry={hingeKnuckleGeometry} material={ironTop} position={[HINGE_X, 0.55, 0.5]} />

    <!-- The door. Hinged on the partition's south-east corner and opening into
         the cubicle, 0.14 to 0.60 — feet under it, air over it. -->
    <T.Group position={[HINGE_X, 0, 0.5]} rotation.y={door.swing}>
      <T.Group rotation.z={door.sag}>
        <T.Mesh
          geometry={doorLeafGeometry}
          material={door.skin}
          position={[0, DOOR_MID, 0]}
          castShadow
        />
        <T.Mesh
          geometry={doorRailGeometry}
          material={enamelDark}
          position={[0, DOOR_BOTTOM + 0.05, 0]}
        />
        <T.Mesh geometry={doorRailGeometry} material={enamelDark} position={[0, DOOR_TOP - 0.05, 0]} />
        <T.Mesh geometry={doorTagGeometry} material={door.tag} position={[0, DOOR_MID, 0.03]} />
        <T.Mesh
          geometry={doorLatchGeometry}
          material={galv}
          position={[DOOR_W - 0.07, DOOR_MID + 0.06, 0]}
        />
        {#if door.hook}
          <T.Mesh geometry={hookGeometry} material={galv} position={[DOOR_W * 0.4, DOOR_TOP - 0.1, 0.04]} />
        {/if}
      </T.Group>
    </T.Group>
  {:else if piece === PIECE.sinks}
    <!-- Closed body, closed deck, because this tile has no terrain column of
         its own. Everything below 0.50 is inside the box and never seen; the
         board reads the counter and the three lips on it. -->
    <T.Mesh
      geometry={sinkBodyGeometry}
      material={porcelainShade}
      position={[0, (SINK_DECK - 0.08) / 2, 0]}
      castShadow
      receiveShadow
    />
    <T.Mesh
      geometry={sinkDeckGeometry}
      material={porcelain}
      position={[0, SINK_DECK - 0.04, 0]}
      castShadow
      receiveShadow
    />
    <!-- Fifteen years of drip under the front lip. It is the only reason a
         white counter under a cold tube does not go to pure glare. -->
    <T.Mesh
      geometry={sinkStainGeometry}
      material={porcelainStain}
      position={[0, SINK_DECK - 0.11, SINK_D / 2 - 0.035]}
    />

    {#each SINK_BOWLS as bx, i (i)}
      <T.Mesh geometry={bowlRimGeometry} material={porcelain} position={[bx, SINK_DECK + 0.001, 0.03]} />
      <T.Mesh geometry={bowlWellGeometry} material={porcelainStain} position={[bx, SINK_DECK + 0.003, 0.03]} />
      <T.Mesh geometry={spoutGeometry} material={galv} position={[bx, SINK_DECK + 0.055, -0.21]} />
      <T.Mesh geometry={spoutArmGeometry} material={galv} position={[bx, SINK_DECK + 0.105, -0.16]} />
      {#each [-1, 1] as side (side)}
        <T.Mesh
          geometry={tapStemGeometry}
          material={galv}
          position={[bx + side * 0.11, SINK_DECK + 0.025, -0.22]}
        />
        <T.Mesh
          geometry={tapHeadGeometry}
          material={galv}
          position={[bx + side * 0.11, SINK_DECK + 0.055, -0.22]}
        />
      {/each}
    {/each}

    <!-- Dado, then the mirror. Both flat on a level-5 wall, both therefore
         free: the wall behind them is 1.25 and already owns that silhouette. -->
    <T.Mesh geometry={splashbackGeometry} material={ceramicDado} position={[0, SINK_DECK + 0.06, -0.482]} />
    <T.Mesh geometry={mirrorFrameGeometry} material={iron} position={[0, MIRROR_Y, -0.47]} />
    <T.Mesh geometry={mirrorGlassGeometry} material={mirrorGlass} position={[0, MIRROR_Y, -0.443]} />

    {#each CRACKS as c, i (i)}
      <T.Mesh
        geometry={crackGeometries[i]}
        material={crackLine}
        position={[c.x, MIRROR_Y + c.y, -0.431]}
        rotation.z={c.a}
      />
    {/each}
    <!-- The shard that is not there any more. -->
    <T.Mesh geometry={shardGeometry} material={gloom} position={[0.05, MIRROR_Y - 0.01, -0.43]} rotation.z={0.22} />
  {:else if piece === PIECE.urinal}
    <!-- A trough on the FRONT of a pier the terrain already built, because the
         pier fills its own square. The splashback stops dead at the pier's own
         top, so this piece adds nothing tall to the board. -->
    <T.Mesh
      geometry={troughBackGeometry}
      material={porcelain}
      position={[0, PIER_TOP / 2, PIER_FACE - 0.015]}
    />
    <T.Mesh
      geometry={troughBodyGeometry}
      material={porcelain}
      position={[0, TROUGH_RIM - 0.14, PIER_FACE + 0.12]}
      castShadow
    />
    <!-- The band of stain under the trough, which is the only thing that keeps
         the brightest object in the room from reading as new porcelain. -->
    <T.Mesh
      geometry={troughBodyGeometry}
      material={porcelainStain}
      position={[0, TROUGH_RIM - 0.2, PIER_FACE + 0.11]}
    />
    <T.Mesh
      geometry={troughLipGeometry}
      material={porcelain}
      position={[0, TROUGH_RIM - 0.02, PIER_FACE + 0.13]}
    />
    <T.Mesh
      geometry={troughWellGeometry}
      material={gloom}
      position={[0, TROUGH_RIM - 0.045, PIER_FACE + 0.12]}
    />
    <T.Mesh
      geometry={troughFootGeometry}
      material={porcelainShade}
      position={[0, 0.025, PIER_FACE + 0.08]}
    />

    <!-- The feed. A 30 mm wire, and the only part of this piece over the pier. -->
    <T.Mesh geometry={flushRiserGeometry} material={galv} position={[0.38, 0.6, PIER_FACE - 0.03]} />
    <T.Mesh geometry={flushRunGeometry} material={galv} position={[0, 0.71, PIER_FACE - 0.03]} />
    <T.Mesh
      geometry={flushSpreaderGeometry}
      material={galv}
      position={[0, 0.51, PIER_FACE + 0.04]}
    />
  {:else if piece === PIECE.radiator}
    {#each [-1, 1] as side (side)}
      <T.Mesh geometry={radFootGeometry} material={iron} position={[side * 0.82, 0.018, 0]} />
    {/each}
    <T.Mesh
      geometry={radBodyGeometry}
      material={iron}
      position={[0, (RAD_TOP - 0.06) / 2, 0]}
      castShadow
      receiveShadow
    />
    {#each RAD_COLUMNS as cx, i (i)}
      <T.Mesh
        geometry={radColumnGeometry}
        material={iron}
        position={[cx, (RAD_TOP - 0.07) / 2, RAD_D / 2 - 0.005]}
      />
      <T.Mesh
        geometry={radColumnGeometry}
        material={iron}
        position={[cx, (RAD_TOP - 0.07) / 2, -RAD_D / 2 + 0.005]}
      />
    {/each}
    <!-- The cap is what makes this an 'x' tile instead of a hole. It is also
         the shelf a man's boots land on, so it overhangs the columns by 40 mm
         on every side and the silhouette reads as a step. -->
    <T.Mesh
      geometry={radCapGeometry}
      material={ironTop}
      position={[0, RAD_TOP - 0.03, 0]}
      castShadow
      receiveShadow
    />

    {#each RAD_RUST as r, i (i)}
      <T.Mesh geometry={radRustGeometry} material={rust} position={[r.x, r.y, RAD_D / 2 + 0.01]} />
    {/each}

    <T.Mesh geometry={radValveGeometry} material={rust} position={[-0.92, 0.29, 0.1]} />
    <T.Mesh geometry={radHandleGeometry} material={ironTop} position={[-0.92, 0.345, 0.1]} />
    <T.Mesh geometry={radFeedGeometry} material={iron} position={[0.92, 0.15, -0.28]} />
  {:else if piece === PIECE.bench}
    {#each [-1, 1] as side (side)}
      <T.Mesh
        geometry={benchCheekGeometry}
        material={iron}
        position={[side * (BENCH_LEN / 2 - 0.03), BENCH_TOP / 2, 0]}
        castShadow
      />
    {/each}
    <!-- The apron. Nobody ever sees it and the board falls through without it. -->
    <T.Mesh geometry={benchApronGeometry} material={iron} position={[0, 0.065, 0]} />
    <T.Mesh geometry={benchBraceGeometry} material={ironTop} position={[0, 0.14, 0]} />
    <T.Mesh
      geometry={benchSubDeckGeometry}
      material={plankSide}
      position={[0, BENCH_TOP - 0.09, 0]}
      receiveShadow
    />

    {#each BENCH_PLANKS as pz, i (i)}
      <T.Mesh
        geometry={benchPlankGeometry}
        material={plank}
        position={[0, BENCH_TOP - 0.03, pz]}
        castShadow
        receiveShadow
      />
      {#each [-1, 1] as side (side)}
        <T.Mesh
          geometry={benchPlankEndGeometry}
          material={plankSide}
          position={[side * (BENCH_LEN / 2 - 0.085), BENCH_TOP - 0.03, pz]}
        />
      {/each}
    {/each}
  {:else if piece === PIECE.tube || piece === PIECE.tubeDead}
    <T.Mesh geometry={tubeChannelGeometry} material={galv} position={[0, TUBE_Y, -0.46]} />
    <T.Mesh geometry={tubeConduitGeometry} material={galv} position={[0.82, TUBE_Y - 0.13, -0.47]} />
    <T.Mesh
      geometry={tubeStripGeometry}
      material={tubeLit ? tubeGlow : tubeDeadSkin}
      position={[0, TUBE_Y, -0.34]}
    />
    {#each [-1, 1] as side (side)}
      <T.Mesh
        geometry={tubeCapGeometry}
        material={tubeLit ? galv : tubeBurnt}
        position={[side * (TUBE_LEN / 2), TUBE_Y, -0.34]}
      />
    {/each}

    <!-- The cage. Five hoops and two guard wires — 14 mm stock, so it stripes
         nothing, and it is the only thing that says this is a subway fitting
         rather than a light bulb. -->
    {#each TUBE_HOOPS as hx, i (i)}
      <T.Mesh geometry={tubeHoopSideGeometry} material={galv} position={[hx, TUBE_Y, -0.265]} />
      <T.Mesh geometry={tubeHoopBarGeometry} material={galv} position={[hx, TUBE_Y - 0.065, -0.34]} />
      <T.Mesh geometry={tubeHoopBarGeometry} material={galv} position={[hx, TUBE_Y + 0.065, -0.34]} />
    {/each}
    <T.Mesh geometry={tubeGuardGeometry} material={galv} position={[0, TUBE_Y - 0.065, -0.265]} />
    <T.Mesh geometry={tubeGuardGeometry} material={galv} position={[0, TUBE_Y + 0.065, -0.265]} />
  {:else if piece === PIECE.bin}
    <T.Mesh geometry={binBodyGeometry} material={galv} position={[0, 0, 0]} castShadow receiveShadow />
    <T.Mesh geometry={binBandGeometry} material={ironTop} position={[0, BIN_TOP * 0.45, 0]} />
    <T.Mesh geometry={binRimGeometry} material={ironTop} position={[0, BIN_TOP - 0.015, 0]} />
    <T.Mesh geometry={binMouthGeometry} material={gloom} position={[0, BIN_TOP - 0.008, 0]} />
    <T.Mesh
      geometry={sackGeometry}
      material={ceramicDado}
      position={[0.06, BIN_TOP + 0.06, -0.04]}
      rotation.z={0.18}
      rotation.y={0.4}
    />

    <!-- Handle over the rim, head down in the bin. No bucket: a bucket would be
         a solid object standing on a walkable tile with nothing in the blocked
         layer behind it. -->
    <T.Mesh
      geometry={mopHandleGeometry}
      material={plankSide}
      position={[-0.2, 0.55, 0.16]}
      rotation.z={0.34}
      rotation.x={-0.2}
    />
    <T.Mesh geometry={mopHeadGeometry} material={porcelainStain} position={[-0.06, 0.28, 0.05]} />
  {:else if piece === PIECE.pipes}
    <T.Mesh geometry={weepGeometry} material={rust} position={[-0.3, 0.42, -0.487]} />
    <T.Mesh geometry={stackGeometry} material={iron} position={[-0.34, 0, -0.34]} castShadow />
    <T.Mesh geometry={feedGeometry} material={ironTop} position={[-0.14, 0, -0.42]} />
    {#each PIPE_COLLARS as cy, i (i)}
      <T.Mesh geometry={collarGeometry} material={ironTop} position={[-0.34, cy, -0.34]} />
    {/each}
    <T.Mesh geometry={bossGeometry} material={iron} position={[-0.26, 0.66, -0.34]} />
    <T.Mesh geometry={bracketGeometry} material={galv} position={[-0.34, 0.36, -0.43]} />
    <T.Mesh geometry={bracketGeometry} material={galv} position={[-0.34, 0.84, -0.43]} />
    <!-- Grouted collar where the riser goes into the floor. -->
    <T.Mesh geometry={pipeBaseGeometry} material={grout} position={[-0.34, 0.015, -0.34]} />
  {:else if piece === PIECE.graffiti}
    {#if roll[6] < 0.4}
      <T.Mesh geometry={patchGeometry} material={ceramic} position={[0.02, 0.58, -0.49]} />
    {/if}
    {#each marks as m, k (k)}
      <T.Mesh
        geometry={markGeometries[m.i]}
        material={markMaterials[MARKS[m.i].c]}
        position={[m.x, m.y, -0.487]}
        rotation.z={m.tilt}
      />
    {/each}
    <!-- Scratched in with a key rather than sprayed. Grout colour, because what
         a scratch exposes is the body under the glaze. -->
    {#each SCRATCHES as s, i (i)}
      <T.Mesh
        geometry={scratchGeometry}
        material={grout}
        position={[s.x, s.y, -0.484]}
        rotation.z={(roll[i] - 0.5) * 1.4}
      />
    {/each}
  {:else if piece === PIECE.wet}
    <!-- Under every overlay the board draws. See WET_ORDER. -->
    {#each puddle as b, i (i)}
      <T.Mesh
        geometry={b.g}
        material={wetFilm}
        position={[b.x, b.y, b.z]}
        renderOrder={WET_ORDER}
      />
    {/each}
    <T.Mesh
      geometry={sheenGeometry}
      material={wetSheen}
      position={[puddle[0].x, 0.0135, puddle[0].z]}
      renderOrder={WET_ORDER}
    />
    {#each [0, 1] as k (k)}
      <T.Mesh
        geometry={printGeometry}
        material={wetPrint}
        position={[0.22 + k * 0.16, 0.0125, 0.3 + k * 0.34]}
        rotation.y={0.3 + roll[k] * 0.4}
        renderOrder={WET_ORDER}
      />
    {/each}
  {/if}
</T.Group>
