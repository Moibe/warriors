<script lang="ts">
  // A sedan left at the kerb on the Orphans' block — and the one prop on this
  // board that is allowed to change while the fight is running.
  //
  // Same rules as the bus and the comfort station: primitives only, flat
  // shading, no texture files, and not one real light. What is new here is the
  // second state. The comfort station and the bus are furniture; this thing is
  // the scene's verb. Swan throws a bottle at it, it burns, and the Orphans go.
  // So the mesh has to be able to say "intact" and "on fire" on its own, and it
  // has to say the second one loudly enough to be the loudest thing on a night
  // board without becoming a wall.
  //
  // HEIGHT, because the bus taught us this the hard way: the roof lands at 1.18
  // against a fighter's 1.55. That is not a compromise, it is the real number —
  // a 1970s sedan is 1.37 m tall next to a 1.78 m man, which at this scale is
  // 1.19. The bus had to be shortened to stay a bus; the car needs no help. A
  // man standing behind it keeps his head and shoulders. Nothing on the vehicle
  // reaches a fighter's eye line except the radio aerial, which is sixteen
  // millimetres across and occludes nobody.
  //
  // Authored nose toward +Z (south), the facing PropPlacement documents. The
  // bus breaks that rule for its own reasons; this one must not, because cars
  // park on both kerbs of the same street and the stage author flips them with
  // `turns` — which only works if the documented facing is actually true. So
  // the numbers below read like a plan view: length runs on Z, width on X, and
  // every flank offset is an X.

  import { T, useTask } from '@threlte/core';
  import {
    BoxGeometry,
    CylinderGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
    RingGeometry,
  } from 'three';

  let {
    position = [0, 0, 0],
    rotation = 0,
    // Two extras beyond the prop contract, both defaulted so the current call
    // site in Scene — <Prop position rotation /> — renders an intact car and
    // nothing else. `burning` is the point of the whole scene; `variant` exists
    // because three identical cars on one street tell the player which one is
    // going to matter before he has decided anything.
    variant = 0,
    burning = false,
  }: {
    position?: [number, number, number];
    rotation?: number;
    variant?: number;
    burning?: boolean;
  } = $props();

  // ---- Paint --------------------------------------------------------------
  // A body tone and a bleached top tone per car. Two tones, not one, for the
  // same reason the bus has a faded roof: from this camera the horizontal
  // surfaces — hood, roof, trunk lid — are most of what you see, so they carry
  // the shape. Sun-dead paint on top, deeper paint down the flanks.
  //
  // Every one of these has to survive on #43454d asphalt at night and stay
  // clear of the four gang palettes. The vinyl roof the period wants is
  // deliberately absent: black on top would kill the largest readable face on
  // the vehicle, and period accuracy is not worth a car you cannot find.

  const PAINT = [
    { body: '#5a6b63', deck: '#6e8078' }, // dull sea-green — the street car
    { body: '#7d6a4e', deck: '#95825f' }, // dead ochre, a decade of sun
    { body: '#8d8a80', deck: '#a29e92' }, // dirty cream, the pale one
  ];

  const paints = PAINT.map(
    (p) => new MeshStandardMaterial({ color: p.body, roughness: 1, flatShading: true })
  );
  const decks = PAINT.map(
    (p) => new MeshStandardMaterial({ color: p.deck, roughness: 1, flatShading: true })
  );

  // Burnt paint. Near-black, never pure black — the same rule the gang palettes
  // follow, and pure black reads as a hole in the board rather than a panel.
  const scorched = new MeshStandardMaterial({ color: '#211f1d', roughness: 1, flatShading: true });

  // ---- Materials ----------------------------------------------------------

  const trim = new MeshStandardMaterial({ color: '#1d1e22', roughness: 1, flatShading: true });
  const rubber = new MeshStandardMaterial({ color: '#14151a', roughness: 1, flatShading: true });
  const steel = new MeshStandardMaterial({ color: '#7c828c', roughness: 0.85, flatShading: true });
  const rust = new MeshStandardMaterial({ color: '#7a4a2a', roughness: 1 });
  const shatter = new MeshStandardMaterial({ color: '#9aa2ac', roughness: 0.6 });
  const lensRed = new MeshStandardMaterial({ color: '#7e2b26', roughness: 0.5 });
  const lensPale = new MeshStandardMaterial({ color: '#b9bec4', roughness: 0.3 });
  const tagPaint = new MeshStandardMaterial({ color: '#d94f3d', roughness: 1 });
  const card = new MeshStandardMaterial({ color: '#b8a884', roughness: 1 });

  // Chrome is this prop's signature, and it is allowed to be the brightest
  // thing on it — unlike the bus, which had a live headlight to protect. A
  // parked car at night has nothing switched on; what picks it out of the
  // asphalt is two bright bars, one at each end, and one bright line down the
  // flank. Kept dull enough to stay metal instead of turning into a lamp.
  const chrome = new MeshStandardMaterial({ color: '#aeb4bc', roughness: 0.45, flatShading: true });

  // Intact glass is a hole, same as the bus: at this distance a pane is not
  // transparent, it is dark. That darkness is the whole setup for the burn.
  const glass = new MeshStandardMaterial({ color: '#0e1014', roughness: 1 });

  // ---- Fire ---------------------------------------------------------------
  // Emissive only, never a light. Intensities are tuned for NoToneMapping,
  // which is what the canvas runs: past 1 each channel clips on its own, so the
  // core is pushed until red and green blow out and blue does not — that is
  // what makes a white-hot middle — while the tongues stop just short, so they
  // stay orange instead of washing out to the same white.
  //
  // The most valuable line in this file: when the car burns, its dark window
  // band flips to a glowing one. A row of black holes becoming a row of bright
  // holes is legible from anywhere on the board, at any zoom, with no flame
  // visible at all. The flames are the confirmation; the windows are the news.

  const CORE_GLOW = 1.5;
  const TONGUE_GLOW = 1.35;
  const WINDOW_GLOW = 1.15;

  const glassHot = new MeshStandardMaterial({
    color: '#ffb14a',
    emissive: '#ff8a2b',
    emissiveIntensity: WINDOW_GLOW,
    roughness: 0.5,
  });
  const flameCore = new MeshStandardMaterial({
    color: '#ffd27a',
    emissive: '#ffd27a',
    emissiveIntensity: CORE_GLOW,
    roughness: 0.4,
    flatShading: true,
  });
  const flameTongue = new MeshStandardMaterial({
    color: '#ff8a2b',
    emissive: '#ff7a1e',
    emissiveIntensity: TONGUE_GLOW,
    roughness: 0.4,
    flatShading: true,
  });

  // The pool of light on the road. A real point light here would be correct and
  // unaffordable — every prop that adds one is a bill the whole board pays every
  // frame — so the fire's reach is drawn instead: two flat unlit plates on the
  // asphalt, bright in the middle and faint at the edge.
  //
  // It is a rule too, not decoration. The inner plate is sized to the tiles the
  // fire makes untenable, so the danger reads the same way a movement range
  // reads, without a second overlay having to be switched on for it.
  const POOL_INNER = 0.3;
  const POOL_OUTER = 0.13;

  const poolInner = new MeshBasicMaterial({
    color: '#ff9a3c',
    transparent: true,
    opacity: POOL_INNER,
    depthWrite: false,
  });
  const poolOuter = new MeshBasicMaterial({
    color: '#ff7a20',
    transparent: true,
    opacity: POOL_OUTER,
    depthWrite: false,
  });

  // ---- Dimensions ---------------------------------------------------------
  // One tile is 1 unit, a fighter is 1.55. Footprint: 2 tiles wide by 4 long.
  //
  // Width and height are the true numbers — 2.00 m and 1.37 m come out at 1.74
  // and 1.19 here, and they fit. Only the length is compressed: a real sedan is
  // 4.8 tiles long and the footprint is 4, so the car loses most of a tile off
  // its overhangs. The same bargain the bus made, one tile cheaper.

  const BODY_W = 1.72;
  const BODY_L = 3.62;
  const FLANK_X = BODY_W / 2; // 0.86 — the sheet metal
  const NOSE_Z = BODY_L / 2; // 1.81
  const TAIL_Z = -BODY_L / 2;

  const ROCKER_Y = 0.2; // underside of the body; ground clearance lives below it
  const DECK_Y = 0.84; // beltline, and the height of the hood and trunk decks
  const BODY_H = DECK_Y - ROCKER_Y;
  const BODY_CY = ROCKER_Y + BODY_H / 2;

  // The decks are separate thin panels laid on the body rather than the body's
  // own top face. It costs three meshes and buys the hood, roof and trunk a
  // lighter tone and a visible seam — the three-box sedan silhouette, which is
  // what the eye actually recognises at this size.
  const DECK_T = 0.04;
  const DECK_CY = DECK_Y + 0.018; // sunk into the body, so no faces are coplanar
  const DECK_TOP = DECK_CY + DECK_T / 2; // 0.878

  const GLASS_H = 0.28;
  const GLASS_CY = DECK_Y + GLASS_H / 2; // 0.98
  const ROOF_Y = DECK_Y + GLASS_H; // 1.12
  const ROOF_T = 0.07;
  const ROOF_CY = ROOF_Y + 0.025;
  const CAR_TOP = ROOF_CY + ROOF_T / 2; // 1.18 — every head on the board clears it

  const GLASS_W = 1.56; // narrower than the body: the shoulder shows either side
  const GLASS_L = 1.2;
  const CABIN_CZ = -0.2; // the cabin sits back, because the hood is long
  const ROOF_W = 1.62; // wider than the glass, so the roof throws a drip edge
  const ROOF_L = 1.14;

  const WHEEL_R = 0.26;
  const WHEEL_X = 0.78;
  const FRONT_AXLE_Z = 1.14;
  const REAR_AXLE_Z = -1.1;
  /** How far the dead tyre is squashed. */
  const FLAT_SQUASH = 0.74;

  // Kerb side and driver side, named once. Left-hand drive with the nose at +Z
  // puts the driver on +X; everything that has a side — the mirror, the flat
  // tyre, the smashed window — hangs off these two so they never disagree.
  const DRIVER_SIDE = 1;
  const KERB_SIDE = -1;
  const SIDES = [1, -1];

  // Layers on the flank, fixed once here so nothing z-fights and the stacking
  // is not re-argued at every mesh.
  const TRIM_X = FLANK_X + 0.012;
  const SPEAR_X = FLANK_X + 0.017;
  const RUST_X = FLANK_X + 0.022;
  const TAG_X = FLANK_X + 0.032; // paint goes over everything. That is the point.
  const PILLAR_X = 0.785;

  // Sitting on a dead rear tyre: the tail drops and the kerb side drops with
  // it. A perfectly level car reads as a toy, and this one has not moved in
  // weeks. Only the body is tilted — tilting the whole prop would bury the
  // front tyres in the asphalt.
  const SAG = -0.01; // negative drops −Z, the tail
  const LEAN = 0.016; // positive raises +X, which drops the kerb side

  // ---- Shared geometries --------------------------------------------------

  const bodyGeometry = new BoxGeometry(BODY_W, BODY_H, BODY_L);
  const hoodGeometry = new BoxGeometry(1.5, DECK_T, 1.06);
  const trunkGeometry = new BoxGeometry(1.46, DECK_T, 0.7);
  const roofGeometry = new BoxGeometry(ROOF_W, ROOF_T, ROOF_L);

  const glassGeometry = new BoxGeometry(GLASS_W, GLASS_H, GLASS_L);
  const windshieldGeometry = new BoxGeometry(1.46, 0.4, 0.05);
  const backlightGeometry = new BoxGeometry(1.4, 0.42, 0.05);

  // Three pillars a side. The bus argued that one unbroken band beats nine
  // separate windows, and it was right — for nine. A four-door sedan has two
  // windows a side, and the thick rear pillar between them is the most
  // period-specific shape on the car. Two holes do not turn to mush.
  const aPillarGeometry = new BoxGeometry(0.07, 0.44, 0.08);
  const bPillarGeometry = new BoxGeometry(0.07, 0.3, 0.07);
  const cPillarGeometry = new BoxGeometry(0.07, 0.46, 0.22);

  const archGeometry = new BoxGeometry(BODY_W + 0.02, 0.34, 0.8);
  const wheelGeometry = new CylinderGeometry(WHEEL_R, WHEEL_R, 0.2, 12).rotateZ(Math.PI / 2);
  const hubGeometry = new CylinderGeometry(0.11, 0.11, 0.04, 8).rotateZ(Math.PI / 2);

  const frontBumperGeometry = new BoxGeometry(1.78, 0.2, 0.12);
  const rearBumperGeometry = new BoxGeometry(1.76, 0.18, 0.12);
  const plateGeometry = new BoxGeometry(0.3, 0.13, 0.02);

  const grilleGeometry = new BoxGeometry(0.92, 0.26, 0.08);
  const grilleBarGeometry = new BoxGeometry(0.035, 0.22, 0.03);
  const lampGeometry = new BoxGeometry(0.15, 0.13, 0.05);
  const tailLampGeometry = new BoxGeometry(0.44, 0.15, 0.05);

  const spearGeometry = new BoxGeometry(0.025, 0.04, 3.2);
  const rockerGeometry = new BoxGeometry(0.03, 0.1, 1.44);
  const seamGeometry = new BoxGeometry(0.02, 0.58, 0.035);
  const handleGeometry = new BoxGeometry(0.03, 0.045, 0.16);
  const tagGeometry = new BoxGeometry(0.02, 0.24, 0.46);

  const mirrorArmGeometry = new BoxGeometry(0.1, 0.04, 0.04);
  const mirrorHeadGeometry = new BoxGeometry(0.045, 0.13, 0.09);
  // The aerial. It is the tallest thing on the prop at 1.55 and it is sixteen
  // millimetres across — it costs nothing in occlusion and it is the fastest
  // way to say "car" in a silhouette. Bent, because they all were.
  const antennaGeometry = new CylinderGeometry(0.016, 0.016, 0.68, 6).translate(0, 0.34, 0);

  const DOOR_SEAM_Z = [0.7, -0.16, -1.0];
  const HANDLE_Z = [0.16, -0.68];
  const GRILLE_BAR_X = [-0.36, -0.18, 0, 0.18, 0.36];
  const HEADLAMP_X = [-0.74, -0.56, 0.56, 0.74];

  // ---- Running gear -------------------------------------------------------
  // One dead tyre, kerb side rear. It is also the only wheel without a hubcap,
  // which is the cheapest way to say nobody has touched this car in a month.

  const WHEELS = [
    { side: DRIVER_SIDE, z: FRONT_AXLE_Z, flat: false },
    { side: KERB_SIDE, z: FRONT_AXLE_Z, flat: false },
    { side: DRIVER_SIDE, z: REAR_AXLE_Z, flat: false },
    { side: KERB_SIDE, z: REAR_AXLE_Z, flat: true },
  ];

  // ---- Damage and history -------------------------------------------------

  const RUST = [
    { y: 0.6, z: REAR_AXLE_Z, h: 0.09, l: 0.86 }, // top of the rear arch, where it always starts
    { y: 0.3, z: -0.3, h: 0.1, l: 0.62 }, // the rocker, eaten from underneath
    { y: 0.56, z: FRONT_AXLE_Z, h: 0.07, l: 0.6 },
  ];
  const rustGeometries = RUST.map((r) => new BoxGeometry(0.02, r.h, r.l));

  // The smashed rear side window, kerb side. Four bars from one point: the same
  // trick as the bus's starred windscreen, and it costs four meshes on one
  // flank instead of a second glass material everywhere.
  const CRACKS = [
    { len: 0.3, rot: 0 },
    { len: 0.24, rot: 1.1 },
    { len: 0.24, rot: -1.1 },
    { len: 0.16, rot: 2.0 },
  ];
  const crackGeometries = CRACKS.map((c) => new BoxGeometry(0.02, 0.025, c.len));

  // ---- The fire -----------------------------------------------------------
  // Tongues are five-sided cones, flat shaded, translated so the table below
  // gives each one its base rather than its centre — the same baking trick the
  // bus uses on its wheels, and it keeps the numbers readable as heights.
  //
  // The tallest tip lands at 1.92, a hand above a fighter's head. That is
  // deliberate, and it is the one thing on this board allowed to be taller than
  // a man: it is narrow, it is the brightest object in the scene, and it is the
  // event the whole street is about. A sheet of fire the width of the car would
  // have been the bus's mistake all over again.

  const FLAMES = [
    { x: 0, y: DECK_TOP, z: 1.1, h: 0.98, r: 0.3, tx: 0.1, tz: 0.04, core: false },
    { x: 0.05, y: DECK_TOP, z: 1.06, h: 0.62, r: 0.16, tx: 0.05, tz: -0.06, core: true },
    { x: -0.08, y: CAR_TOP, z: -0.26, h: 0.74, r: 0.25, tx: -0.14, tz: -0.1, core: false },
    { x: -0.04, y: CAR_TOP, z: -0.24, h: 0.44, r: 0.13, tx: -0.07, tz: -0.04, core: true },
    { x: 0, y: 0.52, z: NOSE_Z - 0.02, h: 0.5, r: 0.17, tx: 0.4, tz: 0, core: true },
    { x: DRIVER_SIDE * 0.78, y: 0.86, z: 0.1, h: 0.56, r: 0.17, tx: 0, tz: 0.52, core: false },
    { x: KERB_SIDE * 0.78, y: 0.86, z: -0.46, h: 0.44, r: 0.15, tx: 0, tz: -0.5, core: false },
    {
      x: DRIVER_SIDE * 0.78,
      y: 0.06,
      z: FRONT_AXLE_Z,
      h: 0.42,
      r: 0.16,
      tx: 0,
      tz: 0.22,
      core: false,
    },
  ];
  const flameGeometries = FLAMES.map((f) =>
    new CylinderGeometry(0, f.r, f.h, 5).translate(0, f.h / 2, 0)
  );

  // Burnt paint on the three faces the camera sees. Thin plates over the decks
  // rather than a swap of the whole body: the flanks keep their colour, so the
  // car still has a shape after it has stopped being a car.
  const SCORCH = [
    { y: DECK_TOP + 0.012, z: 1.16, w: 1.1, l: 0.86 },
    { y: CAR_TOP + 0.012, z: -0.2, w: 1.34, l: 0.96 },
    { y: DECK_TOP + 0.012, z: -1.36, w: 0.94, l: 0.52 },
  ];
  const scorchGeometries = SCORCH.map((s) => new BoxGeometry(s.w, 0.02, s.l));

  // Two flat plates on the asphalt, stretched along the car. The inner one
  // covers roughly the car plus a tile all round — the reach that matters to
  // the rules — and the outer one is only the glow falling off into the street.
  const poolInnerGeometry = new RingGeometry(0, 2.0, 28).rotateX(-Math.PI / 2);
  const poolOuterGeometry = new RingGeometry(1.98, 3.3, 28).rotateX(-Math.PI / 2);
  const POOL_STRETCH: [number, number, number] = [1, 1, 1.28];

  // ---- State --------------------------------------------------------------

  const tone = $derived(((variant % PAINT.length) + PAINT.length) % PAINT.length);
  const paint = $derived(paints[tone]);
  const deck = $derived(burning ? scorched : decks[tone]);
  const pane = $derived(burning ? glassHot : glass);

  let elapsed = 0;

  // The guttering. Fire that holds one fixed brightness reads as orange
  // plastic, and this is the cheapest possible fix: one sine against another
  // that does not divide into it, so the flame never settles into a beat you
  // can count. The task only runs while this car is alight, so the intact ones
  // parked along the same street cost the frame nothing.
  //
  // It writes module-level materials, which every instance on the board shares.
  // That is on purpose — exactly one car is meant to be burning. Two at once
  // would flicker in step, and at this distance nobody reads that as wrong.
  useTask(
    (delta) => {
      elapsed += delta;
      const gust = 0.86 + 0.1 * Math.sin(elapsed * 8.7) + 0.05 * Math.sin(elapsed * 21.3);
      flameCore.emissiveIntensity = CORE_GLOW * gust;
      flameTongue.emissiveIntensity = TONGUE_GLOW * gust;
      glassHot.emissiveIntensity = WINDOW_GLOW * gust;
      poolInner.opacity = POOL_INNER * gust;
      poolOuter.opacity = POOL_OUTER * gust;
    },
    { running: () => burning }
  );
</script>

<T.Group {position} rotation.y={rotation}>
  {#if burning}
    <!-- renderOrder 1: over the terrain, under the units — the same slot the
         movement and range panels use, so the fire's reach reads as one more
         layer of the board rather than as something painted on top of it. -->
    <T.Mesh
      geometry={poolInnerGeometry}
      material={poolInner}
      position.y={0.03}
      scale={POOL_STRETCH}
      renderOrder={1}
    />
    <T.Mesh
      geometry={poolOuterGeometry}
      material={poolOuter}
      position.y={0.022}
      scale={POOL_STRETCH}
      renderOrder={1}
    />
  {/if}

  <!-- Wheels stay level with the road: the lean lives in the dead spring, so
       only the body above them is tilted. -->
  {#each WHEELS as w, i (i)}
    {@const wy = w.flat ? WHEEL_R * FLAT_SQUASH : WHEEL_R}
    {@const squash = w.flat ? FLAT_SQUASH : 1}
    <T.Mesh
      geometry={wheelGeometry}
      material={rubber}
      position={[w.side * WHEEL_X, wy, w.z]}
      scale={[1, squash, 1]}
      castShadow
    />
    <T.Mesh
      geometry={hubGeometry}
      material={w.flat ? trim : steel}
      position={[w.side * (WHEEL_X + 0.085), wy, w.z]}
      scale={[1, squash, 1]}
    />
  {/each}

  <T.Group rotation.x={SAG} rotation.z={-KERB_SIDE * LEAN}>
    <!-- ---- The three masses ------------------------------------------ -->

    <T.Mesh
      geometry={bodyGeometry}
      material={paint}
      position={[0, BODY_CY, 0]}
      castShadow
      receiveShadow
    />

    <T.Mesh geometry={hoodGeometry} material={deck} position={[0, DECK_CY, 1.19]} castShadow />
    <T.Mesh geometry={trunkGeometry} material={deck} position={[0, DECK_CY, -1.37]} castShadow />
    <T.Mesh
      geometry={roofGeometry}
      material={deck}
      position={[0, ROOF_CY, CABIN_CZ]}
      castShadow
      receiveShadow
    />

    <T.Mesh geometry={archGeometry} material={trim} position={[0, 0.4, FRONT_AXLE_Z]} castShadow />
    <T.Mesh geometry={archGeometry} material={trim} position={[0, 0.4, REAR_AXLE_Z]} castShadow />

    <!-- ---- Glass ------------------------------------------------------ -->
    <!-- One box for the cabin, plus a raked plate at each end. The rake is what
         separates a car from a crate in profile, and it costs two meshes. -->

    <T.Mesh geometry={glassGeometry} material={pane} position={[0, GLASS_CY, CABIN_CZ]} />
    <T.Mesh
      geometry={windshieldGeometry}
      material={pane}
      position={[0, GLASS_CY, 0.495]}
      rotation.x={-0.73}
    />
    <T.Mesh
      geometry={backlightGeometry}
      material={pane}
      position={[0, GLASS_CY, -0.91]}
      rotation.x={0.78}
    />

    {#each SIDES as side (side)}
      <T.Mesh
        geometry={aPillarGeometry}
        material={paint}
        position={[side * PILLAR_X, GLASS_CY, 0.5]}
        rotation.x={-0.73}
      />
      <T.Mesh
        geometry={bPillarGeometry}
        material={paint}
        position={[side * PILLAR_X, GLASS_CY, -0.22]}
      />
      <T.Mesh
        geometry={cPillarGeometry}
        material={paint}
        position={[side * PILLAR_X, GLASS_CY, -0.88]}
        rotation.x={0.78}
      />
    {/each}

    {#each CRACKS as c, i (i)}
      <T.Mesh
        geometry={crackGeometries[i]}
        material={shatter}
        position={[KERB_SIDE * 0.795, GLASS_CY, -0.51]}
        rotation.x={c.rot}
      />
    {/each}

    <!-- ---- Nose ------------------------------------------------------- -->

    <T.Mesh
      geometry={frontBumperGeometry}
      material={chrome}
      position={[0, 0.42, NOSE_Z + 0.06]}
      castShadow
    />
    <T.Mesh geometry={grilleGeometry} material={trim} position={[0, 0.64, 1.78]} />
    {#each GRILLE_BAR_X as x (x)}
      <T.Mesh geometry={grilleBarGeometry} material={steel} position={[x, 0.64, 1.835]} />
    {/each}

    <!-- Four sealed beams, one of them long gone. Nothing on this car is lit:
         it has been dead at the kerb for weeks, and the dark is what makes the
         moment it catches worth anything at all. -->
    {#each HEADLAMP_X as x, i (x)}
      <T.Mesh
        geometry={lampGeometry}
        material={i === 0 ? trim : lensPale}
        position={[x, 0.7, 1.825]}
      />
    {/each}

    <!-- ---- Tail -------------------------------------------------------- -->

    <T.Mesh
      geometry={rearBumperGeometry}
      material={chrome}
      position={[0, 0.44, TAIL_Z - 0.06]}
      rotation.z={-0.05}
      castShadow
    />
    <T.Mesh geometry={plateGeometry} material={card} position={[0, 0.44, TAIL_Z - 0.135]} />
    {#each SIDES as side (side)}
      <T.Mesh
        geometry={tailLampGeometry}
        material={lensRed}
        position={[side * 0.54, 0.62, TAIL_Z - 0.005]}
      />
    {/each}

    <!-- ---- The flanks -------------------------------------------------- -->
    <!-- No mirroring of the layout: everything lives in the car's own space, so
         the rust and the tag sit at the same station on both sides. Two cars on
         opposite kerbs differ by `turns`, not by a flipped detail table. -->

    {#each SIDES as side (side)}
      <T.Mesh geometry={spearGeometry} material={chrome} position={[side * SPEAR_X, 0.66, 0]} />
      <T.Mesh geometry={rockerGeometry} material={trim} position={[side * TRIM_X, 0.27, 0.02]} />

      {#each DOOR_SEAM_Z as z (z)}
        <T.Mesh geometry={seamGeometry} material={trim} position={[side * TRIM_X, 0.55, z]} />
      {/each}
      {#each HANDLE_Z as z (z)}
        <T.Mesh geometry={handleGeometry} material={chrome} position={[side * SPEAR_X, 0.76, z]} />
      {/each}

      {#each RUST as r, i (i)}
        <T.Mesh geometry={rustGeometries[i]} material={rust} position={[side * RUST_X, r.y, r.z]} />
      {/each}

      <!-- Somebody else's tag, in the same three cans as the comfort station
           wall and the bus. The paint on this board should look like it came
           out of one shopping trolley. -->
      <T.Mesh
        geometry={tagGeometry}
        material={tagPaint}
        position={[side * TAG_X, 0.6, -1.38]}
        rotation.x={0.16}
      />
    {/each}

    <!-- One mirror, driver's side, and the aerial on the front wing. They are
         the only parts outside the footprint, by about three hundredths of a
         tile — worth it, because a stalk at the cowl and a wire off the wing
         are most of what makes a box read as a vehicle. -->
    <T.Mesh
      geometry={mirrorArmGeometry}
      material={steel}
      position={[DRIVER_SIDE * 0.9, 0.82, 0.52]}
    />
    <T.Mesh
      geometry={mirrorHeadGeometry}
      material={trim}
      position={[DRIVER_SIDE * 0.95, 0.8, 0.52]}
    />
    <T.Mesh
      geometry={antennaGeometry}
      material={steel}
      position={[DRIVER_SIDE * 0.66, DECK_TOP, 1.4]}
      rotation.z={0.16}
    />

    {#if burning}
      {#each SCORCH as s, i (i)}
        <T.Mesh geometry={scorchGeometries[i]} material={scorched} position={[0, s.y, s.z]} />
      {/each}
    {/if}
  </T.Group>

  <!-- Flames sit outside the tilt group: the car leans on its dead spring, fire
       does not. -->
  {#if burning}
    {#each FLAMES as f, i (i)}
      <T.Mesh
        geometry={flameGeometries[i]}
        material={f.core ? flameCore : flameTongue}
        position={[f.x, f.y, f.z]}
        rotation.x={f.tx}
        rotation.z={f.tz}
      />
    {/each}
  {/if}
</T.Group>
