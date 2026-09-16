<script lang="ts">
  // El marcador que flota sobre quien habla en la gotita de diálogo — no
  // repite el nombre ni el texto, eso ya lo dice la barra de abajo. Esto
  // contesta la otra pregunta, la que la barra no puede: DÓNDE está parado,
  // en un tablero donde puede haber diez cabezas iguales desde lejos.
</script>

<div class="marker" aria-hidden="true">
  <span class="dot"></span>
  <span class="dot"></span>
  <span class="dot"></span>
  <div class="tail"></div>
</div>

<style>
  .marker {
    position: relative;
    transform: translate(-50%, -100%);
    display: flex;
    align-items: center;
    gap: 0.16rem;
    padding: 0.28rem 0.4rem;
    background: linear-gradient(180deg, rgba(30, 62, 140, 0.95) 0%, rgba(10, 20, 56, 0.97) 100%);
    border: 2px solid rgba(255, 233, 168, 0.9);
    border-radius: 999px;
    box-shadow:
      inset 0 0 0 1px rgba(8, 16, 44, 0.85),
      0 4px 12px rgba(0, 0, 0, 0.55);
    animation: bob 1.1s ease-in-out infinite;
  }

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #ffe9a8;
    animation: pulse 1.1s ease-in-out infinite;
  }

  .dot:nth-child(2) {
    animation-delay: 0.15s;
  }
  .dot:nth-child(3) {
    animation-delay: 0.3s;
  }

  .tail {
    position: absolute;
    left: 50%;
    bottom: -6px;
    width: 0;
    height: 0;
    transform: translateX(-50%);
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 7px solid rgba(255, 233, 168, 0.9);
  }

  .tail::before {
    content: '';
    position: absolute;
    left: -3.5px;
    top: -8px;
    width: 0;
    height: 0;
    border-left: 3.5px solid transparent;
    border-right: 3.5px solid transparent;
    border-top: 5px solid #17275c;
  }

  @keyframes bob {
    0%,
    100% {
      transform: translate(-50%, -100%) translateY(0);
    }
    50% {
      transform: translate(-50%, -100%) translateY(-3px);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.4;
      transform: scale(0.85);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .marker,
    .dot {
      animation: none;
    }
  }
</style>
