<script lang="ts">
  // End-of-battle overlay. A real panel in the game's own visual language —
  // never a browser dialog.

  import type { Team } from '../units';

  let { winner, onRestart }: { winner: Team; onRestart: () => void } = $props();

  const won = $derived(winner === 'ally');
</script>

<div class="veil">
  <div class="banner" class:defeat={!won}>
    <div class="ribbon">{won ? 'Victoria' : 'Derrota'}</div>
    <p class="line">
      {won
        ? 'El campo es tuyo. La capilla queda a salvo.'
        : 'Tu escuadra ha caído en la colina.'}
    </p>
    <button onclick={onRestart}>Otra batalla</button>
  </div>
</div>

<style>
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
    transition: transform 0.1s, filter 0.12s;
  }

  button:hover {
    transform: translateY(-1px);
    filter: brightness(1.08);
  }
</style>
