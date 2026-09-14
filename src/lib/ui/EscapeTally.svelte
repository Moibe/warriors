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
  }: { units: Unit[]; needed: number; label: string } = $props();

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
