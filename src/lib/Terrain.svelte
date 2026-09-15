<script lang="ts">
  // The battlefield itself: one instanced box per tile for the column, one
  // instanced plate on top for the walkable surface.
  //
  // Two meshes instead of one is what produces the FFT silhouette. The column
  // carries the dull rock tone and gets almost entirely hidden by its
  // neighbours — only cliff faces survive — while the slightly inset top plate
  // carries the bright surface color. The sliver of column left showing around
  // each plate becomes the grid seam, for free.

  import { T } from '@threlte/core';
  import {
    BoxGeometry,
    Color,
    InstancedMesh,
    MeshStandardMaterial,
    Object3D,
    PlaneGeometry,
  } from 'three';
  import {
    COLUMN_DEPTH,
    LEVEL,
    SURFACE_COLORS,
    TILE,
    hash2D,
    tileToWorld,
    type BattleMap,
    type Tile,
  } from './grid';

  let {
    map,
    onTileClick,
    onTileHover,
  }: {
    map: BattleMap;
    onTileClick?: (tile: Tile) => void;
    /** The tile under the pointer, or null once the pointer leaves the board. */
    onTileHover?: (tile: Tile | null) => void;
  } = $props();

  /** Void cells are simply absent, so instance index ≠ tile index. */
  const cells = $derived(map.tiles.filter((t): t is Tile => t !== null));

  /**
   * Sheet metal means the tile is the top of something a prop already draws —
   * the roof of a parked car — so the ground stops at the plate and the column
   * underneath it is skipped. Without this the terrain puts an opaque box the
   * size of the car exactly where the car is, and swallows it whole.
   */
  const columnCells = $derived(cells.filter((c) => c.surface !== 'metal'));

  /** Fraction of a tile the top plate is inset, leaving the seam visible. */
  const PLATE_SCALE = 0.965;
  /** Lift above the column's top face; enough to beat z-fighting, invisible. */
  const PLATE_LIFT = 0.004;
  /**
   * Sheet metal goes the other way: the plate sinks *into* the prop's own roof
   * slab instead of sitting on it. Hidden, because the car is already painting
   * that surface and a grey quad on top of it reads as a tarpaulin — but still
   * there, so clicking a car roof still selects the square. Nothing else on the
   * board has a mesh of its own standing exactly where its ground is.
   */
  const METAL_SINK = -0.02;

  // The column box is authored with its top face on y = 0 so an instance can be
  // positioned at the tile's walkable height and stretched downward.
  const columnGeometry = new BoxGeometry(TILE, 1, TILE).translate(0, -0.5, 0);
  const plateGeometry = new PlaneGeometry(TILE, TILE).rotateX(-Math.PI / 2);

  const columnMaterial = new MeshStandardMaterial({ roughness: 1, metalness: 0, flatShading: true });
  const plateMaterial = new MeshStandardMaterial({ roughness: 0.95, metalness: 0 });

  // $state.raw on three.js refs — a deep $state proxy over an Object3D turns
  // three's own internal mutations into reactive writes and loops forever.
  let columnsRef = $state.raw<InstancedMesh | undefined>(undefined);
  let platesRef = $state.raw<InstancedMesh | undefined>(undefined);

  const dummy = new Object3D();
  const tmpColor = new Color();

  /**
   * Fills both instanced buffers. The map is static, so this runs once per
   * map rather than per frame — the terrain costs two draw calls and no
   * per-frame CPU at all.
   */
  $effect(() => {
    const columns = columnsRef;
    const plates = platesRef;
    if (!columns || !plates) return;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const w = tileToWorld(map, cell.x, cell.y, cell.height);
      const topY = cell.height * LEVEL;

      const lift = cell.surface === 'metal' ? METAL_SINK : PLATE_LIFT;
      dummy.position.set(w.x, topY + lift, w.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(PLATE_SCALE, 1, PLATE_SCALE);
      dummy.updateMatrix();
      plates.setMatrixAt(i, dummy.matrix);

      // A deterministic ±6% brightness wobble per tile. Without it a meadow
      // reads as one flat sheet of paint; with it, as ground.
      const palette = SURFACE_COLORS[cell.surface];
      const jitter = 0.94 + hash2D(cell.x, cell.y, 7) * 0.12;
      tmpColor.set(palette.top).multiplyScalar(jitter);
      plates.setColorAt(i, tmpColor);
    }

    for (let i = 0; i < columnCells.length; i++) {
      const cell = columnCells[i];
      const w = tileToWorld(map, cell.x, cell.y, cell.height);
      const topY = cell.height * LEVEL;

      // Column: from the walkable top down past the lowest terrain, so cliff
      // faces are solid instead of floating slabs.
      dummy.position.set(w.x, topY, w.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, topY + COLUMN_DEPTH, 1);
      dummy.updateMatrix();
      columns.setMatrixAt(i, dummy.matrix);

      const palette = SURFACE_COLORS[cell.surface];
      const jitter = 0.94 + hash2D(cell.x, cell.y, 7) * 0.12;
      tmpColor.set(palette.side).multiplyScalar(jitter);
      columns.setColorAt(i, tmpColor);
    }

    columns.count = columnCells.length;
    plates.count = cells.length;
    columns.instanceMatrix.needsUpdate = true;
    plates.instanceMatrix.needsUpdate = true;
    if (columns.instanceColor) columns.instanceColor.needsUpdate = true;
    if (plates.instanceColor) plates.instanceColor.needsUpdate = true;
    columns.computeBoundingSphere();
    plates.computeBoundingSphere();
  });

  type PointerLike = { instanceId?: number; stopPropagation?: () => void };

  function handleClick(e: PointerLike) {
    const idx = e.instanceId;
    if (idx === undefined) return;
    e.stopPropagation?.();
    const cell = cells[idx];
    if (cell) onTileClick?.(cell);
  }

  // Hover, which this file used to refuse on purpose: "the cursor is pinned to
  // the acting unit, so a pointer-move handler would have nothing to write".
  // That was true and it is what made the game unreadable with a mouse - the
  // only way to learn who a man was, was to walk the keyboard cursor onto him.
  // The game cursor stays pinned exactly as before; this is a SECOND, separate
  // signal for the pointer, and what it drives is the unit window, not the
  // cursor. Deduplicated on the instance index so a pointer resting on a tile
  // costs one write when it arrives and none while it stays.
  let lastHover = -1;
  function handleHover(e: PointerLike) {
    const idx = e.instanceId;
    if (idx === undefined || idx === lastHover) return;
    lastHover = idx;
    onTileHover?.(cells[idx] ?? null);
  }
  function handleLeave() {
    if (lastHover === -1) return;
    lastHover = -1;
    onTileHover?.(null);
  }
</script>

<T.InstancedMesh
  bind:ref={columnsRef}
  args={[columnGeometry, columnMaterial, Math.max(1, columnCells.length)]}
  castShadow
  receiveShadow
/>

<!-- Only the top plates are pickable: you select the surface you'd stand on,
     never the cliff face below it. -->
<T.InstancedMesh
  bind:ref={platesRef}
  args={[plateGeometry, plateMaterial, Math.max(1, cells.length)]}
  receiveShadow
  onclick={handleClick}
  onpointermove={handleHover}
  onpointerleave={handleLeave}
/>
