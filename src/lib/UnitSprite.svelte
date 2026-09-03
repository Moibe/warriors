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
    Sprite,
    SpriteMaterial,
  } from 'three';
  import { LEVEL, TILE, facingVector } from './grid';
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

  const material = $derived.by(() => {
    const m = new SpriteMaterial({
      map: getUnitTexture(unit.job, unit.paletteOverride, view.pose, view.flip),
      transparent: true,
      // alphaTest lets the sprite write depth, so characters occlude each other
      // correctly instead of fighting in the transparent pass.
      alphaTest: 0.5,
      toneMapped: false,
    });
    return m;
  });

  const shadowGeometry = new PlaneGeometry(0.8, 0.8).rotateX(-Math.PI / 2);
  const shadowMaterial = new MeshBasicMaterial({
    map: getShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.9,
  });

  const ringGeometry = new RingGeometry(0.36, 0.46, 24).rotateX(-Math.PI / 2);
  const ringMaterial = $derived(
    new MeshBasicMaterial({
      color: unit.team === 'ally' ? '#5ea8ff' : '#e8564e',
      transparent: true,
      opacity: active ? 0.95 : 0.45,
      depthWrite: false,
      toneMapped: false,
    })
  );

  const markerGeometry = new ConeGeometry(0.15, 0.28, 4).rotateX(Math.PI);
  const markerMaterial = new MeshBasicMaterial({ color: '#ffe27a', toneMapped: false });

  // A shallow idle bob on whoever is acting — enough motion to draw the eye to
  // the unit whose turn it is without animating the whole board.
  let bob = $state(0);
  let markerRef = $state.raw<Mesh | undefined>(undefined);
  let elapsed = 0;

  useTask((delta) => {
    elapsed += delta;
    bob = active ? Math.sin(elapsed * 5) * 0.04 : 0;
    if (markerRef) markerRef.position.y = SPRITE_WORLD_H + 0.32 + Math.sin(elapsed * 4) * 0.09;
  });
</script>

<T.Group position={[world.x, world.y, world.z]}>
  <T.Mesh geometry={ringGeometry} material={ringMaterial} position.y={0.028} renderOrder={2} />
  <T.Mesh geometry={shadowGeometry} material={shadowMaterial} position.y={0.024} renderOrder={2} />

  <T
    is={Sprite}
    {material}
    position.y={SPRITE_WORLD_H / 2 + 0.02 + bob}
    scale={[SPRITE_WORLD_W, SPRITE_WORLD_H, 1]}
    renderOrder={3}
  />

  {#if active}
    <T.Mesh bind:ref={markerRef} geometry={markerGeometry} material={markerMaterial} renderOrder={6} />
  {/if}
</T.Group>
