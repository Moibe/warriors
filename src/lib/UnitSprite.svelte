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
  import { DEATH_TIME, HURT_TIME } from './battle.svelte';
  import { LEVEL, TILE, facingAngle, facingVector } from './grid';
  import { getShadowTexture } from './textures';
  import { SPRITE_WORLD_H, SPRITE_WORLD_W, getUnitTexture, type Pose } from './sprites';
  import type { Unit } from './units';

  let {
    unit,
    pos,
    /** Camera azimuth in radians; 0 looks down −Z. */
    yaw,
    mapWidth,
    mapDepth,
    active = false,
  }: {
    unit: Unit;
    pos: { x: number; y: number; height: number };
    yaw: number;
    mapWidth: number;
    mapDepth: number;
    active?: boolean;
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
  const dying = $derived(unit.hp <= 0 && unit.deathFor > 0);

  $effect(() => {
    // The recoil frame carries the death too — a unit that is struck down is
    // still a unit being struck.
    material.map = getUnitTexture(unit.job, unit.paletteOverride, pose, flip, hurt || dying);
    // alphaTest would clip the entire sprite the moment its opacity dropped
    // below the threshold, so the fade needs it switched off.
    material.alphaTest = dying ? 0 : 0.5;
    material.needsUpdate = true;
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
  $effect(() => {
    const ally = unit.team === 'ally';
    ringMaterial.color.set(ally ? '#5ea8ff' : '#e8564e');
    ringMaterial.opacity = active ? 0.8 : 0.35;
    wedgeMaterial.color.set(ally ? '#bfe0ff' : '#ffb3ac');
    wedgeMaterial.opacity = active ? 1 : 0.8;
  });

  const markerGeometry = new ConeGeometry(0.15, 0.28, 4).rotateX(Math.PI);
  const markerMaterial = new MeshBasicMaterial({ color: '#ffe27a', toneMapped: false });

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

  let fade = $state(1);

  useTask((delta) => {
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

    // Falling: the body holds the recoil frame, sinks a little and fades. Done
    // here rather than in an effect because it changes every frame, and an
    // effect rerunning sixty times a second is the wrong tool.
    if (unit.deathFor > 0) {
      fade = unit.deathFor / DEATH_TIME;
      material.opacity = fade;
      shadowMaterial.opacity = 0.9 * fade;
    } else if (fade !== 1) {
      fade = 1;
      material.opacity = 1;
      shadowMaterial.opacity = 0.9;
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
  {#if !dying}
    <T.Mesh geometry={ringGeometry} material={ringMaterial} position.y={0.028} renderOrder={2} />
    <T.Mesh
      geometry={wedgeGeometry}
      material={wedgeMaterial}
      position.y={0.03}
      rotation.y={facingRotation}
      renderOrder={2}
    />
  {/if}
  <T.Mesh geometry={shadowGeometry} material={shadowMaterial} position.y={0.024} renderOrder={2} />

  <T
    is={Sprite}
    {material}
    position={[
      shakeOffset.x,
      SPRITE_WORLD_H / 2 + 0.02 + bob - (1 - fade) * DEATH_SINK,
      shakeOffset.z,
    ]}
    scale={[SPRITE_WORLD_W, SPRITE_WORLD_H, 1]}
    renderOrder={3}
  />

  {#if active && !dying}
    <T.Mesh bind:ref={markerRef} geometry={markerGeometry} material={markerMaterial} renderOrder={6} />
  {/if}
</T.Group>
