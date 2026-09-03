<script lang="ts">
  // One damage / healing number floating up off a unit and fading out.
  // Materials are built once at mount (never inside a reactive expression) —
  // the popup's clock changes every frame, and rebuilding a texture at 60 Hz
  // for a number that never changes would be the single most expensive thing
  // on screen.

  import { T } from '@threlte/core';
  import { untrack } from 'svelte';
  import { Sprite, SpriteMaterial } from 'three';
  import { LEVEL, TILE } from './grid';
  import { getTextTexture } from './textures';
  import { SPRITE_WORLD_H } from './sprites';
  import type { Popup } from './battle.svelte';

  let {
    popup,
    mapWidth,
    mapDepth,
  }: { popup: Popup; mapWidth: number; mapDepth: number } = $props();

  const { texture, aspect } = untrack(() => getTextTexture(popup.text, popup.color));
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    toneMapped: false,
  });

  const HEIGHT = 0.52;
  const LIFE = 1.5;

  // Anchored where the hit landed, so the number stays put while it rises.
  const world = untrack(() => ({
    x: (popup.x - (mapWidth - 1) / 2) * TILE,
    y: popup.height * LEVEL,
    z: (popup.y - (mapDepth - 1) / 2) * TILE,
  }));

  // Pops up fast, then drifts — the classic hit-number arc.
  const rise = $derived(SPRITE_WORLD_H + 0.02 + Math.min(popup.t, 0.35) * 1.5 + popup.t * 0.22);

  $effect(() => {
    material.opacity = popup.t < LIFE - 0.45 ? 1 : Math.max(0, (LIFE - popup.t) / 0.45);
  });
</script>

<T
  is={Sprite}
  {material}
  position={[world.x, world.y + rise, world.z]}
  scale={[HEIGHT * aspect, HEIGHT, 1]}
  renderOrder={20}
/>
