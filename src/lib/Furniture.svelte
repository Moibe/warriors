<script module lang="ts">
  // El piso de las Lizzies — every stick of furniture in it, as one prop.
  //
  // The other three boards are outdoors, and their props are one object each: a
  // building, a bus, a car. A room is not like that. A room is eight or nine
  // objects that only mean something together — a sofa alone is a sofa, a sofa
  // with a low table, a record player and a lamp is a party. So this is one
  // component with nine pieces on `variant`, not nine components:
  //
  //   · One palette. The flat is lit by one red lampshade, so every surface in
  //     it has to agree about what colour that light is. Nine files would drift
  //     apart the first time somebody nudged a hex.
  //   · One PROPS key. Stages name a kind; adding 'furniture' once lets a stage
  //     furnish a whole apartment by repeating one kind with different
  //     variants, exactly the way the Orphans' block parks three cars.
  //   · One set of materials and geometries for the entire room — see below.
  //
  // Same house rules as the comfort station and the car: primitives only, no
  // texture files, flat shading, high roughness, and not one real light. What is
  // lit is emissive.
  //
  // WHY <script module>. The comfort station is placed once and the cars three
  // times, so they can afford to build their materials per instance — which is
  // what a plain <script> does, the compiler does not hoist a `new Material()`.
  // A furnished flat places ten of these. Ten sofas' worth of duplicate
  // MeshStandardMaterials is a bill for nothing, so everything static lives in
  // module scope and the whole room shares it. That is only safe because
  // nothing here ever writes to a material: the car may do that (its fire
  // gutters every frame) and this may not. There is no useTask in this file at
  // all — furniture does not move, so the room costs zero per-frame CPU.
  //
  // ---- HEIGHTS, and why none of them hides anybody -------------------------
  //
  // A fighter is 1.55. The camera sits at 30° by default and 53° raised, at 45°
  // of yaw, so a tile step toward the camera drops the sight line by
  // 0.707 · tan(30°) = 0.40 (0.93 raised). Read that as: a piece H tall hides,
  // of a man standing one tile behind it, everything below H − 0.40.
  //
  //   moqueta        0.03   hides nothing, ever. It is paint on the floor.
  //   tocadiscos     0.49   hides his ankles (+ a smoked dust cover, see below)
  //   colchón        0.50   hides his ankles. You stand ON this one.
  //   mesa baja      0.50   his shins, plus 50 mm bottle necks up to 0.71
  //   aparador       0.75   his shins. Put it against a wall anyway.
  //   sofá           0.80   below the knee
  //   sillón         0.82   below the knee
  //   lámpara        1.08   to the waist, through a shade 0.46 wide
  //   cuentas        1.22   to the chest, through a bundle 0.22 wide at the jamb
  //
  // Nothing in the room out-tops the partitions themselves, which at level 5 are
  // 1.25 — the ceiling check-stage already enforces on anything blocked. The
  // architecture stays the tallest thing in the flat and the furniture stays
  // under everybody's chest, which is the whole lesson from the last board: a
  // waist-high room is one you fight across, a shoulder-high one is one you
  // lose people in.
  //
  // The two exceptions are both deliberate and both narrow, the same argument
  // the car makes for its radio aerial: the lamp has to be seen because it is
  // the light of the scene, and the beaded curtain has to be seen because it
  // marks a doorway, and on this board a doorway is the whole fight. Each is a
  // vertical sliver, and one camera rotation clears either of them.
  //
  // Authored facing +Z (south), the way stages.ts documents props, so `turns`
  // means what it says: the front of a sofa, the drawers of a sideboard and the
  // open lid of a record player all look south at turns 0.

  import {
    BoxGeometry,
    CylinderGeometry,
    DoubleSide,
    MeshBasicMaterial,
    MeshStandardMaterial,
    RingGeometry,
    SphereGeometry,
  } from 'three';
  import { hash2D } from './grid';

  /** Variant index per piece, so a stage names a sofa instead of guessing a 0. */
  export const PIECE = {
    sofa: 0,
    armchair: 1,
    mattress: 2,
    table: 3,
    sideboard: 4,
    stereo: 5,
    lamp: 6,
    rug: 7,
    beads: 8,
  } as const;

  /**
   * What the map has to agree with. The mesh is decoration, the '#' is the rule
   * — so `w`/`d` here are the footprint the PropPlacement must declare, `top` is
   * the world height of the highest solid part, and `steps` says whether the
   * piece was built to be stood on.
   *
   * The two that step are built to land exactly on level 2 (2 × LEVEL = 0.50),
   * so a stage raises those tiles to height + 2 and marks them 'x' (chapa) —
   * the surface that tells Terrain to skip its column and let the prop draw its
   * own top, which is the trick the parked cars already use for their bonnets.
   */
  export const PIECE_SPECS = {
    sofa: { name: 'Sofá', w: 2, d: 1, top: 0.8, steps: false },
    armchair: { name: 'Sillón', w: 1, d: 1, top: 0.82, steps: false },
    mattress: { name: 'Colchón', w: 2, d: 2, top: 0.5, steps: true },
    table: { name: 'Mesa baja', w: 1, d: 1, top: 0.5, steps: true },
    sideboard: { name: 'Aparador', w: 3, d: 1, top: 0.75, steps: false },
    stereo: { name: 'Tocadiscos', w: 1, d: 1, top: 0.49, steps: false },
    lamp: { name: 'Lámpara', w: 1, d: 1, top: 1.08, steps: false },
    rug: { name: 'Moqueta', w: 3, d: 2, top: 0.03, steps: true },
    beads: { name: 'Cortina de cuentas', w: 1, d: 1, top: 1.22, steps: true },
  } as const;

  const PIECE_COUNT = Object.keys(PIECE).length;

  // ---- Materials ----------------------------------------------------------
  // One set for the whole flat. Two tones on everything that has a horizontal
  // face, for the reason the car's roof taught us: from this camera the tops of
  // things are most of what you see, so the tops carry the shape and the flanks
  // carry the colour.

  const veneer = new MeshStandardMaterial({ color: '#6a4a2c', roughness: 1, flatShading: true });
  // The lit top of every wooden thing. Same walnut, one step up, so a sideboard
  // reads as a box with a lid instead of as a single brown slab.
  const veneerTop = new MeshStandardMaterial({ color: '#7d5a37', roughness: 1, flatShading: true });
  const veneerDark = new MeshStandardMaterial({ color: '#43301d', roughness: 1, flatShading: true });

  // The ficha gives one granate for the carpet and the sofa alike. Two tones
  // here on purpose: a sofa the exact colour of the floor it stands on has no
  // silhouette at all, and this is a board where a man puts his back against
  // the furniture.
  const velvet = new MeshStandardMaterial({ color: '#5d2a2f', roughness: 1, flatShading: true });
  const velvetDeep = new MeshStandardMaterial({ color: '#4a1f24', roughness: 1, flatShading: true });
  const carpet = new MeshStandardMaterial({ color: '#4a1f24', roughness: 1 });
  const wallpaper = new MeshStandardMaterial({ color: '#6b4b33', roughness: 1 });

  const vinyl = new MeshStandardMaterial({ color: '#241f27', roughness: 0.9, flatShading: true });
  const brass = new MeshStandardMaterial({ color: '#c8a34e', roughness: 0.6, flatShading: true });
  // Nickel is the tone the revolver is in. Here it is an ashtray and a tonearm —
  // which is the point: the only bright metal in the room is innocent, right up
  // until it is not.
  const nickel = new MeshStandardMaterial({ color: '#b9bdc6', roughness: 0.35, flatShading: true });
  const bottleGlass = new MeshStandardMaterial({ color: '#3f6b3c', roughness: 0.45 });
  const tumblerGlass = new MeshStandardMaterial({ color: '#8f9aa0', roughness: 0.4 });
  const linen = new MeshStandardMaterial({ color: '#e6dbc6', roughness: 1, flatShading: true });
  const record = new MeshStandardMaterial({ color: '#17141f', roughness: 0.5 });

  // Every hole in the room shares one near-black: the inside of a pulled drawer,
  // the slot under a lifted cushion, the gap where a pillow was. Never pure
  // black — that reads as a tear in the board rather than as a dark place.
  const gloom = new MeshStandardMaterial({ color: '#1a1c2c', roughness: 1 });

  // The gang has no colours, so the room wears them: the scatter cushions, the
  // bedspread and the record sleeves are the satins and the denim the nine are
  // dressed in. It is the only place on this board where a palette repeats, and
  // it is furniture rather than a uniform — which is exactly the joke.
  const SATIN = ['#8e2a3a', '#2f5e46', '#c8a34e', '#c25a84', '#5c7597', '#e6dbc6'];
  const satins = SATIN.map(
    (c) => new MeshStandardMaterial({ color: c, roughness: 0.75, flatShading: true })
  );

  // ---- What is lit --------------------------------------------------------
  // Emissive, never a light. Tuned for NoToneMapping, which is what the canvas
  // runs: the shade stops well short of 1 so it stays a red lampshade instead of
  // blowing out to white, and only the bulb inside it is allowed to clip.

  const shadeSkin = new MeshStandardMaterial({
    color: '#c0392b',
    emissive: '#a8241b',
    emissiveIntensity: 0.85,
    roughness: 0.9,
    flatShading: true,
    // The shade is an open cone, so the camera looks down into it. Without this
    // the far inner wall is culled and the lamp is a hollow ring.
    side: DoubleSide,
  });
  const bulbGlow = new MeshStandardMaterial({
    color: '#ffd9a0',
    emissive: '#e8a33d',
    emissiveIntensity: 1.6,
    roughness: 0.4,
  });
  // The tuning dial. Three centimetres of amber, and the only way the board says
  // there is music playing — which is the reason nobody in this flat hears
  // anything until it is much too late.
  const dialGlow = new MeshStandardMaterial({
    color: '#ffd9a0',
    emissive: '#e8a33d',
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });

  // The pool of light on the floor, drawn rather than lit — two flat unlit
  // plates, the same trick the burning car uses for its reach. A real point
  // light here would be correct and unaffordable, and this is the one prop that
  // would tempt anybody into adding one.
  const poolInner = new MeshBasicMaterial({
    color: '#e8a33d',
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const poolOuter = new MeshBasicMaterial({
    color: '#c0392b',
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  });

  // The record player's dust cover: smoked perspex, and the only see-through
  // thing in the flat. It stands 0.90 tall in a room where nothing else passes
  // 0.82, and the sole reason it is allowed to is that you can see a fighter
  // straight through it.
  const dustCover = new MeshStandardMaterial({
    color: '#2a2630',
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    roughness: 0.3,
  });

  // ---- Bottles, glasses, ashtray ------------------------------------------
  // Authored with the foot at y = 0, so a placement reads as "standing on that
  // deck" instead of as an arithmetic puzzle. One tile is 1 unit and a man is
  // 1.55, which makes a metre 0.87 — so a beer bottle is 0.21 tall and a litre
  // of something stronger is 0.26. Those are the real numbers, unshrunk: the
  // bottles are the smallest things on the board and they still read, because
  // the room is small.

  const bottleBodyGeometry = new CylinderGeometry(0.05, 0.055, 0.14, 8).translate(0, 0.07, 0);
  const bottleNeckGeometry = new CylinderGeometry(0.022, 0.032, 0.07, 6).translate(0, 0.175, 0);
  const flaskBodyGeometry = new CylinderGeometry(0.055, 0.06, 0.17, 8).translate(0, 0.085, 0);
  const flaskNeckGeometry = new CylinderGeometry(0.024, 0.036, 0.09, 6).translate(0, 0.215, 0);
  const tumblerGeometry = new CylinderGeometry(0.042, 0.036, 0.1, 8).translate(0, 0.05, 0);
  const ashtrayGeometry = new CylinderGeometry(0.09, 0.075, 0.035, 10).translate(0, 0.018, 0);

  // ---- Sofá (2×1) ---------------------------------------------------------
  // Top 0.80. The one piece of cover big enough to put your back against, and
  // the seat a Warrior gets pulled down onto — which is the same sentence in
  // this scene. Under the belt, so a man standing behind it keeps everything
  // from the knee up.

  const SOFA_W = 1.92;
  const SOFA_D = 0.9;
  // Both upholstered pieces share a frame: feet to 0.08, frame to 0.26, cushion
  // on top of that. One number, so a tipped cushion on a sofa and a tipped
  // cushion on an armchair leave their hole at the same depth.
  const FRAME_TOP = 0.26;
  const SEAT_Y = 0.35; // cushion centre; its top lands at 0.44

  const sofaFrameGeometry = new BoxGeometry(SOFA_W, 0.18, SOFA_D);
  const sofaSeatGeometry = new BoxGeometry(0.74, 0.18, 0.66);
  const sofaBackGeometry = new BoxGeometry(SOFA_W, 0.54, 0.2);
  const sofaArmGeometry = new BoxGeometry(0.18, 0.36, SOFA_D);
  const sofaSlotGeometry = new BoxGeometry(0.74, 0.02, 0.66);
  const scatterGeometry = new BoxGeometry(0.3, 0.3, 0.11);
  const footGeometry = new BoxGeometry(0.1, 0.08, 0.1);

  const SOFA_FEET = [
    { x: -0.86, z: -0.38 },
    { x: 0.86, z: -0.38 },
    { x: -0.86, z: 0.38 },
    { x: 0.86, z: 0.38 },
  ];

  // ---- Sillón (1×1) -------------------------------------------------------
  // Top 0.82. The same anatomy on one tile: cover you can put in a corner
  // without spending two squares on it, and the chair one Warrior ends up in on
  // his own, which is the trap working.

  const CHAIR_W = 0.86;
  const CHAIR_D = 0.88;

  const chairFrameGeometry = new BoxGeometry(CHAIR_W, 0.18, CHAIR_D);
  const chairSeatGeometry = new BoxGeometry(0.56, 0.18, 0.64);
  const chairBackGeometry = new BoxGeometry(CHAIR_W, 0.56, 0.18);
  const chairArmGeometry = new BoxGeometry(0.14, 0.34, CHAIR_D);
  const chairSlotGeometry = new BoxGeometry(0.56, 0.02, 0.64);

  const CHAIR_FEET = [
    { x: -0.33, z: -0.37 },
    { x: 0.33, z: -0.37 },
    { x: -0.33, z: 0.37 },
    { x: 0.33, z: 0.37 },
  ];

  // ---- Colchón (2×2) ------------------------------------------------------
  // Top 0.50 — exactly level 2, so the grid can mirror it with no fractions and
  // people stand on it. It is the only furniture in the flat you can climb, and
  // it is deliberately the one that gives no cover at all: standing on the bed
  // is a level of height and a clear shot from anywhere in the room.
  //
  // Everything above the deck — both pillows, the folded blanket — lives inside
  // the northern tile pair. If the stage makes the bed walkable it marks the
  // SOUTHERN pair, and then nothing a sprite stands on has a lump in it.

  const BED_W = 1.88;
  const BED_D = 1.84;
  const BED_DECK = 0.5;

  const bedBaseGeometry = new BoxGeometry(BED_W, 0.14, BED_D);
  const bedMattressGeometry = new BoxGeometry(1.82, 0.3, 1.78);
  const bedSpreadGeometry = new BoxGeometry(1.86, 0.06, 1.4);
  const pillowGeometry = new BoxGeometry(0.66, 0.14, 0.3);
  const blanketGeometry = new BoxGeometry(1.5, 0.06, 0.34);
  const bedSlotGeometry = new BoxGeometry(0.62, 0.02, 0.28);

  // ---- Mesa baja (1×1) ----------------------------------------------------
  // Deck 0.50, again exactly level 2, so the stage can decide with a '#'
  // whether this is cover or a step. The bottles argue for cover; the height
  // argues for a step; the film has three men sitting around it with their
  // hands full, so it is the stage's call and the mesh does not mind.
  //
  // A real cocktail table is 0.45 m and this is 0.57. The car went the other
  // way — it kept its true height and let the grid tuck the walkable surface
  // inside the sheet metal — but a table you climb should be exactly one step,
  // so this one is authored to the grid instead.

  const TABLE_DECK = 0.5;

  const tableDeckGeometry = new BoxGeometry(0.84, 0.06, 0.64);
  const tableShelfGeometry = new BoxGeometry(0.76, 0.04, 0.56);
  const tableLegGeometry = new BoxGeometry(0.06, 0.44, 0.06);
  const sleeveGeometry = new BoxGeometry(0.3, 0.02, 0.3);

  const TABLE_LEGS = [
    { x: -0.36, z: -0.26 },
    { x: 0.36, z: -0.26 },
    { x: -0.36, z: 0.26 },
    { x: 0.36, z: 0.26 },
  ];

  // Standing, and where each one ends up once the room has been turned over.
  const TABLE_BOTTLES = [
    { x: -0.26, z: -0.1, fx: -0.3, fz: 0.14, roll: 0.4 },
    { x: 0.02, z: 0.16, fx: 0.08, fz: -0.12, roll: 1.9 },
    { x: 0.3, z: -0.14, fx: 0.34, fz: 0.18, roll: 2.7 },
  ];

  // ---- Aparador (3×1) -----------------------------------------------------
  // Top 0.75 — level 3, the long piece, and the one with the drawer. The ficha
  // is blunt about it: the gun is not on anybody, it is in the furniture, and a
  // Lizzie who starts across the room from her hiding place starts unarmed.
  // This is the hiding place, so it goes where somebody is standing.
  //
  // It is also the biggest wall of solid furniture in the flat, 2.82 long, so it
  // belongs against a partition — with a '#' wall behind it nobody is ever
  // standing where it could hide them.

  const SIDEBOARD_W = 2.82;
  const SIDEBOARD_D = 0.62;
  const SIDEBOARD_DECK = 0.75;
  const SIDEBOARD_FACE = 0.31; // the front sheet of the carcass

  const sideboardPlinthGeometry = new BoxGeometry(2.66, 0.1, 0.52);
  const sideboardCarcassGeometry = new BoxGeometry(SIDEBOARD_W, 0.6, SIDEBOARD_D);
  const sideboardTopGeometry = new BoxGeometry(2.88, 0.05, 0.68);
  const drawerFrontGeometry = new BoxGeometry(0.84, 0.2, 0.03);
  const doorFrontGeometry = new BoxGeometry(0.84, 0.3, 0.03);
  const pullGeometry = new BoxGeometry(0.26, 0.035, 0.035);
  const knobGeometry = new CylinderGeometry(0.028, 0.028, 0.045, 8).rotateX(Math.PI / 2);
  const drawerHoleGeometry = new BoxGeometry(0.86, 0.22, 0.05);
  const drawerBoxGeometry = new BoxGeometry(0.8, 0.18, 0.28);
  const drawerInsideGeometry = new BoxGeometry(0.74, 0.02, 0.24);

  const SIDEBOARD_BAYS = [-0.92, 0, 0.92];

  const SIDEBOARD_FLASKS = [
    { x: -1.06, z: -0.04 },
    { x: -0.86, z: 0.08 },
  ];
  const SIDEBOARD_BOTTLES = [
    { x: 0.56, z: 0.06 },
    { x: 0.76, z: -0.06 },
    { x: 0.94, z: 0.1 },
  ];
  const SIDEBOARD_TUMBLERS = [
    { x: 0.12, z: -0.02 },
    { x: 0.26, z: 0.1 },
    { x: -0.48, z: 0.04 },
  ];

  // ---- Tocadiscos (1×1) ---------------------------------------------------
  // Cabinet top 0.49, lid up at 0.90. Music is why the trap works — nobody in
  // that flat can hear the room next door — and a console with the lid up is the
  // only shape that says "record player" from three tiles away. The lid is the
  // smoked cover, so the 0.90 costs nobody anything.

  const STEREO_DECK = 0.49;

  const stereoLegGeometry = new BoxGeometry(0.05, 0.16, 0.05);
  const stereoCabinetGeometry = new BoxGeometry(0.82, 0.3, 0.46);
  const stereoTopGeometry = new BoxGeometry(0.84, 0.03, 0.48);
  // The black fascia the dial and the knobs live on. A receiver of this decade
  // is a wooden box with one dark panel across its face, and the panel is what
  // makes three centimetres of amber read as switched on.
  const stereoFasciaGeometry = new BoxGeometry(0.7, 0.24, 0.012);
  const platterGeometry = new CylinderGeometry(0.15, 0.15, 0.02, 16);
  const discGeometry = new CylinderGeometry(0.145, 0.145, 0.006, 16);
  const labelGeometry = new CylinderGeometry(0.05, 0.05, 0.008, 12);
  const tonearmGeometry = new BoxGeometry(0.24, 0.018, 0.018);
  const pivotGeometry = new CylinderGeometry(0.03, 0.03, 0.045, 8);
  const dialGeometry = new BoxGeometry(0.26, 0.035, 0.012);
  const stereoKnobGeometry = new CylinderGeometry(0.026, 0.026, 0.02, 8).rotateX(Math.PI / 2);
  // Hinged at its back edge: the geometry is pushed forward so the pivot sits at
  // the origin and the rotation below reads as an angle instead of as a puzzle.
  const lidGeometry = new BoxGeometry(0.8, 0.02, 0.44).translate(0, 0, 0.22);

  const STEREO_LEGS = [
    { x: -0.35, z: -0.17 },
    { x: 0.35, z: -0.17 },
    { x: -0.35, z: 0.17 },
    { x: 0.35, z: 0.17 },
  ];
  const STEREO_KNOBS = [-0.1, 0.02, 0.14];

  // ---- Lámpara (1×1) ------------------------------------------------------
  // Top 1.08, on a shade 0.46 across. The dominant light of the room, and the
  // first light in this game that stands inside the board at table height
  // instead of coming from the sky — so it has to be visible from anywhere in
  // the flat, which is what buys it the extra 0.26 over the sofa.

  const LAMP_TABLE_TOP = 0.46;
  const SHADE_BOTTOM = 0.82;

  const lampTableTopGeometry = new BoxGeometry(0.54, 0.05, 0.54);
  const lampLegGeometry = new BoxGeometry(0.05, 0.41, 0.05);
  const lampBaseGeometry = new CylinderGeometry(0.11, 0.13, 0.06, 10);
  const lampStemGeometry = new CylinderGeometry(0.022, 0.022, 0.3, 8);
  const shadeGeometry = new CylinderGeometry(0.14, 0.23, 0.26, 14, 1, true);
  const bulbGeometry = new SphereGeometry(0.05, 10, 8);

  const LAMP_LEGS = [
    { x: -0.22, z: -0.22 },
    { x: 0.22, z: -0.22 },
    { x: -0.22, z: 0.22 },
    { x: 0.22, z: 0.22 },
  ];

  // Sized to what the light means rather than to what it would really reach: the
  // inner plate is roughly the tiles the lamp owns, the outer one is the fall-off
  // into the corners the ficha calls penumbra azul.
  const poolInnerGeometry = new RingGeometry(0, 1.5, 26).rotateX(-Math.PI / 2);
  const poolOuterGeometry = new RingGeometry(1.48, 2.6, 26).rotateX(-Math.PI / 2);

  // ---- Moqueta (3×2) ------------------------------------------------------
  // Top 0.03. It blocks nothing, it hides nothing, it costs three meshes, and it
  // is the single cheapest way to say this is somebody's home and not a lot with
  // a sofa in it. It also draws the sitting area — where the three of them are
  // meant to end up — without a rule or an overlay saying so.

  const rugBackingGeometry = new BoxGeometry(2.86, 0.012, 1.88);
  const rugFieldGeometry = new BoxGeometry(2.46, 0.012, 1.48);
  const rugMotifGeometry = new BoxGeometry(0.34, 0.012, 0.34).rotateY(Math.PI / 4);

  const RUG_MOTIFS = [-0.82, 0, 0.82];

  // ---- Cortina de cuentas (1×1) -------------------------------------------
  // Top 1.22, gathered against the jamb. The partitions are what this fight is
  // about — a pistol's line stops at a wall and goes through a doorway — so the
  // doorways are worth marking, and this is what actually hung in them in 1979.
  //
  // Tied back rather than hanging across: a curtain of strands over the whole
  // opening would stripe every fighter who walked through it, which is the exact
  // mistake the last board taught us. Gathered, it is a 0.22 bundle at the edge
  // of the tile, and it never rises above the wall it hangs on.

  const beadRailGeometry = new BoxGeometry(0.42, 0.04, 0.05);
  const strandGeometries = [
    new CylinderGeometry(0.05, 0.035, 0.9, 7),
    new CylinderGeometry(0.042, 0.03, 0.72, 6),
    new CylinderGeometry(0.036, 0.026, 0.62, 6),
  ];
  const looseStrandGeometry = new CylinderGeometry(0.014, 0.012, 0.84, 5);
  const tieGeometry = new BoxGeometry(0.2, 0.05, 0.16);

  // Cheap plastic beads in three colours, which is what they were. The whole
  // bundle lives in the western 40% of the tile, clear of the square's centre
  // where a fighter's sprite stands.
  const STRANDS = [
    { x: -0.4, y: 0.74, z: 0.0, tilt: 0.06, material: brass },
    { x: -0.31, y: 0.83, z: 0.07, tilt: -0.05, material: satins[3] },
    { x: -0.33, y: 0.88, z: -0.07, tilt: 0.02, material: satins[1] },
  ];
</script>

<script lang="ts">
  import { T } from '@threlte/core';

  let {
    position = [0, 0, 0],
    rotation = 0,
    variant = 0,
    // One extra beyond the prop contract, defaulted so Scene's call site —
    // <Prop position rotation variant /> — draws an untouched room, the way the
    // car defaults to not burning.
    //
    // `open` is the room AFTER: one thing tipped out of place and one dark hole
    // where it was. It is the same beat on every piece that has a hiding place,
    // because in this scene there is only one beat — the drawer, the cushion,
    // the boot — and it happens to all of them at once.
    open = false,
  }: {
    position?: [number, number, number];
    rotation?: number;
    variant?: number;
    open?: boolean;
  } = $props();

  const piece = $derived(((variant % PIECE_COUNT) + PIECE_COUNT) % PIECE_COUNT);

  // Which satins this particular piece wears, from where it stands. Two sofas in
  // one flat get different cushions for nothing, and they get the same ones on
  // every reload — the room should not reshuffle itself between restarts.
  const trim = $derived.by(() => {
    const kx = Math.round(position[0] * 4);
    const kz = Math.round(position[2] * 4);
    const n = satins.length;
    const a = Math.floor(hash2D(kx, kz, 19) * n) % n;
    const step = 1 + (Math.floor(hash2D(kz, kx, 23) * (n - 1)) % (n - 1));
    return { a: satins[a], b: satins[(a + step) % n] };
  });
</script>

<T.Group {position} rotation.y={rotation}>
  {#if piece === PIECE.sofa}
    {#each SOFA_FEET as f, i (i)}
      <T.Mesh geometry={footGeometry} material={veneerDark} position={[f.x, 0.04, f.z]} />
    {/each}

    <T.Mesh
      geometry={sofaFrameGeometry}
      material={velvetDeep}
      position={[0, 0.17, 0]}
      castShadow
      receiveShadow
    />
    <T.Mesh
      geometry={sofaBackGeometry}
      material={velvetDeep}
      position={[0, 0.52, -0.35]}
      rotation.x={0.1}
      castShadow
    />
    {#each [-1, 1] as side (side)}
      <T.Mesh
        geometry={sofaArmGeometry}
        material={velvet}
        position={[side * 0.87, 0.44, 0]}
        castShadow
      />
    {/each}

    <!-- Left cushion always sits. The right one is the one somebody was sitting
         on, so it is the one that gets tipped. -->
    <T.Mesh
      geometry={sofaSeatGeometry}
      material={velvet}
      position={[-0.38, SEAT_Y, 0.06]}
      castShadow
    />
    <T.Mesh
      geometry={sofaSeatGeometry}
      material={velvet}
      position={open ? [0.38, 0.52, 0.34] : [0.38, SEAT_Y, 0.06]}
      rotation.x={open ? -1.2 : 0}
      castShadow
    />
    {#if open}
      <T.Mesh
        geometry={sofaSlotGeometry}
        material={gloom}
        position={[0.38, FRAME_TOP + 0.005, 0.06]}
      />
    {/if}

    <T.Mesh
      geometry={scatterGeometry}
      material={trim.a}
      position={[-0.46, 0.56, -0.2]}
      rotation.x={0.35}
      rotation.z={0.12}
    />
    <T.Mesh
      geometry={scatterGeometry}
      material={trim.b}
      position={[0.5, 0.56, -0.21]}
      rotation.x={0.3}
      rotation.z={-0.2}
    />
  {:else if piece === PIECE.armchair}
    {#each CHAIR_FEET as f, i (i)}
      <T.Mesh geometry={footGeometry} material={veneerDark} position={[f.x, 0.04, f.z]} />
    {/each}

    <T.Mesh
      geometry={chairFrameGeometry}
      material={velvetDeep}
      position={[0, 0.17, 0]}
      castShadow
      receiveShadow
    />
    <T.Mesh
      geometry={chairBackGeometry}
      material={velvetDeep}
      position={[0, 0.53, -0.35]}
      rotation.x={0.1}
      castShadow
    />
    {#each [-1, 1] as side (side)}
      <T.Mesh
        geometry={chairArmGeometry}
        material={velvet}
        position={[side * 0.36, 0.43, 0]}
        castShadow
      />
    {/each}

    <T.Mesh
      geometry={chairSeatGeometry}
      material={velvet}
      position={open ? [0, 0.52, 0.32] : [0, SEAT_Y, 0.06]}
      rotation.x={open ? -1.2 : 0}
      castShadow
    />
    {#if open}
      <T.Mesh
        geometry={chairSlotGeometry}
        material={gloom}
        position={[0, FRAME_TOP + 0.005, 0.06]}
      />
    {/if}

    <T.Mesh
      geometry={scatterGeometry}
      material={trim.a}
      position={[0.08, 0.57, -0.21]}
      rotation.x={0.32}
      rotation.z={0.18}
    />
  {:else if piece === PIECE.mattress}
    <T.Mesh
      geometry={bedBaseGeometry}
      material={veneerDark}
      position={[0, 0.07, 0]}
      receiveShadow
    />
    <T.Mesh geometry={bedMattressGeometry} material={linen} position={[0, 0.29, 0]} castShadow />
    <!-- The spread covers everything from the middle south, which is the half
         that gets stood on; the pale sheet shows at the head end, where the
         pillows are and where nobody's feet ever land. -->
    <T.Mesh
      geometry={bedSpreadGeometry}
      material={trim.a}
      position={[0, BED_DECK - 0.03, 0.2]}
      receiveShadow
    />

    <T.Mesh geometry={pillowGeometry} material={linen} position={[-0.44, BED_DECK + 0.01, -0.72]} />
    <T.Mesh
      geometry={pillowGeometry}
      material={linen}
      position={open ? [0.5, 0.58, -0.5] : [0.44, BED_DECK + 0.01, -0.72]}
      rotation.x={open ? -0.9 : 0}
      rotation.z={open ? 0.2 : 0}
    />
    {#if open}
      <T.Mesh
        geometry={bedSlotGeometry}
        material={gloom}
        position={[0.44, BED_DECK + 0.005, -0.72]}
      />
    {/if}

    <T.Mesh geometry={blanketGeometry} material={trim.b} position={[0, BED_DECK + 0.03, -0.32]} />
  {:else if piece === PIECE.table}
    {#each TABLE_LEGS as l, i (i)}
      <T.Mesh geometry={tableLegGeometry} material={veneerDark} position={[l.x, 0.22, l.z]} />
    {/each}
    <T.Mesh geometry={tableShelfGeometry} material={veneerDark} position={[0, 0.22, 0]} />
    <T.Mesh geometry={sleeveGeometry} material={trim.b} position={[0.06, 0.245, -0.02]} />
    <T.Mesh
      geometry={tableDeckGeometry}
      material={veneerTop}
      position={[0, TABLE_DECK - 0.03, 0]}
      castShadow
      receiveShadow
    />

    {#each TABLE_BOTTLES as b, i (i)}
      {#if open}
        <T.Mesh
          geometry={bottleBodyGeometry}
          material={bottleGlass}
          position={[b.fx, TABLE_DECK + 0.055, b.fz]}
          rotation.z={Math.PI / 2}
          rotation.y={b.roll}
        />
        <T.Mesh
          geometry={bottleNeckGeometry}
          material={bottleGlass}
          position={[b.fx, TABLE_DECK + 0.055, b.fz]}
          rotation.z={Math.PI / 2}
          rotation.y={b.roll}
        />
      {:else}
        <T.Mesh
          geometry={bottleBodyGeometry}
          material={bottleGlass}
          position={[b.x, TABLE_DECK, b.z]}
        />
        <T.Mesh
          geometry={bottleNeckGeometry}
          material={bottleGlass}
          position={[b.x, TABLE_DECK, b.z]}
        />
      {/if}
    {/each}

    <T.Mesh
      geometry={tumblerGeometry}
      material={tumblerGlass}
      position={[-0.08, TABLE_DECK, 0.2]}
    />
    <T.Mesh
      geometry={tumblerGeometry}
      material={tumblerGlass}
      position={[0.18, TABLE_DECK, 0.08]}
    />
    <T.Mesh
      geometry={ashtrayGeometry}
      material={nickel}
      position={open ? [-0.3, TABLE_DECK, 0.24] : [-0.3, TABLE_DECK, -0.18]}
      rotation.z={open ? 0.5 : 0}
    />
  {:else if piece === PIECE.sideboard}
    <T.Mesh geometry={sideboardPlinthGeometry} material={veneerDark} position={[0, 0.05, 0]} />
    <T.Mesh
      geometry={sideboardCarcassGeometry}
      material={veneer}
      position={[0, 0.4, 0]}
      castShadow
      receiveShadow
    />
    <T.Mesh
      geometry={sideboardTopGeometry}
      material={veneerTop}
      position={[0, SIDEBOARD_DECK - 0.025, 0]}
      castShadow
      receiveShadow
    />

    {#each SIDEBOARD_BAYS as bx, i (i)}
      <T.Mesh
        geometry={doorFrontGeometry}
        material={veneerTop}
        position={[bx, 0.3, SIDEBOARD_FACE + 0.015]}
      />
      <T.Mesh
        geometry={knobGeometry}
        material={brass}
        position={[bx, 0.3, SIDEBOARD_FACE + 0.05]}
      />
      {#if !(open && bx === 0)}
        <T.Mesh
          geometry={drawerFrontGeometry}
          material={veneerTop}
          position={[bx, 0.58, SIDEBOARD_FACE + 0.015]}
        />
        <T.Mesh
          geometry={pullGeometry}
          material={brass}
          position={[bx, 0.58, SIDEBOARD_FACE + 0.045]}
        />
      {/if}
    {/each}

    <!-- The drawer. Somebody was sitting closest to it all evening. -->
    {#if open}
      <T.Mesh
        geometry={drawerHoleGeometry}
        material={gloom}
        position={[0, 0.58, SIDEBOARD_FACE - 0.01]}
      />
      <T.Mesh geometry={drawerBoxGeometry} material={veneerDark} position={[0, 0.57, 0.46]} />
      <T.Mesh geometry={drawerInsideGeometry} material={gloom} position={[0, 0.655, 0.46]} />
      <T.Mesh geometry={drawerFrontGeometry} material={veneerTop} position={[0, 0.58, 0.605]} />
      <T.Mesh geometry={pullGeometry} material={brass} position={[0, 0.58, 0.635]} />
    {/if}

    {#each SIDEBOARD_FLASKS as b, i (i)}
      <T.Mesh
        geometry={flaskBodyGeometry}
        material={bottleGlass}
        position={[b.x, SIDEBOARD_DECK, b.z]}
      />
      <T.Mesh
        geometry={flaskNeckGeometry}
        material={bottleGlass}
        position={[b.x, SIDEBOARD_DECK, b.z]}
      />
    {/each}
    {#each SIDEBOARD_BOTTLES as b, i (i)}
      <T.Mesh
        geometry={bottleBodyGeometry}
        material={bottleGlass}
        position={[b.x, SIDEBOARD_DECK, b.z]}
      />
      <T.Mesh
        geometry={bottleNeckGeometry}
        material={bottleGlass}
        position={[b.x, SIDEBOARD_DECK, b.z]}
      />
    {/each}
    {#each SIDEBOARD_TUMBLERS as g, i (i)}
      <T.Mesh
        geometry={tumblerGeometry}
        material={tumblerGlass}
        position={[g.x, SIDEBOARD_DECK, g.z]}
      />
    {/each}
    <T.Mesh geometry={ashtrayGeometry} material={nickel} position={[1.16, SIDEBOARD_DECK, 0.02]} />
  {:else if piece === PIECE.stereo}
    {#each STEREO_LEGS as l, i (i)}
      <T.Mesh geometry={stereoLegGeometry} material={veneerDark} position={[l.x, 0.08, l.z]} />
    {/each}
    <T.Mesh
      geometry={stereoCabinetGeometry}
      material={veneer}
      position={[0, 0.31, 0]}
      castShadow
      receiveShadow
    />
    <T.Mesh
      geometry={stereoTopGeometry}
      material={veneerTop}
      position={[0, STEREO_DECK - 0.015, 0]}
    />

    <T.Mesh
      geometry={platterGeometry}
      material={nickel}
      position={[-0.06, STEREO_DECK + 0.01, 0]}
    />
    <T.Mesh geometry={discGeometry} material={record} position={[-0.06, STEREO_DECK + 0.023, 0]} />
    <T.Mesh geometry={labelGeometry} material={brass} position={[-0.06, STEREO_DECK + 0.028, 0]} />
    <T.Mesh
      geometry={pivotGeometry}
      material={nickel}
      position={[0.29, STEREO_DECK + 0.02, -0.12]}
    />
    <T.Mesh
      geometry={tonearmGeometry}
      material={nickel}
      position={[0.18, STEREO_DECK + 0.035, -0.06]}
      rotation.y={0.55}
    />

    <!-- The dial is on. That is the whole reason nobody hears the next room. -->
    <T.Mesh geometry={stereoFasciaGeometry} material={vinyl} position={[-0.04, 0.31, 0.237]} />
    <T.Mesh geometry={dialGeometry} material={dialGlow} position={[-0.22, 0.37, 0.244]} />
    {#each STEREO_KNOBS as kx, i (i)}
      <T.Mesh geometry={stereoKnobGeometry} material={brass} position={[kx, 0.25, 0.245]} />
    {/each}

    <T.Mesh
      geometry={lidGeometry}
      material={dustCover}
      position={[0, STEREO_DECK, -0.23]}
      rotation.x={-1.2}
    />

    <!-- Sleeves leaning against the cabinet, in two of the satins somebody in
         this room is wearing. -->
    <T.Mesh
      geometry={sleeveGeometry}
      material={trim.a}
      position={[-0.3, 0.17, 0.3]}
      rotation.x={1.32}
      rotation.z={0.06}
    />
    <T.Mesh
      geometry={sleeveGeometry}
      material={trim.b}
      position={[-0.24, 0.16, 0.33]}
      rotation.x={1.24}
      rotation.z={-0.1}
    />
  {:else if piece === PIECE.lamp}
    <!-- Drawn light, not a real one: two flat plates on the floor, the same slot
         the movement and range panels use, so the lamp's reach reads as one more
         layer of the board. They sit above the rug on purpose — a rug is the one
         piece of furniture you lay light on. -->
    <T.Mesh geometry={poolInnerGeometry} material={poolInner} position.y={0.05} renderOrder={1} />
    <T.Mesh geometry={poolOuterGeometry} material={poolOuter} position.y={0.042} renderOrder={1} />

    {#each LAMP_LEGS as l, i (i)}
      <T.Mesh geometry={lampLegGeometry} material={veneerDark} position={[l.x, 0.205, l.z]} />
    {/each}
    <T.Mesh
      geometry={lampTableTopGeometry}
      material={veneerTop}
      position={[0, LAMP_TABLE_TOP - 0.025, 0]}
      castShadow
      receiveShadow
    />

    <T.Mesh geometry={lampBaseGeometry} material={brass} position={[0, LAMP_TABLE_TOP + 0.03, 0]} />
    <T.Mesh geometry={lampStemGeometry} material={brass} position={[0, 0.67, 0]} />
    <T.Mesh geometry={bulbGeometry} material={bulbGlow} position={[0, 0.95, 0]} />
    <T.Mesh geometry={shadeGeometry} material={shadeSkin} position={[0, SHADE_BOTTOM + 0.13, 0]} />

    <T.Mesh geometry={ashtrayGeometry} material={nickel} position={[0.17, LAMP_TABLE_TOP, 0.16]} />
  {:else if piece === PIECE.rug}
    <T.Mesh geometry={rugBackingGeometry} material={wallpaper} position={[0, 0.016, 0]} />
    <T.Mesh geometry={rugFieldGeometry} material={carpet} position={[0, 0.022, 0]} receiveShadow />
    {#each RUG_MOTIFS as mx, i (i)}
      <T.Mesh
        geometry={rugMotifGeometry}
        material={i === 1 ? brass : veneerDark}
        position={[mx, 0.024, 0]}
      />
    {/each}
  {:else if piece === PIECE.beads}
    <T.Mesh geometry={beadRailGeometry} material={veneerDark} position={[-0.29, 1.2, 0]} />
    {#each STRANDS as s, i (i)}
      <T.Mesh
        geometry={strandGeometries[i]}
        material={s.material}
        position={[s.x, s.y, s.z]}
        rotation.z={s.tilt}
      />
    {/each}
    <T.Mesh geometry={tieGeometry} material={satins[0]} position={[-0.35, 0.62, 0]} />
    <!-- One strand left hanging where somebody pushed through it. Fourteen
         millimetres wide: it says beads and it hides nobody. -->
    <T.Mesh geometry={looseStrandGeometry} material={brass} position={[-0.11, 0.76, 0.03]} />
  {/if}
</T.Group>
