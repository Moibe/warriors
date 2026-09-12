<script lang="ts">
  // A thrown thing crossing the board.
  //
  // It travels a parabola rather than a straight line for two reasons: an arc
  // is how a person actually throws a bottle, and it lifts the object clear of
  // the heads in between, so the flight stays visible over a crowded board
  // instead of disappearing behind whoever is standing in the way.
  //
  // The board waits for it. The roll does not happen until it lands, which is
  // what makes the hit read as caused by the object rather than as a number
  // that appeared next to it.

  import { T } from '@threlte/core';
  import { untrack } from 'svelte';
  import { Sprite, SpriteMaterial } from 'three';
  import type { ThrowAnim } from './battle.svelte';
  import { LEVEL, TILE } from './grid';
  import { PROJECTILE_WORLD, getProjectileTexture } from './sprites';

  let {
    fly,
    mapWidth,
    mapDepth,
  }: { fly: ThrowAnim; mapWidth: number; mapDepth: number } = $props();

  // Built once: the texture never changes mid-flight, and rebuilding a material
  // every frame of a half-second animation is the wrong kind of busy.
  const material = new SpriteMaterial({
    map: untrack(() => getProjectileTexture(fly.projectile)),
    transparent: true,
    alphaTest: 0.5,
    toneMapped: false,
  });

  /** Roughly where a hand is, above the tile the thrower is standing on. */
  const HAND_HEIGHT = 0.62;

  const world = $derived.by(() => {
    const f = Math.min(1, fly.t);
    const gx = fly.from.x + (fly.to.x - fly.from.x) * f;
    const gy = fly.from.y + (fly.to.y - fly.from.y) * f;
    const gh = fly.from.height + (fly.to.height - fly.from.height) * f;
    // Zero at both ends, peak in the middle: 4f(1−f) is the unit parabola.
    const lift = fly.arc * 4 * f * (1 - f) * LEVEL;
    return {
      x: (gx - (mapWidth - 1) / 2) * TILE,
      y: gh * LEVEL + HAND_HEIGHT + lift,
      z: (gy - (mapDepth - 1) / 2) * TILE,
    };
  });

  $effect(() => {
    material.rotation = fly.t * fly.spin;
  });
</script>

<T
  is={Sprite}
  {material}
  position={[world.x, world.y, world.z]}
  scale={[PROJECTILE_WORLD, PROJECTILE_WORLD, 1]}
  renderOrder={5}
/>
