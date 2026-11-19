<script lang="ts">
  // La capa del diálogo de apertura: el velo que sostiene el reloj, el clic o
  // Intro que pasa a la siguiente línea, y el botón de saltar.
  //
  // Lo que dice un personaje YA NO se dibuja aquí: sale en un globo sobre su
  // cabeza (`SpeechBubble`, colgado del tablero en Scene.svelte), porque una
  // barra fija abajo quedaba lejos de donde el jugador estaba mirando y se
  // leía poco. Aquí sólo queda la línea sin nadie que la diga — el parte de
  // batalla hablando por sí solo — que no tiene cabeza de la que colgar y sale
  // en un recuadro arriba, centrado.
  //
  // Nunca inventa una frase: el texto es exactamente el mismo que ya cae al
  // parte de batalla (`BriefLine.text`, sin tocar).
  import { battle, advanceIntro, skipIntro } from '../battle.svelte';

  const intro = $derived(battle.intro);
  const line = $derived(intro ? intro.lines[intro.index] : null);
  const isLast = $derived(!!intro && intro.index === intro.lines.length - 1);
  const position = $derived(intro ? `${intro.index + 1} / ${intro.lines.length}` : '');

  function onSkip(e: MouseEvent) {
    e.stopPropagation();
    skipIntro();
  }
</script>

{#if line}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="veil" onclick={advanceIntro}>
    <button class="skip" onclick={onSkip}>Saltar »</button>

    {#if !line.speaker}
      {#key intro?.index}
        <div class="narrator" aria-live="polite">
          <p class="who">Parte de batalla</p>
          <p class="text">{line.text}</p>
          <div class="foot">
            <span class="count">{position}</span>
            <span class="next">{isLast ? 'Empezar ▸' : '▼'}</span>
          </div>
        </div>
      {/key}
    {/if}
  </div>
{/if}

<style>
  /* Viñeta, no cortina: oscurece las orillas y deja limpio el centro, que es
     donde la cámara pone a quien habla. Sigue diciendo "el juego está en
     pausa" sin apagar al personaje. */
  .veil {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 16vh 2rem 0;
    background: radial-gradient(ellipse 75% 70% at 50% 50%, transparent 40%, rgba(2, 5, 16, 0.55) 100%);
    z-index: 25;
    cursor: pointer;
    animation: fade 0.4s ease-out both;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  /* Abajo a la derecha, sobre el aviso de "Calculando iniciativa…": arriba se
     encimaba con los controles de cámara, y aquí abajo no hay nada que hacer
     mientras el reloj está detenido. */
  .skip {
    position: absolute;
    bottom: 4.6rem;
    right: 0.9rem;
    font: inherit;
    font-size: 0.72rem;
    letter-spacing: 0.05em;
    color: #cfe0ff;
    background: rgba(10, 20, 56, 0.6);
    border: 1px solid rgba(214, 228, 255, 0.45);
    border-radius: 4px;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
  }

  .skip:hover {
    background: rgba(20, 38, 92, 0.75);
    border-color: rgba(214, 228, 255, 0.8);
  }

  .narrator {
    max-width: 30rem;
    width: 100%;
    background: linear-gradient(180deg, rgba(30, 62, 140, 0.95) 0%, rgba(10, 20, 56, 0.97) 100%);
    border: 2px solid rgba(214, 228, 255, 0.9);
    border-radius: 8px;
    padding: 0.65rem 0.9rem 0.5rem;
    box-shadow:
      inset 0 0 0 1px rgba(8, 16, 44, 0.85),
      0 10px 30px rgba(0, 0, 0, 0.6);
    animation: rise 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
  }

  .who {
    margin: 0 0 0.15rem;
    font-size: 0.8rem;
    font-weight: 500;
    font-style: italic;
    letter-spacing: 0.04em;
    color: #a9c0e6;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
  }

  .text {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.45;
    color: #eef3ff;
  }

  .foot {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 0.4rem;
  }

  .count {
    font-size: 0.62rem;
    letter-spacing: 0.06em;
    color: #92a8cf;
    font-variant-numeric: tabular-nums;
  }

  .next {
    font-size: 0.72rem;
    color: #ffe9a8;
    animation: bob 1s ease-in-out infinite;
  }

  @keyframes bob {
    0%,
    100% {
      transform: translateY(0);
      opacity: 0.75;
    }
    50% {
      transform: translateY(2px);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .veil,
    .narrator,
    .next {
      animation: none;
    }
  }

  @media (max-width: 480px) {
    .veil {
      padding: 12vh 1rem 0;
    }
    .text {
      font-size: 0.84rem;
    }
  }
</style>
