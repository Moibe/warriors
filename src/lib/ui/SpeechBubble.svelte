<script lang="ts">
  // El globo de diálogo, plantado sobre la cabeza de quien habla. Estilo Final
  // Fantasy Tactics: retrato, nombre, la línea, y una colita que baja hasta él.
  //
  // Antes la línea salía en una barra fija abajo y aquí sólo flotaba un
  // marcador de puntitos para decir DÓNDE estaba el que hablaba. Eran dos
  // lecturas para una sola pregunta, y la que importaba —qué dice— quedaba a
  // un palmo de donde el jugador estaba mirando. Ahora es una sola cosa y está
  // donde está el hombre: la cámara va hacia él en cada línea (`cameraTarget`
  // en Scene.svelte) y el globo cuelga de su cabeza.
  //
  // Nunca toma el puntero: el clic que avanza lo atrapa el velo de
  // `IntroDialogue`, que está debajo, y un globo que se pudiera "hoverear"
  // parpadearía igual que la tarjeta flotante.
  //
  // Anclado por el centro de abajo. El <HTML> pone la esquina superior
  // izquierda del elemento sobre el punto encima de la cabeza; el transform de
  // `.anchor` lo sube y lo centra para que la punta de la colita caiga ahí.
  import { getPortraitUrl } from '../sprites';
  import { hatOf, type Unit } from '../units';

  let {
    unit,
    text,
    position,
    isLast,
  }: { unit: Unit; text: string; position: string; isLast: boolean } = $props();

  const portrait = $derived(getPortraitUrl(unit.job, unit.paletteOverride, 6, hatOf(unit)));
</script>

<div class="anchor" aria-live="polite">
  <div class="bubble" class:enemy={unit.team === 'enemy'}>
    <div class="bust">
      <img src={portrait} alt="" />
    </div>
    <div class="body">
      <p class="who">{unit.name}</p>
      <p class="text">{text}</p>
      <div class="foot">
        <span class="count">{position}</span>
        <span class="next">{isLast ? 'Empezar ▸' : '▼'}</span>
      </div>
    </div>
    <div class="tail"></div>
  </div>
</div>

<style>
  .anchor {
    /* La punta de la colita (7px por debajo de la caja) cae sobre el ancla. */
    transform: translate(-50%, calc(-100% - 9px));
    pointer-events: none;
    width: max-content;
    max-width: min(23rem, 82vw);
  }

  .bubble {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    background: linear-gradient(180deg, rgba(30, 62, 140, 0.96) 0%, rgba(10, 20, 56, 0.97) 100%);
    border: 2px solid rgba(255, 233, 168, 0.92);
    border-radius: 10px;
    padding: 0.5rem 0.75rem 0.4rem 0.5rem;
    box-shadow:
      inset 0 0 0 1px rgba(8, 16, 44, 0.85),
      0 10px 28px rgba(0, 0, 0, 0.65);
    transform-origin: 50% 100%;
    animation: pop 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  /* Cuando habla el otro bando, el filo y el nombre pasan a rojo: el mismo
     rojo de los anillos enemigos en el tablero, para saber de qué lado viene
     la frase antes de leerla. */
  .bubble.enemy {
    border-color: rgba(255, 138, 122, 0.92);
  }
  .bubble.enemy .who,
  .bubble.enemy .next {
    color: #ffb4a8;
  }
  .bubble.enemy .tail {
    border-top-color: rgba(255, 138, 122, 0.92);
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.9);
    }
  }

  .bust {
    flex: none;
    width: 46px;
    height: 52px;
    display: grid;
    place-items: center;
    background: linear-gradient(180deg, #3a5fa0, #16234c);
    border: 1px solid rgba(214, 228, 255, 0.7);
    border-radius: 6px;
    overflow: hidden;
  }

  .bust img {
    width: 92%;
    height: auto;
    image-rendering: pixelated;
  }

  .body {
    min-width: 0;
  }

  .who {
    margin: 0 0 0.1rem;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #ffe9a8;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
  }

  .text {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.4;
    color: #eef3ff;
  }

  .foot {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    margin-top: 0.3rem;
  }

  .count {
    font-size: 0.6rem;
    letter-spacing: 0.06em;
    color: #92a8cf;
    font-variant-numeric: tabular-nums;
  }

  .next {
    font-size: 0.7rem;
    color: #ffe9a8;
    animation: bob 1s ease-in-out infinite;
  }

  /* La colita: borde dorado por fuera, relleno del fondo de la caja por dentro. */
  .tail {
    position: absolute;
    left: 50%;
    bottom: -9px;
    width: 0;
    height: 0;
    transform: translateX(-50%);
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 9px solid rgba(255, 233, 168, 0.92);
  }

  .tail::before {
    content: '';
    position: absolute;
    left: -6px;
    top: -11px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 7px solid #0b1640;
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
    .bubble,
    .next {
      animation: none;
    }
  }

  @media (max-width: 480px) {
    .bust {
      width: 38px;
      height: 44px;
    }
    .text {
      font-size: 0.82rem;
    }
  }
</style>
