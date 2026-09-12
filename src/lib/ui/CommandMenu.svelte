<script lang="ts">
  // The command window — Mover, the active job's abilities, Esperar.
  //
  // It also stands in for the prompt line: while a destination or a target is
  // being picked the same window explains what the game is waiting for, so the
  // player never has to look elsewhere to know what a click will do.
  //
  // The rows are not built here: they arrive as data from `commandList()`, the
  // very list the keyboard walks. Building them twice is how a highlight ends
  // up one row away from the thing it is highlighting.
  //
  // Layout rule for this window: **nothing here may change size on selection.**
  // The window is anchored to the bottom of the screen, so any growth pushes
  // the buttons upward — out from under a stationary cursor — which fires
  // mouseleave, shrinks it back, fires mouseenter, and flickers forever. Hence
  // the fixed panel width and the help slot that is always present and always
  // the same height.

  import type { CommandEntry, Phase } from '../battle.svelte';
  import { FACING_NAMES, type Facing } from '../grid';
  import type { Ability } from '../jobs';
  import type { Unit } from '../units';
  import Window from './Window.svelte';

  let {
    unit,
    phase,
    ability,
    commands,
    selected,
    onSelect,
    onRun,
    onCancel,
    canConfirm,
    onFacing,
    onPreviewFacing,
  }: {
    unit: Unit;
    phase: Phase;
    ability: Ability | null;
    /** The order list, straight from the battle module. */
    commands: CommandEntry[];
    /** Highlighted row — moved by the arrows and by hovering alike. */
    selected: number;
    onSelect: (index: number) => void;
    onRun: (index: number) => void;
    onCancel: () => void;
    /** False while the aim is on a square the ability would not touch. */
    canConfirm: boolean;
    onFacing: (f: Facing) => void;
    /** Turns the unit on the map while a direction is merely pointed at. */
    onPreviewFacing: (f: Facing | null) => void;
  } = $props();

  const FACINGS: Facing[] = ['n', 'e', 's', 'w'];

  /** Label, cost tag and help text for one row. */
  function present(entry: CommandEntry) {
    if (entry.kind === 'move') {
      return {
        name: 'Mover',
        cost: `${unit.move} cas.`,
        short: false,
        head: `Mover · ${unit.move} casillas · salto ${unit.jump}`,
        desc: 'Las flechas eligen el destino y Enter confirma.',
      };
    }
    if (entry.kind === 'wait') {
      return {
        name: 'Esperar',
        cost: 'fin',
        short: false,
        head: 'Esperar · termina el turno',
        desc: 'Cuanto menos gastes en el turno, antes te vuelve a tocar.',
      };
    }
    const a = entry.ability;
    const span = a.minRange > 0 ? `${a.minRange}–${a.range}` : `${a.range}`;
    return {
      name: a.name,
      cost: a.mp ? `${a.mp} AG` : '—',
      short: a.mp > unit.mp,
      head: `${a.name} · alcance ${span}${a.aoe ? ` · área ${a.aoe}` : ''}`,
      desc: a.desc,
    };
  }

  const shown = $derived(commands[selected] ? present(commands[selected]) : null);

  /** Keyboard tag: Esperar is always 0, everything else counts from 1. */
  function keyTag(entry: CommandEntry, i: number) {
    return entry.kind === 'wait' ? '0' : String(i + 1);
  }
</script>

<Window title={phase === 'facing' ? 'Orientación' : 'Órdenes'}>
  <div class="panel">
    {#if phase === 'command'}
      <div class="list">
        {#each commands as entry, i (entry.kind === 'ability' ? entry.ability.id : entry.kind)}
          {@const p = present(entry)}
          <button
            class="cmd"
            class:selected={i === selected}
            class:wait={entry.kind === 'wait'}
            disabled={!entry.enabled}
            onclick={() => onRun(i)}
            onmouseenter={() => onSelect(i)}
            onfocus={() => onSelect(i)}
          >
            <span class="key">{keyTag(entry, i)}</span>
            <span class="text">{p.name}</span>
            <span class="cost"><b class:short={p.short}>{p.cost}</b></span>
          </button>
        {/each}
      </div>

      <!-- Always rendered at a fixed height: the help text swaps in place, it
           never adds to the window. -->
      <div class="slot">
        {#if shown}
          <p class="hint desc"><b>{shown.head}</b><br />{shown.desc}</p>
        {/if}
      </div>
    {:else if phase === 'move'}
      <p class="prompt">Elige una casilla azul.</p>
      <div class="slot">
        <p class="hint">
          Con las flechas o haciendo clic. Las casillas fuera de tu Salto quedan
          descartadas.
        </p>
      </div>
      <button class="back" onclick={onCancel}>Volver</button>
    {:else if phase === 'target'}
      <p class="prompt">{ability?.name}: elige el blanco.</p>
      <!-- El aviso va DENTRO del hueco de alto fijo, nunca en el rótulo de
           arriba: cambiar la altura de la ventana al mover el cursor la haría
           saltar bajo el puntero. -->
      <div class="slot">
        {#if canConfirm}
          <p class="hint">Con las flechas o haciendo clic.<br />{ability?.desc}</p>
        {:else}
          <p class="hint">
            Con las flechas o haciendo clic.<br />Aquí no hay blanco: la acción no
            se gasta.
          </p>
        {/if}
      </div>
      <button class="back" onclick={onCancel}>Volver</button>
    {:else if phase === 'facing'}
      <div class="slot">
        <p class="hint">
          ¿Hacia dónde queda mirando?<br />Apunta una dirección para verla en el
          mapa; por la espalda recibe más daño.
        </p>
      </div>
      <div class="facings">
        {#each FACINGS as f (f)}
          <!-- focus/blur as well as hover, so the preview also works when the
               buttons are reached with the keyboard. -->
          <button
            class="cmd"
            onclick={() => onFacing(f)}
            onmouseenter={() => onPreviewFacing(f)}
            onmouseleave={() => onPreviewFacing(null)}
            onfocus={() => onPreviewFacing(f)}
            onblur={() => onPreviewFacing(null)}
          >
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
     Wide enough that the longest help text in the catalog wraps to two lines,
     which is what keeps the reserved slot below from being mostly empty. */
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

  /* Keyboard selection and hover look identical on purpose: they are the same
     state, so drawing them differently would imply two cursors. */
  .cmd.selected:not(:disabled),
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
     against every entry in the catalog. Fixed, never grown. */
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
