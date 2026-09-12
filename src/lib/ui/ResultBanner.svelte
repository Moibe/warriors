<script lang="ts">
  // End-of-battle overlay. A real panel in the game's own visual language —
  // never a browser dialog.

  import type { Team } from '../units';

  let {
    winner,
    outcome,
    onRestart,
    onChangeStage,
  }: {
    winner: Team;
    /** What this particular battle says when it ends. Lives on the stage. */
    outcome: { victory: string; defeat: string };
    onRestart: () => void;
    onChangeStage: () => void;
  } = $props();

  const won = $derived(winner === 'ally');
</script>

<div class="veil">
  <div class="banner" class:defeat={!won}>
    <div class="ribbon">{won ? 'Victoria' : 'Derrota'}</div>
    <p class="line">
      {won ? outcome.victory : outcome.defeat}
    </p>
    <div class="choices">
      <button onclick={onRestart}>Repetir</button>
      <button class="ghost" onclick={onChangeStage}>Otra batalla</button>
    </div>
  </div>
</div>

<style>
  .choices {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .veil {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 50% 45%, rgba(4, 10, 28, 0.35), rgba(2, 5, 16, 0.8));
    z-index: 20;
    animation: fade 0.5s ease-out both;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  .banner {
    min-width: 22rem;
    padding: 1.6rem 2rem 1.4rem;
    text-align: center;
    background: linear-gradient(180deg, rgba(30, 62, 140, 0.95), rgba(10, 20, 56, 0.97));
    border: 2px solid rgba(214, 228, 255, 0.9);
    border-radius: 8px;
    box-shadow:
      inset 0 0 0 1px rgba(8, 16, 44, 0.85),
      0 20px 60px rgba(0, 0, 0, 0.7);
    animation: rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.97);
    }
  }

  .banner.defeat {
    background: linear-gradient(180deg, rgba(120, 40, 46, 0.95), rgba(40, 10, 20, 0.97));
  }

  .ribbon {
    font-size: 1.7rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #ffe9a8;
    text-shadow: 0 3px 8px rgba(0, 0, 0, 0.8);
  }

  .banner.defeat .ribbon {
    color: #ffc9c2;
  }

  .line {
    margin: 0.5rem 0 1.1rem;
    font-size: 0.82rem;
    color: #cfe0ff;
  }

  button {
    padding: 0.45rem 1.4rem;
    font: inherit;
    font-size: 0.82rem;
    letter-spacing: 0.05em;
    color: #0d1a3c;
    background: linear-gradient(180deg, #ffe9a8, #d9ab45);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 4px;
    cursor: pointer;
    transition:
      filter 0.12s,
      box-shadow 0.12s;
  }

  button:hover {
    filter: brightness(1.08);
    box-shadow: 0 0 0 2px rgba(255, 233, 168, 0.45);
  }

  /* The secondary choice: same shape, no fill — leaving this battle behind
     should not compete with trying it again. */
  button.ghost {
    color: #e6eeff;
    background: transparent;
    border-color: rgba(214, 228, 255, 0.6);
  }

  button.ghost:hover {
    background: rgba(90, 140, 230, 0.22);
    box-shadow: 0 0 0 2px rgba(214, 228, 255, 0.3);
  }
</style>
