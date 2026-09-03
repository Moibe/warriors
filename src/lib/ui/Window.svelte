<script lang="ts">
  // The window chrome the whole HUD is built from.
  //
  // Final Fantasy Tactics puts everything inside the same object: a deep blue
  // vertical gradient, a pale one-pixel frame, and a second darker line just
  // inside it. Rebuilding that once here means every panel in the game is
  // automatically consistent, and restyling the UI is a single file.

  import type { Snippet } from 'svelte';

  let {
    title,
    children,
    padded = true,
    tight = false,
    class: klass = '',
  }: {
    title?: string;
    children: Snippet;
    padded?: boolean;
    /** Denser padding, for the turn list and other stacked rows. */
    tight?: boolean;
    class?: string;
  } = $props();
</script>

<div class="window {klass}">
  {#if title}
    <div class="titlebar">{title}</div>
  {/if}
  <div class="body" class:padded class:tight>
    {@render children()}
  </div>
</div>

<style>
  .window {
    background: linear-gradient(180deg, rgba(30, 62, 140, 0.9) 0%, rgba(10, 20, 56, 0.94) 100%);
    border: 2px solid rgba(214, 228, 255, 0.9);
    border-radius: 6px;
    box-shadow:
      inset 0 0 0 1px rgba(8, 16, 44, 0.85),
      inset 0 1px 0 1px rgba(255, 255, 255, 0.12),
      0 8px 24px rgba(0, 0, 0, 0.55);
    color: #eef3ff;
    backdrop-filter: blur(2px);
    overflow: hidden;
  }

  .titlebar {
    padding: 0.3rem 0.6rem 0.28rem;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #ffe9a8;
    background: linear-gradient(180deg, rgba(46, 84, 172, 0.95), rgba(20, 38, 92, 0.9));
    border-bottom: 1px solid rgba(214, 228, 255, 0.35);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }

  .body.padded {
    padding: 0.55rem 0.7rem;
  }

  .body.padded.tight {
    padding: 0.35rem 0.4rem;
  }
</style>
