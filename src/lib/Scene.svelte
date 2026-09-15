<script lang="ts">
  // Assembles the battlefield and owns the frame loop.
  //
  // Everything below reads from `battle` and draws it. The only writes back are
  // the two clocks (CT and animations) and the pointer, which turns a click on
  // a tile into whatever the current phase says a click means.

  import { T, useTask } from '@threlte/core';
  import { HTML, interactivity } from '@threlte/extras';
  import CameraRig from './CameraRig.svelte';
  import Bus from './Bus.svelte';
  import ComfortStation from './ComfortStation.svelte';
  import Conclave from './Conclave.svelte';
  import MensRoom from './MensRoom.svelte';
  import ConeyIsland from './ConeyIsland.svelte';
  import Furniture from './Furniture.svelte';
  import ParkedCar from './ParkedCar.svelte';
  import FloatingNumber from './FloatingNumber.svelte';
  import HoverCard from './HoverCard.svelte';
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
    barrierStanding,
  hoveredUnit,
} from './battle.svelte';
  import { LEVEL, TILE, tileToWorld, type Tile } from './grid';
  import { landableTiles, tilesInBurst } from './pathfinding';
  import { barrierTiles, exitTiles } from './stages';
  import { SPRITE_WORLD_H } from './sprites';
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
  /** Whether the way out is still shut behind the stage's barrier. */
  const shut = $derived(barrierStanding());
  /** The barrier's own squares, drawn only while it stands. */
  const barrier = $derived(shut ? barrierTiles(stage) : new Set<string>());
  /** The one the battle is decided by, if it is decided by one. */
  const headId = $derived(stage.head?.id ?? null);
  /** Whoever the mouse is resting on, for the card that floats over his head. */
  const hoverUnit = $derived(hoveredUnit());
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

  /**
   * How far through the barrier the gang has got, 0 to 1, for the props that
   * ARE the barrier.
   *
   * The number in the panel was the only thing that moved while they hit it:
   * sixty points is four or five swings, and for the first three of them the
   * fence looked exactly as it had at the top of the battle. A board fence is
   * the one obstacle in this game whose damage the player can be shown instead
   * of told, so it is shown - the panel stays, because six-of-sixty is a
   * promise the picture cannot make on its own, but nobody should have to read
   * it to know a punch landed.
   */
  const barrierWear = $derived.by(() => {
    const full = stage.exit?.barrier?.hp ?? 0;
    if (!full || !shut) return 0;
    return Math.min(1, Math.max(0, 1 - battle.barrierHp / full));
  });

  /** Whether this prop's footprint stands on the barrier rectangle. */
  function onBarrier(p: (typeof stage.props)[number]): boolean {
    const b = stage.exit?.barrier;
    if (!b) return false;
    return p.x < b.x + b.w && p.x + p.w > b.x && p.y < b.y + b.d && p.y + p.d > b.y;
  }

  // Props are centred on their footprint, so moving one is editing the anchor
  // in stages.ts and nothing else.
  const scenery = $derived(
    stage.props
      .filter((p) => !p.when || (p.when === 'closed') === shut)
      .map((p) => {
        const w = tileToWorld(map, p.x + (p.w - 1) / 2, p.y + (p.d - 1) / 2, p.height);
        return {
          p,
          pos: [w.x, w.y, w.z] as [number, number, number],
          rot: ((p.turns ?? 0) * Math.PI) / 2,
          variant: p.variant ?? 0,
          wear: onBarrier(p) ? barrierWear : 0,
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
{#each scenery as { p, pos, rot, variant, wear }, i (i)}
  {@const Prop = PROPS[p.kind]}
  <Prop position={pos} rotation={rot} {variant} {wear} />
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
  <!-- Amber while the barrier stands: the squares are still the way out, they
       are just not open yet, and green would promise a walk the pathfinder
       refuses. The barrier itself gets the same amber, so the thing to hit and
       the thing it is hiding read as one shut door. -->
  <TileOverlays
    {map}
    tiles={doorway}
    color={shut ? '#ffb35c' : '#79e07a'}
    opacity={0.5}
    lift={0.055}
    pulse={0.35}
  />
{/if}
{#if barrier.size}
  <TileOverlays {map} tiles={barrier} color="#ffb35c" opacity={0.45} lift={0.05} pulse={0.2} />
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

<!-- The card over the hovered man's head. DOM, not a sprite: it has to be crisp
     at any zoom and it has to sit on top of everything, and an <HTML> element
     reprojected every frame does both for free. `pointerEvents="none"` so the
     card can never be the thing under the pointer - a tooltip you can hover is a
     tooltip that flickers. -->
{#if hoverUnit}
  {@const hw = tileToWorld(map, hoverUnit.x, hoverUnit.y, heightOf(hoverUnit))}
  <HTML position={[hw.x, hw.y + SPRITE_WORLD_H + 0.1, hw.z]} pointerEvents="none">
    <HoverCard unit={hoverUnit} />
  </HTML>
{/if}

{#each battle.popups as popup (popup.id)}
  <FloatingNumber {popup} mapWidth={map.width} mapDepth={map.depth} />
{/each}
