<script lang="ts">
  // The confirmation readout shown while a target is under the cursor.
  //
  // Committing an action without knowing the odds is the one thing a tactics
  // game must never ask of the player. These numbers come from the same
  // function that rolls the result, so the promise and the outcome cannot drift
  // apart.

  import { ANGLE_NAMES, type AttackForecast } from '../combat';
  import type { Unit } from '../units';
  import Window from './Window.svelte';

  let {
    target,
    data,
    abilityName,
    friendlyFire = false,
  }: {
    target: Unit;
    data: AttackForecast;
    abilityName: string;
    /** True when the ability is pointed at the wrong side — allowed, but loud. */
    friendlyFire?: boolean;
  } = $props();

  const heightLabel = $derived(
    data.heightDiff > 0
      ? `+${data.heightDiff} de ventaja`
      : data.heightDiff < 0
        ? `${data.heightDiff} en desventaja`
        : 'mismo nivel'
  );
</script>

<Window title={data.healing ? 'Curación' : 'Previsión'}>
  <div class="head">
    <b>{abilityName}</b> → <span class:enemy={target.team === 'enemy'}>{target.name}</span>
  </div>

  <div class="big" class:heal={data.healing}>
    {data.min}<span class="dash">–</span>{data.max}
    <small>{data.healing ? 'PV' : 'daño'}</small>
  </div>

  <div class="grid">
    <span class="k">Acierto</span>
    <span class="v" class:risky={data.hit < 60}>{data.hit}%</span>
    <span class="k">Ángulo</span><span class="v">{ANGLE_NAMES[data.angle]}</span>
    <span class="k">Altura</span><span class="v">{heightLabel}</span>
    <span class="k">PV del blanco</span><span class="v">{target.hp} / {target.hpMax}</span>
  </div>

  {#if friendlyFire}
    <p class="warn">Fuego amigo: esto va contra los tuyos.</p>
  {:else if !data.healing && data.max >= target.hp}
    <p class="lethal">Puede ser letal.</p>
  {/if}
</Window>

<style>
  .head {
    font-size: 0.72rem;
    color: #a9c0e6;
    margin-bottom: 0.25rem;
  }

  .head b {
    color: #ffe9a8;
  }

  .head .enemy {
    color: #ffb0a8;
  }

  .big {
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1;
    color: #fff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.75);
    margin-bottom: 0.4rem;
    font-variant-numeric: tabular-nums;
  }

  .big.heal {
    color: #9df09a;
  }

  .big .dash {
    opacity: 0.55;
    margin: 0 0.05em;
  }

  .big small {
    font-size: 0.6rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #93aad2;
    margin-left: 0.3rem;
  }

  .grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.08rem 0.7rem;
    font-size: 0.66rem;
    min-width: 11rem;
  }

  .k {
    color: #93aad2;
  }

  .v {
    text-align: right;
    color: #eef3ff;
  }

  .v.risky {
    color: #ffb0a8;
  }

  .lethal {
    margin: 0.4rem 0 0;
    font-size: 0.64rem;
    color: #ffd24a;
  }

  .warn {
    margin: 0.4rem 0 0;
    padding: 0.15rem 0.35rem;
    font-size: 0.64rem;
    color: #ffd7c2;
    background: rgba(224, 64, 47, 0.28);
    border: 1px solid rgba(255, 150, 120, 0.55);
    border-radius: 3px;
  }
</style>
