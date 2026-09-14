<script lang="ts">
  // Terrain readout for the tile under the pointer. FFT keeps this on screen at
  // all times because height is a rule, not decoration — knowing a tile is two
  // levels up is knowing whether you can reach it and what it costs to attack
  // from it.

  import { SURFACE_NAMES, type Tile } from '../grid';
  import Window from './Window.svelte';

  let {
    tile,
    occupant,
    /** Somebody lying here. Nobody can stop on his square, so it is not clear. */
    body,
  }: { tile: Tile | null; occupant?: string; body?: string } = $props();
</script>

<Window title="Terreno">
  {#if tile}
    <div class="grid">
      <span class="k">Tipo</span><span class="v">{SURFACE_NAMES[tile.surface]}</span>
      <span class="k">Altura</span><span class="v">{tile.height}</span>
      <span class="k">Casilla</span><span class="v">{tile.x}, {tile.y}</span>
      <span class="k">Estado</span>
      <span class="v">
        {#if occupant}
          Ocupada · {occupant}
        {:else if body}
          <span class="down">Caído · {body}</span>
        {:else if tile.walkable}
          Transitable
        {:else}
          Intransitable
        {/if}
      </span>
    </div>
  {:else}
    <p class="empty">Pasa el cursor por el mapa.</p>
  {/if}
</Window>

<style>
  .grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.1rem 0.6rem;
    font-size: 0.68rem;
    min-width: 10rem;
  }

  .k {
    color: #93aad2;
  }

  .v {
    color: #eef3ff;
    text-align: right;
  }

  /* Dimmer than an occupied tile, because it half-counts: you can cross it,
     you just cannot stop. */
  .down {
    color: #b9a0a0;
  }

  .empty {
    margin: 0;
    font-size: 0.66rem;
    color: #93aad2;
    min-width: 10rem;
  }
</style>
