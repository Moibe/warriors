<script lang="ts">
  // Camera chrome: rotate a quarter turn either way, raise or lower the angle,
  // zoom, recentre. Every one of these has a keyboard shortcut, but a tactics
  // camera is unusable if you have to guess at it — the buttons are the
  // documentation.

  let {
    onRotate,
    onPitch,
    onZoom,
    onRecenter,
    pitchHigh,
  }: {
    onRotate: (dir: 1 | -1) => void;
    onPitch: () => void;
    onZoom: (delta: number) => void;
    onRecenter: () => void;
    pitchHigh: boolean;
  } = $props();
</script>

<div class="rig">
  <button title="Girar a la izquierda (Q)" onclick={() => onRotate(-1)} aria-label="Girar a la izquierda">
    <svg viewBox="0 0 24 24" aria-hidden="true"
      ><path
        d="M9 5 4 10l5 5M4 10h9a7 7 0 0 1 0 14"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      /></svg
    >
  </button>

  <button title="Girar a la derecha (E)" onclick={() => onRotate(1)} aria-label="Girar a la derecha">
    <svg viewBox="0 0 24 24" aria-hidden="true"
      ><path
        d="m15 5 5 5-5 5M20 10h-9a7 7 0 0 0 0 14"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      /></svg
    >
  </button>

  <button class:on={pitchHigh} title="Cambiar inclinación (R)" onclick={onPitch} aria-label="Inclinación">
    <svg viewBox="0 0 24 24" aria-hidden="true"
      ><path
        d="M3 17h18L12 6z"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
      /></svg
    >
  </button>

  <button title="Acercar (rueda)" onclick={() => onZoom(8)} aria-label="Acercar">
    <span class="glyph">+</span>
  </button>

  <button title="Alejar (rueda)" onclick={() => onZoom(-8)} aria-label="Alejar">
    <span class="glyph">−</span>
  </button>

  <button title="Centrar en la unidad activa (C)" onclick={onRecenter} aria-label="Centrar">
    <svg viewBox="0 0 24 24" aria-hidden="true"
      ><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2" /><path
        d="M12 2v3M12 19v3M2 12h3M19 12h3"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      /></svg
    >
  </button>
</div>

<style>
  .rig {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: linear-gradient(180deg, rgba(30, 62, 140, 0.9), rgba(10, 20, 56, 0.94));
    border: 2px solid rgba(214, 228, 255, 0.9);
    border-radius: 6px;
    box-shadow:
      inset 0 0 0 1px rgba(8, 16, 44, 0.85),
      0 8px 24px rgba(0, 0, 0, 0.5);
  }

  button {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    padding: 0;
    color: #dce8ff;
    background: rgba(10, 24, 60, 0.5);
    border: 1px solid rgba(180, 200, 240, 0.35);
    border-radius: 4px;
    cursor: pointer;
    transition:
      background 0.12s,
      color 0.12s,
      transform 0.08s;
  }

  button:hover {
    background: rgba(78, 138, 226, 0.55);
    color: #fff;
    transform: translateY(-1px);
  }

  button.on {
    background: rgba(255, 210, 74, 0.3);
    border-color: rgba(255, 226, 122, 0.75);
    color: #ffe9a8;
  }

  svg {
    width: 17px;
    height: 17px;
  }

  .glyph {
    font-size: 1rem;
    line-height: 1;
    font-weight: 700;
  }
</style>
