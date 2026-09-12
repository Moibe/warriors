<script lang="ts">
  // Picking which fight to walk into.
  //
  // Built in the same visual language as the end-of-battle banner — same veil,
  // same panel, same rise — because it shows up in the same place and means the
  // same kind of thing: the battle is over, choose what happens next.

  import type { Stage, StageId } from '../stages';

  let {
    stages,
    currentId,
    onPick,
    onClose,
  }: {
    stages: Stage[];
    currentId: StageId;
    onPick: (id: StageId) => void;
    onClose: () => void;
  } = $props();

  // Starts on whichever battle is in play, so Enter with no arrow keys means
  // "this one again" rather than jumping somewhere the player did not look.
  let index = $state(0);
  $effect(() => {
    const at = stages.findIndex((s) => s.id === currentId);
    if (at >= 0) index = at;
  });

  // Arrow keys and Enter, like every other list in the game. The page's own
  // key handler stands down while this is open, so nothing reaches the board.
  export function step(delta: number) {
    index = (index + delta + stages.length) % stages.length;
  }
  export function confirm() {
    onPick(stages[index].id);
  }
</script>

<!-- Esc is handled by the page's key handler, which stands down for everything
     else while this is open; the veil is a click target and nothing more. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="veil" onclick={onClose}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="panel" onclick={(e) => e.stopPropagation()}>
    <div class="ribbon">Elige la batalla</div>

    <ul>
      {#each stages as stage, i (stage.id)}
        <li>
          <button
            class:selected={i === index}
            class:playing={stage.id === currentId}
            onmouseenter={() => (index = i)}
            onclick={() => onPick(stage.id)}
          >
            <span class="name">{stage.name}</span>
            <span class="rival">{stage.rival}</span>
            {#if stage.id === currentId}<span class="now">en curso</span>{/if}
          </button>
        </li>
      {/each}
    </ul>

    <p class="hint">↑↓ elegir · Enter empezar · Esc cancelar</p>
  </div>
</div>

<style>
  .veil {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 50% 45%, rgba(4, 10, 28, 0.35), rgba(2, 5, 16, 0.8));
    z-index: 30;
    animation: fade 0.25s ease-out both;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  .panel {
    min-width: 21rem;
    padding: 0 0 0.9rem;
    border: 2px solid rgba(214, 228, 255, 0.9);
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(30, 62, 140, 0.96), rgba(10, 20, 56, 0.97));
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
    animation: rise 0.28s cubic-bezier(0.2, 0.9, 0.3, 1) both;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }

  .ribbon {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid rgba(214, 228, 255, 0.35);
    color: #ffe27a;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  ul {
    margin: 0;
    padding: 0.6rem 0.6rem 0.2rem;
    list-style: none;
  }

  button {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: 0 0.6rem;
    width: 100%;
    padding: 0.5rem 0.7rem;
    border: 1px solid transparent;
    border-radius: 5px;
    background: transparent;
    color: #dfe8f8;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  /* Selection is a filled row, not a transform: the panel is anchored under a
     stationary pointer, and anything that resizes on hover starts a loop. */
  button.selected {
    border-color: rgba(214, 228, 255, 0.75);
    background: rgba(90, 140, 230, 0.32);
  }

  .name {
    font-size: 1rem;
    font-weight: 700;
  }

  .rival {
    grid-column: 1;
    color: #9fb4d8;
    font-size: 0.78rem;
  }

  .now {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: center;
    color: #ffe27a;
    font-size: 0.66rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .hint {
    margin: 0.3rem 1rem 0;
    color: #8fa6c8;
    font-size: 0.7rem;
  }
</style>
