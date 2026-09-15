<script lang="ts">
  // La gotita de diálogo: una línea a la vez, con el retrato de quien habla si
  // lo hay, antes de que el reloj empiece a correr. Estilo Final Fantasy
  // Tactics — retrato, globo con colita, un clic o Intro para seguir.
  //
  // Nunca inventa una cara ni una frase: el texto es exactamente el mismo que
  // ya cae al parte de batalla (`BriefLine.text`, sin tocar), y el retrato es
  // el de una unidad real del reparto de esta escena, generado por el mismo
  // motor de sprites que dibuja el tablero.
  import { battle, advanceIntro, skipIntro } from '../battle.svelte';
  import { getPortraitUrl } from '../sprites';
  import { hatOf } from '../units';

  const intro = $derived(battle.intro);
  const line = $derived(intro ? intro.lines[intro.index] : null);
  const speaker = $derived(line?.speaker ? battle.units.find((u) => u.id === line.speaker) : undefined);
  const portrait = $derived(
    speaker ? getPortraitUrl(speaker.job, speaker.paletteOverride, 8, hatOf(speaker)) : ''
  );
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

    <div class="bar" class:no-bust={!speaker}>
      {#if speaker}
        <div class="bust">
          <img src={portrait} alt={speaker.name} />
        </div>
      {/if}

      <div class="bubble">
        {#if speaker}
          <div class="tail"></div>
          <p class="who">{speaker.name}</p>
        {:else}
          <p class="who narrator">Parte de batalla</p>
        {/if}
        <p class="text">{line.text}</p>
        <div class="foot">
          <span class="count">{position}</span>
          <span class="next">{isLast ? 'Empezar ▸' : '▼'}</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .veil {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0 2rem 2.4rem;
    background: linear-gradient(180deg, rgba(2, 5, 16, 0.15) 0%, rgba(2, 5, 16, 0.55) 100%);
    z-index: 25;
    cursor: pointer;
    animation: fade 0.4s ease-out both;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  .skip {
    position: absolute;
    top: 1rem;
    right: 1rem;
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

  .bar {
    display: flex;
    align-items: flex-end;
    gap: 0;
    max-width: 46rem;
    width: 100%;
    animation: rise 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }

  .bust {
    flex: none;
    width: 74px;
    height: 82px;
    margin-right: -1px;
    display: grid;
    place-items: center;
    background: linear-gradient(180deg, #3a5fa0, #16234c);
    border: 2px solid rgba(214, 228, 255, 0.85);
    border-radius: 6px;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.55);
  }

  .bust img {
    width: 88%;
    height: auto;
    image-rendering: pixelated;
  }

  .bubble {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    background: linear-gradient(180deg, rgba(30, 62, 140, 0.95) 0%, rgba(10, 20, 56, 0.97) 100%);
    border: 2px solid rgba(214, 228, 255, 0.9);
    border-radius: 8px;
    padding: 0.65rem 0.9rem 0.5rem;
    box-shadow:
      inset 0 0 0 1px rgba(8, 16, 44, 0.85),
      0 10px 30px rgba(0, 0, 0, 0.6);
  }

  .bar.no-bust .bubble {
    max-width: 34rem;
    margin: 0 auto;
  }

  .tail {
    position: absolute;
    left: -9px;
    bottom: 1.1rem;
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-right: 9px solid rgba(214, 228, 255, 0.9);
  }

  .tail::after {
    content: '';
    position: absolute;
    left: 2px;
    top: -6px;
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 7px solid #17275c;
  }

  .who {
    margin: 0 0 0.15rem;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #ffe9a8;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
  }

  .who.narrator {
    color: #a9c0e6;
    font-weight: 500;
    font-style: italic;
    letter-spacing: 0.04em;
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
    .bar,
    .next {
      animation: none;
    }
  }

  @media (max-width: 480px) {
    .veil {
      padding: 0 1rem 1.6rem;
    }
    .bust {
      width: 58px;
      height: 64px;
    }
    .who {
      font-size: 0.74rem;
    }
    .text {
      font-size: 0.84rem;
    }
  }
</style>
