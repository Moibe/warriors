<script module lang="ts">
  // El cónclave de Van Cortlandt Park — the whole amphitheatre, as one prop.
  //
  // Same house rules as the comfort station, the car, the flat, the beach and
  // the lavatory: three.js primitives only, no texture files, flat shading,
  // high roughness, metalness 0, and NOT ONE REAL LIGHT. What glows is
  // emissive. And the same reason as Furniture.svelte for being ONE component
  // with nine pieces on `variant` rather than nine files:
  //
  //   · One palette. Midnight in a New York park has to agree with itself about
  //     what moonlight does to cut stone, to black iron and to galvanised wire.
  //     Nine files drift apart the first time somebody nudges a hex.
  //   · One PROPS key. A stage dresses a whole park by repeating one kind with
  //     different variants, the way the Orphans' block parks three cars.
  //   · One set of materials and geometries for the entire park. This stage
  //     places THIRTY-ONE of these — six arcade bays and a dozen fence tiles
  //     alone — and the Svelte compiler does NOT hoist a
  //     `new MeshStandardMaterial()` out of a plain <script>. So everything
  //     static lives in <script module> and every placement shares it.
  //
  // NOTHING in this file writes to a material, with ONE documented exception:
  // the police beacon, below. See "THE ONE ANIMATED PIECE".
  //
  // Authored FACING SOUTH (+Z), the way stages.ts documents props, so `turns`
  // means what it says, and the men's room radiator is the reference: its back
  // is on local −Z and it goes against the EAST wall with turns 3. So turns 1
  // puts a back on the west wall and turns 3 puts a back on the east wall. The
  // arcade's wall face is on local −Z, which at turns 0 is the NORTH wall —
  // which is where row 0 is, so the arcade is placed unturned.
  //
  // `position` puts the group at the CENTRE of its tile footprint, at
  // height · LEVEL, and LOCAL y = 0 is that plane. Author upward from zero.
  // Authoring at +0.5 instead of 0 is the documented past bug; do not.
  //
  // ---- THE BOARD THIS DRESSES ----------------------------------------------
  //
  // 18 × 14, `vanCortlandt`, and it is the TUTORIAL. A stone amphitheatre: the
  // floor of the bowl is level 0 at rows 1–4, x 1–9 — where Cyrus fell and
  // where Cleon is pinned — and the terraces step UP to the south and to the
  // east, 1, 2, 3, 4, 5. Four fixed walls hem it in and every one of them is
  // blocked masonry the terrain has already drawn:
  //
  //   row 0, x 0–11   the ARCADE WALL, level 5 → world 1.25
  //   x 0, rows 0–9   the FALSE WALL down the west side, level 5
  //   x 4 and x 12    two PARAPETS down the seating, rows 5–8, level 5
  //   row 13          the FENCE LINE, level 5 — except x 11–14, which is the
  //                   HOLE THEY WENT THROUGH, and is the exit
  //
  // Everything in this file is a SKIN on one of those, a small object on the
  // stone, or off the board entirely. Not one piece adds a blocked square the
  // map has not already claimed.
  //
  // ---- HEIGHTS, AND THIS IS THE IMPORTANT PART ------------------------------
  //
  // A fighter is 1.55. The camera sits at 30° by default and 53° raised, at 45°
  // of yaw, so a tile step toward the camera drops the sight line by
  // 0.707 · tan(30°) = 0.40 (0.93 raised). Read it as: a piece H tall hides, of
  // a man standing ONE TILE BEHIND it, everything below H − 0.40.
  //
  // H is measured above the floor the piece stands on, which is the floor the
  // man behind it is standing on too, so the subtraction is honest.
  //
  //   piece       H      H−0.40   H−0.93   hides, of a man one tile behind
  //   litter      0.012  −0.39    −0.92    nothing. It is paper on the stone.
  //   cyrus       0.22   −0.18    −0.71    nothing.
  //   fenceGap    0.30   −0.10    −0.63    nothing, and it hangs off the lip.
  //   bin         0.34   −0.06    −0.59    nothing.
  //   fence       1.02    0.62     0.09    nothing: it is a LATTICE (below).
  //   arcade      1.25    0.85     0.32    nothing: flat on a 1.25 wall.
  //   cruiser     1.42    1.02     0.49    nothing: it is off the board.
  //   treeline    2.00    1.60     1.07    nothing: it is off the board.
  //   lamp        2.24    1.84     1.31    nothing: a 0.09 column, head at 1.96.
  //
  // THE RULE THIS FILE HOLDS, AND IT IS HARSHER THAN ANY OTHER BOARD'S BECAUSE
  // THIS IS THE ONE THE PLAYER IS LEARNING ON:
  //
  //        NOTHING WIDE BETWEEN 0.62 AND 1.95.
  //        Wires and poles may pass through that band. Masses may not.
  //
  // Only two pieces on the board are in that band at all, and each buys its
  // pass with a number:
  //
  //   · fence — a chain-link LATTICE. Nothing continuous in it is thicker than
  //     0.06: the rails are 50 mm stock, the wires 22 mm. It STRIPES a man
  //     standing behind it, it never MASKS him. That is the whole difference
  //     between a fence and a wall, and it is the reason a fence is allowed to
  //     be 1.02 tall on the one line of tiles the player has to walk out over.
  //   · lamp — a 0.09 column with the lantern above the band entirely. The
  //     head's bottom is at 1.96, and the arithmetic is: a man one tile behind
  //     sees the head at 1.96 − 0.40 = 1.56, which clears his 1.55 by ten
  //     millimetres.
  //     So the lamp is only legal on a tile whose level is EQUAL TO OR ABOVE
  //     the men near it. Drop it a terrace below them and the ten millimetres
  //     become minus a quarter of a metre, and the tutorial board eats a head.
  //
  // The arcade is the geometric exemption the lavatory already established: a
  // thing lying FLAT ON A WALL TALLER THAN IT cannot hide anybody, because the
  // wall already owns that silhouette and owns more of it. The arcade wall is
  // level 5 = 1.25 and the arcade tops out at exactly 1.25. Not one millimetre
  // of it floats over the bowl.
  //
  // ---- THE OFF-BOARD ARITHMETIC, WHICH IS THE SECOND RULE -------------------
  //
  // `cruiser` and `treeline` carry `offBoard: true` and may NEVER be placed
  // inside the play field. That is not a style note, it is what lets them be
  // 1.42 and 2.00 tall on a board where 0.62 is the ceiling.
  //
  // The camera turns in four quarters, so "behind the board" is only behind it
  // at two of them. At the opposite yaw an off-board piece is BETWEEN the
  // camera and the board. One tile of distance from the camera lifts a thing
  // 0.40 up the screen, so the rim it hides behind is worth 0.40 per tile more
  // than its own height, and the rule falls straight out:
  //
  //        an off-board piece must top out UNDER   R + 0.40 × N
  //
  // where R is the height of the rim it stands behind and N the number of tiles
  // beyond that rim. Stay under it and the rim's own silhouette swallows the
  // piece at every yaw. Worked, for this board:
  //
  //   cruiser  1.42, behind the arcade wall R = 1.25:
  //            N = 1 → 1.65 > 1.42 ✓.  Place it at N = 2 (1.75 of margin) so
  //            the searchlight has somewhere to throw.
  //   treeline 2.00, behind the arcade wall R = 1.25:
  //            N = 2 → 2.05 > 2.00 ✓, and that is 50 mm of room. Use N = 3.
  //            behind the EAST terrace rim R = 1.00 (level 4):
  //            N = 2 → 1.80 ✗.  N = 3 → 2.20 ✓. Three tiles, minimum.
  //            behind the FENCE LINE R = 1.25 + fence 1.02 = 2.27: any N.
  //
  // At the raised 53° every one of those budgets grows to 0.93 per tile, so the
  // shallow camera is the binding case and the numbers above are the real ones.
  //
  // Coney Island solved the same problem by hanging its horizon on a pivot that
  // follows the camera's azimuth. That cost a useThrelte, a per-frame matrix and
  // a paragraph of explanation, and it was the right answer THERE because a
  // 45-metre Ferris wheel cannot be got under any rim. A police car and a row of
  // trees can. This board buys it with geometry instead. DO NOT ADD A PIVOT.
  //
  // ---- THE OVERLAY CONTRACT, AND IT IS THE ONE LESSON OF THE BOARD ----------
  //
  // The game's own tile overlays lift at 0.02 (movement), 0.03 (weapon reach),
  // 0.045 (burst) and 0.055 (THE WAY OUT). Two pieces here live on tiles those
  // overlays are drawn on, and both are pinned under all four:
  //
  //   · fenceGap sits ON the exit tiles. If anything it draws rose over the
  //     green exit panel, the board would have hidden the only thing it is
  //     teaching — that this battle is won by leaving. So NOTHING it draws
  //     inside its own footprint goes above 0.013, and the piece spends its
  //     declared 0.30 entirely OFF the board: the peeled flap of cut fence
  //     hangs south over the park's outer lip, past local x = +0.52, which at
  //     turns 3 is beyond the last row of tiles the board has. That is the
  //     whole trick, and it only works because the fence line IS the southern
  //     edge — there is no tile out there to spoil.
  //   · litter is paper on stone and never leaves 0.012.
  //
  // Both use `depthWrite: false` and `renderOrder 0`, so they sort under the
  // overlays by geometry instead of arguing with them.
  //
  // ---- THE ONE ANIMATED PIECE, AND WHY IT EARNS ITS KEEP --------------------
  //
  // The cruiser, and only the cruiser, has a useTask, gated
  // `running: () => piece === PIECE.cruiser`. Every other placement on this
  // board costs zero per-frame CPU, the way the lavatory and the flat do.
  //
  // Three arguments, and none of them is decoration:
  //
  //   1. EVERY OTHER OBJECT ON THIS BOARD IS FROZEN ONE SECOND AFTER A GUNSHOT.
  //      That is correct for the objects and wrong for the screen. A tutorial
  //      that opens on a completely static board reads as a screenshot, and a
  //      player who believes the game has not started yet has been taught the
  //      wrong first lesson before he has touched anything. One thing moving at
  //      the back of the set says "this is running, it is waiting for you".
  //   2. IT IS THE ONLY OBJECT ON THE SET THAT EXPLAINS THE SCENE'S PREMISE.
  //      Nine men walk away from a fight instead of having one, and the reason
  //      is in the film: a police searchlight blinds Luther mid-aim and saves
  //      Fox. A board whose win condition is a hole in a fence needs a reason
  //      the player can SEE for why running is the answer, and the reason is
  //      sweeping across the back wall the whole time.
  //   3. IT CANNOT TOUCH A RULE. Off the board; above the men; unlit; pitched
  //      DOWN into the face of a 1.25 masonry wall that stops it dead; never
  //      descending into the play field at any yaw. And `running: () => false`
  //      degrades it to a parked car with its lights on, because the beacon
  //      domes are emissive whether or not anything ever writes to them.
  //
  // THE BEACON MATERIALS ARE MODULE-LEVEL AND SHARED, AND THE TASK WRITES THEM.
  // That is safe for exactly one reason: exactly one cruiser is ever placed.
  // It is the same exception ParkedCar takes for its guttering flame, and for
  // the same reason — two of them would pulse in step. The next person will not
  // guess this, so it is written here and again at the task.
  //
  // The searchlight shaft is a big unlit transparent volume and it WILL sort in
  // front of sprites at some yaws. Three mitigations together, all required:
  // opacity 0.09 (the faintest transparent thing in the project — the flat's
  // outer lamp pool is 0.10), renderOrder 0, and it is AIMED ALONG THE WALL
  // rather than out into the bowl, so the tiles it could ever cross are tiles
  // nobody stands on. It is an open cone rather than the obvious flat quad
  // because a quad goes edge-on and vanishes at two of the four yaws, which is
  // the one thing a beam that exists to be noticed must not do.
  //
  // ---- PALETTE -------------------------------------------------------------
  //
  // Midnight in a New York park. grid.ts gives the ground: 'stone' at #77756f
  // over #4e4d49 for the terraces, 'grass' at #40603a, lit by cold moonlight
  // from the east with a sodium tint in the ambient. Five families, and they
  // are kept far apart in VALUE rather than in hue, because this is the board
  // where a player learns to read a board and hue is the first thing that goes
  // when he is looking at nine sprites instead:
  //
  //   cut stone   #6b6963 / #7e7c74   The arcade. Deliberately a step LIGHTER
  //                                   than the terrain's cliff face #4e4d49 and
  //                                   a step DARKER than its top face #77756f —
  //                                   so the relief reads against the wall it
  //                                   is carved into without competing with the
  //                                   terraces a man is standing on.
  //   black iron  #1f2124 / #33363b   Gates, fence posts, lamp column, bin.
  //                                   Near-black, never black: pure black reads
  //                                   as a tear in the board.
  //   galvanised  #7f868c             The chain-link, and the LIGHTEST thing on
  //                                   the board on purpose. The fence is the way
  //                                   out; it has to be findable from the far
  //                                   corner of the bowl at a glance.
  //   dead grass  #2a3324 / #141a12   The rim scrub and the trees, dragged to
  //                                   near-black. The treeline is a wall, not a
  //                                   subject — it exists to stop the eye, and
  //                                   anything it says louder than that is
  //                                   stolen from the bowl.
  //   sodium      #ffc478 / #e07b12   The park lamps, and the only warm thing
  //                                   out here. Emissive, never a light.
  //
  // THE BOWL STAYS CLEAN. It is where the board is read: Cyrus, some handbills
  // and nothing else. The lamp deliberately does NOT draw a pool of light on
  // the stone the way the flat's lampshade does — on this board the only glow
  // on the ground should be the board's own overlays, because those are the
  // sentences the player is being asked to learn to read.
  //
  // ---- DETERMINISM ---------------------------------------------------------
  //
  // Per-instance variation is keyed exactly the way Furniture keys its `trim`:
  // the placement's own world position, quantised to quarter-tiles. So arcade
  // bays and fence tiles differ from each other and are IDENTICAL on every
  // reload. That last half is the point — this is the board a player is
  // learning, and a park that reshuffles itself between restarts cannot be
  // learned.

  import {
    BoxGeometry,
    CircleGeometry,
    ConeGeometry,
    CylinderGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
    PlaneGeometry,
    RingGeometry,
    SphereGeometry,
  } from 'three';
  import { hash2D } from './grid';

  /** Variant index per piece, so a stage names a lamp instead of guessing a 5. */
  export const PIECE = {
    arcade: 0,
    fence: 1,
    fenceGap: 2,
    cruiser: 3,
    cyrus: 4,
    lamp: 5,
    treeline: 6,
    litter: 7,
    bin: 8,
  } as const;

  /**
   * What the map has to agree with. The mesh is decoration, the '#' is the rule
   * — so `w`/`d` are the footprint the PropPlacement must declare AS AUTHORED
   * (a `turns` of 1 or 3 swaps them, the way it swaps everything), `top` is the
   * height of the highest solid part ABOVE THE FLOOR THE PIECE STANDS ON, and
   * `steps` says whether the piece was built to be walked over.
   *
   * `caps` is inherited from MensRoom and is false everywhere here: no piece on
   * this board is the top of an 'x' tile. Every wall it touches is a real
   * blocked terrain column that the map drew first.
   *
   * `wall` marks the two pieces that have such a column of their own to hang
   * on: the arcade on the back wall at row 0, the fence on the fence line at
   * row 13. Neither needs a footprint the map does not already own.
   *
   * `offBoard` is new, and it is a prohibition rather than a hint: those two
   * pieces may NEVER be placed inside the play field. See the off-board
   * arithmetic in the header — it is the only thing keeping them legal.
   *
   * One number is not what it looks like, and it is deliberate. `fenceGap.top`
   * is 0.30, but nothing that piece draws inside its own three tiles goes above
   * 0.013 — the 0.30 is the peeled flap of cut fence hanging SOUTH off the
   * board's outer lip, outside every tile it owns. The spec is honest: 0.30 is
   * the clearance the map must keep around the hole. The mesh spends none of it
   * where the green exit overlay lives.
   */
  export const PIECE_SPECS = {
    arcade: {
      name: 'Arcada',
      w: 2,
      d: 1,
      top: 1.25,
      steps: false,
      caps: false,
      wall: true,
      offBoard: false,
    },
    fence: {
      name: 'Valla',
      w: 1,
      d: 1,
      top: 1.02,
      steps: false,
      caps: false,
      wall: true,
      offBoard: false,
    },
    fenceGap: {
      name: 'Valla rota',
      w: 1,
      d: 3,
      top: 0.3,
      steps: true,
      caps: false,
      wall: false,
      offBoard: false,
    },
    cruiser: {
      name: 'Patrulla',
      w: 2,
      d: 2,
      top: 1.42,
      steps: false,
      caps: false,
      wall: false,
      offBoard: true,
    },
    cyrus: {
      name: 'Cyrus',
      w: 1,
      d: 1,
      top: 0.22,
      steps: false,
      caps: false,
      wall: false,
      offBoard: false,
    },
    lamp: {
      name: 'Farola',
      w: 1,
      d: 1,
      top: 2.24,
      steps: false,
      caps: false,
      wall: false,
      offBoard: false,
    },
    treeline: {
      name: 'Arboleda',
      w: 1,
      d: 1,
      top: 2.0,
      steps: false,
      caps: false,
      wall: false,
      offBoard: true,
    },
    litter: {
      name: 'Octavillas',
      w: 1,
      d: 1,
      top: 0.012,
      steps: true,
      caps: false,
      wall: false,
      offBoard: false,
    },
    bin: {
      name: 'Papelera',
      w: 1,
      d: 1,
      top: 0.34,
      steps: false,
      caps: false,
      wall: false,
      offBoard: false,
    },
  } as const;

  const PIECE_COUNT = Object.keys(PIECE).length;

  // ---- Materials ----------------------------------------------------------
  // One set for the whole park. Two tones on everything with a horizontal face,
  // for the reason the car's roof taught us: from this camera the tops of
  // things are most of what you see, so the tops carry the shape and the flanks
  // carry the colour. metalness is written out even where three would default
  // it, because a board full of iron and galvanised wire is exactly the file
  // where somebody would eventually be tempted.

  const ashlar = new MeshStandardMaterial({
    color: '#6b6963',
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });
  // The courses the moon actually hits: the coping, the plinth, the arch rings.
  // One step up, so the arcade reads as carved rather than as a painted panel.
  const ashlarLit = new MeshStandardMaterial({
    color: '#7e7c74',
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
  const ashlarDark = new MeshStandardMaterial({
    color: '#55534e',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  /** Two ages of stone. Each bay picks one from its own position. */
  const ASHLARS = [ashlar, ashlarLit];

  // Every hole on this board shares one near-black: the inside of an arch, the
  // mouth of the bin, a car window. Never pure black — that reads as a tear in
  // the board rather than as a dark place.
  const gloom = new MeshStandardMaterial({ color: '#15171a', roughness: 1, metalness: 0 });

  const iron = new MeshStandardMaterial({
    color: '#1f2124',
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });
  const ironLit = new MeshStandardMaterial({
    color: '#33363b',
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
  const rust = new MeshStandardMaterial({
    color: '#6e4128',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  // Galvanised, and the lightest thing on the board by a distance. That is a
  // decision, not an accident: the fence is the way out.
  const galv = new MeshStandardMaterial({
    color: '#7f868c',
    roughness: 0.6,
    metalness: 0,
    flatShading: true,
  });
  const galvDull = new MeshStandardMaterial({
    color: '#5d646a',
    roughness: 0.85,
    metalness: 0,
    flatShading: true,
  });

  // The park at the rim: near-black foliage over a band of scrub. The treeline
  // is a wall, not a subject.
  const bough = new MeshStandardMaterial({
    color: '#141a12',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const boughLit = new MeshStandardMaterial({
    color: '#1d2618',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const timber = new MeshStandardMaterial({
    color: '#20211c',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const scrub = new MeshStandardMaterial({
    color: '#2a3324',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  // Cyrus. Three muted tones and no fourth — see the piece itself for why.
  const leather = new MeshStandardMaterial({
    color: '#33291f',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const cloth = new MeshStandardMaterial({
    color: '#4a4436',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const skinTone = new MeshStandardMaterial({
    color: '#6b4a33',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  // Parks Department green, which is what every basket in every New York park
  // was and still is.
  const parkGreen = new MeshStandardMaterial({
    color: '#2c3a2e',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  // The RMP: dark blue body, white doors and roof, 1979. Blue-and-white is the
  // only livery that reads as police at six pixels across, which is the size a
  // door panel is at this zoom.
  const cruiserBlue = new MeshStandardMaterial({
    color: '#1c2738',
    roughness: 0.75,
    metalness: 0,
    flatShading: true,
  });
  const cruiserWhite = new MeshStandardMaterial({
    color: '#b3b8bc',
    roughness: 0.8,
    metalness: 0,
    flatShading: true,
  });
  const chrome = new MeshStandardMaterial({
    color: '#9aa0a6',
    roughness: 0.4,
    metalness: 0,
    flatShading: true,
  });
  const pane = new MeshStandardMaterial({
    color: '#10151c',
    roughness: 0.3,
    metalness: 0,
    flatShading: true,
  });
  const tyre = new MeshStandardMaterial({
    color: '#16171a',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  // ---- What is lit --------------------------------------------------------
  // Emissive, never a light. Tuned for NoToneMapping, which is what the canvas
  // runs.

  /**
   * THE ONE MUTABLE PAIR IN THIS FILE. The task below writes
   * `emissiveIntensity` on both of these sixty times a second. They are module
   * scope, so every placement of every piece shares them — which is safe for
   * exactly one reason: EXACTLY ONE CRUISER IS EVER PLACED. Two would pulse in
   * step, which is the tell that gives the trick away. Same exception ParkedCar
   * takes for its fire, same condition attached.
   *
   * The LOW value is not zero, and that is deliberate: at `running: () => false`
   * the domes keep their floor and the car is simply parked with its lights on.
   * The animation is an improvement on a correct still image, never a
   * prerequisite for one.
   */
  const BEACON_LOW = 0.34;
  const BEACON_HIGH = 2.15;
  const beaconRed = new MeshStandardMaterial({
    color: '#e0503a',
    emissive: '#c11d0e',
    emissiveIntensity: BEACON_HIGH,
    roughness: 0.35,
    metalness: 0,
  });
  const beaconWhite = new MeshStandardMaterial({
    color: '#f4efe2',
    emissive: '#ffe9c0',
    emissiveIntensity: BEACON_LOW,
    roughness: 0.35,
    metalness: 0,
  });

  const headlamp = new MeshStandardMaterial({
    color: '#e8e2cf',
    emissive: '#cfc49a',
    emissiveIntensity: 0.85,
    roughness: 0.4,
    metalness: 0,
  });
  const spotLens = new MeshStandardMaterial({
    color: '#eef3f6',
    emissive: '#dfe9ee',
    emissiveIntensity: 1.8,
    roughness: 0.35,
    metalness: 0,
  });

  // The park lamps. Sodium, and the only warm thing out here.
  const sodium = new MeshStandardMaterial({
    color: '#ffc478',
    emissive: '#e07b12',
    emissiveIntensity: 1.25,
    roughness: 0.45,
    metalness: 0,
  });

  /**
   * The searchlight shaft. 0.09 is the faintest transparent thing in the
   * project on purpose — the flat's outer lamp pool, the previous record, is
   * 0.10. `depthWrite: false` so it never punches a hole in what is drawn after
   * it, and renderOrder 0 against the overlays' 1 so the sort order agrees with
   * the geometry instead of arguing with it.
   */
  const SHAFT_ORDER = 0;
  const shaftGlow = new MeshBasicMaterial({
    color: '#dfe9f0',
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
  });

  // ---- What is flat -------------------------------------------------------
  // The two ground pieces. THE HEIGHT IS A CONTRACT, not a taste: the game's
  // overlays lift at 0.02, 0.03, 0.045 and 0.055, and this board's exit overlay
  // is the only sentence the tutorial has. Nothing below leaves 0.013.

  const FLAT_ORDER = 0;
  const FLAT_CEILING = 0.013;

  const handbill = new MeshBasicMaterial({
    color: '#cfc7ae',
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const handbillWorn = new MeshBasicMaterial({
    color: '#a49a82',
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const handbillInk = new MeshBasicMaterial({
    color: '#2a2b2c',
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  const trodden = new MeshBasicMaterial({
    color: '#54524a',
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const wireFlat = new MeshBasicMaterial({
    color: '#6b7278',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  // ---- Arcada (2×1, on the level-5 wall at row 0) -------------------------
  // The masonry arcade of arches, and the one built feature of the real
  // location. It is a RELIEF: the wall behind it is already 1.25 of blocked
  // terrain, and this adds nothing to that silhouette — it only carves it.
  //
  // The wall face is local z = −0.50, and nothing is drawn AT −0.50: two
  // coplanar surfaces z-fight, and a z-fight on the biggest flat object on the
  // board is the most visible bug this file could ship. Five layers, 12 mm
  // apart, 60 mm of total depth, deepest first:
  //
  //   L1  −0.488  the soffit of the arch and the back of the gate recesses
  //   L2  −0.476  the bars
  //   L3  −0.464  the arch rings, the jambs, the gate frames
  //   L4  −0.452  the pier faces
  //   L5  −0.440  plinth, string course and coping — the proudest courses
  //
  // Two bays per placement, one per tile, so six placements dress the twelve
  // tiles of row 0 and the bay pitch never drifts off the grid.

  const WALL_FACE = -0.5;
  const L1 = WALL_FACE + 0.012;
  const L2 = WALL_FACE + 0.024;
  const L3 = WALL_FACE + 0.036;
  const L4 = WALL_FACE + 0.048;
  const L5 = WALL_FACE + 0.06;

  const ARCADE_TOP = 1.25;
  /** Bay centres, one per tile of the 2-wide footprint. */
  const ARCADE_BAYS = [-0.5, 0.5];
  const ARCH_R = 0.3; // half the opening, and the radius of its head
  const ARCH_SPRING = 0.5; // where the straight jambs stop and the curve starts
  const ARCH_FOOT = 0.09; // the plinth the arches stand on

  const plinthGeometry = new BoxGeometry(2.0, ARCH_FOOT, 0.012);
  const stringCourseGeometry = new BoxGeometry(2.0, 0.06, 0.012);
  const copingGeometry = new BoxGeometry(2.02, 0.08, 0.012);
  // The pier between the two bays, and the two half-piers at the seams. Half,
  // so that two arcade placements butting up give one 0.40 pier and not two
  // coincident boxes arguing about depth.
  const pierGeometry = new BoxGeometry(0.4, ARCADE_TOP - ARCH_FOOT - 0.08, 0.012);
  const pierHalfGeometry = new BoxGeometry(0.2, ARCADE_TOP - ARCH_FOOT - 0.08, 0.012);

  const archRecessGeometry = new BoxGeometry(ARCH_R * 2, ARCH_SPRING - ARCH_FOOT, 0.012);
  // The half-disc that closes the top of the recess, and the voussoir band over
  // it. RingGeometry and CircleGeometry both already face +Z, which is out of
  // the wall and toward the bowl.
  const archSoffitGeometry = new CircleGeometry(ARCH_R, 14, 0, Math.PI);
  const archRingGeometry = new RingGeometry(ARCH_R, ARCH_R + 0.08, 14, 1, 0, Math.PI);
  const archJambGeometry = new BoxGeometry(0.08, ARCH_SPRING - ARCH_FOOT, 0.012);

  // The gate that closes an arch. Half the bays get one, from their own
  // position — a blank dark arch and a barred one are the same wall, and the
  // difference between them is the only thing that stops twelve identical
  // openings reading as wallpaper.
  const archBarGeometry = new BoxGeometry(0.024, 0.59, 0.02);
  const archRailGeometry = new BoxGeometry(0.58, 0.028, 0.02);
  const ARCH_BARS = [-0.21, -0.07, 0.07, 0.21];

  // "…with metal gates above." The band of barred gates over the arcade, which
  // is what the real arches carry. 0.96 → 1.17, under the coping.
  const GATE_Y = 1.065;
  const gateRecessGeometry = new BoxGeometry(0.78, 0.21, 0.012);
  const gateBarGeometry = new BoxGeometry(0.022, 0.19, 0.02);
  const gateRailGeometry = new BoxGeometry(0.76, 0.026, 0.02);
  // Frame JAMBS rather than a lintel: the string course tops out at 0.94 and
  // the coping starts at 1.17, so there is no vertical room left for a head —
  // a lintel would live entirely behind two courses that are proud of it.
  const gateJambGeometry = new BoxGeometry(0.05, 0.23, 0.012);
  const GATE_BARS = [-0.24, -0.08, 0.08, 0.24];

  // ---- Valla (1×1, standing on the level-5 fence line) --------------------
  // Chain-link, and it must be a LATTICE, not a mass. Nothing continuous in it
  // is over 0.06: top rail and bottom tension wire at 50 mm, fabric wires at
  // 22 mm, one 70 mm post per tile. Total occlusion across a tile is about an
  // eighth of its width, so a man behind it is STRIPED and never MASKED — which
  // is the only reason a 1.02 object is allowed to stand on the row nine men
  // have to walk out over.
  //
  // Symmetric about local z = 0, because a fence has no front. `turns` here
  // only decides which way the RUN lies: 0 or 2 east–west, 1 or 3 north–south.

  const FENCE_POST_H = 1.0;
  const FENCE_TOP = 1.02;

  const fencePostGeometry = new CylinderGeometry(0.035, 0.038, FENCE_POST_H, 6);
  const fenceCapGeometry = new CylinderGeometry(0.046, 0.046, 0.02, 6);
  const fenceTopRailGeometry = new BoxGeometry(1.01, 0.05, 0.05);
  const fenceTensionGeometry = new BoxGeometry(1.01, 0.03, 0.03);
  const fenceWireGeometry = new BoxGeometry(0.022, 0.86, 0.022);
  const fenceDiagGeometry = new BoxGeometry(0.022, 1.1, 0.022);
  const FENCE_WIRES = [-0.4, -0.2, 0, 0.2, 0.4];

  // ---- Valla rota (1×3, ON the exit tiles) --------------------------------
  // The hole they went through, and the most rule-bound object on the board.
  //
  // Authored as a run along local +Z, three tiles, with the cut fabric peeled
  // out along local +X. THE STAGE MUST PLACE IT WITH turns 3: that swings the
  // run east–west along the fence line and points +X SOUTH, which is off the
  // southern edge of an 18×14 board — no row 14 exists. Any other turn puts the
  // peeled flap back inside the park, over tiles men stand on, and the piece
  // becomes illegal.
  //
  // Everything inside the footprint is a PLANE at 0.006–0.012, unlit,
  // `depthWrite: false`, renderOrder 0. Planes rather than thin boxes because a
  // plane has no thickness to spend and this piece has 13 millimetres to live
  // in. See FLAT_CEILING.

  const gapPathGeometry = new PlaneGeometry(0.68, 2.86).rotateX(-Math.PI / 2);
  const gapMatGeometry = new PlaneGeometry(0.44, 0.6).rotateX(-Math.PI / 2);
  const gapWireGeometry = new PlaneGeometry(0.03, 0.86).rotateX(-Math.PI / 2);
  /** Where the trodden-flat fabric ended up. All of it under 0.013. */
  const GAP_MATS = [
    { x: -0.12, z: -0.92, rot: 0.24, y: 0.007 },
    { x: 0.16, z: 0.34, rot: -0.38, y: 0.009 },
    { x: -0.06, z: 1.02, rot: 0.12, y: 0.011 },
  ];
  const GAP_WIRES = [
    { x: -0.24, z: -1.16, rot: 0.9, y: 0.008 },
    { x: 0.22, z: -0.42, rot: -0.55, y: 0.01 },
    { x: -0.18, z: 0.18, rot: 1.35, y: 0.012 },
    { x: 0.26, z: 0.88, rot: -1.1, y: 0.0085 },
    { x: 0.02, z: 1.3, rot: 0.42, y: 0.0105 },
  ];

  // The 0.30 the spec declares, and it is spent ENTIRELY off the board: hinged
  // on the park's outer lip at local x ≈ 0.52 and peeled up and out to 0.88.
  // Nothing of it crosses back over an exit tile.
  const gapFlapGeometry = new BoxGeometry(0.44, 0.025, 2.1);
  const gapStubGeometry = new CylinderGeometry(0.035, 0.042, 0.24, 6);
  const GAP_FLAP_TILT = 0.62;

  // ---- Patrulla (2×2, OFF the board, behind the arcade) -------------------
  // Roof at 1.18, which is the car's real height — a 1970s sedan is 1.37 m
  // against a 1.78 m man, and at this scale that is 1.19. ParkedCar landed on
  // the same number from the same arithmetic and there is no reason to argue
  // with it. The beacon bar takes it to 1.42, which is what the off-board rule
  // is budgeted against.
  //
  // Nose toward +Z (south), the facing every prop here documents, because it is
  // parked NORTH of the arcade looking at it. That is also what aims the
  // searchlight: the beam is authored down the car's own +Z and never has to be
  // pointed by hand.

  const CAR_ROOF = 1.18;
  const CRUISER_TOP = 1.42;

  const wheelGeometry = new CylinderGeometry(0.17, 0.17, 0.16, 12).rotateZ(Math.PI / 2);
  const hubGeometry = new CylinderGeometry(0.07, 0.07, 0.17, 8).rotateZ(Math.PI / 2);
  const CAR_WHEELS = [
    { x: -0.64, z: 0.78 },
    { x: 0.64, z: 0.78 },
    { x: -0.64, z: -0.8 },
    { x: 0.64, z: -0.8 },
  ];

  const rockerGeometry = new BoxGeometry(1.4, 0.12, 2.36);
  const bodyGeometry = new BoxGeometry(1.36, 0.4, 2.44);
  const bonnetGeometry = new BoxGeometry(1.3, 0.09, 0.84);
  const bootGeometry = new BoxGeometry(1.3, 0.09, 0.66);
  const greenhouseGeometry = new BoxGeometry(1.2, 0.4, 1.16);
  const carRoofGeometry = new BoxGeometry(1.24, 0.06, 1.2);
  const screenGeometry = new BoxGeometry(1.1, 0.34, 0.03);
  const sideGlassGeometry = new BoxGeometry(0.02, 0.26, 1.02);
  const doorPanelGeometry = new BoxGeometry(0.02, 0.34, 1.12);
  const shieldGeometry = new BoxGeometry(0.015, 0.16, 0.2);
  const bumperGeometry = new BoxGeometry(1.4, 0.1, 0.1);
  const grilleGeometry = new BoxGeometry(1.08, 0.14, 0.04);
  const headlampGeometry = new CylinderGeometry(0.09, 0.09, 0.05, 10).rotateX(Math.PI / 2);

  // The beacon bar. Its own group, because the task turns it and nothing else.
  const BEACON_BASE_H = 0.05; // 1.18 → 1.23
  const DOME_H = 0.17; // 1.23 → 1.40
  const DOME_CAP_H = 0.02; // 1.40 → 1.42, and that is CRUISER_TOP
  const beaconBarGeometry = new BoxGeometry(0.78, BEACON_BASE_H, 0.2);
  const beaconFootGeometry = new BoxGeometry(0.2, 0.05, 0.16);
  const domeGeometry = new CylinderGeometry(0.095, 0.118, DOME_H, 8);
  const domeCapGeometry = new CylinderGeometry(0.058, 0.095, DOME_CAP_H, 8);
  const DOME_X = 0.26;

  // The searchlight. On the driver's A-pillar, where it actually was.
  const SPOT_POS: [number, number, number] = [-0.6, 1.16, 0.52];
  const spotArmGeometry = new CylinderGeometry(0.022, 0.022, 0.12, 6);
  const spotCanGeometry = new CylinderGeometry(0.085, 0.085, 0.13, 10).rotateX(Math.PI / 2);
  const spotLensGeometry = new CircleGeometry(0.072, 10);

  /**
   * The beam, as an open cone with its apex at the lens. 2.4 long, which dies
   * inside the arcade masonry at any sane placement — the wall is opaque and
   * depth-TESTS the shaft even though the shaft does not depth-WRITE, so the
   * stone clips the far end for free.
   *
   * Pitched 0.14 rad DOWN. That is the safety number: from 1.16 the beam's
   * centre falls to 0.83 at full reach and its upper edge peaks at about 1.21 —
   * under the arcade's 1.25 coping the whole way, so the light plays on the
   * wall's face and never clears its top into the sky, and never, at any yaw,
   * descends toward the bowl.
   */
  const SHAFT_LEN = 2.4;
  const SHAFT_PITCH = 0.14;
  const shaftGeometry = new ConeGeometry(0.3, SHAFT_LEN, 12, 1, true)
    .rotateX(-Math.PI / 2)
    .translate(0, 0, SHAFT_LEN / 2);

  /** ~1.1 s, one turn in two seconds, and a sweep of ±14° over eleven. */
  const BEACON_CYCLE = 1.1;
  const BEACON_SPIN = 3.0;
  const SWEEP_YAW = 0.244; // 14°, in radians
  const SWEEP_RATE = 0.56;

  // ---- Cyrus (1×1, on the floor of the bowl) ------------------------------
  // He is the reason there is a game and he is already dead when it starts. The
  // battle begins the moment after.
  //
  // HANDLED WITH RESTRAINT, and the restraint is an argument rather than
  // squeamishness. Four reasons, and any one of them would be enough:
  //
  //   1. THIS IS THE TUTORIAL. The lesson of the board is that you read tiles.
  //      A pool of red on the stone would be the loudest thing in the bowl and
  //      it would be competing with the movement panel for the same pixels, on
  //      the one board where the player has not yet learned what a movement
  //      panel is.
  //   2. THE SPRITES ARE THE PEOPLE. Nine of them, and the game asks the player
  //      to read each one as a man with a turn. A second figure, prone and more
  //      detailed than any of them, teaches him that some figures are scenery —
  //      which is the last thing a tactics board should ever say.
  //   3. THE FILM DOES NOT DWELL. Cyrus goes down in a wide shot and a silence.
  //      The scene's horror is that nine men are blamed for it, not the body.
  //   4. HE IS NINE BOXES AND TWO MUTED TONES. That is all it takes to read as
  //      a man on the ground at this camera, and anything past it is spectacle
  //      spent on a board that has none.
  //
  // Face up, head turned away, arms loose. Laid on a 0.34 rad diagonal to the
  // grid inside the group, so `turns` still means what it says and he still
  // never lines up square with the tiles — a body parallel to a tile edge reads
  // as furniture.

  const CYRUS_TILT = 0.34;
  const cyrusHeadGeometry = new BoxGeometry(0.19, 0.17, 0.21);
  const cyrusShoulderGeometry = new BoxGeometry(0.42, 0.16, 0.18);
  const cyrusChestGeometry = new BoxGeometry(0.36, 0.19, 0.48);
  const cyrusVestGeometry = new BoxGeometry(0.3, 0.04, 0.42);
  const cyrusHipGeometry = new BoxGeometry(0.32, 0.17, 0.22);
  const cyrusThighGeometry = new BoxGeometry(0.13, 0.15, 0.34);
  const cyrusShinGeometry = new BoxGeometry(0.11, 0.13, 0.3);
  const cyrusBootGeometry = new BoxGeometry(0.12, 0.12, 0.15);
  const cyrusArmGeometry = new BoxGeometry(0.32, 0.11, 0.12);
  const cyrusForearmGeometry = new BoxGeometry(0.1, 0.11, 0.36);

  // ---- Farola (1×1) -------------------------------------------------------
  // Head bottom at 1.96, top at 2.24, on a column 0.09 across at its widest.
  //
  // 1.96 is not a taste, it is the clearance: a man one tile behind sees the
  // head at 1.96 − 0.40 = 1.56, ten millimetres over his 1.55. Which is why the
  // piece is ONLY legal on a tile at a level equal to or above the men near it.
  // One terrace down and the ten millimetres become minus a quarter of a metre.
  //
  // No pool of light on the stone. The flat's lampshade draws one and it is
  // right there, because that board is lit by one lamp and the pool IS the
  // scene. Here the only glow on the ground should be the board's own overlays,
  // because on this board those are the sentences being taught.

  const LAMP_HEAD = 1.96;
  const LAMP_TOP = 2.24;
  const lampBaseGeometry = new BoxGeometry(0.26, 0.1, 0.26);
  const lampPlinthGeometry = new CylinderGeometry(0.08, 0.1, 0.14, 8);
  const lampColumnGeometry = new CylinderGeometry(0.034, 0.044, 1.78, 8);
  const lampCollarGeometry = new CylinderGeometry(0.07, 0.07, 0.05, 8);
  const lampGlassGeometry = new CylinderGeometry(0.15, 0.085, 0.14, 8);
  const lampCapGeometry = new ConeGeometry(0.17, 0.14, 8);

  // ---- Arboleda (1×1, OFF the board) --------------------------------------
  // A black wall of trees on the far rim. Two crowns and a scrub band per tile,
  // repeated along a line — and unlike everything else in this file it is
  // allowed to be a solid MASS, because there is nothing behind it to lose and
  // the off-board arithmetic keeps it under whatever rim it stands behind.
  //
  // Tops out at 1.98, which is the 2.00 the spec declares with 20 mm of honest
  // slack. See the header for what N that buys: three tiles behind a level-4
  // rim, two behind the level-5 arcade.

  const treeTrunkGeometry = new CylinderGeometry(0.05, 0.08, 1.2, 5);
  const treeTrunkLowGeometry = new CylinderGeometry(0.045, 0.07, 0.86, 5);
  /** Faceted blobs, flat-shaded. Oaks and maples, not the poplars of a poster. */
  const crownBigGeometry = new SphereGeometry(0.4, 7, 5);
  const crownMidGeometry = new SphereGeometry(0.31, 6, 5);
  const crownSmallGeometry = new SphereGeometry(0.24, 6, 4);
  const scrubGeometry = new BoxGeometry(1.06, 0.26, 0.5);
  const scrubLobeGeometry = new SphereGeometry(0.22, 6, 4);

  // ---- Octavillas (1×1) ---------------------------------------------------
  // Cyrus called every gang in the city to this park, and the handbills are how
  // they were told. So the litter on this board is not generic rubbish, it is
  // the invitation — nine tiles of it around the podium, trodden into the
  // stone.
  //
  // Planes, 0.004 to 0.012, unlit, depthWrite off, renderOrder 0. Same contract
  // as fenceGap: see FLAT_CEILING.

  const billGeometry = new PlaneGeometry(0.17, 0.23).rotateX(-Math.PI / 2);
  const billInkGeometry = new PlaneGeometry(0.12, 0.035).rotateX(-Math.PI / 2);
  const BILLS = [
    { x: -0.3, z: -0.24, rot: 0.42, y: 0.004 },
    { x: 0.12, z: -0.34, rot: -0.9, y: 0.006 },
    { x: 0.32, z: 0.06, rot: 1.24, y: 0.005 },
    { x: -0.16, z: 0.2, rot: -0.28, y: 0.008 },
    { x: 0.06, z: 0.36, rot: 0.76, y: 0.007 },
    { x: -0.36, z: 0.34, rot: -1.5, y: 0.009 },
    { x: 0.3, z: -0.4, rot: 0.14, y: 0.006 },
    { x: -0.04, z: -0.06, rot: -0.62, y: 0.01 },
  ];

  // ---- Papelera (1×1) -----------------------------------------------------
  // The green wire basket that stood in every New York park in 1979. Top 0.34,
  // well under the 0.62 line, so it is cover for nobody and hides nothing — it
  // is there because a park with no bin in it is a diagram of a park.

  const BIN_TOP = 0.34;
  const binBodyGeometry = new CylinderGeometry(0.26, 0.22, 0.3, 10);
  const binFootGeometry = new CylinderGeometry(0.235, 0.235, 0.02, 10);
  const binRimGeometry = new CylinderGeometry(0.275, 0.275, 0.035, 10);
  const binMouthGeometry = new CylinderGeometry(0.235, 0.235, 0.015, 10);
  const binHoopGeometry = new CylinderGeometry(0.268, 0.268, 0.022, 10);
  const binRibGeometry = new BoxGeometry(0.026, 0.3, 0.02);
  // Flat and low on purpose: the declared top is 0.34 and the overflow has to
  // live under it, so it is a crumpled handful and not a sack.
  const binSackGeometry = new BoxGeometry(0.19, 0.05, 0.16);
  const BIN_RIBS = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return { x: Math.sin(a) * 0.245, z: Math.cos(a) * 0.245, rot: a };
  });

  // ---- The rolls ----------------------------------------------------------
  // Keyed exactly the way Furniture keys its `trim`: the placement's own world
  // position, quantised to quarter-tiles. Same square, same park, every time.
  const SEEDS = [19, 23, 29, 31, 37, 41, 43, 47];
</script>

<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import type { Group } from 'three';

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

  /** Eight deterministic rolls for this placement, from where it stands. */
  const roll = $derived.by(() => {
    const kx = Math.round(position[0] * 4);
    const kz = Math.round(position[2] * 4);
    return SEEDS.map((s) => hash2D(kx, kz, s));
  });

  /**
   * Which of the two bays of this arcade placement is gated, and in what stone.
   * Four rolls per bay so two bays of one placement never agree by accident,
   * and so six placements along row 0 give twelve bays that all differ.
   */
  const bays = $derived(
    ARCADE_BAYS.map((bx, i) => {
      const r = [roll[i * 4], roll[i * 4 + 1], roll[i * 4 + 2], roll[i * 4 + 3]];
      return {
        x: bx,
        stone: ASHLARS[r[0] < 0.5 ? 0 : 1],
        ring: r[1] < 0.35 ? ashlarLit : ashlar,
        gated: r[2] < 0.5,
        // One bay in five has rusted through at the springing. It is two
        // meshes and it is the only warm pixel on twelve tiles of wall.
        bled: r[3] < 0.2,
      };
    })
  );

  /**
   * This tile of fence, and what forty years of winters did to it. A run of a
   * dozen is a dozen different panels and the same dozen on every reload.
   */
  const panel = $derived.by(() => ({
    lean: (roll[0] - 0.5) * 0.09,
    sag: roll[1] < 0.24 ? -0.045 : 0,
    // One wire in six is gone. That is what a fence looks like at the bottom of
    // a park nobody maintains, and it is also a free reminder that this thing
    // is a lattice: you can see straight through the hole.
    cut: roll[2] < 0.2 ? Math.floor(roll[3] * FENCE_WIRES.length) % FENCE_WIRES.length : -1,
    bow: (roll[4] - 0.5) * 0.09,
    post: roll[5] < 0.3 ? rust : galvDull,
  }));

  /** Which two trees stand on this tile of rim, and how far each one leans. */
  const trees = $derived.by(() => ({
    ax: -0.26 + (roll[0] - 0.5) * 0.2,
    az: (roll[1] - 0.5) * 0.3,
    aLean: (roll[2] - 0.5) * 0.12,
    bx: 0.3 + (roll[3] - 0.5) * 0.2,
    bz: (roll[4] - 0.5) * 0.3,
    bLean: (roll[5] - 0.5) * 0.12,
    swap: roll[6] < 0.5,
  }));

  // ---- The one task in the file -------------------------------------------
  // Refs are $state.raw, never plain $state: a deep proxy over an Object3D
  // walks a graph that points back at itself and never comes out. Terrain
  // learned that one first and wrote it down.

  let beaconRef = $state.raw<Group | undefined>(undefined);
  let spotRef = $state.raw<Group | undefined>(undefined);
  let elapsed = 0;

  /**
   * The only moving thing on this board, and see the header for the full case:
   * a static tutorial reads as a screenshot, and the searchlight is the only
   * object on the set that explains why nine men run instead of fighting.
   *
   * Three jobs. The bar turns. The two domes trade a low emissive for a high
   * one on a 1.1 s cycle — out of phase, so red and white alternate. The beam
   * yaws ±14° across the FACE of the arcade wall and nowhere else.
   *
   * IT WRITES MODULE-LEVEL MATERIALS, which every placement on the board
   * shares. That is on purpose and it is conditional: EXACTLY ONE CRUISER IS
   * EVER PLACED. Two would pulse in step. Same exception ParkedCar takes for
   * its guttering flame, same single-instance condition attached to it.
   *
   * The object writes go straight onto the Object3D rather than through $state,
   * for the reason the Coney Island pivot gives: a rotation that changes sixty
   * times a second through the reactive graph is sixty invalidations of a
   * component with a hundred meshes in it.
   */
  useTask(
    (delta) => {
      elapsed += delta;

      const bar = beaconRef;
      if (bar) bar.rotation.y = elapsed * BEACON_SPIN;

      const beat = 0.5 + 0.5 * Math.sin((elapsed / BEACON_CYCLE) * Math.PI * 2);
      const swing = BEACON_HIGH - BEACON_LOW;
      beaconRed.emissiveIntensity = BEACON_LOW + swing * beat;
      beaconWhite.emissiveIntensity = BEACON_LOW + swing * (1 - beat);

      const spot = spotRef;
      if (spot) spot.rotation.y = SWEEP_YAW * Math.sin(elapsed * SWEEP_RATE);
    },
    { running: () => piece === PIECE.cruiser }
  );
</script>

<T.Group {position} rotation.y={rotation}>
  {#if piece === PIECE.arcade}
    <!-- Relief on a wall the terrain already drew at 1.25. Every layer is a
         multiple of 12 mm off the face at z = −0.50, and nothing is AT −0.50. -->
    <T.Mesh geometry={plinthGeometry} material={ashlarLit} position={[0, ARCH_FOOT / 2, L5]} />
    <T.Mesh geometry={stringCourseGeometry} material={ashlarLit} position={[0, 0.91, L5]} />
    <T.Mesh geometry={copingGeometry} material={ashlarLit} position={[0, ARCADE_TOP - 0.04, L5]} />

    <!-- The pier between the bays, and two HALF piers at the seams so that two
         placements butting together make one pier instead of two z-fighting
         ones. -->
    <T.Mesh
      geometry={pierGeometry}
      material={ashlar}
      position={[0, (ARCADE_TOP - 0.08 + ARCH_FOOT) / 2, L4]}
    />
    {#each [-0.9, 0.9] as px (px)}
      <T.Mesh
        geometry={pierHalfGeometry}
        material={ashlarDark}
        position={[px, (ARCADE_TOP - 0.08 + ARCH_FOOT) / 2, L4]}
      />
    {/each}

    {#each bays as bay, i (i)}
      <!-- The opening: a straight recess to the springing, closed by a half
           disc. Both at L1, the deepest layer, so the arch reads as a hole in
           the wall rather than as a panel stuck on it. -->
      <T.Mesh
        geometry={archRecessGeometry}
        material={gloom}
        position={[bay.x, (ARCH_SPRING + ARCH_FOOT) / 2, L1]}
      />
      <T.Mesh geometry={archSoffitGeometry} material={gloom} position={[bay.x, ARCH_SPRING, L1]} />

      {#if bay.gated}
        <!-- Barred. The bars stop at 0.68, safely under the 0.714 the arch
             head leaves at the outermost bar, so nothing pokes through the
             curve. -->
        {#each ARCH_BARS as bx (bx)}
          <T.Mesh
            geometry={archBarGeometry}
            material={iron}
            position={[bay.x + bx, ARCH_FOOT + 0.295, L2]}
          />
        {/each}
        <T.Mesh geometry={archRailGeometry} material={iron} position={[bay.x, 0.18, L2]} />
        <T.Mesh geometry={archRailGeometry} material={ironLit} position={[bay.x, 0.62, L2]} />
      {/if}

      <!-- The voussoir band and its jambs, at L3. -->
      <T.Mesh
        geometry={archRingGeometry}
        material={bay.ring}
        position={[bay.x, ARCH_SPRING, L3]}
      />
      {#each [-1, 1] as side (side)}
        <T.Mesh
          geometry={archJambGeometry}
          material={bay.ring}
          position={[bay.x + side * (ARCH_R + 0.04), (ARCH_SPRING + ARCH_FOOT) / 2, L3]}
        />
      {/each}
      {#if bay.bled}
        <T.Mesh
          geometry={archJambGeometry}
          material={rust}
          position={[bay.x - (ARCH_R + 0.04), (ARCH_SPRING + ARCH_FOOT) / 2 - 0.06, L3 + 0.004]}
        />
      {/if}

      <!-- "…with metal gates above." The barred band over the arcade. -->
      <T.Mesh geometry={gateRecessGeometry} material={gloom} position={[bay.x, GATE_Y, L1]} />
      {#each GATE_BARS as gx (gx)}
        <T.Mesh geometry={gateBarGeometry} material={iron} position={[bay.x + gx, GATE_Y, L2]} />
      {/each}
      <T.Mesh geometry={gateRailGeometry} material={ironLit} position={[bay.x, GATE_Y, L2]} />
      {#each [-1, 1] as side (side)}
        <T.Mesh
          geometry={gateJambGeometry}
          material={bay.stone}
          position={[bay.x + side * 0.415, GATE_Y, L3]}
        />
      {/each}
    {/each}
  {:else if piece === PIECE.fence}
    <!-- Chain-link, and every member in it is a wire. The post is 70 mm, the
         top rail 50, the fabric 22. Nothing continuous is over 0.06, which is
         the whole reason a 1.02 object is legal on the line the player walks
         out over: it stripes a man, it does not mask him. -->
    <!-- The lean pivots at the post's FOOT, not at the tile centre. A rotation
         about the group origin would lift a post standing half a tile away off
         the stone by a couple of centimetres, and a fence post hovering over
         the exit row is the sort of thing a player only ever notices on the
         board he is being taught on. -->
    <T.Group position={[-0.5, 0, 0]} rotation.z={panel.lean}>
      <T.Mesh
        geometry={fencePostGeometry}
        material={panel.post}
        position={[0, FENCE_POST_H / 2, 0]}
        castShadow
      />
      <T.Mesh geometry={fenceCapGeometry} material={galvDull} position={[0, FENCE_TOP - 0.01, 0]} />
    </T.Group>

    <T.Group position={[0, 0, panel.bow]}>
      <T.Mesh
        geometry={fenceTopRailGeometry}
        material={galvDull}
        position={[0, 0.965 + panel.sag, 0]}
        rotation.z={panel.sag * 0.6}
      />
      <T.Mesh geometry={fenceTensionGeometry} material={galvDull} position={[0, 0.09, 0]} />
      <T.Mesh geometry={fenceTensionGeometry} material={galv} position={[0, 0.52, 0]} />

      {#each FENCE_WIRES as wx, i (i)}
        {#if i !== panel.cut}
          <T.Mesh geometry={fenceWireGeometry} material={galv} position={[wx, 0.52, 0]} />
        {/if}
      {/each}

      <!-- Two crossed strands. They say "chain-link" rather than "railing",
           and at 22 mm they cost the silhouette nothing. -->
      <T.Mesh
        geometry={fenceDiagGeometry}
        material={galv}
        position={[0, 0.52, 0.012]}
        rotation.z={0.78}
      />
      <T.Mesh
        geometry={fenceDiagGeometry}
        material={galvDull}
        position={[0, 0.52, -0.012]}
        rotation.z={-0.78}
      />
    </T.Group>
  {:else if piece === PIECE.fenceGap}
    <!-- THE EXIT. Nothing in this block that stands on a tile goes over 0.013,
         because the green exit overlay lifts at 0.055 and a prop drawn over it
         would have destroyed the one lesson of the board. Planes, unlit,
         depthWrite off, renderOrder 0. -->
    <T.Mesh geometry={gapPathGeometry} material={trodden} position={[0, 0.005, 0]} renderOrder={FLAT_ORDER} />
    {#each GAP_MATS as m, i (i)}
      <T.Mesh
        geometry={gapMatGeometry}
        material={wireFlat}
        position={[m.x, m.y, m.z]}
        rotation.y={m.rot}
        renderOrder={FLAT_ORDER}
      />
    {/each}
    {#each GAP_WIRES as w, i (i)}
      <T.Mesh
        geometry={gapWireGeometry}
        material={wireFlat}
        position={[w.x, w.y, w.z]}
        rotation.y={w.rot}
        renderOrder={FLAT_ORDER}
      />
    {/each}

    <!-- The declared 0.30, and ALL of it beyond local x = 0.52 — which at the
         mandated turns 3 is south of row 13, off the southern lip of the board,
         where there is no tile and no overlay to spoil. The flap is hinged on
         the lip and peeled up and out, which is what a cut fence does. -->
    <T.Mesh
      geometry={gapFlapGeometry}
      material={galvDull}
      position={[0.7, 0.16, 0]}
      rotation.z={GAP_FLAP_TILT}
      castShadow
    />
    {#each [-1.15, 1.15] as sz (sz)}
      <T.Mesh
        geometry={gapStubGeometry}
        material={rust}
        position={[0.6, 0.12, sz]}
        rotation.z={0.5}
      />
    {/each}
  {:else if piece === PIECE.cruiser}
    <!-- OFF THE BOARD, behind the arcade, nose at the wall. 1.42 to the top of
         the domes, which is what the R + 0.40·N budget in the header is spent
         on. Never inside the play field. -->
    {#each CAR_WHEELS as w, i (i)}
      <T.Mesh geometry={wheelGeometry} material={tyre} position={[w.x, 0.17, w.z]} />
      <T.Mesh geometry={hubGeometry} material={chrome} position={[w.x, 0.17, w.z]} />
    {/each}

    <T.Mesh geometry={rockerGeometry} material={cruiserBlue} position={[0, 0.26, 0]} />
    <T.Mesh geometry={bodyGeometry} material={cruiserBlue} position={[0, 0.52, 0]} castShadow receiveShadow />
    <T.Mesh geometry={bonnetGeometry} material={cruiserBlue} position={[0, 0.75, 0.8]} />
    <T.Mesh geometry={bootGeometry} material={cruiserBlue} position={[0, 0.75, -0.9]} />

    <!-- Blue and white, 1979. The white doors are the whole livery: at this
         zoom a door panel is six pixels and two of them side by side is the
         only shape that says police before the beacon does. -->
    {#each [-1, 1] as side (side)}
      <T.Mesh
        geometry={doorPanelGeometry}
        material={cruiserWhite}
        position={[side * 0.69, 0.52, 0.02]}
      />
      <T.Mesh geometry={shieldGeometry} material={cruiserBlue} position={[side * 0.702, 0.56, 0.02]} />
      <T.Mesh
        geometry={sideGlassGeometry}
        material={pane}
        position={[side * 0.605, 0.98, -0.04]}
      />
    {/each}

    <T.Mesh geometry={greenhouseGeometry} material={cruiserBlue} position={[0, 0.95, -0.04]} castShadow />
    <T.Mesh geometry={carRoofGeometry} material={cruiserWhite} position={[0, CAR_ROOF - 0.03, -0.04]} />
    <T.Mesh geometry={screenGeometry} material={pane} position={[0, 0.96, 0.53]} rotation.x={0.28} />
    <T.Mesh geometry={screenGeometry} material={pane} position={[0, 0.96, -0.61]} rotation.x={-0.3} />

    <T.Mesh geometry={grilleGeometry} material={ironLit} position={[0, 0.62, 1.22]} />
    {#each [-1, 1] as side (side)}
      <T.Mesh geometry={headlampGeometry} material={headlamp} position={[side * 0.46, 0.64, 1.23]} />
    {/each}
    {#each [1.24, -1.24] as bz (bz)}
      <T.Mesh geometry={bumperGeometry} material={chrome} position={[0, 0.42, bz]} />
    {/each}

    <!-- The beacon bar. Its own group, because the task turns THIS and nothing
         else on the car. The domes are emissive with or without the task
         running, so a parked cruiser with `running: () => false` is still a
         police car with its lights on. -->
    <T.Group bind:ref={beaconRef} position={[0, CAR_ROOF, -0.1]}>
      <T.Mesh geometry={beaconBarGeometry} material={iron} position={[0, BEACON_BASE_H / 2, 0]} />
      <T.Mesh geometry={beaconFootGeometry} material={ironLit} position={[0, BEACON_BASE_H / 2, 0]} />
      {#each [-1, 1] as side (side)}
        <T.Mesh
          geometry={domeGeometry}
          material={side < 0 ? beaconRed : beaconWhite}
          position={[side * DOME_X, BEACON_BASE_H + DOME_H / 2, 0]}
        />
        <T.Mesh
          geometry={domeCapGeometry}
          material={side < 0 ? beaconRed : beaconWhite}
          position={[side * DOME_X, CRUISER_TOP - CAR_ROOF - DOME_CAP_H / 2, 0]}
        />
      {/each}
    </T.Group>

    <!-- The searchlight. The GROUP yaws, so the housing points where the beam
         points and the beam never has to be aimed by hand. ±14° is what keeps
         it on the face of the arcade wall; the 0.14 rad of down-pitch inside is
         what keeps it under the coping and out of the bowl forever. -->
    <T.Mesh geometry={spotArmGeometry} material={ironLit} position={[SPOT_POS[0], 1.09, SPOT_POS[2]]} />
    <T.Group bind:ref={spotRef} position={SPOT_POS}>
      <T.Mesh geometry={spotCanGeometry} material={iron} />
      <T.Mesh geometry={spotLensGeometry} material={spotLens} position={[0, 0, 0.068]} />
      <T.Group rotation.x={SHAFT_PITCH}>
        <T.Mesh
          geometry={shaftGeometry}
          material={shaftGlow}
          position={[0, 0, 0.07]}
          renderOrder={SHAFT_ORDER}
        />
      </T.Group>
    </T.Group>
  {:else if piece === PIECE.cyrus}
    <!-- Nine boxes and two muted tones. No blood, no spectacle, no fourth
         colour — the argument is written out at the geometry above, and the
         short version is that this is the tutorial board and the loudest thing
         on it has to be the overlay the player is learning to read. -->
    <T.Group rotation.y={CYRUS_TILT}>
      <T.Mesh geometry={cyrusHeadGeometry} material={skinTone} position={[0.05, 0.085, -0.62]} rotation.y={0.5} />
      <T.Mesh geometry={cyrusShoulderGeometry} material={leather} position={[0, 0.08, -0.44]} />
      <T.Mesh geometry={cyrusChestGeometry} material={leather} position={[0, 0.095, -0.14]} castShadow />
      <T.Mesh geometry={cyrusVestGeometry} material={cloth} position={[0, 0.2, -0.16]} />
      <T.Mesh geometry={cyrusHipGeometry} material={cloth} position={[0, 0.085, 0.18]} />

      <!-- One arm flung out, one along the body. That is the whole pose. -->
      <T.Mesh
        geometry={cyrusArmGeometry}
        material={leather}
        position={[-0.34, 0.06, -0.3]}
        rotation.y={0.45}
      />
      <T.Mesh geometry={cyrusForearmGeometry} material={leather} position={[0.24, 0.06, -0.14]} />

      {#each [-1, 1] as side (side)}
        <T.Mesh
          geometry={cyrusThighGeometry}
          material={cloth}
          position={[side * 0.09, 0.075, 0.44]}
          rotation.y={side * 0.1}
        />
        <T.Mesh geometry={cyrusShinGeometry} material={cloth} position={[side * 0.11, 0.065, 0.76]} />
        <T.Mesh geometry={cyrusBootGeometry} material={leather} position={[side * 0.11, 0.06, 0.96]} />
      {/each}
    </T.Group>
  {:else if piece === PIECE.lamp}
    <!-- Head bottom 1.96, top 2.24, column 0.08 across. Only legal on a tile at
         a level equal to or above the men near it — see the arithmetic above. -->
    <T.Mesh geometry={lampBaseGeometry} material={ironLit} position={[0, 0.05, 0]} castShadow />
    <T.Mesh geometry={lampPlinthGeometry} material={iron} position={[0, 0.17, 0]} />
    <T.Mesh geometry={lampColumnGeometry} material={iron} position={[0, 1.13, 0]} castShadow />
    <T.Mesh geometry={lampCollarGeometry} material={ironLit} position={[0, LAMP_HEAD - 0.025, 0]} />
    <!-- The lantern glass is the emissive, never a light. It reads from the
         side as well as from under, which is what matters on a board seen from
         30° of elevation. -->
    <T.Mesh geometry={lampGlassGeometry} material={sodium} position={[0, LAMP_HEAD + 0.07, 0]} />
    <T.Mesh geometry={lampCapGeometry} material={iron} position={[0, LAMP_TOP - 0.07, 0]} />
  {:else if piece === PIECE.treeline}
    <!-- OFF THE BOARD. A wall, not a subject: it exists to stop the eye at the
         rim, and anything it says louder than that is stolen from the bowl.
         Tops out at 1.98 against the declared 2.00. -->
    <T.Mesh geometry={scrubGeometry} material={scrub} position={[0, 0.13, 0.18]} />
    <T.Mesh geometry={scrubLobeGeometry} material={scrub} position={[-0.36, 0.2, 0.34]} />
    <T.Mesh geometry={scrubLobeGeometry} material={bough} position={[0.34, 0.18, 0.3]} />

    <T.Group position={[trees.ax, 0, trees.az]} rotation.z={trees.aLean}>
      <T.Mesh geometry={treeTrunkGeometry} material={timber} position={[0, 0.6, 0]} castShadow />
      <T.Mesh geometry={crownBigGeometry} material={bough} position={[0, 1.58, 0]} castShadow />
      <T.Mesh geometry={crownMidGeometry} material={trees.swap ? boughLit : bough} position={[-0.27, 1.32, 0.1]} />
      <T.Mesh geometry={crownSmallGeometry} material={bough} position={[0.28, 1.42, -0.08]} />
    </T.Group>

    <T.Group position={[trees.bx, 0, trees.bz]} rotation.z={trees.bLean}>
      <T.Mesh geometry={treeTrunkLowGeometry} material={timber} position={[0, 0.43, 0]} />
      <T.Mesh geometry={crownMidGeometry} material={trees.swap ? bough : boughLit} position={[0, 1.18, 0]} castShadow />
      <T.Mesh geometry={crownSmallGeometry} material={bough} position={[0.24, 0.96, 0.1]} />
    </T.Group>
  {:else if piece === PIECE.litter}
    <!-- The handbills Cyrus called every gang in the city with. Under every
         overlay the board draws — see FLAT_CEILING. -->
    {#each BILLS as b, i (i)}
      <T.Mesh
        geometry={billGeometry}
        material={i % 3 === 0 ? handbillWorn : handbill}
        position={[b.x + (roll[i] - 0.5) * 0.1, b.y, b.z + (roll[(i + 3) % roll.length] - 0.5) * 0.1]}
        rotation.y={b.rot + (roll[(i + 1) % roll.length] - 0.5) * 0.5}
        renderOrder={FLAT_ORDER}
      />
    {/each}
    <!-- Two of them still have a headline on. One extra plane each, 1 mm over
         the paper, and it is the difference between litter and paper. -->
    {#each [0, 4] as k (k)}
      <T.Mesh
        geometry={billInkGeometry}
        material={handbillInk}
        position={[BILLS[k].x + (roll[k] - 0.5) * 0.1, FLAT_CEILING - 0.001, BILLS[k].z - 0.05]}
        rotation.y={BILLS[k].rot}
        renderOrder={FLAT_ORDER}
      />
    {/each}
  {:else if piece === PIECE.bin}
    <T.Mesh geometry={binFootGeometry} material={iron} position={[0, 0.01, 0]} />
    <T.Mesh geometry={binBodyGeometry} material={parkGreen} position={[0, 0.15, 0]} castShadow receiveShadow />
    {#each BIN_RIBS as r, i (i)}
      <T.Mesh geometry={binRibGeometry} material={iron} position={[r.x, 0.15, r.z]} rotation.y={r.rot} />
    {/each}
    <T.Mesh geometry={binHoopGeometry} material={iron} position={[0, 0.07, 0]} />
    <T.Mesh geometry={binHoopGeometry} material={iron} position={[0, 0.23, 0]} />
    <T.Mesh geometry={binRimGeometry} material={ironLit} position={[0, BIN_TOP - 0.0175, 0]} />
    <T.Mesh geometry={binMouthGeometry} material={gloom} position={[0, BIN_TOP - 0.03, 0]} />
    {#if roll[0] < 0.55}
      <!-- Something going over the rim. It is the same handbill as everywhere
           else on this board, crumpled: the park filled up and the baskets did
           too. -->
      <T.Mesh
        geometry={binSackGeometry}
        material={cloth}
        position={[0.07, 0.292, -0.05]}
        rotation.y={roll[1] * 1.4}
        rotation.z={0.22}
      />
    {/if}
  {/if}
</T.Group>
