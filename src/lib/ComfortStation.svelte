<script lang="ts">
  // The park's comfort station, standing on the north-west terrace.
  //
  // No model files: a concrete plinth, brick walls, a flat slab roof with a
  // cornice lip, a black doorway, a lamp over it, and a painted patch on the
  // south wall. At the scale the isometric camera works at, that silhouette is
  // all a building needs — and it stays a handful of numbers anyone can nudge.
  //
  // The south wall faces the battlefield on purpose. It is the one flat, lit
  // surface on the board, which makes it the wall worth tagging.

  import { T } from '@threlte/core';
  import { BoxGeometry, MeshStandardMaterial, SphereGeometry } from 'three';

  let {
    position = [0, 0, 0],
  }: { position?: [number, number, number] } = $props();

  const brick = new MeshStandardMaterial({ color: '#6d4436', roughness: 1, flatShading: true });
  const concrete = new MeshStandardMaterial({ color: '#7d7a72', roughness: 1, flatShading: true });
  const roof = new MeshStandardMaterial({ color: '#4a4b50', roughness: 0.95, flatShading: true });
  const dark = new MeshStandardMaterial({ color: '#141318', roughness: 1 });
  // The lamp reads as on because it is emissive, not because it lights the
  // scene — one more real light per prop is a cost the whole board pays.
  const bulb = new MeshStandardMaterial({
    color: '#ffd9a0',
    emissive: '#ffb455',
    emissiveIntensity: 1.6,
    roughness: 0.4,
  });

  const WALL_W = 2.6; // east–west
  const WALL_D = 1.8; // north–south
  const WALL_H = 1.25;
  const PLINTH_H = 0.16;
  const SLAB_H = 0.14;
  const OVERHANG = 0.16;

  const ROOF_Y = PLINTH_H + WALL_H;

  const plinthGeometry = new BoxGeometry(WALL_W + 0.3, PLINTH_H, WALL_D + 0.3);
  const wallGeometry = new BoxGeometry(WALL_W, WALL_H, WALL_D);
  const slabGeometry = new BoxGeometry(WALL_W + OVERHANG * 2, SLAB_H, WALL_D + OVERHANG * 2);
  const lipGeometry = new BoxGeometry(WALL_W + OVERHANG * 2, 0.07, 0.06);
  const doorGeometry = new BoxGeometry(0.58, 0.86, 0.1);
  const bandGeometry = new BoxGeometry(WALL_W + 0.02, 0.1, WALL_D + 0.02);
  const stepGeometry = new BoxGeometry(1.0, 0.09, 0.22);
  const hoodGeometry = new BoxGeometry(0.34, 0.05, 0.2);
  const bulbGeometry = new SphereGeometry(0.075, 10, 8);

  // A vent grille, and the barred window every one of these buildings has.
  const barGeometry = new BoxGeometry(0.05, 0.4, 0.08);
  const windowGeometry = new BoxGeometry(0.5, 0.4, 0.09);

  /**
   * The tag on the south wall, as three flat color blocks. It is not lettering
   * at this size — it is the smear of color that says somebody has been here,
   * which is all the silhouette can carry anyway.
   */
  const TAG = [
    { w: 0.62, h: 0.26, x: -0.72, y: 0.52, color: '#d94f3d' },
    { w: 0.5, h: 0.2, x: -0.2, y: 0.38, color: '#e8c33c' },
    { w: 0.44, h: 0.3, x: 0.78, y: 0.6, color: '#3fa0c9' },
  ];
  const tagMaterials = TAG.map(
    (t) => new MeshStandardMaterial({ color: t.color, roughness: 1 })
  );
  const tagGeometries = TAG.map((t) => new BoxGeometry(t.w, t.h, 0.02));
</script>

<T.Group {position}>
  <T.Mesh
    geometry={plinthGeometry}
    material={concrete}
    position.y={PLINTH_H / 2}
    castShadow
    receiveShadow
  />

  <T.Mesh
    geometry={wallGeometry}
    material={brick}
    position.y={PLINTH_H + WALL_H / 2}
    castShadow
    receiveShadow
  />

  <!-- Concrete band where the brick meets the roof, the way these were built. -->
  <T.Mesh geometry={bandGeometry} material={concrete} position.y={ROOF_Y - 0.11} castShadow />

  <!-- Flat roof: a slab that overhangs on all four sides, plus a raised lip on
       the south edge so the skyline is not a single clean rectangle. -->
  <T.Mesh geometry={slabGeometry} material={roof} position.y={ROOF_Y + SLAB_H / 2} castShadow />
  <T.Mesh
    geometry={lipGeometry}
    material={roof}
    position={[0, ROOF_Y + SLAB_H + 0.035, WALL_D / 2 + OVERHANG - 0.03]}
    castShadow
  />

  <!-- South face: doorway, lamp, barred window, and the tag. -->
  <T.Mesh
    geometry={doorGeometry}
    material={dark}
    position={[-0.55, PLINTH_H + 0.43, WALL_D / 2 + 0.01]}
  />
  <T.Mesh
    geometry={hoodGeometry}
    material={concrete}
    position={[-0.55, PLINTH_H + 0.95, WALL_D / 2 + 0.08]}
    castShadow
  />
  <T.Mesh geometry={bulbGeometry} material={bulb} position={[-0.55, PLINTH_H + 0.9, WALL_D / 2 + 0.1]} />
  <T.Mesh
    geometry={stepGeometry}
    material={concrete}
    position={[-0.55, 0.045, WALL_D / 2 + 0.22]}
    receiveShadow
  />

  <T.Mesh
    geometry={windowGeometry}
    material={dark}
    position={[0.75, PLINTH_H + 0.72, WALL_D / 2 + 0.01]}
  />
  {#each [-0.14, 0, 0.14] as dx (dx)}
    <T.Mesh
      geometry={barGeometry}
      material={concrete}
      position={[0.75 + dx, PLINTH_H + 0.72, WALL_D / 2 + 0.04]}
    />
  {/each}

  {#each TAG as t, i (i)}
    <T.Mesh
      geometry={tagGeometries[i]}
      material={tagMaterials[i]}
      position={[t.x, t.y, WALL_D / 2 + 0.012]}
    />
  {/each}
</T.Group>
