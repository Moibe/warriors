<script lang="ts">
  // Assembles the battlefield and owns the frame loop.
  //
  // Everything below reads from `battle` and draws it. The only writes back are
  // the two clocks (CT and animations) and the pointer, which turns a click on
  // a tile into whatever the current phase says a click means.

  import { T, useTask } from '@threlte/core';
  import { interactivity } from '@threlte/extras';
  import CameraRig from './CameraRig.svelte';
  import Chapel from './Chapel.svelte';
  import FloatingNumber from './FloatingNumber.svelte';
  import Terrain from './Terrain.svelte';
  import TileCursor from './TileCursor.svelte';
  import TileOverlays from './TileOverlays.svelte';
  import UnitSprite from './UnitSprite.svelte';
  import {
    abilityRangeTiles,
    activeReach,
    activeUnit,
    advanceAnimations,
    advanceClock,
    battle,
    confirmTile,
    cursorCoord,
    heightOf,
    map,
    renderPosition,
  } from './battle.svelte';
  import { LEVEL, TILE, tileToWorld, type Tile } from './grid';
  import { CHAPEL_ANCHOR } from './maps';
  import { landableTiles } from './pathfinding';
  import { isAlive } from './units';

  let {
    yawIndex = 0,
    pitchHigh = false,
    zoom = 46,
    pan = { x: 0, y: 0 },
    yaw = $bindable(Math.PI / 4),
  }: {
    yawIndex?: number;
    pitchHigh?: boolean;
    zoom?: number;
    pan?: { x: number; y: number };
    yaw?: number;
  } = $props();

  interactivity();

  useTask((delta) => {
    // Clamp: a backgrounded tab hands back a huge delta on return, which would
    // otherwise fast-forward several turns in one frame.
    const dt = Math.min(delta, 0.1);
    advanceClock(dt);
    advanceAnimations(dt);
  });

  // ---- Camera target ------------------------------------------------------
  // Sits on whoever is acting, offset by the player's pan. Pan is expressed in
  // screen axes and rotated into world space here, so dragging right always
  // moves the view right no matter which way the camera is turned.
  const cameraTarget = $derived.by(() => {
    const u = activeUnit();
    const base = u ? tileToWorld(map, u.x, u.y, heightOf(u)) : { x: 0, y: 1, z: 0 };
    const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    const fwd = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    return {
      x: base.x + pan.x * right.x + pan.y * fwd.x,
      y: base.y + 0.6,
      z: base.z + pan.x * right.z + pan.y * fwd.z,
    };
  });

  // ---- Highlight layers ---------------------------------------------------

  const moveTiles = $derived.by(() => {
    if (battle.phase !== 'move') return new Set<string>();
    return landableTiles(activeReach());
  });

  const rangeTiles = $derived(
    battle.phase === 'target' ? abilityRangeTiles() : new Set<string>()
  );

  const cursorTile = $derived(cursorCoord());

  const cursorColor = $derived(
    battle.phase === 'target' ? '#ff8a7a' : battle.phase === 'move' ? '#8fd0ff' : '#ffffff'
  );

  // ---- Pointer ------------------------------------------------------------

  function handleClick(tile: Tile) {
    confirmTile(tile.x, tile.y);
  }

  const chapelPos = $derived.by(() => {
    const c = CHAPEL_ANCHOR;
    const w = tileToWorld(map, c.x + (c.w - 1) / 2, c.y + (c.d - 1) / 2, c.height);
    return [w.x, w.y, w.z] as [number, number, number];
  });

  const livingUnits = $derived(battle.units.filter(isAlive));
</script>

<CameraRig {yawIndex} {pitchHigh} {zoom} target={cameraTarget} bind:yaw />

<!-- Bright, low-contrast key light with a warm tint and a cool sky bounce —
     the flat, readable lighting a tactics grid needs. It sits east and slightly
     south so the tile faces the camera can see stay lit, while cliffs and the
     chapel still throw a shadow back across the board. -->
<T.AmbientLight intensity={0.55} color="#c9d8f0" />
<T.HemisphereLight intensity={0.9} color="#cfe4ff" groundColor="#6b5a3f" />
<T.DirectionalLight
  castShadow
  intensity={2}
  color="#fff2d6"
  position={[11, 15, 4]}
  shadow.mapSize.width={2048}
  shadow.mapSize.height={2048}
  shadow.camera.left={-14}
  shadow.camera.right={14}
  shadow.camera.top={14}
  shadow.camera.bottom={-14}
  shadow.camera.near={1}
  shadow.camera.far={60}
  shadow.bias={-0.0015}
  shadow.normalBias={0.02}
/>

<Terrain {map} onTileClick={handleClick} />

<Chapel position={chapelPos} />

<!-- Layer order by lift: movement under weapon reach under the burst. -->
<TileOverlays {map} tiles={moveTiles} color="#2f7fe8" opacity={0.72} lift={0.02} />
<TileOverlays {map} tiles={rangeTiles} color="#e0402f" opacity={0.55} lift={0.03} />

<!-- No bobbing arrow: the acting unit already carries its own marker, and two
     floating arrows on the same tile read as a duplicate. -->
<TileCursor {map} tile={cursorTile} color={cursorColor} showArrow={false} />

{#each livingUnits as unit (unit.id)}
  <UnitSprite
    {unit}
    pos={renderPosition(unit)}
    {yaw}
    mapWidth={map.width}
    mapDepth={map.depth}
    active={battle.activeId === unit.id}
  />
{/each}

{#each battle.popups as popup (popup.id)}
  <FloatingNumber {popup} mapWidth={map.width} mapDepth={map.depth} />
{/each}
