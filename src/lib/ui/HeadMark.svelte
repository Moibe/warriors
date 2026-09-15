<script lang="ts">
  // The one the battle is decided by.
  //
  // The board marks him with a halo; this says his name and how much of him is
  // left. Without it the halo is decoration — a ring over somebody's head does
  // not tell you that dropping him ends the fight, and a win condition nobody
  // can read is a win condition that does not exist.

  import { isAlive, type Unit } from '../units';
  import Window from './Window.svelte';

  let { unit, label }: { unit: Unit | undefined; label: string } = $props();

  const pct = $derived(unit ? Math.max(0, (unit.hp / unit.hpMax) * 100) : 0);
  const down = $derived(!!unit && !isAlive(unit));
</script>

{#if unit}
  <Window title={label}>
    <div class="row" class:down>
      <span class="name">{unit.name}</span>
      <span class="hp">{unit.hp}/{unit.hpMax}</span>
    </div>
    <div class="bar"><span style:--pct="{pct}%"></span></div>
    <p class="hint">{down ? 'Se acabó.' : 'Es el único que importa.'}</p>
  </Window>
{/if}

<style>
  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.8rem;
    min-width: 9rem;
  }

  .name {
    font-size: 0.9rem;
    font-weight: 800;
    color: #ffd24a;
    letter-spacing: 0.02em;
  }

  .row.down .name {
    color: #9a8f7a;
    text-decoration: line-through;
  }

  .hp {
    font-size: 0.68rem;
    color: #dfe8f8;
  }

  .bar {
    margin-top: 0.25rem;
    height: 3px;
    background: rgba(255, 255, 255, 0.16);
    border-radius: 2px;
    overflow: hidden;
  }

  .bar span {
    display: block;
    height: 100%;
    width: var(--pct);
    background: #ffd24a;
  }

  .hint {
    margin: 0.3rem 0 0;
    font-size: 0.66rem;
    color: #93aad2;
  }
</style>
