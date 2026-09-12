<script lang="ts">
  // The unit window: portrait, job, bars and the two flavour stats.
  //
  // The portrait is a crop of the very sprite standing on the map, so a recolor
  // applied to a unit shows up here for free — no second set of art to keep in
  // sync.

  import { FACING_NAMES } from '../grid';
  import { JOBS } from '../jobs';
  import { getPortraitUrl } from '../sprites';
  import { hatOf, type Unit } from '../units';
  import Window from './Window.svelte';

  let { unit, height, title = 'Unidad' }: { unit: Unit; height: number; title?: string } =
    $props();

  const job = $derived(JOBS[unit.job]);
  const portrait = $derived(getPortraitUrl(unit.job, unit.paletteOverride, 4, hatOf(unit)));
  const hpPct = $derived(Math.max(0, (unit.hp / unit.hpMax) * 100));
  const mpPct = $derived(unit.mpMax ? Math.max(0, (unit.mp / unit.mpMax) * 100) : 0);
  const ctPct = $derived(Math.min(100, unit.ct));
</script>

<Window {title}>
  <div class="row">
    <div class="portrait" class:enemy={unit.team === 'enemy'}>
      <img src={portrait} alt={unit.name} />
    </div>

    <div class="info">
      <div class="name">
        <span class="who">{unit.name}</span>
        <span class="tag" class:enemy={unit.team === 'enemy'}>{job.tag}</span>
      </div>
      <div class="job">{job.name}</div>

      <div class="bar-line">
        <span class="label">PV</span>
        <div class="bar"><div class="fill hp" style:width="{hpPct}%"></div></div>
        <span class="num">{unit.hp}<i>/{unit.hpMax}</i></span>
      </div>

      <div class="bar-line">
        <span class="label">AG</span>
        <div class="bar"><div class="fill mp" style:width="{mpPct}%"></div></div>
        <span class="num">{unit.mp}<i>/{unit.mpMax}</i></span>
      </div>

      <div class="bar-line">
        <span class="label">CT</span>
        <div class="bar"><div class="fill ct" style:width="{ctPct}%"></div></div>
        <span class="num">{Math.floor(unit.ct)}</span>
      </div>
    </div>
  </div>

  <div class="stats">
    <span>Agallas <b>{unit.brave}</b></span>
    <span>Calle <b>{unit.faith}</b></span>
    <span>Mov <b>{unit.move}</b></span>
    <span>Salto <b>{unit.jump}</b></span>
    <span>Alt <b>{height}</b></span>
    <span>Cara <b>{FACING_NAMES[unit.facing]}</b></span>
  </div>
</Window>

<style>
  .row {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
  }

  .portrait {
    flex: 0 0 auto;
    width: 62px;
    height: 68px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(214, 228, 255, 0.55);
    border-radius: 4px;
    background: linear-gradient(180deg, #4b74b8, #1b2c58);
    box-shadow: inset 0 0 0 1px rgba(6, 12, 32, 0.7);
    overflow: hidden;
  }

  .portrait.enemy {
    background: linear-gradient(180deg, #8a4a52, #401c28);
  }

  .portrait img {
    width: 100%;
    height: auto;
    image-rendering: pixelated;
  }

  .info {
    flex: 1 1 auto;
    min-width: 0;
  }

  .name {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
  }

  .who {
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }

  .tag {
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    padding: 0.05rem 0.28rem;
    border-radius: 3px;
    background: rgba(94, 168, 255, 0.25);
    border: 1px solid rgba(140, 200, 255, 0.55);
    color: #cfe6ff;
  }

  .tag.enemy {
    background: rgba(232, 86, 78, 0.22);
    border-color: rgba(255, 150, 140, 0.55);
    color: #ffd0cb;
  }

  .job {
    font-size: 0.68rem;
    color: #a9c0e6;
    margin-bottom: 0.28rem;
  }

  .bar-line {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.16rem;
  }

  .label {
    font-size: 0.6rem;
    width: 1.4rem;
    color: #ffe9a8;
    letter-spacing: 0.06em;
  }

  .bar {
    flex: 1 1 auto;
    height: 7px;
    border-radius: 2px;
    background: rgba(4, 10, 28, 0.85);
    border: 1px solid rgba(180, 200, 240, 0.35);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    transition: width 0.25s ease-out;
  }

  .fill.hp {
    background: linear-gradient(180deg, #8ff08a, #3aa03a);
  }
  .fill.mp {
    background: linear-gradient(180deg, #86c7ff, #2e6fc4);
  }
  .fill.ct {
    background: linear-gradient(180deg, #ffe08a, #d99a1f);
  }

  .num {
    font-size: 0.66rem;
    min-width: 3.4rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .num i {
    font-style: normal;
    color: #92a8cf;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.1rem 0.7rem;
    margin-top: 0.5rem;
    padding-top: 0.4rem;
    border-top: 1px solid rgba(180, 200, 240, 0.22);
    font-size: 0.63rem;
    color: #a9c0e6;
  }

  .stats b {
    color: #eef3ff;
    font-weight: 600;
  }
</style>
