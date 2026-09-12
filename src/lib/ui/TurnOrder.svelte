<script lang="ts">
  // The turn-order prediction.
  //
  // This is the single most useful window in a CT-driven tactics game: it turns
  // Speed from an abstract stat into a visible queue, and it's what lets the
  // player decide whether there is time to heal before the enemy knight swings.

  import { JOBS } from '../jobs';
  import { getPortraitUrl } from '../sprites';
  import { hatOf, type Unit } from '../units';
  import Window from './Window.svelte';

  let {
    entries,
    activeId,
  }: { entries: { unit: Unit; ct: number }[]; activeId: string | null } = $props();
</script>

<Window title="Orden de turno" tight>
  <ol class="queue">
    {#each entries as entry, i (entry.unit.id + '-' + i)}
      <li
        class="slot"
        class:now={i === 0 && entry.unit.id === activeId}
        class:enemy={entry.unit.team === 'enemy'}
      >
        <span class="pos">{i === 0 ? '▶' : i + 1}</span>
        <img
          class="face"
          src={getPortraitUrl(entry.unit.job, entry.unit.paletteOverride, 2, hatOf(entry.unit))}
          alt=""
        />
        <span class="who">
          <b>{entry.unit.name}</b>
          <i>{JOBS[entry.unit.job].tag}</i>
        </span>
        <span class="hp" style:--pct="{(entry.unit.hp / entry.unit.hpMax) * 100}%"></span>
      </li>
    {/each}
  </ol>
</Window>

<style>
  .queue {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 11.5rem;
  }

  .slot {
    display: grid;
    grid-template-columns: 0.9rem 22px 1fr;
    grid-template-rows: auto auto;
    align-items: center;
    gap: 0 0.35rem;
    padding: 0.16rem 0.28rem;
    border-radius: 3px;
    background: rgba(10, 24, 60, 0.4);
    border-left: 3px solid #4e8ae2;
  }

  .slot.enemy {
    border-left-color: #e8564e;
  }

  .slot.now {
    background: rgba(78, 138, 226, 0.42);
    box-shadow: inset 0 0 0 1px rgba(214, 228, 255, 0.55);
  }

  .pos {
    grid-row: 1 / 3;
    font-size: 0.6rem;
    color: #ffe9a8;
    text-align: center;
  }

  .face {
    grid-row: 1 / 3;
    width: 22px;
    height: 24px;
    object-fit: cover;
    object-position: top center;
    image-rendering: pixelated;
    border-radius: 2px;
    background: rgba(4, 10, 28, 0.6);
  }

  .who {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    min-width: 0;
  }

  .who b {
    font-size: 0.7rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .who i {
    font-style: normal;
    font-size: 0.55rem;
    color: #93aad2;
  }

  /* A two-pixel health strip under the name — enough to read the state of the
     whole battlefield at a glance without a second window. */
  .hp {
    height: 3px;
    border-radius: 2px;
    background: rgba(4, 10, 28, 0.75);
    overflow: hidden;
    position: relative;
  }

  .hp::after {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--pct);
    background: linear-gradient(180deg, #8ff08a, #3aa03a);
  }
</style>
