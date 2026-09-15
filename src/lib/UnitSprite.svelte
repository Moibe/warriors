<script lang="ts">
  // One character: a screen-aligned pixel sprite, a soft drop shadow and a
  // team ring on the ground.
  //
  // Which of the four views to show is derived from the unit's facing and the
  // camera's azimuth. Two painted poses (toward the camera, away from it) plus
  // a horizontal mirror cover all four, which is exactly the trick the original
  // sprites use — and it means rotating the camera makes characters turn to
  // show their backs, the single detail that sells "these flats are people".

  import { T, useTask } from '@threlte/core';
  import {
    ConeGeometry,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    RingGeometry,
    Shape,
    ShapeGeometry,
    Sprite,
    SpriteMaterial,
  } from 'three';
  import { DEATH_TIME, HURT_TIME, setHoverUnit } from './battle.svelte';
  import { LEVEL, TILE, facingAngle, facingVector } from './grid';
  import { getShadowTexture } from './textures';
  import { SPRITE_WORLD_H, SPRITE_WORLD_W, getUnitTexture, type Pose } from './sprites';
  import { hatOf, type Unit } from './units';

  let {
    unit,
    pos,
    /** Camera azimuth in radians; 0 looks down −Z. */
    yaw,
    mapWidth,
    mapDepth,
    active = false,
    /** The one this battle is decided by. Exactly one unit, or none at all. */
    marked = false,
  }: {
    unit: Unit;
    pos: { x: number; y: number; height: number };
    yaw: number;
    mapWidth: number;
    mapDepth: number;
    active?: boolean;
    marked?: boolean;
  } = $props();

  const world = $derived({
    x: (pos.x - (mapWidth - 1) / 2) * TILE,
    y: pos.height * LEVEL,
    z: (pos.y - (mapDepth - 1) / 2) * TILE,
  });

  // Screen-space projection of the unit's facing. `toward` > 0 means the unit
  // is looking at the camera; `right` < 0 means it is looking screen-left and
  // the art has to be mirrored.
  const view = $derived.by(() => {
    const f = facingVector(unit.facing);
    const toward = f.x * Math.sin(yaw) + f.y * Math.cos(yaw);
    const right = f.x * Math.cos(yaw) - f.y * Math.sin(yaw);
    return { pose: (toward >= 0 ? 'front' : 'back') as Pose, flip: right < 0 };
  });

  // Split out as primitives on purpose. `view` rebuilds on every frame of a
  // camera rotation because `yaw` animates, and a fresh object invalidates
  // every dependent each frame. A string and a boolean only invalidate when the
  // pose genuinely flips — a few times per rotation instead of sixty.
  const pose = $derived(view.pose);
  const flip = $derived(view.flip);

  // One material for the life of the component: swapping `.map` is far cheaper
  // than building a SpriteMaterial per change, and never leaks the old one.
  const material = new SpriteMaterial({
    transparent: true,
    // alphaTest lets the sprite write depth, so characters occlude each other
    // correctly instead of fighting in the transparent pass.
    alphaTest: 0.5,
    toneMapped: false,
  });

  /** Booleans, not raw timers: the texture only changes when one of them flips. */
  const hurt = $derived(unit.hurtFor > 0);

  // Three states, and only one of them is stored anywhere: `hp` is the rule.
  // `collapsing` is the beat he goes over in, `downed` is the rest of the
  // battle. Deliberately derived rather than kept on the unit — a stored
  // `isDown` would have to be remembered and cleared everywhere the day
  // somebody can be picked back up, and that is the kind of door that shuts
  // itself.
  const fallen = $derived(unit.hp <= 0);
  const collapsing = $derived(fallen && unit.deathFor > 0);
  const downed = $derived(fallen && unit.deathFor <= 0);

  /**
   * Which way a body lies, settled once from the id rather than from facing.
   * Bodies never turn, so this has to be stable when the camera does — and
   * three of them side by side all lying the same way read as wallpaper rather
   * than as people.
   */
  const restFlip = $derived(
    [...unit.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) % 2 !== 0
  );

  $effect(() => {
    // Going over still borrows the recoil frame — a man being struck down is
    // still a man being struck — and then it becomes its own drawing.
    material.map = getUnitTexture(
      unit.job,
      unit.paletteOverride,
      downed ? 'down' : pose,
      downed ? restFlip : flip,
      hurt || collapsing,
      unit.weapon,
      hatOf(unit)
    );
    material.needsUpdate = true;

    // Everything the body looks like hangs off `hp` here rather than
    // accumulating in the frame loop, and that is not tidiness. Scene keys the
    // sprites by unit id, the ids repeat from one battle to the next, so
    // restarting hands a *reused* component a living man while its three.js
    // material still holds the corpse's settings. Deriving it here means the
    // restart repaints him on its own.
    material.opacity = 1;
    material.alphaTest = 0.5;
    if (!fallen) material.color.setRGB(1, 1, 1);
    shadowMaterial.opacity = downed ? 0.45 : 0.9;
  });

  const shadowGeometry = new PlaneGeometry(0.8, 0.8).rotateX(-Math.PI / 2);
  const shadowMaterial = new MeshBasicMaterial({
    map: getShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.9,
  });

  const ringGeometry = new RingGeometry(0.26, 0.34, 24).rotateX(-Math.PI / 2);
  const ringMaterial = new MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  // The facing wedge — an arrowhead on the ground breaking the ring on the side
  // the unit is looking.
  //
  // The sprite alone cannot express four directions: the body art is
  // left-right symmetric, so east and south differ only by which side the
  // weapon hangs on, and a unit carrying nothing (the monk) renders
  // pixel-identical in both. Facing decides flanking and back-attack bonuses,
  // so it needs a tell that does not depend on the artwork.
  // Sits in the gap OUTSIDE the ring, not on top of it: overlapping shapes in
  // the same colour merge into one blob and the arrow stops reading as an
  // arrow. The tip reaches just past the tile edge, pointing at the square the
  // unit is actually looking at.
  const wedgeShape = new Shape();
  wedgeShape.moveTo(0, 0.6);
  wedgeShape.lineTo(-0.19, 0.38);
  wedgeShape.lineTo(0.19, 0.38);
  wedgeShape.closePath();
  // Authored pointing +Y; rotating -90° about X lays it flat aiming north,
  // which is what facingAngle() is measured from.
  const wedgeGeometry = new ShapeGeometry(wedgeShape).rotateX(-Math.PI / 2);
  const wedgeMaterial = new MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  const facingRotation = $derived(facingAngle(unit.facing));

  // The ring carries team identity, the wedge carries direction — so the wedge
  // gets the brighter tint and the ring steps back, rather than both competing
  // in the same colour at the same weight.
  // Hover, reported by the man rather than by the tile under him.
  //
  // The terrain's plates say which tile the pointer is on, but a sprite is a
  // standing rectangle and most of it is above its tile: rest the pointer on
  // his chest and the ray goes through the billboard to the plate BEHIND him.
  // So the sprite names itself, and `hoveredUnit()` prefers that name to the
  // ground's. A man on the floor names nobody - he is a body on a square the
  // plate can speak for.
  function enterHover() {
    if (!downed) setHoverUnit(unit.id);
  }
  function leaveHover() {
    setHoverUnit(null, unit.id);
  }

  $effect(() => {
    const ally = unit.team === 'ally';
    ringMaterial.color.set(ally ? '#5ea8ff' : '#e8564e');
    ringMaterial.opacity = active ? 0.8 : 0.35;
    wedgeMaterial.color.set(ally ? '#bfe0ff' : '#ffb3ac');
    wedgeMaterial.opacity = active ? 1 : 0.8;
  });

  const markerGeometry = new ConeGeometry(0.15, 0.28, 4).rotateX(Math.PI);
  const markerMaterial = new MeshBasicMaterial({ color: '#ffe27a', toneMapped: false });

  // The mark on the man the battle is decided by.
  //
  // A flat ring over his head rather than another cone: the acting unit already
  // owns the cone, and two floating arrows on one tile read as a duplicate —
  // the same reason the tile cursor stopped drawing one. Above the heads, so
  // eight men standing around him cannot hide it. Flat, so it hides nobody. And
  // doubled with a near-black under-ring for the same reason every sprite here
  // is drawn with an outline: gold on a gold dawn sky is nothing at all.
  //
  // He is the one unit in the game that can never be hidden. The information is
  // free; getting to him is not.
  const haloGeometry = new RingGeometry(0.2, 0.3, 20).rotateX(-Math.PI / 2);
  const haloUnderGeometry = new RingGeometry(0.17, 0.33, 20).rotateX(-Math.PI / 2);
  const haloMaterial = new MeshBasicMaterial({ color: '#ffd24a', toneMapped: false, depthWrite: false });
  const haloUnderMaterial = new MeshBasicMaterial({ color: '#1c1620', toneMapped: false, depthWrite: false });

  // A shallow idle bob on whoever is acting — enough motion to draw the eye to
  // the unit whose turn it is without animating the whole board.
  let bob = $state(0);
  /** Recoil displacement along the camera's screen-right axis, in world units. */
  let shake = $state(0);
  let markerRef = $state.raw<Mesh | undefined>(undefined);
  let elapsed = 0;
  let tinted = false;

  /** How long the glare lasts, of the reaction's total. The pose outlives it. */
  const FLASH_TIME = 0.28;
  /** How far the body sinks as it fades out. */
  const DEATH_SINK = 0.28;

  /** How far into the drop he is, 0 upright and 1 on the floor. */
  const sink = $derived(collapsing ? 1 - unit.deathFor / DEATH_TIME : 0);

  useTask((delta) => {
    // A body has nothing to animate: no idle bob, no marker, no flash. Leaving
    // early matters more than it used to, because the scene no longer shrinks
    // as the fight goes on — all eighteen sprites live to the end now.
    if (fallen) return;

    elapsed += delta;
    bob = active ? Math.sin(elapsed * 5) * 0.04 : 0;
    if (markerRef) markerRef.position.y = SPRITE_WORLD_H + 0.32 + Math.sin(elapsed * 4) * 0.09;

    // Three signals stacked on one hit, because any one alone gets lost in a
    // busy frame: the recoil frame above, a flash, and a shudder. Both fade out
    // over the reaction rather than switching off.
    const left = unit.hurtFor;
    if (left > 0) {
      // One decaying flash, not a strobe: a sprite blinking on and off reads as
      // a rendering fault, and fast flashing is worth avoiding on principle.
      // Values above 1 blow the sprite out — tone mapping is off — so the peak
      // is a hot glare rather than a polite tint.
      const k = Math.max(0, (left - (HURT_TIME - FLASH_TIME)) / FLASH_TIME);
      material.color.setRGB(1 + 1.8 * k, 1 - 0.55 * k, 1 - 0.6 * k);
      shake = Math.sin(left * 58) * 0.12 * (left / HURT_TIME);
      tinted = true;
    } else if (tinted) {
      material.color.setRGB(1, 1, 1);
      shake = 0;
      tinted = false;
    }

  });

  // Screen-right in world XZ, so the shudder reads as sideways however the
  // camera happens to be turned.
  const shakeOffset = $derived({
    x: shake * Math.cos(yaw),
    z: -shake * Math.sin(yaw),
  });
</script>

<T.Group position={[world.x, world.y, world.z]}>
  <!-- A body has no side and no facing: both markers go the instant it falls,
       rather than fading along with it and reading as still in play. -->
  <!-- A body has no side left to fight for and is not looking anywhere, so the
       ground markers go for good. This is also the single biggest thing keeping
       a board with eighteen of them readable: eighteen red and blue rings is
       noise, eighteen dark still shapes is a street after a fight. -->
  {#if !fallen}
    <T.Mesh geometry={ringGeometry} material={ringMaterial} position.y={0.028} renderOrder={2} />
    <T.Mesh
      geometry={wedgeGeometry}
      material={wedgeMaterial}
      position.y={0.03}
      rotation.y={facingRotation}
      renderOrder={2}
    />
  {/if}
  <!-- Flatter and wider once he is down: a man on the floor is already in
       contact with it, so this stops being a cast shadow and becomes the line
       that keeps the billboard from looking like it floats. -->
  <T.Mesh
    geometry={shadowGeometry}
    material={shadowMaterial}
    position.y={0.024}
    scale={downed ? [1.25, 1, 0.8] : [1, 1, 1]}
    renderOrder={2}
  />

  <!-- The drop of a hundredth once he is down is not visible — it is there to
       lose the depth tie against a living man standing on the same square, which
       the pathfinder allows and which therefore happens. The man always wins the
       pixel. -->
  <T
    is={Sprite}
    {material}
    position={[
      shakeOffset.x,
      downed ? SPRITE_WORLD_H / 2 - 0.01 : SPRITE_WORLD_H / 2 + 0.02 + bob - sink * DEATH_SINK,
      shakeOffset.z,
    ]}
    scale={[SPRITE_WORLD_W, SPRITE_WORLD_H, 1]}
    onpointerenter={enterHover}
    onpointerleave={leaveHover}
    renderOrder={downed ? 2 : 3}
  />

  {#if marked && !fallen}
    <T.Mesh
      geometry={haloUnderGeometry}
      material={haloUnderMaterial}
      position.y={SPRITE_WORLD_H + 0.20}
      renderOrder={6}
    />
    <T.Mesh
      geometry={haloGeometry}
      material={haloMaterial}
      position.y={SPRITE_WORLD_H + 0.21}
      renderOrder={7}
    />
  {/if}

  {#if active && !fallen}
    <T.Mesh bind:ref={markerRef} geometry={markerGeometry} material={markerMaterial} renderOrder={6} />
  {/if}
</T.Group>
