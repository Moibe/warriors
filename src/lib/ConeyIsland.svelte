<script module lang="ts">
  // Coney Island al amanecer — el decorado de la última batalla, en una pieza.
  //
  // Same house rules as the bus, the car and the flat: three.js primitives only,
  // no texture files, flat shading, high roughness, and not one real light. And
  // the same reason as Furniture.svelte for being ONE component with variants
  // rather than seven files: one palette (a single sunrise has to agree with
  // itself), one PROPS key, and one set of materials and geometries shared by
  // every piece on the beach.
  //
  // ---- THE PROBLEM THIS FILE EXISTS TO SOLVE --------------------------------
  //
  // The Wonder Wheel is 45 m and the Parachute Jump 76 m. At LEVEL = 0.25 that
  // is 180 and 304 levels, against a measured rule that nothing blocked above
  // level 5 may stand inside the field of play. So none of it can be a
  // PropPlacement on tiles, and none of it needs to be: the spectacle lives
  // BEYOND the board, as geometry with no footprint and no collision, and the
  // board itself stays a sheet of empty sand.
  //
  // But "behind the board" is not a place you can just put something, because
  // this camera is ORTHOGRAPHIC and turns in four quarters. Two facts follow,
  // and both of them shape every number below:
  //
  //   1. DISTANCE DOES NOT SHRINK ANYTHING. A thing 40 tiles away is drawn at
  //      exactly its real size. Forced scale is therefore not a cheat here, it
  //      is the only option: what decides how big a ride looks is not how far
  //      away it stands but how many world units tall it is. Measured against
  //      the review viewport (tools/shoot.mjs: 1440 × 860 at the default zoom
  //      58, so one world unit = 58 px and the frame is 14.8 units tall), the
  //      whole horizon gets about FOUR UNITS of screen height above the board's
  //      far edge. Everything here is drawn to that budget, not to Coney Island.
  //
  //   2. FAR AWAY MEANS HIGH UP, AND TURNING THE CAMERA MOVES "AWAY". Rotate
  //      90° and anything parked to the north is suddenly between the player and
  //      his own people. So the backdrop is hung on a pivot that follows the
  //      camera's azimuth: it orbits the board centre and stays exactly opposite
  //      the viewer, always behind everything, at every one of the four yaws and
  //      all through the swing between them.
  //
  //      That is not a trick, it is this game's own convention taken one step
  //      further. The sky is CSS behind a transparent canvas and does not turn
  //      either; a unit is a Sprite that always faces the viewer. The horizon is
  //      simply the largest billboard on the board. The board spins, the horizon
  //      does not — which is what a real horizon does.
  //
  // ---- THE SCREEN FRAME, AND WHY THE NUMBERS BELOW ARE READABLE -------------
  //
  // Because the pivot cancels the camera's yaw, the skyline is authored in a
  // frame whose axes ARE the screen's:  +X right, +Y up, −Z away from the
  // viewer. Under an orthographic camera at the default 30° pitch that makes the
  // projection a one-liner:
  //
  //        u = x                       (screen across)
  //        v = 0.868·y + 0.497·(−z)    (screen up)
  //
  // Read it as: every unit of HEIGHT lifts a thing 0.87 up the screen, and every
  // unit of DISTANCE lifts it 0.50. Which is the whole difficulty in one line —
  // standing something further back costs more than half of what it would cost
  // to make it taller, and the frame only has four units of room.
  //
  // ---- WHERE THE BOARD IS, IN THAT FRAME ------------------------------------
  //
  // Whatever its size, a rectangular board seen from 45° is a diamond with the
  // SAME silhouette at all four yaws. Its far edges lie along
  //
  //        z = |x| − BOARD_REACH
  //
  // — a chevron, deepest behind the middle of the screen and coming forward to
  // meet the camera at the left and right corners. `behind()` below is that line
  // plus a clearance, and every piece of the horizon is hung off it. Two things
  // fall out of it for free:
  //
  //   · The city band hugs the board's far edge all the way round, because the
  //     band and the edge climb the screen at the same 0.5 slope. The strip of
  //     sky between the sand and the first rooftops stays about a tenth of a
  //     unit wide — six pixels — instead of opening into a gap that would make
  //     the board look like a raft.
  //   · The CENTRE OF THE HORIZON IS THE EXPENSIVE PART. Right above the board's
  //     far corner the chevron is at its deepest, so anything standing there is
  //     already half a frame up before it has any height at all. So nothing tall
  //     goes there. The middle of the skyline is left open on purpose — haze and
  //     sky — and the big silhouettes are pushed out into the wings, where the
  //     board's edge has dropped away and there is room to stand something up.
  //     That is the answer to "how do you put a Ferris wheel on a board without
  //     covering the board": you leave the middle of the horizon empty.
  //
  // ---- IT CANNOT HIDE ANYBODY, AND IT MUST NOT SWALLOW ANYBODY EITHER -------
  //
  // Occlusion is settled by construction: the backdrop is always farther from
  // the camera than the whole board, so a sprite in front of it always wins the
  // depth test. The bus taught us the other half of that lesson though — a thing
  // that does not hide a fighter can still lose him. Two rules answer it:
  //
  //   · NOTHING IN THE HORIZON IS A SOLID MASS. Every ride is open lattice,
  //     spokes, trestle and rail, with sky between the members, so a sprite
  //     standing in front of one never lands on a filled field. The only solid
  //     shapes up there are the rooftops, and they are kept below the line of
  //     the board's own far edge.
  //   · THE HAZE IS THICKEST EXACTLY WHERE THE PEOPLE ARE. The mist band sits on
  //     the board's far edge, which is the only height a sprite can ever reach
  //     into; the skyline earns its contrast higher up, over a man's head, where
  //     nobody is standing. So the fight happens against a wash, and the
  //     spectacle happens above it.
  //
  // ---- AND IT IS DAY, WHICH NOTHING IN THIS GAME HAS BEEN -------------------
  //
  // The four night boards read by lit edges against dark. This one cannot: a
  // bulb is invisible at dawn. What reads by day is SILHOUETTE and SHADOW, so
  // that is what everything here is made of — the sun is a rising glow behind
  // the east end of the horizon and the rides are cut against it, and down on
  // the board every post, baluster and lamp is shaped to throw a long shadow
  // west across the sand. The one lamp globe is barely emissive on purpose: it
  // is the last minute of a street light, not a lantern.
  //
  // Authored facing +Z (south), the way stages.ts documents props — the sea is
  // south, so at turns 0 a railing faces the water and a bench has its back to
  // it. The skyline ignores `rotation`: it is hung on the camera instead.

  import {
    BoxGeometry,
    CanvasTexture,
    Color,
    ConeGeometry,
    CylinderGeometry,
    DoubleSide,
    LinearFilter,
    MeshBasicMaterial,
    MeshStandardMaterial,
    PlaneGeometry,
    SRGBColorSpace,
    SphereGeometry,
    TorusGeometry,
  } from 'three';
  import { hash2D } from './grid';

  /** Variant index per piece, so a stage names a bench instead of guessing a 3. */
  export const PIECE = {
    skyline: 0,
    railing: 1,
    lamp: 2,
    bench: 3,
    posts: 4,
    litter: 5,
    surf: 6,
  } as const;

  /**
   * What the map has to agree with. The mesh is decoration, the '#' is the rule.
   * `top` is the world height of the highest solid part, `steps` says whether the
   * piece was built to be stood on, and `offBoard` marks the one piece that has
   * no footprint at all because it is not on the board.
   */
  export const PIECE_SPECS = {
    skyline: { name: 'Coney Island', w: 2, d: 2, top: 0, steps: false, offBoard: true },
    railing: { name: 'Barandilla', w: 3, d: 1, top: 0.66, steps: false, offBoard: false },
    lamp: { name: 'Farola', w: 1, d: 1, top: 2.1, steps: false, offBoard: false },
    bench: { name: 'Banco', w: 1, d: 1, top: 0.78, steps: false, offBoard: false },
    posts: { name: 'Pilotes', w: 3, d: 1, top: 0.9, steps: false, offBoard: false },
    litter: { name: 'Basura', w: 1, d: 1, top: 0.3, steps: false, offBoard: false },
    surf: { name: 'Rompiente', w: 4, d: 1, top: 0.06, steps: true, offBoard: false },
  } as const;

  const PIECE_COUNT = Object.keys(PIECE).length;

  // ---- The board's reach, the one number to move if the beach changes -------

  /**
   * How deep the board reaches away from the camera, in the screen frame:
   * 0.7071 · (width + depth) / 2, measured to the outer tile edges. A 16 × 14
   * beach gives 0.7071 · 15 = 10.6. It is the same at every yaw, because turning
   * a rectangle a quarter turn gives back the same diamond.
   *
   * If the beach is ever re-cut, this is the only number in the file that has to
   * follow it — everything else hangs off `behind()`.
   */
  const BOARD_REACH = 10.6;

  /** Screen rise per unit of height and per unit of distance, at 30° pitch. */
  const V_UP = 0.868;
  const V_BACK = 0.497;

  /** Never nearer than this, even out past the board's left and right corners. */
  const NEAREST = -5.0;
  /** How far behind the board's far edge a thing stands. A sprite is at its
   *  tile's centre, a third of a unit nearer than the tile's edge, so this
   *  clears a man standing on the very last row as well as the row itself. */
  const CLEAR = 1.2;

  /** The line the whole horizon is hung from: the board's far edge, plus air. */
  function behind(x: number): number {
    return Math.min(NEAREST, Math.abs(x) - BOARD_REACH - CLEAR);
  }

  /** How far back a ride stands from the rooftops that hide its feet. */
  const RIDE_SETBACK = 1.4;

  // ---- Distance, mixed into the paint ---------------------------------------
  // Aerial perspective, done in the material instead of in a pass: every colour
  // is dragged toward the veil by how far away it stands. It is the cheapest
  // depth cue there is and it costs nothing at all per frame.

  const VEIL = new Color('#c9a48f');

  /** A colour, washed toward the horizon. `mix` 0 is here, 1 is gone. */
  function far(hex: string, mix: number): Color {
    return new Color(hex).lerp(VEIL, mix);
  }

  function backdrop(hex: string, mix: number): MeshStandardMaterial {
    return new MeshStandardMaterial({ color: far(hex, mix), roughness: 1, flatShading: true });
  }

  // How much veil each layer carries. The wings are nearer than the middle, so
  // they keep more of their own colour — which is why the horizon reads as deep
  // even though every bit of it is within seven units of the board.
  const HAZE_WING = 0.2;
  const HAZE_MID = 0.34;
  const HAZE_DEEP = 0.46;

  // ---- Backdrop materials ---------------------------------------------------
  // Lit, not unlit. An unlit backdrop would hold its light while the board's
  // turned underneath it, and the sun would be on the wrong side of the picture
  // at two of the four yaws. These are ordinary standard materials with
  // castShadow and receiveShadow both off: the key carves them from the east
  // exactly as it carves the sand, and the shadow map — which is sized to the
  // board — is never sampled out here where its frustum has run out.

  const jumpSteel = backdrop('#6b5a52', HAZE_WING); // unpainted, rusted, 1979
  const jumpShade = backdrop('#3a3038', HAZE_WING);
  const wheelSteel = backdrop('#b9b2a8', HAZE_MID); // lattice against the light
  const wheelShade = backdrop('#3c4350', HAZE_MID);
  const coasterWhite = backdrop('#cfc6b6', HAZE_WING); // the Cyclone's white timber
  const coasterRed = backdrop('#a83a2f', HAZE_WING);
  const deadWood = backdrop('#6b6053', HAZE_MID); // the Thunderbolt, abandoned
  const weed = backdrop('#5c6b44', HAZE_MID);
  const cityFace = backdrop('#7b6f66', HAZE_DEEP);
  const cityRoof = backdrop('#8d8176', HAZE_DEEP);
  const cityDark = backdrop('#4b4550', HAZE_DEEP);
  const tankWood = backdrop('#6b5f52', HAZE_DEEP);

  // ---- Board materials ------------------------------------------------------
  // These are on the board, lit by the same rig as the sand, and they all cast.

  const saltTimber = new MeshStandardMaterial({
    // Grey with salt, not the warm #5d4126 of the bandstand. A boardwalk that
    // comes out park-bench brown is the same mistake as a yellow bus.
    color: '#6e6459',
    roughness: 1,
    flatShading: true,
  });
  const saltTimberDark = new MeshStandardMaterial({
    color: '#45403a',
    roughness: 1,
    flatShading: true,
  });
  const ironwork = new MeshStandardMaterial({ color: '#4a4740', roughness: 1, flatShading: true });
  const rust = new MeshStandardMaterial({ color: '#7a4a2a', roughness: 1 });
  const palePaint = new MeshStandardMaterial({ color: '#9aa0a0', roughness: 1, flatShading: true });
  const tar = new MeshStandardMaterial({ color: '#2b2822', roughness: 1, flatShading: true });
  const tin = new MeshStandardMaterial({ color: '#8a8f94', roughness: 0.6, flatShading: true });
  const paper = new MeshStandardMaterial({ color: '#c4bba8', roughness: 1 });
  const bottleGlass = new MeshStandardMaterial({ color: '#3f7a4a', roughness: 0.45 });

  /**
   * The one lit thing on the whole beach, and it is almost off. A boardwalk lamp
   * at sunrise is five minutes from being switched off for the day; emissive
   * enough to hold a pale bead in the shade of its own cap, nowhere near enough
   * to read as a night light. What says "lamp" here is the two-unit shadow it
   * lays down the deck, not the glass.
   */
  const globeGlass = new MeshStandardMaterial({
    color: '#e8e2d2',
    emissive: '#ffd9a0',
    emissiveIntensity: 0.3,
    roughness: 0.4,
  });

  // ---- Haze and sun, painted to a canvas ------------------------------------
  // The page runs with ssr = false, so `document` is here at module load — the
  // same licence textures.ts takes for the cursor and the damage numbers. These
  // are generated, not loaded: the project still ships without an image file.

  function finish(c: HTMLCanvasElement): CanvasTexture {
    const t = new CanvasTexture(c);
    t.magFilter = LinearFilter;
    t.minFilter = LinearFilter;
    t.generateMipmaps = false;
    t.colorSpace = SRGBColorSpace;
    return t;
  }

  /**
   * The band of sea mist the horizon stands in.
   *
   * It is the piece that lets the backdrop have no ground at all. Nothing out
   * there needs a floor, a bulkhead or a coastline, because every foot of it
   * ends in haze — which is what a distant thing does at first light, and which
   * also means nothing has to line up with the board's own edge.
   *
   * Warm at the bottom where the sun is coming, cool above, and transparent at
   * BOTH ends so the band has no edge anywhere: a hard line would read as a
   * shelf floating in the sky, which is exactly the failure this replaces.
   *
   * `fade` also washes the inner end out, for the two plates that hang past the
   * board's left and right corners and must not creep in over the sand.
   */
  function hazeTexture(fade: boolean): CanvasTexture {
    const c = document.createElement('canvas');
    c.width = fade ? 128 : 4;
    c.height = 256;
    const ctx = c.getContext('2d')!;

    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, 'rgba(154, 174, 202, 0)');
    g.addColorStop(0.3, 'rgba(158, 173, 196, 0.4)');
    g.addColorStop(0.56, 'rgba(210, 184, 168, 0.92)');
    g.addColorStop(0.78, 'rgba(234, 194, 152, 1)');
    g.addColorStop(0.93, 'rgba(226, 178, 140, 0.5)');
    g.addColorStop(1.0, 'rgba(220, 170, 135, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, 256);

    if (fade) {
      // Kept as alpha, not as a second fill: the colour ramp above has to
      // survive underneath it untouched.
      ctx.globalCompositeOperation = 'destination-in';
      const h = ctx.createLinearGradient(0, 0, 128, 0);
      h.addColorStop(0.0, 'rgba(0,0,0,0)');
      h.addColorStop(0.12, 'rgba(0,0,0,1)');
      h.addColorStop(1.0, 'rgba(0,0,0,1)');
      ctx.fillStyle = h;
      ctx.fillRect(0, 0, 128, 256);
    }
    return finish(c);
  }

  /**
   * The sun, which is not a disc.
   *
   * The beach faces south and the sun comes up in the east, so it rises at the
   * SIDE of the picture and stays low — there is no moment where it hangs over
   * the sea in front of you. What you get instead is one end of the horizon
   * burning and the rides at that end going black against it. So: no disc, no
   * lens flare, just a wide soft bloom parked behind the east end of the
   * skyline, far enough back that every ride is cut out of it.
   */
  function glowTexture(): CanvasTexture {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(S / 2, S * 0.66, 0, S / 2, S * 0.66, S / 2);
    g.addColorStop(0.0, 'rgba(255, 219, 168, 0.95)');
    g.addColorStop(0.28, 'rgba(255, 196, 132, 0.6)');
    g.addColorStop(0.62, 'rgba(240, 161, 99, 0.22)');
    g.addColorStop(1.0, 'rgba(230, 150, 100, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return finish(c);
  }

  const HAZE = hazeTexture(false);
  const HAZE_EDGE = hazeTexture(true);
  const GLOW = glowTexture();

  // DoubleSide because the two wing plates are the same plate mirrored with a
  // negative scale, which turns its winding inside out. Unlit, so the flipped
  // normal costs nothing.
  const hazeDeep = new MeshBasicMaterial({
    map: HAZE,
    transparent: true,
    opacity: 0.66,
    depthWrite: false,
    side: DoubleSide,
  });
  const hazeWing = new MeshBasicMaterial({
    map: HAZE_EDGE,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: DoubleSide,
  });
  const sunHaze = new MeshBasicMaterial({
    map: GLOW,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: DoubleSide,
  });

  // ---- Where the horizon's pieces stand --------------------------------------
  // Screen-x, west to east, exactly the order the geography gives: Parachute
  // Jump, Thunderbolt, Wonder Wheel, Astroland, Cyclone. Depth is `behind()` in
  // every case, so the layout re-hugs the board on its own.

  const JUMP_X = -9.4;
  const THUNDER_X = -5.9;
  const WHEEL_X = 4.6;
  const TOWER_X = 7.4;
  const ROCKET_X = 8.9;
  const CYCLONE_X = 11.2;

  const RIDE_Z = (x: number) => behind(x) - RIDE_SETBACK;

  // ---- The rooftops ---------------------------------------------------------
  // Surf Avenue's backs and the shut concessions, in two wings with a hole in
  // the middle. Boxes two units deep, so the front face of a block stands nearer
  // than the ride behind it — which is how a ride's legs end: not in a fade, not
  // on a plinth, but behind somebody's roof, the way every skyline works.
  //
  // The four marked blocks are not decoration. Each one has to out-top the base
  // of the ride standing behind it or that ride is left standing on nothing.

  const BLOCK_D = 2.0;

  const BLOCKS = [
    { x: -18.0, w: 3.8, h: 1.0 },
    { x: -15.0, w: 2.8, h: 1.45 },
    { x: -12.4, w: 2.6, h: 0.85 },
    { x: -9.4, w: 3.4, h: 1.3 }, // the Parachute Jump ends here
    { x: -7.0, w: 2.2, h: 0.95 },
    { x: -5.6, w: 2.4, h: 1.25 }, // the Thunderbolt ends here
    { x: -4.0, w: 2.0, h: 0.7 },
    { x: 2.4, w: 2.4, h: 0.8 },
    { x: 4.6, w: 3.0, h: 1.35 }, // the Wonder Wheel ends here
    { x: 7.4, w: 2.6, h: 1.25 }, // the Astrotower ends here
    { x: 9.8, w: 2.4, h: 0.9 },
    { x: 11.6, w: 3.0, h: 1.3 }, // the Cyclone ends here
    { x: 14.6, w: 3.0, h: 1.0 },
    { x: 17.8, w: 3.4, h: 1.45 },
  ].map((b) => ({ ...b, z: behind(b.x) }));

  const blockGeometries = BLOCKS.map((b) => new BoxGeometry(b.w, b.h, BLOCK_D));
  // A cornice on every other roof. One flat line on top of a box is the whole
  // difference between a building and a crate at this size.
  const capGeometries = BLOCKS.map((b) => new BoxGeometry(b.w + 0.12, 0.07, BLOCK_D + 0.12));

  /** Two water tanks on legs: the most New York silhouette there is, for six
   *  meshes each, and the only thing on the horizon that says "city" rather
   *  than "fairground". */
  const TANKS = [
    { x: -15.0, base: 1.45 },
    { x: 14.6, base: 1.0 },
  ].map((t) => ({ ...t, z: behind(t.x) }));

  const tankLegGeometry = new BoxGeometry(0.05, 0.42, 0.05);
  const tankBodyGeometry = new CylinderGeometry(0.3, 0.33, 0.52, 10);
  const tankCapGeometry = new ConeGeometry(0.34, 0.2, 10);
  const TANK_LEGS = [
    { x: -0.2, z: -0.2 },
    { x: 0.2, z: -0.2 },
    { x: -0.2, z: 0.2 },
    { x: 0.2, z: 0.2 },
  ];

  // ---- Parachute Jump -------------------------------------------------------
  // 76 m of open steel, drawn 4.4 units tall — one two-hundredth of the tiles it
  // would really cover, and the right size for the frame, which is the only
  // measurement that exists under an orthographic camera.
  //
  // It is the tallest thing in the game and the one piece allowed to graze the
  // top of the shot, because it is also the thinnest: a cage you can see the
  // sky through from top to bottom. AND IT IS NOT RED. In 1979 it had been shut
  // for eleven years, unpainted, grey with rust. The red-and-neon tower everyone
  // draws is from this century — painting it red is the yellow bus all over.

  const JUMP_H = 3.95; // to the hub; the crown puts the finished top at 4.4
  const JUMP_FOOT = 0.52;
  const JUMP_HEAD = 0.13;

  const jumpHalf = (y: number) => JUMP_FOOT - (JUMP_FOOT - JUMP_HEAD) * (y / JUMP_H);

  const JUMP_LEAN = Math.atan((JUMP_FOOT - JUMP_HEAD) / JUMP_H);
  const jumpLegGeometry = new BoxGeometry(0.075, Math.hypot(JUMP_H, JUMP_FOOT - JUMP_HEAD), 0.075);
  const JUMP_LEGS = [
    { sx: 1, sz: 1 },
    { sx: 1, sz: -1 },
    { sx: -1, sz: 1 },
    { sx: -1, sz: -1 },
  ];

  const JUMP_LEVELS = [0.0, 0.78, 1.55, 2.3, 3.0, 3.6];
  const JUMP_BANDS = JUMP_LEVELS.slice(1).map((y) => ({ y, w: jumpHalf(y) * 2 }));
  const jumpBandGeometries = JUMP_BANDS.map((b) => new BoxGeometry(b.w, 0.045, 0.045));

  // The bracing zig-zags: one diagonal per bay, alternating, which is what makes
  // a row of horizontals read as a lattice instead of as a ladder.
  const JUMP_DIAGS = JUMP_LEVELS.slice(0, -1).map((y0, i) => {
    const y1 = JUMP_LEVELS[i + 1];
    const flip = i % 2 === 0 ? 1 : -1;
    const x0 = -flip * jumpHalf(y0);
    const x1 = flip * jumpHalf(y1);
    const dx = x1 - x0;
    const dy = y1 - y0;
    return {
      x: (x0 + x1) / 2,
      y: (y0 + y1) / 2,
      len: Math.hypot(dx, dy),
      rot: Math.atan2(dy, dx),
    };
  });
  const jumpDiagGeometries = JUMP_DIAGS.map((d) => new BoxGeometry(d.len, 0.035, 0.035));

  // The crown: twelve arms on a ring, like the skeleton of an umbrella blown
  // inside out. Twelve is not a decoration count, it is the number the tower
  // had, and it is what makes the silhouette identifiable at forty pixels.
  const CROWN_R = 0.3;
  const CROWN_ARMS = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: Math.cos(a) * CROWN_R, z: Math.sin(a) * CROWN_R, ry: -a };
  });
  const crownArmGeometry = new BoxGeometry(0.52, 0.035, 0.035);
  const crownHubGeometry = new CylinderGeometry(0.11, 0.13, 0.17, 8);
  const crownRingGeometry = new TorusGeometry(0.57, 0.028, 4, 24).rotateX(Math.PI / 2);
  const crownMastGeometry = new CylinderGeometry(0.03, 0.045, 0.55, 6);
  const crownCapGeometry = new SphereGeometry(0.055, 8, 6);
  // Four of the twelve cable drops, not twelve: at two pixels across, the other
  // eight would only turn the crown to mush.
  const cableGeometry = new CylinderGeometry(0.022, 0.022, 0.55, 5);
  const CABLES = [0, 3, 6, 9].map((i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: Math.cos(a) * 0.57, z: Math.sin(a) * 0.57 };
  });

  // ---- Wonder Wheel ---------------------------------------------------------
  // The one shape on the horizon that has to be seen face-on, and the pivot is
  // what guarantees it: the wheel always presents its disc, at every yaw, the
  // way a wheel does when you are standing on the beach looking at it.
  //
  // Two rims and twelve spokes, which is line-work — from the board, a fighter
  // standing in front of it is never standing on a filled shape.

  const WHEEL_R = 1.62;
  const WHEEL_HUB_Y = 1.88;
  const WHEEL_TOP = WHEEL_HUB_Y + WHEEL_R; // 3.5 — the top of the whole horizon

  const wheelRimGeometry = new TorusGeometry(WHEEL_R, 0.038, 4, 44);
  const wheelInnerGeometry = new TorusGeometry(1.16, 0.03, 4, 36);
  const wheelHubGeometry = new CylinderGeometry(0.14, 0.14, 0.3, 10).rotateX(Math.PI / 2);
  const wheelSpokeGeometry = new BoxGeometry(WHEEL_R, 0.032, 0.032);
  const wheelCabinGeometry = new BoxGeometry(0.2, 0.17, 0.15);

  const WHEEL_SPOKES = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: Math.cos(a) * (WHEEL_R / 2), y: Math.sin(a) * (WHEEL_R / 2), rot: a };
  });
  // The cabins hang level however far round they have gone. That is the whole
  // charm of a Ferris wheel and it costs one table.
  const WHEEL_CABINS = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    return { x: Math.cos(a) * 1.5, y: Math.sin(a) * 1.5 - 0.19 };
  });

  const WHEEL_LEAN = Math.atan(0.85 / WHEEL_HUB_Y);
  const wheelLegGeometry = new BoxGeometry(0.075, Math.hypot(WHEEL_HUB_Y, 0.85), 0.075);
  const WHEEL_LEGS = [
    { sx: 1, z: 0.32 },
    { sx: 1, z: -0.32 },
    { sx: -1, z: 0.32 },
    { sx: -1, z: -0.32 },
  ];
  const wheelTieGeometry = new BoxGeometry(1.7, 0.05, 0.05);

  // ---- The two wooden coasters ----------------------------------------------
  // One helper, two rides. A coaster is a polyline: give it the points and it
  // gives back the track segments, and the trestle goes under the joints.

  type Seg = { x: number; y: number; len: number; rot: number };

  function ridge(points: [number, number][]): Seg[] {
    const out: Seg[] = [];
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      const dx = x1 - x0;
      const dy = y1 - y0;
      out.push({
        x: (x0 + x1) / 2,
        y: (y0 + y1) / 2,
        len: Math.hypot(dx, dy),
        rot: Math.atan2(dy, dx),
      });
    }
    return out;
  }

  // The Cyclone: the lift hill, the crest, and the drop everybody in New York
  // has been on. It sits a whole block back from the boardwalk in real life, so
  // from the sand you only ever see the white hump over the rooftops — which is
  // exactly what the rooftop in front of it leaves showing.
  const CYCLONE_PTS: [number, number][] = [
    [-2.6, 0.2],
    [-1.7, 0.85],
    [-0.85, 1.6],
    [-0.3, 1.95],
    [0.15, 1.9],
    [0.6, 1.15],
    [1.05, 0.55],
    [1.6, 0.9],
    [2.1, 1.0],
    [2.7, 0.55],
  ];
  const CYCLONE_TRACK = ridge(CYCLONE_PTS);
  const cycloneRailGeometries = CYCLONE_TRACK.map((s) => new BoxGeometry(s.len, 0.085, 0.42));
  const cycloneTrimGeometries = CYCLONE_TRACK.map((s) => new BoxGeometry(s.len, 0.05, 0.46));
  const cyclonePostGeometries = CYCLONE_PTS.map((p) => new BoxGeometry(0.06, p[1], 0.06));

  // The Thunderbolt: in 1979 it had been shut for years with the weeds coming up
  // through it. Same helper, lower, sagging, and with a bay of track simply
  // missing — which is the only way a board can say "abandoned" without a word.
  const THUNDER_PTS: [number, number][] = [
    [-2.0, 0.15],
    [-1.3, 0.6],
    [-0.55, 1.1],
    [0.15, 1.25],
    [0.85, 0.85],
    [1.5, 1.0],
    [2.1, 0.5],
  ];
  const THUNDER_TRACK = ridge(THUNDER_PTS).filter((_, i) => i !== 3); // the hole
  const thunderRailGeometries = THUNDER_TRACK.map((s) => new BoxGeometry(s.len, 0.08, 0.38));
  const thunderPostGeometries = THUNDER_PTS.map((p) => new BoxGeometry(0.055, p[1], 0.055));
  const weedGeometry = new ConeGeometry(0.11, 0.34, 5);
  const WEEDS = [-1.6, -0.7, 0.2, 1.1, 1.9];

  // ---- Astroland ------------------------------------------------------------

  const towerShaftGeometry = new CylinderGeometry(0.04, 0.1, 3.5, 7);
  const towerBaseGeometry = new CylinderGeometry(0.2, 0.26, 0.24, 8);
  const towerRingGeometry = new TorusGeometry(0.17, 0.05, 4, 12).rotateX(Math.PI / 2);
  const towerMastGeometry = new CylinderGeometry(0.018, 0.018, 0.5, 5);

  const rocketBodyGeometry = new CylinderGeometry(0.14, 0.18, 0.72, 9);
  const rocketNoseGeometry = new ConeGeometry(0.14, 0.4, 9);
  const rocketFinGeometry = new BoxGeometry(0.04, 0.3, 0.22);
  const rocketStandGeometry = new BoxGeometry(0.42, 0.14, 0.32);
  const ROCKET_FINS = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

  // ---- The haze plates ------------------------------------------------------
  // Three, and every number in them is a clearance:
  //
  //   · DEEP sits at −11.3, which is behind the board's farthest corner (−10.6)
  //     and in front of the deep rooftops (−11.8). It is the only plate that
  //     crosses the middle of the screen, and it is what fills the hole left
  //     where the skyline deliberately has nothing.
  //   · The two WINGS sit at −4.4 and start at |x| = 6.6, because a plate at
  //     that depth would come in front of the sand if it reached any further in
  //     — the board's far edge crosses −4.4 at |x| = 6.0. Their inner ends are
  //     washed out in the texture, so the cut itself is never visible.
  //
  // The right-hand wing is the left one at scale −1: one texture, two plates.

  const hazeDeepGeometry = new PlaneGeometry(56, 5.4);
  const hazeWingGeometry = new PlaneGeometry(19.4, 5.4);
  const sunGeometry = new PlaneGeometry(22, 11);

  const HAZE_DEEP_AT: [number, number, number] = [0, 0.6, -11.3];
  const HAZE_WING_AT: [number, number, number] = [-16.3, 1.0, -4.4];
  const SUN_AT: [number, number, number] = [8.6, -2.0, -11.6];

  // ---- Barandilla (3×1) -----------------------------------------------------
  // Top 0.66, under everybody's belt. It is not cover and it never will be —
  // line of fire is read off the map's heights, and this is a picket of 50 mm
  // bars. What it is for is the shadow: at this hour it lays two metres of
  // striped iron down the deck, and that is the whole reason the boardwalk reads
  // as a boardwalk from above instead of as a brown strip.

  const RAIL_Z = 0.36; // the seaward edge of the tile
  const railTopGeometry = new BoxGeometry(2.98, 0.075, 0.09);
  const railMidGeometry = new BoxGeometry(2.94, 0.05, 0.06);
  const railPostGeometry = new BoxGeometry(0.1, 0.66, 0.1);
  const balusterGeometry = new BoxGeometry(0.05, 0.5, 0.05);
  const BALUSTERS = [-1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05];
  /** One bar gone and one bent. Forty years of winters, in two numbers. */
  const RAIL_MISSING = 4;
  const RAIL_BENT = 1;

  // ---- Farola (1×1) ---------------------------------------------------------
  // Top 2.1, on a post 90 mm across. It breaks the level-5 ceiling and it is
  // allowed to, on the same terms as the car's aerial and the beaded curtain:
  // it is a vertical sliver you can see a whole fighter through, one camera
  // rotation clears it, and it only ever stands on the landward row of the deck
  // where nobody fights.

  const lampBaseGeometry = new BoxGeometry(0.24, 0.13, 0.24);
  const lampPostGeometry = new CylinderGeometry(0.045, 0.06, 1.8, 7);
  const lampCollarGeometry = new CylinderGeometry(0.075, 0.075, 0.06, 8);
  const lampGlobeGeometry = new SphereGeometry(0.125, 10, 8);
  const lampCapGeometry = new ConeGeometry(0.15, 0.12, 8);

  // ---- Banco (1×1) ----------------------------------------------------------
  // Backs to the sea, the way they are bolted down out there — so at turns 0 the
  // backrest is on the +Z side and a man sitting on it is looking inland.

  const benchSeatGeometry = new BoxGeometry(0.92, 0.06, 0.42);
  const benchSlatGeometry = new BoxGeometry(0.92, 0.04, 0.1);
  const benchBackGeometry = new BoxGeometry(0.92, 0.3, 0.05);
  const benchEndGeometry = new BoxGeometry(0.07, 0.44, 0.42);
  const BENCH_SLATS = [-0.14, 0.02, 0.16];

  // ---- Pilotes (3×1) --------------------------------------------------------
  // The one piece that does two jobs: a line of them along the foot of the deck
  // is the piling forest, and the same line run south into the water is the
  // groyne. Nothing over 0.9, so a man standing behind them keeps everything
  // from the chest up — and again, what they are really for is the shadow. Six
  // posts at this hour rake six stripes clean across the sand.

  const POSTS = [
    { x: -1.3, h: 0.82, tilt: 0.05 },
    { x: -0.88, h: 0.62, tilt: -0.03 },
    { x: -0.42, h: 0.9, tilt: 0.02 },
    { x: 0.0, h: 0.48, tilt: 0.07 },
    { x: 0.42, h: 0.74, tilt: -0.05 },
    { x: 0.9, h: 0.38, tilt: 0.09 },
    { x: 1.32, h: 0.66, tilt: -0.02 },
  ];
  const postGeometries = POSTS.map((p) => new CylinderGeometry(0.075, 0.085, p.h, 6));
  const tieBarGeometry = new BoxGeometry(0.9, 0.04, 0.04);

  // ---- Basura (1×1) ---------------------------------------------------------
  // "¿Esto es por lo que hemos peleado toda la noche?" — the line the whole
  // stage is built on. The sky is magnificent and the ground is a tip, and this
  // is the cheap half of that contradiction: four flat objects, nothing over
  // 0.3, and every one of them casting at a sun that is almost on the ground.

  const tyreGeometry = new TorusGeometry(0.17, 0.07, 5, 12).rotateX(Math.PI / 2);
  const canGeometry = new CylinderGeometry(0.035, 0.035, 0.1, 7).rotateZ(Math.PI / 2);
  const slatGeometry = new BoxGeometry(0.4, 0.03, 0.08);
  const newsGeometry = new BoxGeometry(0.22, 0.012, 0.16);
  const litterBottleGeometry = new CylinderGeometry(0.048, 0.052, 0.19, 7).rotateZ(Math.PI / 2);
  const LITTER_CANS = [
    { x: -0.2, z: 0.22, rot: 0.6 },
    { x: 0.26, z: -0.12, rot: 2.1 },
    { x: 0.05, z: 0.34, rot: 1.2 },
  ];

  // ---- Rompiente (4×1) ------------------------------------------------------
  // Flat plates on the tideline, drawn the way the burning car draws its pool of
  // light: renderOrder 1, over the terrain and under the units, so the water's
  // edge reads as one more layer of the board rather than as something sitting
  // on it. It is the only thing on this board that moves, and at four in the
  // morning on an empty beach that is exactly right.

  const foamGeometry = new BoxGeometry(3.9, 0.02, 0.5);
  const washGeometry = new BoxGeometry(3.94, 0.015, 1.15);
  const tongueGeometry = new BoxGeometry(0.62, 0.02, 0.26);
  const TONGUES = [-1.25, 0.1, 1.35];

  const foam = new MeshBasicMaterial({
    color: '#cfd8d8',
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  const wash = new MeshBasicMaterial({
    color: '#9fb0ae',
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
</script>

<script lang="ts">
  import { T, useTask, useThrelte } from '@threlte/core';
  import { Vector3, type Group } from 'three';

  let {
    position = [0, 0, 0],
    rotation = 0,
    variant = 0,
  }: { position?: [number, number, number]; rotation?: number; variant?: number } = $props();

  const piece = $derived(((variant % PIECE_COUNT) + PIECE_COUNT) % PIECE_COUNT);
  const isHorizon = $derived(piece === PIECE.skyline);

  /** Deterministic per-instance variation: the same beach every reload. */
  const seed = $derived(
    hash2D(Math.round(position[0] * 4), Math.round(position[2] * 4), 41)
  );

  // ---- The pivot ------------------------------------------------------------
  // The one piece of machinery in this file. It reads the camera's azimuth off
  // the camera itself rather than taking it as a prop, because the prop contract
  // is position / rotation / variant and Scene has nothing else to give — and
  // because a backdrop that needs wiring through three files is a backdrop
  // somebody will eventually place wrong.
  //
  // The group sits on the origin, which is where tileToWorld centres every map,
  // so setting its Y rotation to the camera's yaw swings the whole horizon round
  // the middle of the beach and parks it opposite the viewer. At the default
  // view the rotation is 45° and the skyline's own axes line up with the screen:
  // +X across, −Z away. That is why every number above reads like a drawing.
  //
  // It writes the object directly instead of going through $state: a rotation
  // that changes sixty times a second through the reactive graph is sixty
  // invalidations of a component with a hundred and fifty meshes in it.

  let pivot = $state.raw<Group | undefined>(undefined);
  let tide = $state.raw<Group | undefined>(undefined);
  const { camera } = useThrelte();
  const forward = new Vector3();
  let elapsed = 0;

  useTask(
    () => {
      const g = pivot;
      const cam = camera.current;
      if (!g || !cam) return;
      cam.getWorldDirection(forward);
      // The camera looks at the board from its azimuth, so the direction back
      // out of the lens is the bearing we have to match.
      const yaw = Math.atan2(-forward.x, -forward.z);
      if (Math.abs(yaw - g.rotation.y) > 1e-4) g.rotation.y = yaw;
    },
    { running: () => isHorizon }
  );

  // The tide. One slow sine, phase-shifted per instance off its own position, so
  // four sections of surf along the same shoreline breathe out of step instead
  // of sliding up the sand like one bar. Nothing here touches a material — the
  // car may gutter its shared flame because exactly one car ever burns; the
  // waterline is placed four or five times and has to stagger.
  useTask(
    (delta) => {
      const g = tide;
      if (!g) return;
      elapsed += delta;
      const t = elapsed * 0.5 + seed * Math.PI * 2;
      g.position.z = Math.sin(t) * 0.3;
      const s = 1 + Math.sin(t * 0.73) * 0.06;
      g.scale.set(1, 1, s);
    },
    { running: () => piece === PIECE.surf }
  );
</script>

<!-- The pivot only ever turns for the horizon; for everything else it is an
     identity group and costs a matrix nobody looks at. The prop's own group is
     inside it, with the position and rotation the stage gave it, exactly as
     every other prop in this project. -->
<T.Group bind:ref={pivot}>
  <T.Group {position} rotation.y={rotation}>
    {#if piece === PIECE.skyline}
      <!-- ================= EL HORIZONTE ================= -->
      <!-- Nothing below casts or receives. It is outside the shadow camera's
           frustum, which is sized to the board, and a mesh that receives out
           there would sample the edge of the map and wear a false stripe. -->

      <!-- ---- The sun, first, so everything else is cut out of it ---- -->
      <T.Mesh geometry={sunGeometry} material={sunHaze} position={SUN_AT} />

      <!-- ---- Rooftops ---- -->
      {#each BLOCKS as b, i (i)}
        <T.Mesh
          geometry={blockGeometries[i]}
          material={i % 3 === 1 ? cityDark : cityFace}
          position={[b.x, b.h / 2, b.z]}
        />
        {#if i % 2 === 0}
          <T.Mesh
            geometry={capGeometries[i]}
            material={cityRoof}
            position={[b.x, b.h + 0.035, b.z]}
          />
        {/if}
      {/each}

      {#each TANKS as t, i (i)}
        {#each TANK_LEGS as l, j (j)}
          <T.Mesh
            geometry={tankLegGeometry}
            material={cityDark}
            position={[t.x + l.x, t.base + 0.21, t.z + l.z]}
          />
        {/each}
        <T.Mesh
          geometry={tankBodyGeometry}
          material={tankWood}
          position={[t.x, t.base + 0.68, t.z]}
        />
        <T.Mesh
          geometry={tankCapGeometry}
          material={cityDark}
          position={[t.x, t.base + 1.04, t.z]}
        />
      {/each}

      <!-- ---- Salto en paracaídas ---- -->
      {@const jz = RIDE_Z(JUMP_X)}
      {#each JUMP_LEGS as l, i (i)}
        <T.Mesh
          geometry={jumpLegGeometry}
          material={i === 0 || i === 1 ? jumpSteel : jumpShade}
          position={[
            JUMP_X + l.sx * ((JUMP_FOOT + JUMP_HEAD) / 2),
            JUMP_H / 2,
            jz + l.sz * ((JUMP_FOOT + JUMP_HEAD) / 2),
          ]}
          rotation.z={l.sx * JUMP_LEAN}
          rotation.x={-l.sz * JUMP_LEAN}
        />
      {/each}
      {#each JUMP_BANDS as b, i (i)}
        <T.Mesh geometry={jumpBandGeometries[i]} material={jumpSteel} position={[JUMP_X, b.y, jz]} />
        <T.Mesh
          geometry={jumpBandGeometries[i]}
          material={jumpShade}
          position={[JUMP_X, b.y, jz]}
          rotation.y={Math.PI / 2}
        />
      {/each}
      {#each JUMP_DIAGS as d, i (i)}
        <T.Mesh
          geometry={jumpDiagGeometries[i]}
          material={jumpShade}
          position={[JUMP_X + d.x, d.y, jz]}
          rotation.z={d.rot}
        />
      {/each}

      <T.Mesh geometry={crownHubGeometry} material={jumpSteel} position={[JUMP_X, JUMP_H, jz]} />
      <T.Mesh
        geometry={crownRingGeometry}
        material={jumpSteel}
        position={[JUMP_X, JUMP_H + 0.06, jz]}
      />
      {#each CROWN_ARMS as a, i (i)}
        <T.Mesh
          geometry={crownArmGeometry}
          material={i % 2 === 0 ? jumpSteel : jumpShade}
          position={[JUMP_X + a.x, JUMP_H + 0.06, jz + a.z]}
          rotation.y={a.ry}
          rotation.z={-0.08}
        />
      {/each}
      {#each CABLES as c, i (i)}
        <T.Mesh
          geometry={cableGeometry}
          material={jumpShade}
          position={[JUMP_X + c.x, JUMP_H - 0.22, jz + c.z]}
        />
      {/each}
      <T.Mesh
        geometry={crownMastGeometry}
        material={jumpSteel}
        position={[JUMP_X, JUMP_H + 0.34, jz]}
      />
      <T.Mesh
        geometry={crownCapGeometry}
        material={jumpShade}
        position={[JUMP_X, JUMP_H + 0.62, jz]}
      />

      <!-- ---- Thunderbolt: comido por la maleza desde hace años ---- -->
      {@const tz = RIDE_Z(THUNDER_X)}
      {#each THUNDER_PTS as p, i (i)}
        <T.Mesh
          geometry={thunderPostGeometries[i]}
          material={deadWood}
          position={[THUNDER_X + p[0], p[1] / 2, tz]}
        />
      {/each}
      {#each THUNDER_TRACK as s, i (i)}
        <T.Mesh
          geometry={thunderRailGeometries[i]}
          material={deadWood}
          position={[THUNDER_X + s.x, s.y, tz]}
          rotation.z={s.rot}
        />
      {/each}
      {#each WEEDS as wx, i (i)}
        <T.Mesh
          geometry={weedGeometry}
          material={weed}
          position={[THUNDER_X + wx, 0.17, tz + 0.5]}
          rotation.z={(i % 2 === 0 ? 1 : -1) * 0.12}
        />
      {/each}

      <!-- ---- Wonder Wheel ---- -->
      {@const wz = RIDE_Z(WHEEL_X)}
      {#each WHEEL_LEGS as l, i (i)}
        <T.Mesh
          geometry={wheelLegGeometry}
          material={i < 2 ? wheelSteel : wheelShade}
          position={[WHEEL_X + l.sx * 0.62, WHEEL_HUB_Y / 2, wz + l.z]}
          rotation.z={l.sx * WHEEL_LEAN}
        />
      {/each}
      <T.Mesh
        geometry={wheelTieGeometry}
        material={wheelShade}
        position={[WHEEL_X, 0.74, wz]}
      />
      <T.Mesh
        geometry={wheelRimGeometry}
        material={wheelSteel}
        position={[WHEEL_X, WHEEL_HUB_Y, wz]}
      />
      <T.Mesh
        geometry={wheelInnerGeometry}
        material={wheelShade}
        position={[WHEEL_X, WHEEL_HUB_Y, wz]}
      />
      {#each WHEEL_SPOKES as s, i (i)}
        <T.Mesh
          geometry={wheelSpokeGeometry}
          material={i % 2 === 0 ? wheelSteel : wheelShade}
          position={[WHEEL_X + s.x, WHEEL_HUB_Y + s.y, wz]}
          rotation.z={s.rot}
        />
      {/each}
      <T.Mesh
        geometry={wheelHubGeometry}
        material={wheelShade}
        position={[WHEEL_X, WHEEL_HUB_Y, wz]}
      />
      {#each WHEEL_CABINS as c, i (i)}
        <T.Mesh
          geometry={wheelCabinGeometry}
          material={i % 3 === 0 ? wheelSteel : wheelShade}
          position={[WHEEL_X + c.x, WHEEL_HUB_Y + c.y, wz + 0.05]}
        />
      {/each}

      <!-- ---- Astroland: la aguja y el cohete ---- -->
      {@const az = RIDE_Z(TOWER_X)}
      <T.Mesh geometry={towerBaseGeometry} material={cityDark} position={[TOWER_X, 0.12, az]} />
      <T.Mesh geometry={towerShaftGeometry} material={wheelSteel} position={[TOWER_X, 1.85, az]} />
      <T.Mesh geometry={towerRingGeometry} material={wheelShade} position={[TOWER_X, 2.2, az]} />
      <T.Mesh geometry={towerMastGeometry} material={wheelShade} position={[TOWER_X, 3.8, az]} />

      {@const rz = RIDE_Z(ROCKET_X)}
      <T.Mesh geometry={rocketStandGeometry} material={cityDark} position={[ROCKET_X, 0.07, rz]} />
      <T.Mesh geometry={rocketBodyGeometry} material={coasterWhite} position={[ROCKET_X, 0.5, rz]} />
      <T.Mesh geometry={rocketNoseGeometry} material={coasterRed} position={[ROCKET_X, 1.06, rz]} />
      {#each ROCKET_FINS as a, i (i)}
        <T.Mesh
          geometry={rocketFinGeometry}
          material={coasterRed}
          position={[ROCKET_X + Math.cos(a) * 0.16, 0.28, rz + Math.sin(a) * 0.16]}
          rotation.y={-a}
        />
      {/each}

      <!-- ---- Cyclone ---- -->
      {@const cz = RIDE_Z(CYCLONE_X)}
      {#each CYCLONE_PTS as p, i (i)}
        <T.Mesh
          geometry={cyclonePostGeometries[i]}
          material={coasterWhite}
          position={[CYCLONE_X + p[0], p[1] / 2, cz]}
        />
      {/each}
      {#each CYCLONE_TRACK as s, i (i)}
        <T.Mesh
          geometry={cycloneTrimGeometries[i]}
          material={coasterRed}
          position={[CYCLONE_X + s.x, s.y - 0.07, cz]}
          rotation.z={s.rot}
        />
        <T.Mesh
          geometry={cycloneRailGeometries[i]}
          material={coasterWhite}
          position={[CYCLONE_X + s.x, s.y, cz]}
          rotation.z={s.rot}
        />
      {/each}

      <!-- ---- La bruma, lo último que se dibuja del horizonte ---- -->
      <!-- Transparent, so three draws it after the opaque board and lets the
           depth buffer decide: the sand is nearer, so the sand wins, and the
           haze only ever shows where there is sky behind it. -->
      <T.Mesh geometry={hazeDeepGeometry} material={hazeDeep} position={HAZE_DEEP_AT} />
      <T.Mesh geometry={hazeWingGeometry} material={hazeWing} position={HAZE_WING_AT} />
      <T.Mesh
        geometry={hazeWingGeometry}
        material={hazeWing}
        position={[-HAZE_WING_AT[0], HAZE_WING_AT[1], HAZE_WING_AT[2]]}
        scale={[-1, 1, 1]}
      />
    {:else if piece === PIECE.railing}
      <!-- ================= BARANDILLA ================= -->
      {#each [-1, 1] as side (side)}
        <T.Mesh
          geometry={railPostGeometry}
          material={ironwork}
          position={[side * 1.42, 0.33, RAIL_Z]}
          castShadow
        />
      {/each}
      {#each BALUSTERS as bx, i (i)}
        {#if i !== RAIL_MISSING}
          <T.Mesh
            geometry={balusterGeometry}
            material={i === 3 ? rust : ironwork}
            position={[bx, 0.25, RAIL_Z]}
            rotation.z={i === RAIL_BENT ? 0.16 : 0}
            castShadow
          />
        {/if}
      {/each}
      <T.Mesh
        geometry={railTopGeometry}
        material={saltTimber}
        position={[0, 0.62, RAIL_Z]}
        castShadow
      />
      <T.Mesh geometry={railMidGeometry} material={ironwork} position={[0, 0.34, RAIL_Z]} castShadow />
      <!-- The plank edge the rail is bolted through: without it the posts look
           driven into the deck rather than fixed to its lip. -->
      <T.Mesh
        geometry={railMidGeometry}
        material={saltTimberDark}
        position={[0, 0.03, RAIL_Z + 0.06]}
        receiveShadow
      />
    {:else if piece === PIECE.lamp}
      <!-- ================= FAROLA ================= -->
      <T.Mesh geometry={lampBaseGeometry} material={ironwork} position={[0, 0.065, 0]} castShadow />
      <T.Mesh geometry={lampPostGeometry} material={ironwork} position={[0, 1.03, 0]} castShadow />
      <T.Mesh geometry={lampCollarGeometry} material={palePaint} position={[0, 1.9, 0]} />
      <T.Mesh geometry={lampGlobeGeometry} material={globeGlass} position={[0, 2.0, 0]} />
      <T.Mesh geometry={lampCapGeometry} material={ironwork} position={[0, 2.11, 0]} castShadow />
    {:else if piece === PIECE.bench}
      <!-- ================= BANCO ================= -->
      {#each [-1, 1] as side (side)}
        <T.Mesh
          geometry={benchEndGeometry}
          material={ironwork}
          position={[side * 0.42, 0.22, 0]}
          castShadow
        />
      {/each}
      <T.Mesh geometry={benchSeatGeometry} material={saltTimber} position={[0, 0.42, 0]} castShadow />
      {#each BENCH_SLATS as sz, i (i)}
        <T.Mesh
          geometry={benchSlatGeometry}
          material={i === 1 ? saltTimberDark : saltTimber}
          position={[0, 0.46, sz]}
        />
      {/each}
      <T.Mesh
        geometry={benchBackGeometry}
        material={saltTimber}
        position={[0, 0.62, 0.2]}
        rotation.x={0.14}
        castShadow
      />
    {:else if piece === PIECE.posts}
      <!-- ================= PILOTES ================= -->
      {#each POSTS as p, i (i)}
        <T.Mesh
          geometry={postGeometries[i]}
          material={i % 3 === 0 ? tar : saltTimberDark}
          position={[p.x, p.h / 2 - 0.06, (i % 2 === 0 ? 1 : -1) * 0.12]}
          rotation.z={p.tilt}
          castShadow
        />
      {/each}
      <!-- One tie-rod still holding two of them together, and rusted through. -->
      <T.Mesh
        geometry={tieBarGeometry}
        material={rust}
        position={[-1.09, 0.42, 0]}
        rotation.z={0.03}
        castShadow
      />
    {:else if piece === PIECE.litter}
      <!-- ================= BASURA ================= -->
      {@const spin = seed * Math.PI * 2}
      <T.Mesh
        geometry={tyreGeometry}
        material={tar}
        position={[-0.22, 0.04, -0.18]}
        rotation.y={spin}
        rotation.x={0.12}
        castShadow
      />
      {#each LITTER_CANS as c, i (i)}
        <T.Mesh
          geometry={canGeometry}
          material={tin}
          position={[c.x, 0.035, c.z]}
          rotation.y={c.rot + spin}
          castShadow
        />
      {/each}
      <T.Mesh
        geometry={slatGeometry}
        material={saltTimberDark}
        position={[0.18, 0.05, 0.02]}
        rotation.y={spin * 0.6 + 0.4}
        rotation.z={0.08}
        castShadow
      />
      <T.Mesh geometry={newsGeometry} material={paper} position={[-0.3, 0.012, 0.3]} rotation.y={spin * 1.3} />
      <T.Mesh
        geometry={litterBottleGeometry}
        material={bottleGlass}
        position={[0.34, 0.048, 0.3]}
        rotation.y={spin + 1.1}
        castShadow
      />
    {:else if piece === PIECE.surf}
      <!-- ================= ROMPIENTE ================= -->
      <T.Group bind:ref={tide}>
        <T.Mesh geometry={washGeometry} material={wash} position={[0, 0.02, -0.28]} renderOrder={1} />
        <T.Mesh geometry={foamGeometry} material={foam} position={[0, 0.035, 0]} renderOrder={1} />
        {#each TONGUES as tx, i (i)}
          <T.Mesh
            geometry={tongueGeometry}
            material={foam}
            position={[tx, 0.03, 0.3 + (i % 2) * 0.12]}
            renderOrder={1}
          />
        {/each}
      </T.Group>
    {/if}
  </T.Group>
</T.Group>