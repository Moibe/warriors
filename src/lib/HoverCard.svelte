<script lang="ts">
  // The small card that floats over whoever the mouse is resting on.
  //
  // The unit window in the corner already answers "who is this?" in full, but
  // it answers it in the wrong place: your eyes are on the man, and the window
  // is a foot and a half away. This is the same answer, shrunk to what you can
  // take in without looking away - name, role, how much of him is left - and
  // put where you are already looking. It is a tooltip in the game's own
  // window chrome, and it never takes the pointer: `pointer-events: none` on
  // the root, because a card that can be hovered is a card that flickers.
  //
  // Anchored by its bottom-centre. The <HTML> wrapper puts the element's
  // top-left on the point above the man's head; the transform below pulls it
  // up and across so the card sits ON that point rather than hanging from it.

  import { JOBS } from './jobs';
  import type { Unit } from './units';

  let { unit }: { unit: Unit } = $props();

  const job = $derived(JOBS[unit.job]);
  const pct = $derived(Math.max(0, Math.min(100, (unit.hp / unit.hpMax) * 100)));
</script>

<div class="card" class:enemy={unit.team === 'enemy'}>
  <div class="row">
    <span class="name">{unit.name}</span>
    <span class="tag">{job.tag}</span>
  </div>
  <div class="bar"><span style:width="{pct}%"></span></div>
  <div class="foot">
    <span class="hp">{unit.hp}<i>/{unit.hpMax}</i></span>
    <span class="job">{job.name}</span>
  </div>
</div>

<style>
  .card {
    /* Bottom-centre on the anchor, with a hair of air under it. */
    transform: translate(-50%, calc(-100% - 6px));
    pointer-events: none;
    white-space: nowrap;
    min-width: 6.4rem;
    padding: 0.26rem 0.5rem 0.3rem;
    border: 2px solid rgba(214, 228, 255, 0.9);
    border-left: 4px solid #5ea8ff;
    border-radius: 5px;
    background: linear-gradient(180deg, rgba(30, 62, 140, 0.94) 0%, rgba(10, 20, 56, 0.96) 100%);
    box-shadow:
      inset 0 0 0 1px rgba(8, 16, 44, 0.85),
      0 6px 18px rgba(0, 0, 0, 0.6);
    color: #eef3ff;
    font-size: 0.66rem;
    line-height: 1.15;
    position: relative;
  }

  /* The team's colour on the spine: the same blue and red the ground rings use,
     so the card says whose man this is before a word is read. */
  .card.enemy {
    border-left-color: #e8564e;
  }

  /* A little tail down to the head it belongs to. */
  .card::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -7px;
    width: 0;
    height: 0;
    transform: translateX(-50%);
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid rgba(214, 228, 255, 0.9);
  }

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .name {
    font-weight: 800;
    font-size: 0.78rem;
    letter-spacing: 0.01em;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }

  .tag {
    font-size: 0.56rem;
    letter-spacing: 0.1em;
    color: #ffe9a8;
    border: 1px solid rgba(255, 233, 168, 0.55);
    border-radius: 3px;
    padding: 0 0.28rem;
  }

  .bar {
    margin-top: 0.24rem;
    height: 3px;
    background: rgba(255, 255, 255, 0.16);
    border-radius: 2px;
    overflow: hidden;
  }

  .bar span {
    display: block;
    height: 100%;
    background: #79e07a;
  }

  .foot {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    margin-top: 0.2rem;
    font-size: 0.6rem;
  }

  .hp i {
    font-style: normal;
    color: #93aad2;
  }

  .job {
    color: #93aad2;
  }
</style>
