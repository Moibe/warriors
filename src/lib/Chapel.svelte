<script lang="ts">
  // The chapel that crowns the north-west plateau, built from primitives.
  //
  // No model files: a plinth, four walls, two tilted roof slabs meeting at a
  // ridge, extruded triangular gables and an arched door. At the scale the
  // isometric camera works at, that silhouette is all a building needs — and it
  // stays a handful of numbers anyone can nudge.

  import { T } from '@threlte/core';
  import {
    BoxGeometry,
    CircleGeometry,
    CylinderGeometry,
    ExtrudeGeometry,
    MeshStandardMaterial,
    Shape,
  } from 'three';

  let {
    position = [0, 0, 0],
  }: { position?: [number, number, number] } = $props();

  const stone = new MeshStandardMaterial({ color: '#bdb5a5', roughness: 1, flatShading: true });
  const stoneDark = new MeshStandardMaterial({ color: '#9a9082', roughness: 1, flatShading: true });
  const roof = new MeshStandardMaterial({ color: '#6a6e79', roughness: 0.9, flatShading: true });
  const wood = new MeshStandardMaterial({ color: '#4a3524', roughness: 1 });
  const glass = new MeshStandardMaterial({
    color: '#2f4a72',
    roughness: 0.4,
    emissive: '#16233a',
  });

  const WALL_W = 2.6; // east–west
  const WALL_D = 1.8; // north–south, the ridge runs this way
  const WALL_H = 1.4;
  const PLINTH_H = 0.16;
  const EAVE_OVERHANG = 0.28;
  const ROOF_PITCH = 0.52; // radians ≈ 30°

  // The roof is derived from the pitch rather than eyeballed, so the gable
  // triangle and the slabs always describe the same roofline. Getting these out
  // of sync is what makes a hand-placed roof show a sliver of wall poking
  // through it.
  const GABLE_RISE = (WALL_W / 2) * Math.tan(ROOF_PITCH);
  const RIDGE_Y = PLINTH_H + WALL_H + GABLE_RISE;
  /** Slab length measured along the slope, from ridge to eave. */
  const SLAB_W = WALL_W / 2 / Math.cos(ROOF_PITCH) + EAVE_OVERHANG;
  const slabOffsetX = (SLAB_W / 2) * Math.cos(ROOF_PITCH);
  const slabOffsetY = (SLAB_W / 2) * Math.sin(ROOF_PITCH);

  const plinthGeometry = new BoxGeometry(WALL_W + 0.35, PLINTH_H, WALL_D + 0.35);
  const wallGeometry = new BoxGeometry(WALL_W, WALL_H, WALL_D);
  const slabGeometry = new BoxGeometry(SLAB_W, 0.12, WALL_D + 0.3);
  const ridgeGeometry = new BoxGeometry(0.18, 0.13, WALL_D + 0.34);
  const doorGeometry = new BoxGeometry(0.56, 0.72, 0.12);
  const archGeometry = new CylinderGeometry(0.28, 0.28, 0.12, 16, 1, false, 0, Math.PI).rotateX(
    Math.PI / 2
  );
  const stepGeometry = new BoxGeometry(1.0, 0.09, 0.22);
  const roseGeometry = new CircleGeometry(0.17, 16);

  /** Triangular gable filling the wedge between wall top and roof ridge. */
  const gableShape = new Shape();
  gableShape.moveTo(-WALL_W / 2, 0);
  gableShape.lineTo(WALL_W / 2, 0);
  gableShape.lineTo(0, GABLE_RISE);
  gableShape.closePath();
  const gableGeometry = new ExtrudeGeometry(gableShape, { depth: 0.14, bevelEnabled: false });
</script>

<T.Group {position}>
  <T.Mesh geometry={plinthGeometry} material={stoneDark} position.y={PLINTH_H / 2} castShadow receiveShadow />

  <T.Mesh
    geometry={wallGeometry}
    material={stone}
    position.y={PLINTH_H + WALL_H / 2}
    castShadow
    receiveShadow
  />

  <!-- Gables: south face gets the rose window, north is plain. -->
  <T.Mesh
    geometry={gableGeometry}
    material={stone}
    position={[0, PLINTH_H + WALL_H, WALL_D / 2 - 0.14]}
    castShadow
  />
  <T.Mesh
    geometry={gableGeometry}
    material={stone}
    position={[0, PLINTH_H + WALL_H, -WALL_D / 2]}
    castShadow
  />
  <T.Mesh
    geometry={roseGeometry}
    material={glass}
    position={[0, PLINTH_H + WALL_H + 0.3, WALL_D / 2 + 0.01]}
  />

  <!-- Roof slabs. The outer edge of each drops, so the +x slab tilts negative. -->
  <T.Mesh
    geometry={slabGeometry}
    material={roof}
    position={[-slabOffsetX, RIDGE_Y - slabOffsetY, 0]}
    rotation.z={ROOF_PITCH}
    castShadow
  />
  <T.Mesh
    geometry={slabGeometry}
    material={roof}
    position={[slabOffsetX, RIDGE_Y - slabOffsetY, 0]}
    rotation.z={-ROOF_PITCH}
    castShadow
  />
  <T.Mesh geometry={ridgeGeometry} material={roof} position={[0, RIDGE_Y + 0.02, 0]} castShadow />

  <!-- Arched door on the south wall, facing the battlefield. -->
  <T.Mesh geometry={doorGeometry} material={wood} position={[0, PLINTH_H + 0.36, WALL_D / 2 + 0.02]} />
  <T.Mesh geometry={archGeometry} material={wood} position={[0, PLINTH_H + 0.72, WALL_D / 2 + 0.02]} />
  <T.Mesh geometry={stepGeometry} material={stoneDark} position={[0, 0.045, WALL_D / 2 + 0.2]} receiveShadow />
</T.Group>
