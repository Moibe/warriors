<script lang="ts">
  // How many are out, and how many still have to be.
  //
  // Without this the rule does not exist. The board can say "these three tiles
  // are special"; only a number can say "three of you have to be standing on
  // the other side of them". A battle whose win condition is invisible is a
  // battle with no win condition.

  import type { Unit } from '../units';
  import { hasLeft, inPlay } from '../units';
  import Window from './Window.svelte';

  let {
    units,
    needed,
    label,
    barrier,
  }: {
    units: Unit[];
    needed: number;
    label: string;
    /** What stands in the way, while it still does. Absent once it is down. */
    barrier?: { label: string; hp: number; hpMax: number };
  } = $props();

  const allies = $derived(units.filter((u) => u.team === 'ally'));
  const out = $derived(allies.filter(hasLeft));
  const standing = $derived(allies.filter(inPlay));

  // The number that actually matters is not how many got out, it is how many
  // can still be got out. The moment those fall short the battle is already
  // lost, and the player should be able to see that coming rather than be told
  // about it afterwards.
  const possible = $derived(out.length + standing.length);
  const doomed = $derived(possible < needed);
</script>

<Window title={label}>
  <div class="tally" class:doomed>
    {#each allies as u (u.id)}
      <span
        class="pip"
        class:out={hasLeft(u)}
        class:down={!hasLeft(u) && !inPlay(u)}
        title={u.name}
      >
        {u.name}
      </span>
    {/each}
  </div>
  {#if barrier}
    <!-- The fence before the count: until this line goes, the number under it
         cannot move, and the player should read them in that order. -->
    <p class="barrier">
      <span>{barrier.label}</span>
      <span class="hp">{barrier.hp}<span class="max">/{barrier.hpMax}</span></span>
    </p>
    <p class="hint">Cerrada. Rómpanla a golpes.</p>
  {/if}
  <p class="count" class:doomed>
    {out.length} de {needed} fuera
  </p>
</Window>

<style>
  .tally {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
    min-width: 8rem;
  }

  .pip {
    font-size: 0.68rem;
    color: #dfe8f8;
    padding-left: 0.85rem;
    position: relative;
  }

  /* A filled dot for anybody still in the room, a hollow one for anybody out,
     and a struck-through name for anybody who is not coming. */
  .pip::before {
    content: '●';
    position: absolute;
    left: 0;
    color: #5ea8ff;
  }

  .pip.out {
    color: #79e07a;
  }

  .pip.out::before {
    content: '○';
    color: #79e07a;
  }

  .pip.down {
    color: #7d6a6a;
    text-decoration: line-through;
  }

  .pip.down::before {
    content: '×';
    color: #a05a5a;
  }

  .barrier {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    margin: 0.4rem 0 0;
    font-size: 0.7rem;
    font-weight: 700;
    color: #ffb35c;
    letter-spacing: 0.04em;
  }

  .barrier .max {
    font-weight: 400;
    opacity: 0.7;
  }

  .hint {
    margin: 0.1rem 0 0;
    font-size: 0.62rem;
    color: #d8c9a8;
    opacity: 0.85;
  }

  .count {
    margin: 0.35rem 0 0;
    font-size: 0.7rem;
    font-weight: 700;
    color: #ffe27a;
    letter-spacing: 0.04em;
  }

  .count.doomed {
    color: #ff8a80;
  }
</style>
