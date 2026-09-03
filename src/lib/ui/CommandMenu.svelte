<script lang="ts">
  // The command window — Mover, the active job's abilities, Esperar.
  //
  // It also stands in for the prompt line: while a destination or a target is
  // being picked the same window explains what the game is waiting for, so the
  // player never has to look elsewhere to know what a click will do.
  //
  // Layout rule for this window: **nothing here may change size on hover.**
  // The window is anchored to the bottom of the screen, so any growth pushes
  // the buttons upward — out from under a stationary cursor — which fires
  // mouseleave, shrinks it back, fires mouseenter, and flickers forever. Hence
  // the fixed panel width and the description slot that is always present and
  // always the same height, empty or not.

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

  // A turn change can swap the menu out from under the pointer; the stale
  // description would otherwise survive into the next unit's window.
  $effect(() => {
    void unit.id;
    void phase;
    hovered = null;
  });

  const rangeLabel = $derived.by(() => {
    const a = hovered;
    if (!a) return '';
    const span = a.minRange > 0 ? `${a.minRange}–${a.range}` : `${a.range}`;
    return `alcance ${span}${a.aoe ? ` · área ${a.aoe}` : ''}`;
  });

  const FACINGS: Facing[] = ['n', 'e', 's', 'w'];
</script>

<Window title={phase === 'facing' ? 'Orientación' : 'Órdenes'}>
  <div class="panel">
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

      <!-- Always rendered at a fixed height: the description replaces the
           default line in place, it never adds to the window. -->
      <div class="slot">
        {#if hovered}
          <p class="hint desc"><b>{hovered.name}</b> · {rangeLabel}<br />{hovered.desc}</p>
        {:else}
          <p class="hint">Elige una orden. <kbd>Esc</kbd> cancela.</p>
        {/if}
      </div>
    {:else if phase === 'move'}
      <p class="prompt">Elige una casilla azul.</p>
      <div class="slot">
        <p class="hint">Las casillas fuera de tu Salto quedan descartadas.</p>
      </div>
      <button class="back" onclick={onCancel}>Volver</button>
    {:else if phase === 'target'}
      <p class="prompt">{ability?.name}: elige el blanco.</p>
      <div class="slot">
        <p class="hint">{ability?.desc}</p>
      </div>
      <button class="back" onclick={onCancel}>Volver</button>
    {:else if phase === 'facing'}
      <div class="slot">
        <p class="hint">¿Hacia dónde queda mirando?</p>
      </div>
      <div class="facings">
        {#each FACINGS as f (f)}
          <button class="cmd" onclick={() => onFacing(f)}>
            <span class="text">{FACING_NAMES[f]}</span>
          </button>
        {/each}
      </div>
      <button class="back" onclick={onCancel}>Volver</button>
    {/if}
  </div>
</Window>

<style>
  /* Fixed width: the window must never resize in response to its contents.
     Wide enough that the longest ability description in the catalog wraps to
     two lines, which is what keeps the reserved slot below from being mostly
     empty in the common case. */
  .panel {
    width: 16rem;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 2px;
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
    /* No transform on hover — moving the button moves its own hit box, and a
       cursor resting on the edge would toggle the hover state forever. The
       highlight is drawn entirely inside the existing box instead. */
    transition:
      background 0.12s,
      border-color 0.12s,
      box-shadow 0.12s;
  }

  .cmd:hover:not(:disabled) {
    background: rgba(78, 138, 226, 0.45);
    border-color: rgba(200, 224, 255, 0.7);
    box-shadow: inset 3px 0 0 rgba(255, 233, 168, 0.9);
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

  /* Reserved space for the help line: header plus two wrapped lines, measured
     against every description in the catalog. Fixed, never grown. */
  .slot {
    height: 3.75rem;
    margin-top: 0.45rem;
    overflow: hidden;
  }

  .hint {
    margin: 0;
    font-size: 0.66rem;
    line-height: 1.35;
    color: #a9c0e6;
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
