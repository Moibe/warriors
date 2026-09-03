<script lang="ts">
  // Running record of what just happened. Damage numbers vanish in a second;
  // the log is where the player checks whether that miss was really a miss.

  import Window from './Window.svelte';

  let { lines, limit = 5 }: { lines: string[]; limit?: number } = $props();

  const shown = $derived(lines.slice(0, limit));
</script>

<Window title="Parte de batalla" tight>
  <ul class="log">
    {#each shown as line, i (line + i)}
      <li style:opacity={1 - i * 0.16}>{line}</li>
    {/each}
    {#if !shown.length}
      <li class="empty">Sin novedades.</li>
    {/if}
  </ul>
</Window>

<style>
  .log {
    list-style: none;
    margin: 0;
    padding: 0;
    width: 17rem;
    font-size: 0.66rem;
    line-height: 1.45;
  }

  .log li {
    padding: 0.05rem 0.15rem;
    border-bottom: 1px solid rgba(180, 200, 240, 0.1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .log li:last-child {
    border-bottom: none;
  }

  .empty {
    color: #93aad2;
  }
</style>
