<script lang="ts">
  // The command window — Mover, the active job's abilities, Esperar.
  //
  // It also stands in for the prompt line: while a destination or a target is
  // being picked the same window explains what the game is waiting for, so the
  // player never has to look elsewhere to know what a click will do.

  import { FACING_NAMES, type Facing } from '../grid';
  import { JOBS, type Ability } from '../jobs';
  import type { Unit } from '../units';
  import type { Phase } from '../battle.svelte';
  import Window from './Window.svelte';

  let {
    unit,
    phase,
    ability,
    onMove,
    onAbility,
    onWait,
    onCancel,
    onFacing,
  }: {
    unit: Unit;
    phase: Phase;
    ability: Ability | null;
    onMove: () => void;
    onAbility: (a: Ability) => void;
    onWait: () => void;
    onCancel: () => void;
    onFacing: (f: Facing) => void;
  } = $props();

  const abilities = $derived(JOBS[unit.job].abilities);
  let hovered = $state<Ability | null>(null);

  const FACINGS: Facing[] = ['n', 'e', 's', 'w'];
</script>

<Window title={phase === 'facing' ? 'Orientación' : 'Órdenes'}>
  {#if phase === 'command'}
    <div class="list">
      <button class="cmd" disabled={unit.hasMoved} onclick={onMove}>
        <span class="key">1</span>
        <span class="text">Mover</span>
        <span class="cost">{unit.move} cas.</span>
      </button>

      {#each abilities as a, i (a.id)}
        <button
          class="cmd"
          disabled={unit.hasActed || a.mp > unit.mp}
          onclick={() => onAbility(a)}
          onmouseenter={() => (hovered = a)}
          onmouseleave={() => (hovered = null)}
        >
          <span class="key">{i + 2}</span>
          <span class="text">{a.name}</span>
          <span class="cost">
            {#if a.mp}<b class:short={a.mp > unit.mp}>{a.mp} PM</b>{:else}—{/if}
          </span>
        </button>
      {/each}

      <button class="cmd wait" onclick={onWait}>
        <span class="key">0</span>
        <span class="text">Esperar</span>
        <span class="cost">fin</span>
      </button>
    </div>

    {#if hovered}
      <p class="hint desc">
        <b>{hovered.name}</b> · alcance {hovered.minRange > 0 ? hovered.minRange + '–' : ''}{hovered.range}{hovered.aoe
          ? ' · área ' + hovered.aoe
          : ''}<br />
        {hovered.desc}
      </p>
    {:else}
      <p class="hint">Elige una orden. <kbd>Esc</kbd> cancela.</p>
    {/if}
  {:else if phase === 'move'}
    <p class="prompt">Elige una casilla azul.</p>
    <p class="hint">Las casillas fuera de tu Salto quedan descartadas.</p>
    <button class="back" onclick={onCancel}>Volver</button>
  {:else if phase === 'target'}
    <p class="prompt">{ability?.name}: elige el blanco.</p>
    <p class="hint">{ability?.desc}</p>
    <button class="back" onclick={onCancel}>Volver</button>
  {:else if phase === 'facing'}
    <p class="hint">¿Hacia dónde queda mirando?</p>
    <div class="facings">
      {#each FACINGS as f (f)}
        <button class="cmd" onclick={() => onFacing(f)}>
          <span class="text">{FACING_NAMES[f]}</span>
        </button>
      {/each}
    </div>
    <button class="back" onclick={onCancel}>Volver</button>
  {:else}
    <p class="hint">…</p>
  {/if}
</Window>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 12.5rem;
  }

  .cmd {
    display: grid;
    grid-template-columns: 1.1rem 1fr auto;
    align-items: center;
    gap: 0.45rem;
    width: 100%;
    padding: 0.28rem 0.4rem;
    background: rgba(10, 24, 60, 0.45);
    border: 1px solid transparent;
    border-radius: 3px;
    color: #eef3ff;
    font: inherit;
    font-size: 0.78rem;
    text-align: left;
    cursor: pointer;
    transition:
      background 0.12s,
      border-color 0.12s,
      transform 0.08s;
  }

  .cmd:hover:not(:disabled) {
    background: rgba(78, 138, 226, 0.45);
    border-color: rgba(200, 224, 255, 0.7);
    transform: translateX(2px);
  }

  .cmd:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }

  .cmd.wait {
    margin-top: 0.2rem;
    border-top: 1px solid rgba(180, 200, 240, 0.2);
    border-radius: 0 0 3px 3px;
  }

  .key {
    font-size: 0.6rem;
    color: #ffe9a8;
    text-align: center;
    opacity: 0.85;
  }

  .cost {
    font-size: 0.62rem;
    color: #9db4da;
  }

  .cost b {
    font-weight: 600;
    color: #86c7ff;
  }

  .cost b.short {
    color: #ff8f86;
  }

  .prompt {
    margin: 0 0 0.25rem;
    font-size: 0.82rem;
    color: #ffe9a8;
  }

  .hint {
    margin: 0;
    font-size: 0.66rem;
    line-height: 1.35;
    color: #a9c0e6;
    max-width: 15rem;
  }

  .hint.desc b {
    color: #eef3ff;
  }

  .hint kbd {
    font: inherit;
    font-size: 0.6rem;
    padding: 0 0.2rem;
    border: 1px solid rgba(180, 200, 240, 0.4);
    border-radius: 2px;
  }

  .facings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px;
    margin: 0.35rem 0;
  }

  .facings .cmd {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .back {
    margin-top: 0.45rem;
    padding: 0.2rem 0.6rem;
    font: inherit;
    font-size: 0.68rem;
    color: #cfe0ff;
    background: rgba(10, 24, 60, 0.6);
    border: 1px solid rgba(180, 200, 240, 0.45);
    border-radius: 3px;
    cursor: pointer;
  }

  .back:hover {
    background: rgba(78, 138, 226, 0.45);
  }
</style>
