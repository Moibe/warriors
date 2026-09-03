<script lang="ts">
  // The coloured panes laid over tiles: blue for movement, red for a weapon's
  // reach, amber for the burst of the ability being aimed. One instanced mesh
  // per overlay layer, so a forty-tile movement range still costs one draw call.

  import { T, useTask } from '@threlte/core';
  import {
    DoubleSide,
    InstancedMesh,
    MeshBasicMaterial,
    Object3D,
    PlaneGeometry,
  } from 'three';
  import { LEVEL, TILE, parseKey, tileAt, type BattleMap } from './grid';
  import { getPanelTexture } from './textures';

  let {
    map,
    tiles,
    color = '#3d8ee8',
    opacity = 0.5,
    /** Height above the tile surface. Layers stack: move 0.02, range 0.03… */
    lift = 0.02,
    /** Breathing amount, 0 = static. Keeps a big range from looking painted on. */
    pulse = 0.12,
  }: {
    map: BattleMap;
    tiles: Set<string>;
    color?: string;
    opacity?: number;
    lift?: number;
    pulse?: number;
  } = $props();

  const MAX_PANELS = 600;
  const PANEL_SCALE = 0.92;

  const geometry = new PlaneGeometry(TILE, TILE).rotateX(-Math.PI / 2);
  const material = new MeshBasicMaterial({
    map: getPanelTexture(),
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });

  let meshRef = $state.raw<InstancedMesh | undefined>(undefined);
  const dummy = new Object3D();
  let elapsed = 0;

  $effect(() => {
    material.color.set(color);
  });

  $effect(() => {
    const mesh = meshRef;
    if (!mesh) return;

    let i = 0;
    for (const key of tiles) {
      if (i >= MAX_PANELS) break;
      const { x, y } = parseKey(key);
      const tile = tileAt(map, x, y);
      if (!tile) continue;
      dummy.position.set(
        (x - (map.width - 1) / 2) * TILE,
        tile.height * LEVEL + lift,
        (y - (map.depth - 1) / 2) * TILE
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(PANEL_SCALE, 1, PANEL_SCALE);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  });

  // Opacity is written in exactly one place. `pulse` 0 simply makes the
  // breathing term vanish, so a static layer needs no separate code path.
  useTask((delta) => {
    elapsed += delta;
    material.opacity = opacity * (1 - pulse + pulse * Math.sin(elapsed * 3.2));
  });
</script>

<!-- renderOrder 1: over the terrain, under the units. -->
<T.InstancedMesh
  bind:ref={meshRef}
  args={[geometry, material, MAX_PANELS]}
  renderOrder={1}
  frustumCulled={false}
/>
