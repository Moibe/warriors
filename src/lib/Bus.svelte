<script lang="ts">
  // The Turnbull A.C. bus: a 1960s school bus, repainted green by hand, parked
  // across the road under the el.
  //
  // Same rules as the comfort station — primitives only, flat shading, no
  // texture files, and nothing that costs the board a real light. What makes a
  // bus read as a bus from the isometric camera is three masses in a row (long
  // snout, tall box, thin roof) plus one unbroken black window band. Everything
  // after that is damage, and damage is most of what this vehicle is.
  //
  // Authored nose toward +X so every number below reads like a side elevation;
  // `rotation` turns it on the grid: the street map parks it across the road,
  // running north-south, so it comes in with a quarter turn. Its anchor lives
  // in stages.ts next to the blocked footprint, so mesh and rule never drift.

  import { T } from '@threlte/core';
  import { BoxGeometry, CylinderGeometry, MeshStandardMaterial, SphereGeometry } from 'three';

  let {
    position = [0, 0, 0],
    rotation = 0,
  }: { position?: [number, number, number]; rotation?: number } = $props();

  // ---- Materials ----------------------------------------------------------
  // Institutional green gone dull, not a cheerful green. Three tones do the
  // shaping: body, a darker tone for the rails and recesses, a sun-bleached
  // tone for the roof — the roof is the face the camera sees most, so it is the
  // one that has to look faded rather than painted.

  const green = new MeshStandardMaterial({ color: '#3d5a3a', roughness: 1, flatShading: true });
  const greenDark = new MeshStandardMaterial({ color: '#2c4129', roughness: 1, flatShading: true });
  const greenRoof = new MeshStandardMaterial({ color: '#6d7f63', roughness: 1, flatShading: true });
  const chassis = new MeshStandardMaterial({ color: '#23271f', roughness: 1, flatShading: true });
  const rubber = new MeshStandardMaterial({ color: '#14151a', roughness: 1, flatShading: true });
  const steel = new MeshStandardMaterial({ color: '#7c828c', roughness: 0.85, flatShading: true });
  const primer = new MeshStandardMaterial({ color: '#6b6a66', roughness: 1, flatShading: true });
  const rust = new MeshStandardMaterial({ color: '#7a4a2a', roughness: 1 });
  const plank = new MeshStandardMaterial({ color: '#6a4a2c', roughness: 1, flatShading: true });
  const cardboard = new MeshStandardMaterial({ color: '#b8a884', roughness: 1 });
  const shatter = new MeshStandardMaterial({ color: '#8f96a0', roughness: 0.6 });

  // One flat near-black for every pane on the vehicle. At this distance glass
  // is not transparent, it is a hole — and a hole is exactly what you want,
  // because the heads sit against it.
  const glass = new MeshStandardMaterial({ color: '#101318', roughness: 1 });

  // The gang's gold, straight off the back patch. Painted lettering and the
  // bull get this; the school-bus yellow underneath gets its own, brighter and
  // greener tone so a thin bleed line never reads as part of the sign.
  const gold = new MeshStandardMaterial({ color: '#c9932f', roughness: 1 });
  const schoolYellow = new MeshStandardMaterial({ color: '#c9a227', roughness: 1 });

  // Two skin tones for the shaved heads behind the glass: it is a mixed gang,
  // and two tones alternating is enough to say so at four pixels a head.
  const skinLight = new MeshStandardMaterial({ color: '#a87c58', roughness: 1, flatShading: true });
  const skinDark = new MeshStandardMaterial({ color: '#6d4a30', roughness: 1, flatShading: true });

  // Lit by being emissive, never by being a light. Two emissive materials on
  // the whole prop: one working headlight and one working tail lamp. A second
  // real light per prop is a bill the entire board pays every frame.
  const headlamp = new MeshStandardMaterial({
    color: '#ffe6b4',
    emissive: '#ffb455',
    emissiveIntensity: 1.7,
    roughness: 0.35,
  });
  const deadLamp = new MeshStandardMaterial({ color: '#2b2d31', roughness: 0.5 });
  const tailLamp = new MeshStandardMaterial({
    color: '#9c4a42',
    emissive: '#8e2a20',
    emissiveIntensity: 1.1,
    roughness: 0.5,
  });

  // ---- Dimensions ---------------------------------------------------------
  // One tile is 1 unit and a fighter is 1.55 tall. A real school bus next to a
  // real man is 3.6 times longer than it is tall; at 5 tiles long that would
  // make a 1.4-high bus you could see over, which is not what a bus is for. So
  // the length is compressed and the height is not: 5 long, 2 tall, the roof
  // well clear of everybody's head. Squat, heavy, and unmistakably a vehicle.

  const BODY_L = 3.8; // the passenger box
  const BODY_W = 1.86;
  const BODY_H = 1.44;
  const HOOD_L = 1.0; // the snout, engine out front, the way these were built
  const HOOD_W = 1.5;

  const NOSE_X = 2.38; // front face of the fender mass
  const BODY_FRONT_X = NOSE_X - HOOD_L;
  const BODY_CX = BODY_FRONT_X - BODY_L / 2;
  const TAIL_X = BODY_CX - BODY_L / 2;
  const HOOD_CX = BODY_FRONT_X + HOOD_L / 2;

  const WHEEL_R = 0.33;
  const SILL_Y = 0.38; // underside of the body: the floor line
  const ROOF_Y = SILL_Y + BODY_H; // 1.82
  const ROOF_T = 0.1;
  const ROOF_W = 1.96; // wider than the body, so the roof throws a drip edge

  // The window band. Its bottom sits just under a fighter's eye line and its
  // top just over his head, which is what puts the heads inside at the right
  // height when the gang is standing next to the thing.
  const GLASS_H = 0.52;
  const GLASS_CY = ROOF_Y - 0.16 - GLASS_H / 2; // 1.40
  const GLASS_TOP = GLASS_CY + GLASS_H / 2;
  const GLASS_BOT = GLASS_CY - GLASS_H / 2;

  // Layers on the flank, in the order paint actually went on. Each is a fixed
  // offset so nothing ever z-fights and the stacking is decided once, here,
  // instead of being argued about at every mesh.
  const FLANK_Z = BODY_W / 2; // 0.93 — the sheet metal itself
  const PANEL_Z = FLANK_Z + 0.015; // rub rails, window band, bolted panels
  const SIGN_Z = FLANK_Z + 0.012; // hand-painted lettering
  const RUST_Z = FLANK_Z + 0.03; // rust creeps over the arch flares too
  const TAG_Z = FLANK_Z + 0.045; // graffiti goes over everything. That is the point.

  const DOOR_SIDE = 1; // +Z is the kerb side: nose at +X, up at +Y, so right is +Z

  // Nose-down on dead front springs, and leaning a hair toward the door side,
  // because that is the side nine men climb out of. A perfectly level bus reads
  // as a toy.
  const SAG = -0.026; // ≈1.5° — negative drops +X
  const LEAN = 0.012; // ≈0.7° — positive drops +Z

  // ---- Shared geometries --------------------------------------------------

  const bodyGeometry = new BoxGeometry(BODY_L, BODY_H, BODY_W);
  const roofGeometry = new BoxGeometry(BODY_L + 0.08, ROOF_T, ROOF_W);
  // A second, narrower slab instead of a curved roof: two flat steps read as a
  // shallow barrel from any angle the camera is allowed to take.
  const crownGeometry = new BoxGeometry(BODY_L - 0.24, 0.07, ROOF_W - 0.4);
  const hatchGeometry = new BoxGeometry(0.34, 0.05, 0.34);

  // One box for both flanks: it is wider than the body, so it pokes out on each
  // side while its ends stay buried. A continuous black band beats nine
  // separate windows at this size — nine holes turn to mush, one band does not.
  const glassGeometry = new BoxGeometry(BODY_L - 0.34, GLASS_H, BODY_W + 0.03);
  const railGeometry = new BoxGeometry(BODY_L - 0.04, 0.06, BODY_W + 0.03);

  const skirtGeometry = new BoxGeometry(BODY_L - 0.1, 0.18, BODY_W - 0.1);
  // The rear wheel arch. No booleans here, so a dark flared box around the duals
  // is what makes the tyres look like they come out of a well instead of out of
  // the paintwork.
  const archGeometry = new BoxGeometry(0.98, 0.44, BODY_W + 0.02);

  const fenderGeometry = new BoxGeometry(HOOD_L, 0.5, BODY_W - 0.04);
  const hoodGeometry = new BoxGeometry(HOOD_L - 0.04, 0.3, HOOD_W);
  const grilleGeometry = new BoxGeometry(0.08, 0.46, 0.92);
  const grilleBarGeometry = new BoxGeometry(0.03, 0.42, 0.05);
  const lampGeometry = new SphereGeometry(0.115, 10, 8);
  const bumperGeometry = new BoxGeometry(0.1, 0.22, BODY_W + 0.04);
  const rearBumperGeometry = new BoxGeometry(0.1, 0.2, BODY_W + 0.02);
  const tieRodGeometry = new BoxGeometry(0.04, 0.3, 0.04);

  const windshieldGeometry = new BoxGeometry(0.08, GLASS_H, 1.52);
  const mullionGeometry = new BoxGeometry(0.05, GLASS_H + 0.02, 0.07);
  const cardGeometry = new BoxGeometry(0.05, 0.17, 0.86);
  const scrawlGeometry = new BoxGeometry(0.02, 0.06, 0.52);

  const doorPanelGeometry = new BoxGeometry(0.62, 0.7, 0.05);
  const doorBarGeometry = new BoxGeometry(0.05, 1.28, 0.04);
  const stepGeometry = new BoxGeometry(0.3, 0.06, 0.22);

  const rearDoorGeometry = new BoxGeometry(0.06, 1.02, 0.74);
  const rearPaneGeometry = new BoxGeometry(0.04, 0.34, 0.6);
  const rearBigGeometry = new BoxGeometry(0.03, 0.3, 0.56);
  const rearSmallGeometry = new BoxGeometry(0.02, 0.11, 0.46);
  const rearTagGeometry = new BoxGeometry(0.02, 0.3, 0.34);
  const tailLampGeometry = new BoxGeometry(0.06, 0.16, 0.16);

  const plywoodGeometry = new BoxGeometry(0.6, 0.5, 0.05);
  const battenGeometry = new BoxGeometry(0.64, 0.06, 0.02);
  const primerGeometry = new BoxGeometry(0.6, 0.42, 0.04);

  const mirrorArmGeometry = new BoxGeometry(0.05, 0.05, 0.16);
  const mirrorHeadGeometry = new BoxGeometry(0.05, 0.22, 0.1);

  // Tyres are cylinders laid on their side; baking the rotation into the
  // geometry keeps every wheel in the list down to a position.
  const wheelWideGeometry = new CylinderGeometry(WHEEL_R, WHEEL_R, 0.24, 12).rotateX(Math.PI / 2);
  const wheelNarrowGeometry = new CylinderGeometry(WHEEL_R, WHEEL_R, 0.17, 12).rotateX(Math.PI / 2);
  const hubGeometry = new CylinderGeometry(0.13, 0.13, 0.04, 8).rotateX(Math.PI / 2);

  const headGeometry = new SphereGeometry(0.105, 8, 6);

  // ---- Running gear -------------------------------------------------------

  const FRONT_AXLE_X = 1.62;
  const REAR_AXLE_X = -1.55;

  const WHEELS = [
    { x: FRONT_AXLE_X, z: 0.85, wide: true },
    { x: FRONT_AXLE_X, z: -0.85, wide: true },
    { x: REAR_AXLE_X, z: 0.88, wide: false },
    { x: REAR_AXLE_X, z: 0.7, wide: false },
    { x: REAR_AXLE_X, z: -0.7, wide: false },
    { x: REAR_AXLE_X, z: -0.88, wide: false },
  ];

  // No hubcaps on this bus, so the outer wheels show a bare dull hub. Dull, not
  // chrome: chrome would be the brightest thing on the vehicle and the headlight
  // has to win that fight.
  const HUBS = [
    { x: FRONT_AXLE_X, z: 0.97 },
    { x: FRONT_AXLE_X, z: -0.97 },
    { x: REAR_AXLE_X, z: 0.975 },
    { x: REAR_AXLE_X, z: -0.975 },
  ];

  // ---- The sign on the flank ----------------------------------------------
  // "TURNBULL · bull · A.C." from tail to nose, stopping at the door.
  //
  // These are not letters and are not meant to be: each block is a cluster of
  // two or three characters, and the gaps between them are what the eye reads
  // as writing. Same trick as the skull on the Warriors' vest and the tag on
  // the comfort station wall.
  //
  // It climbs toward the nose because somebody painted it standing on a crate.
  // The rise and the per-block tilt are the same slope, so it reads as one bad
  // baseline rather than as blocks placed wrong.
  const SIGN_Y = 0.84;
  const SIGN_RISE = 0.035;
  const SIGN_TILT = 0.035;

  const SIGN = [
    { x: -1.98, w: 0.5, h: 0.28 },
    { x: -1.42, w: 0.5, h: 0.28 },
    { x: -0.86, w: 0.42, h: 0.28 },
    { x: 0.24, w: 0.24, h: 0.26 },
    { x: 0.54, w: 0.24, h: 0.26 },
  ];
  const signGeometries = SIGN.map((b) => new BoxGeometry(b.w, b.h, 0.02));

  /** The painted baseline: everything on the sign sits on this line. */
  function signY(x: number): number {
    return SIGN_Y + x * SIGN_RISE;
  }

  const BULL_X = -0.22;
  const bullFaceGeometry = new BoxGeometry(0.32, 0.3, 0.02);
  const bullHornGeometry = new BoxGeometry(0.16, 0.055, 0.02);

  // ---- Damage and history -------------------------------------------------

  // Yellow bleeding out from under the green. Thin on purpose: a hairline at a
  // panel edge reads as paint that did not cover, while a block of the same
  // colour would read as more lettering. This is the detail that tells the
  // whole story of the vehicle without a word of text.
  const YELLOW = [
    { x: BODY_CX, y: GLASS_BOT - 0.025, w: BODY_L - 0.5, h: 0.05 }, // the window line
    { x: BODY_CX, y: ROOF_Y - 0.03, w: BODY_L - 0.9, h: 0.04 }, // under the drip edge
    { x: -1.6, y: GLASS_TOP + 0.05, w: 0.9, h: 0.09 }, // the ghost of "SCHOOL BUS"
    { x: 0.1, y: 0.46, w: 0.62, h: 0.05 }, // along the sill
  ];
  const yellowGeometries = YELLOW.map((s) => new BoxGeometry(s.w, s.h, 0.02));

  const RUST = [
    { x: REAR_AXLE_X, y: 0.8, w: 0.96, h: 0.09 }, // the top of the rear arch, where it always starts
    { x: -0.5, y: 0.44, w: 0.6, h: 0.1 }, // a sill line mid-body
    { x: -2.24, y: 0.62, w: 0.2, h: 0.4 }, // the rear corner seam
  ];
  const rustGeometries = RUST.map((s) => new BoxGeometry(s.w, s.h, 0.02));

  // Other people's tags, in the same three-colour vocabulary as the comfort
  // station wall — the paint on this board should look like it came out of the
  // same few cans. One of them has been crossed out by somebody else.
  const GRAFFITI = [
    { x: -1.02, y: 1.3, w: 0.52, h: 0.24, rot: -0.14, color: '#d94f3d' },
    { x: 0.02, y: 0.58, w: 0.42, h: 0.22, rot: 0.22, color: '#3fa0c9' },
  ];
  const graffitiMaterials = GRAFFITI.map(
    (g) => new MeshStandardMaterial({ color: g.color, roughness: 1 })
  );
  const graffitiGeometries = GRAFFITI.map((g) => new BoxGeometry(g.w, g.h, 0.02));
  const crossOutGeometry = new BoxGeometry(0.62, 0.06, 0.02);
  const crossOut = new MeshStandardMaterial({ color: '#cdc6b8', roughness: 1 });

  // The windscreen, starred on the passenger side. Four bars radiating from one
  // point is the cheapest thing that reads as a spider-web crack.
  const CRACKS = [
    { len: 0.46, rot: 0 },
    { len: 0.4, rot: 1 },
    { len: 0.4, rot: -1 },
    { len: 0.26, rot: 2.1 },
  ];
  const crackGeometries = CRACKS.map((c) => new BoxGeometry(0.02, 0.025, c.len));

  // Shaved heads pressed against the glass. The sphere sits mostly inside the
  // window band and only the cap comes through, which is what turns it into a
  // head behind a window instead of a ball stuck to the side.
  const HEADS = [
    { x: -2.02, side: 1, dark: false, scale: 1 },
    { x: -1.42, side: 1, dark: true, scale: 0.92 },
    { x: -0.55, side: 1, dark: false, scale: 1.05 },
    { x: 0.34, side: 1, dark: true, scale: 0.95 },
    { x: -1.3, side: -1, dark: true, scale: 1 },
    { x: -0.4, side: -1, dark: false, scale: 0.95 },
    { x: 0.42, side: -1, dark: true, scale: 1.05 },
  ];
  const HEAD_Z = FLANK_Z - 0.03;

  const FLANKS = [1, -1];
  const GRILLE_BARS = [-0.3, -0.1, 0.1, 0.3];
</script>

<T.Group {position} rotation.y={rotation}>
  <!-- Wheels stay level with the road: the sag lives in the springs, so only
       the body above them is tilted. Tilting the whole prop would bury the
       front tyres in the asphalt. -->
  {#each WHEELS as w, i (i)}
    <T.Mesh
      geometry={w.wide ? wheelWideGeometry : wheelNarrowGeometry}
      material={rubber}
      position={[w.x, WHEEL_R, w.z]}
      castShadow
    />
  {/each}
  {#each HUBS as h, i (i)}
    <T.Mesh geometry={hubGeometry} material={primer} position={[h.x, WHEEL_R, h.z]} />
  {/each}

  <T.Group rotation.z={SAG} rotation.x={LEAN}>
    <!-- ---- The three masses ------------------------------------------ -->

    <T.Mesh
      geometry={bodyGeometry}
      material={green}
      position={[BODY_CX, SILL_Y + BODY_H / 2, 0]}
      castShadow
      receiveShadow
    />

    <T.Mesh
      geometry={fenderGeometry}
      material={green}
      position={[HOOD_CX, 0.65, 0]}
      castShadow
      receiveShadow
    />
    <T.Mesh
      geometry={hoodGeometry}
      material={green}
      position={[HOOD_CX - 0.02, 1.05, 0]}
      castShadow
      receiveShadow
    />

    <T.Mesh
      geometry={roofGeometry}
      material={greenRoof}
      position={[BODY_CX, ROOF_Y + ROOF_T / 2, 0]}
      castShadow
      receiveShadow
    />
    <T.Mesh
      geometry={crownGeometry}
      material={greenRoof}
      position={[BODY_CX, ROOF_Y + ROOF_T + 0.035, 0]}
      castShadow
    />
    <T.Mesh geometry={hatchGeometry} material={chassis} position={[-0.6, ROOF_Y + ROOF_T + 0.09, 0]} />

    <!-- ---- Underbody ------------------------------------------------- -->

    <T.Mesh geometry={skirtGeometry} material={chassis} position={[BODY_CX, 0.29, 0]} castShadow />
    <T.Mesh geometry={archGeometry} material={chassis} position={[REAR_AXLE_X, 0.56, 0]} castShadow />

    <!-- Front bumper: shoved in on one corner and held up with a rod. Rotating
         it off true is cheaper than modelling a dent and reads the same. -->
    <T.Mesh
      geometry={bumperGeometry}
      material={chassis}
      position={[NOSE_X + 0.07, 0.4, 0]}
      rotation.x={0.07}
      rotation.z={-0.05}
      castShadow
    />
    <T.Mesh
      geometry={tieRodGeometry}
      material={steel}
      position={[NOSE_X + 0.05, 0.56, 0.62]}
      rotation.z={0.3}
    />
    <T.Mesh
      geometry={rearBumperGeometry}
      material={chassis}
      position={[TAIL_X - 0.06, 0.46, 0]}
      castShadow
    />

    <!-- ---- Glass, rails and the panels bolted over them --------------- -->

    <T.Mesh geometry={glassGeometry} material={glass} position={[BODY_CX + 0.04, GLASS_CY, 0]} />
    <T.Mesh geometry={railGeometry} material={greenDark} position={[BODY_CX, 1.06, 0]} />
    <T.Mesh geometry={railGeometry} material={greenDark} position={[BODY_CX, 0.56, 0]} />

    {#each HEADS as h, i (i)}
      <T.Mesh
        geometry={headGeometry}
        material={h.dark ? skinDark : skinLight}
        position={[h.x, GLASS_CY + 0.05, h.side * HEAD_Z]}
        scale={h.scale}
      />
    {/each}

    <!-- One window boarded up, on the side away from the door so it never
         hides behind the passengers getting out. -->
    <T.Mesh geometry={plywoodGeometry} material={plank} position={[-1.85, GLASS_CY, -PANEL_Z - 0.01]} />
    <T.Mesh geometry={battenGeometry} material={chassis} position={[-1.85, GLASS_CY, -PANEL_Z - 0.03]} />

    <!-- A replacement body panel in bare primer, beaten in over the middle of
         the word. One flank tells a slightly different story than the other,
         which is what a vehicle that has been fixed twice looks like. -->
    <T.Mesh geometry={primerGeometry} material={primer} position={[-1.42, 0.82, -PANEL_Z - 0.013]} />

    <!-- ---- Hand-painted sign, both flanks ---------------------------- -->
    <!-- No mirroring of the layout: the blocks live in the bus's own space, so
         the lettering climbs toward the nose on whichever side you are looking
         at. That is what a sign painted by one man on one afternoon does. -->
    {#each FLANKS as side (side)}
      {#each SIGN as b, i (i)}
        <T.Mesh
          geometry={signGeometries[i]}
          material={gold}
          position={[b.x, signY(b.x), side * SIGN_Z]}
          rotation.z={SIGN_TILT}
        />
      {/each}

      <T.Mesh
        geometry={bullFaceGeometry}
        material={gold}
        position={[BULL_X, signY(BULL_X), side * SIGN_Z]}
        rotation.z={SIGN_TILT}
      />
      <T.Mesh
        geometry={bullHornGeometry}
        material={gold}
        position={[BULL_X - 0.18, signY(BULL_X) + 0.13, side * SIGN_Z]}
        rotation.z={-0.6}
      />
      <T.Mesh
        geometry={bullHornGeometry}
        material={gold}
        position={[BULL_X + 0.18, signY(BULL_X) + 0.13, side * SIGN_Z]}
        rotation.z={0.6}
      />

      {#each YELLOW as s, i (i)}
        <T.Mesh
          geometry={yellowGeometries[i]}
          material={schoolYellow}
          position={[s.x, s.y, side * SIGN_Z]}
        />
      {/each}

      {#each RUST as s, i (i)}
        <T.Mesh geometry={rustGeometries[i]} material={rust} position={[s.x, s.y, side * RUST_Z]} />
      {/each}

      {#each GRAFFITI as g, i (i)}
        <T.Mesh
          geometry={graffitiGeometries[i]}
          material={graffitiMaterials[i]}
          position={[g.x, g.y, side * TAG_Z]}
          rotation.z={g.rot}
        />
      {/each}
      <T.Mesh
        geometry={crossOutGeometry}
        material={crossOut}
        position={[GRAFFITI[0].x, GRAFFITI[0].y, side * (TAG_Z + 0.01)]}
        rotation.z={0.35}
      />
    {/each}

    <!-- ---- Nose ------------------------------------------------------- -->

    <T.Mesh geometry={grilleGeometry} material={chassis} position={[NOSE_X - 0.01, 0.66, 0]} />
    {#each GRILLE_BARS as z (z)}
      <T.Mesh geometry={grilleBarGeometry} material={steel} position={[NOSE_X + 0.035, 0.66, z]} />
    {/each}

    <!-- One eye. A bus with both headlights working is a bus that has been
         looked after, and at night on an isometric board a single warm point is
         a signature you can pick out from across the map. -->
    <T.Mesh geometry={lampGeometry} material={headlamp} position={[NOSE_X + 0.03, 0.76, -0.66]} />
    <T.Mesh geometry={lampGeometry} material={deadLamp} position={[NOSE_X + 0.03, 0.76, 0.66]} />

    <T.Mesh geometry={windshieldGeometry} material={glass} position={[BODY_FRONT_X + 0.02, GLASS_CY, 0]} />
    <T.Mesh geometry={mullionGeometry} material={green} position={[BODY_FRONT_X + 0.07, GLASS_CY, 0]} />
    <T.Mesh
      geometry={headGeometry}
      material={skinLight}
      position={[BODY_FRONT_X + 0.02, GLASS_CY + 0.02, -0.34]}
    />
    {#each CRACKS as c, i (i)}
      <T.Mesh
        geometry={crackGeometries[i]}
        material={shatter}
        position={[BODY_FRONT_X + 0.085, GLASS_CY, 0.42]}
        rotation.x={c.rot}
      />
    {/each}

    <!-- Where the destination roll used to go: a piece of cardboard with the
         gang's name scrawled on it. In miniature this is the single strongest
         tell that the bus belongs to somebody. -->
    <T.Mesh geometry={cardGeometry} material={cardboard} position={[BODY_FRONT_X + 0.05, GLASS_TOP + 0.07, 0]} />
    <T.Mesh
      geometry={scrawlGeometry}
      material={chassis}
      position={[BODY_FRONT_X + 0.085, GLASS_TOP + 0.07, 0]}
      rotation.x={0.06}
    />

    <!-- Mirrors on stalks. They are the only parts that hang outside the
         footprint, by about a tenth of a tile — worth it, because a pair of
         stalks at the cowl is the difference between a vehicle and a crate.
         The kerb-side one has been folded back and wired. -->
    {#each FLANKS as side (side)}
      <T.Mesh
        geometry={mirrorArmGeometry}
        material={steel}
        position={[1.33, 1.58, side * (FLANK_Z + 0.06)]}
      />
      <T.Mesh
        geometry={mirrorHeadGeometry}
        material={chassis}
        position={[1.33, 1.5, side * (FLANK_Z + 0.12)]}
        rotation.z={side === DOOR_SIDE ? 0.3 : 0}
        rotation.y={side === DOOR_SIDE ? 0.25 : 0}
      />
    {/each}

    <!-- ---- The folding door ------------------------------------------- -->
    <!-- Two uprights and a centre seam crossing the window band is all it takes
         to say "bi-fold door here" — the glass in the door is already part of
         the continuous band, so it needs no pane of its own. -->
    <T.Mesh
      geometry={doorPanelGeometry}
      material={chassis}
      position={[1.02, 0.78, DOOR_SIDE * PANEL_Z]}
    />
    <T.Mesh
      geometry={doorBarGeometry}
      material={greenDark}
      position={[0.7, 1.05, DOOR_SIDE * (PANEL_Z + 0.01)]}
    />
    <T.Mesh
      geometry={doorBarGeometry}
      material={greenDark}
      position={[1.34, 1.05, DOOR_SIDE * (PANEL_Z + 0.01)]}
    />
    <T.Mesh
      geometry={doorBarGeometry}
      material={greenDark}
      position={[1.02, 1.05, DOOR_SIDE * (PANEL_Z + 0.01)]}
    />
    <!-- The step the war chief shouts from. -->
    <T.Mesh
      geometry={stepGeometry}
      material={chassis}
      position={[1.02, 0.34, DOOR_SIDE * (FLANK_Z + 0.05)]}
      castShadow
    />

    <!-- ---- Tail -------------------------------------------------------- -->

    <T.Mesh geometry={rearDoorGeometry} material={greenDark} position={[TAIL_X - 0.02, 1.02, 0]} />
    <T.Mesh geometry={rearPaneGeometry} material={glass} position={[TAIL_X - 0.05, 1.36, 0]} />
    <T.Mesh geometry={rearBigGeometry} material={gold} position={[TAIL_X - 0.055, 0.95, 0]} />
    <T.Mesh
      geometry={rearSmallGeometry}
      material={gold}
      position={[TAIL_X - 0.06, 0.7, 0]}
      rotation.x={0.12}
    />
    <T.Mesh
      geometry={rearTagGeometry}
      material={graffitiMaterials[1]}
      position={[TAIL_X - 0.015, 1.2, 0.72]}
      rotation.x={0.2}
    />

    <T.Mesh geometry={tailLampGeometry} material={tailLamp} position={[TAIL_X - 0.02, 0.8, 0.72]} />
    <T.Mesh geometry={tailLampGeometry} material={deadLamp} position={[TAIL_X - 0.02, 0.8, -0.72]} />
  </T.Group>
</T.Group>
