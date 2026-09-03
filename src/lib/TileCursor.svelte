<script lang="ts">
  // The tile cursor — a bright frame on the tile under the pointer plus the
  // little bobbing arrow the genre has used since the 16-bit era. The arrow is
  // what makes a selection readable when the frame is edge-on to the camera.

  import { T, useTask } from '@threlte/core';
  import {
    ConeGeometry,
    DoubleSide,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
  } from 'three';
  import { LEVEL, TILE, tileAt, type BattleMap, type Coord } from './grid';
  import { getCursorTexture } from './textures';

  let {
    map,
    tile,
    color = '#ffffff',
    showArrow = true,
  }: {
    map: BattleMap;
    tile: Coord | null;
    color?: string;
    showArrow?: boolean;
  } = $props();

  const frameGeometry = new PlaneGeometry(TILE * 1.02, TILE * 1.02).rotateX(-Math.PI / 2);
  const arrowGeometry = new ConeGeometry(0.17, 0.3, 4).rotateX(Math.PI);

  const frameMaterial = new MeshBasicMaterial({
    map: getCursorTexture(),
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
    toneMapped: false,
  });
  const arrowMaterial = new MeshBasicMaterial({ toneMapped: false, depthTest: false });

  $effect(() => {
    frameMaterial.color.set(color);
    arrowMaterial.color.set(color);
  });

  const placement = $derived.by(() => {
    if (!tile) return null;
    const t = tileAt(map, tile.x, tile.y);
    if (!t) return null;
    return {
      x: (tile.x - (map.width - 1) / 2) * TILE,
      y: t.height * LEVEL,
      z: (tile.y - (map.depth - 1) / 2) * TILE,
    };
  });

  let arrowRef = $state.raw<Mesh | undefined>(undefined);
  let elapsed = 0;

  useTask((delta) => {
    elapsed += delta;
    if (arrowRef) arrowRef.position.y = 1.05 + Math.sin(elapsed * 4) * 0.08;
  });
</script>

{#if placement}
  <!-- depthTest is off on both: the cursor must stay visible even when a
       cliff behind it would otherwise cut into the frame. renderOrder puts it
       above the range panels. -->
  <T.Group position={[placement.x, placement.y, placement.z]}>
    <T.Mesh
      geometry={frameGeometry}
      material={frameMaterial}
      position.y={0.05}
      renderOrder={4}
    />
    {#if showArrow}
      <T.Mesh
        bind:ref={arrowRef}
        geometry={arrowGeometry}
        material={arrowMaterial}
        position.y={1.05}
        renderOrder={5}
      />
    {/if}
  </T.Group>
{/if}
