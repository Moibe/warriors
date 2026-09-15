<script lang="ts">
  // Assembles the battlefield and owns the frame loop.
  //
  // Everything below reads from `battle` and draws it. The only writes back are
  // the two clocks (CT and animations) and the pointer, which turns a click on
  // a tile into whatever the current phase says a click means.

  import { T, useTask } from '@threlte/core';
  import { interactivity } from '@threlte/extras';
  import CameraRig from './CameraRig.svelte';
  import Bus from './Bus.svelte';
  import ComfortStation from './ComfortStation.svelte';
  import Conclave from './Conclave.svelte';
  import MensRoom from './MensRoom.svelte';
  import ConeyIsland from './ConeyIsland.svelte';
  import Furniture from './Furniture.svelte';
  import ParkedCar from './ParkedCar.svelte';
  import FloatingNumber from './FloatingNumber.svelte';
  import Projectile from './Projectile.svelte';
  import Terrain from './Terrain.svelte';
  import TileCursor from './TileCursor.svelte';
  import TileOverlays from './TileOverlays.svelte';
  import UnitSprite from './UnitSprite.svelte';
  import {
    abilityRangeTiles,
    activeReach,
    aimHasTarget,
    activeUnit,
    advanceAnimations,
    advanceClock,
    battle,
    confirmTile,
    cursorCoord,
    heightOf,
    stage as currentStage,
    renderPosition,
    setHoverTile,
  } from './battle.svelte';
  import { LEVEL, TILE, tileToWorld, type Tile } from './grid';
  import { landableTiles, tilesInBurst } from './pathfinding';
  import { exitTiles } from './stages';
  import { hasLeft } from './units';

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

  // One derived read of the installed stage; the board and the scenery hang off
  // it, so every `map` below keeps working untouched and now tracks the swap.
  const stage = $derived(currentStage());
  /** The way out, if this battle has one. */
  const doorway = $derived(exitTiles(stage));
  /** The one the battle is decided by, if it is decided by one. */
  const headId = $derived(stage.head?.id ?? null);
  const map = $derived(stage.map);
  const light = $derived(stage.light);

  /** Which component draws which prop. Stages name a kind, not a component. */
  const PROPS = {
    comfortStation: ComfortStation,
    bus: Bus,
    parkedCar: ParkedCar,
    furniture: Furniture,
    coneyIsland: ConeyIsland,
    mensRoom: MensRoom,
    conclave: Conclave,
  };

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

  // What an area ability would actually catch. Only for real bursts: on a
  // single-target ability the cursor frame already says it, and a second
  // highlight on the same square is noise.
  const burstTiles = $derived.by(() => {
    const aim = battle.aim;
    const ability = battle.ability;
    if (battle.phase !== 'target' || !ability || !aim || ability.aoe === 0) {
      return new Set<string>();
    }
    return tilesInBurst(map, aim, ability.aoe);
  });

  const cursorTile = $derived(cursorCoord());

  // Greyed out while aiming at something that cannot be confirmed, so the
  // refusal reads as a rule rather than as an unresponsive button.
  const cursorColor = $derived(
    battle.phase === 'target'
      ? aimHasTarget()
        ? '#ff8a7a'
        : '#7d8690'
      : battle.phase === 'move'
        ? '#8fd0ff'
        : '#ffffff'
  );

  // ---- Pointer ------------------------------------------------------------

  function handleClick(tile: Tile) {
    confirmTile(tile.x, tile.y);
  }

  // Props are centred on their footprint, so moving one is editing the anchor
  // in stages.ts and nothing else.
  const scenery = $derived(
    stage.props.map((p) => {
      const w = tileToWorld(map, p.x + (p.w - 1) / 2, p.y + (p.d - 1) / 2, p.height);
      return {
        p,
        pos: [w.x, w.y, w.z] as [number, number, number],
        rot: ((p.turns ?? 0) * Math.PI) / 2,
        variant: p.variant ?? 0,
      };
    })
  );

  // The shadow frustum used to be hardwired to ±14, which fits the park and
  // nothing else: on a longer board the units at the far end lose their shadow
  // all at once, along a visible straight edge. Derive it from the board.
  const shadowExtent = $derived(Math.max(map.width, map.depth) * 0.75 + 4);

  // Everybody, standing or not. A man who goes down stays down on the square it
  // happened on for the rest of the battle: he is out of the rules — no turn, no
  // target, no vote on who has won — but he is still lying there, and the board
  // carries what the fight has cost so far instead of tidying it away.
  // Everybody who is still on this beach, standing or not. A man who goes down
  // stays down on the square it happened on: he is out of the rules — no turn,
  // no target, no vote on who has won — but he is still lying there, and the
  // board carries what the fight has cost instead of tidying it away.
  //
  // Somebody who walked out through a door is the other kind of gone, and he
  // does have to be taken off: the engine already treats his square as free and
  // lets the next man stand on it, so leaving him drawn put two people on one
  // tile and a team ring on somebody who had left the building.
  const shownUnits = $derived(battle.units.filter((u) => !hasLeft(u)));
</script>

<CameraRig {yawIndex} {pitchHigh} {zoom} target={cameraTarget} bind:yaw />

<!-- Night in the park, but a readable one. The key is moonlight: cold, still
     strong enough to separate the terraces, and still coming from the east so
     the tile faces the camera can see stay lit and the ledges keep throwing
     shadows across the board. The ambient carries a sodium tint, which is the
     only warmth out here — the park lamps. -->
<T.AmbientLight intensity={light.ambient.intensity} color={light.ambient.color} />
<T.HemisphereLight
  intensity={light.hemisphere.intensity}
  color={light.hemisphere.sky}
  groundColor={light.hemisphere.ground}
/>
<T.DirectionalLight
  castShadow
  intensity={light.key.intensity}
  color={light.key.color}
  position={light.key.position}
  shadow.mapSize.width={2048}
  shadow.mapSize.height={2048}
  shadow.camera.left={-shadowExtent}
  shadow.camera.right={shadowExtent}
  shadow.camera.top={shadowExtent}
  shadow.camera.bottom={-shadowExtent}
  shadow.camera.near={1}
  shadow.camera.far={60}
  shadow.bias={-0.0015}
  shadow.normalBias={0.02}
/>

<Terrain
  {map}
  onTileClick={handleClick}
  onTileHover={(t) => setHoverTile(t ? { x: t.x, y: t.y } : null)}
/>

<!-- Keyed by position in the list, not by tile: a rug and the armchair standing
     on it share a square, and so would any two pieces stacked on purpose. -->
{#each scenery as { p, pos, rot, variant }, i (i)}
  {@const Prop = PROPS[p.kind]}
  <Prop position={pos} rotation={rot} {variant} />
{/each}

<!-- Layer order by lift: movement under weapon reach under the burst. -->
<!-- Opacity is high because the texture now carries the contrast: the rim
     lands near full strength while the grey interior stays see-through. -->
<TileOverlays {map} tiles={moveTiles} color="#4a9bff" opacity={0.85} lift={0.02} />
<TileOverlays {map} tiles={rangeTiles} color="#ff4a36" opacity={0.85} lift={0.03} />
<TileOverlays {map} tiles={burstTiles} color="#ffd24a" opacity={0.9} lift={0.045} pulse={0.25} />

<!-- The way out. The only overlay that is always on: the other three describe a
     moment — where I can walk, what I can reach, what the swing catches — and
     this one describes a standing fact about the room. Green because it is the
     one colour the HUD has left, and drawn above the rest at half strength so a
     blue movement panel never hides it and it never shouts over one. -->
{#if doorway.size}
  <TileOverlays {map} tiles={doorway} color="#79e07a" opacity={0.5} lift={0.055} pulse={0.35} />
{/if}

<!-- No bobbing arrow: the acting unit already carries its own marker, and two
     floating arrows on the same tile read as a duplicate. -->
<TileCursor {map} tile={cursorTile} color={cursorColor} showArrow={false} />

{#each shownUnits as unit (unit.id)}
  <UnitSprite
    {unit}
    pos={renderPosition(unit)}
    {yaw}
    mapWidth={map.width}
    mapDepth={map.depth}
    active={battle.activeId === unit.id}
    marked={unit.id === headId}
  />
{/each}

<!-- Above the fighters, below the numbers: the object is the cause and the
     number is the consequence, and they never share a frame anyway. -->
{#if battle.throw}
  <Projectile fly={battle.throw} mapWidth={map.width} mapDepth={map.depth} />
{/if}

{#each battle.popups as popup (popup.id)}
  <FloatingNumber {popup} mapWidth={map.width} mapDepth={map.depth} />
{/each}
