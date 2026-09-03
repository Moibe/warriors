<script lang="ts">
  // The battle screen: a Threlte canvas with the HUD floating over it.
  //
  // This file owns exactly two things — the camera's user-facing state and the
  // input bindings. Everything about the battle itself lives in
  // `battle.svelte.ts`; the windows below are pure readers of it.

  import { Canvas } from '@threlte/core';
  import { NoToneMapping } from 'three';

  import Scene from '$lib/Scene.svelte';
  import {
    activeUnit,
    battle,
    cancel,
    commandAbility,
    commandMove,
    commandWait,
    confirmFacing,
    heightOf,
    map,
    restart,
    upcomingTurns,
  } from '$lib/battle.svelte';
  import { forecast, isValidTarget } from '$lib/combat';
  import { tileAt, type Facing } from '$lib/grid';
  import { JOBS } from '$lib/jobs';
  import { isAlive, unitAt } from '$lib/units';

  import BattleLog from '$lib/ui/BattleLog.svelte';
  import CameraControls from '$lib/ui/CameraControls.svelte';
  import CommandMenu from '$lib/ui/CommandMenu.svelte';
  import Forecast from '$lib/ui/Forecast.svelte';
  import ResultBanner from '$lib/ui/ResultBanner.svelte';
  import TileInfo from '$lib/ui/TileInfo.svelte';
  import TurnOrder from '$lib/ui/TurnOrder.svelte';
  import UnitPanel from '$lib/ui/UnitPanel.svelte';

  const APP_VERSION = '0.1.0';

  // ---- Camera -------------------------------------------------------------

  const ZOOM_MIN = 26;
  const ZOOM_MAX = 110;

  let yawIndex = $state(0);
  let pitchHigh = $state(false);
  let zoom = $state(58);
  let pan = $state({ x: 0, y: 0 });
  let yaw = $state(Math.PI / 4);

  function rotate(dir: 1 | -1) {
    yawIndex += dir;
  }

  function zoomBy(delta: number) {
    zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom + delta));
  }

  function recenter() {
    pan = { x: 0, y: 0 };
  }

  // Whoever is acting is the subject of the shot, so a fresh turn drops any
  // panning the player did to peek at another corner of the map.
  let lastActive = $state<string | null>(null);
  $effect(() => {
    if (battle.activeId !== lastActive) {
      lastActive = battle.activeId;
      pan = { x: 0, y: 0 };
    }
  });

  // ---- Pointer: wheel zoom, middle/right drag to pan -----------------------

  let dragging = $state(false);
  let lastX = 0;
  let lastY = 0;

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 5 : -5);
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 1 && e.button !== 2) return;
    e.preventDefault();
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    // Orthographic: one world unit is exactly `zoom` pixels, so this drags the
    // ground under the cursor at 1:1 whatever the zoom level.
    pan = { x: pan.x - dx / zoom, y: pan.y + dy / zoom };
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  // ---- Keyboard -----------------------------------------------------------

  function onKeyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();

    if (k === 'q') return rotate(-1);
    if (k === 'e') return rotate(1);
    if (k === 'r') return (pitchHigh = !pitchHigh);
    if (k === 'c') return recenter();
    if (k === '+' || k === '=') return zoomBy(6);
    if (k === '-') return zoomBy(-6);
    if (k === 'escape') return cancel();

    const u = activeUnit();
    if (!u || u.team !== 'ally') return;

    if (battle.phase === 'command') {
      if (k === '1') return commandMove();
      if (k === '0') return commandWait();
      const idx = Number(k) - 2;
      const abilities = JOBS[u.job].abilities;
      if (Number.isInteger(idx) && idx >= 0 && idx < abilities.length) {
        commandAbility(abilities[idx]);
      }
    }
  }

  // ---- Derived views ------------------------------------------------------

  const hoveredTile = $derived(
    battle.hovered ? tileAt(map, battle.hovered.x, battle.hovered.y) : null
  );

  const hoveredUnit = $derived(
    battle.hovered ? unitAt(battle.units, battle.hovered.x, battle.hovered.y) : undefined
  );

  /** The unit window follows the pointer, falling back to whoever is acting. */
  const panelUnit = $derived(hoveredUnit ?? activeUnit());

  const active = $derived(activeUnit());
  const playerTurn = $derived(!!active && active.team === 'ally' && isAlive(active));

  const queue = $derived(upcomingTurns(7));

  /** Odds preview, shown only while a live target sits under the cursor. */
  const aimForecast = $derived.by(() => {
    const aim = battle.aim;
    const ability = battle.ability;
    const u = activeUnit();
    if (battle.phase !== 'target' || !aim || !ability || !u) return null;
    const target = unitAt(battle.units, aim.x, aim.y);
    if (!target) return null;
    return {
      target,
      abilityName: ability.name,
      data: forecast(u, heightOf(u), target, heightOf(target), ability),
      // Aiming at your own side is allowed — the burst of a fireball doesn't
      // check tabards — but the window says so before you commit.
      friendlyFire: !isValidTarget(u, target, ability),
    };
  });

  const showCommands = $derived(
    playerTurn &&
      (battle.phase === 'command' ||
        battle.phase === 'move' ||
        battle.phase === 'target' ||
        battle.phase === 'facing')
  );

  function handleFacing(f: Facing) {
    confirmFacing(f);
  }
</script>

<svelte:head>
  <title>Warriors · Colina de la Capilla</title>
</svelte:head>

<svelte:window onkeydown={onKeyDown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="stage"
  class:dragging
  onwheel={onWheel}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  oncontextmenu={(e) => e.preventDefault()}
>
  <!-- The canvas is transparent, so the sky is CSS behind it. -->
  <Canvas toneMapping={NoToneMapping}>
    <Scene {yawIndex} {pitchHigh} {zoom} {pan} bind:yaw />
  </Canvas>

  <div class="hud">
    <div class="corner top-left">
      <div class="header">
        <h1>{map.name}</h1>
        <p>
          Turno {battle.turn}
          <span class="ver">v{APP_VERSION}</span>
        </p>
      </div>
      <TileInfo tile={hoveredTile} occupant={hoveredUnit?.name} />
    </div>

    <div class="corner top-right">
      <CameraControls
        onRotate={rotate}
        onPitch={() => (pitchHigh = !pitchHigh)}
        onZoom={zoomBy}
        onRecenter={recenter}
        {pitchHigh}
      />
      <TurnOrder entries={queue} activeId={battle.activeId} />
    </div>

    <div class="corner bottom-left">
      {#if panelUnit}
        <UnitPanel
          unit={panelUnit}
          height={heightOf(panelUnit)}
          title={panelUnit.id === battle.activeId ? 'En turno' : 'Unidad'}
        />
      {/if}
    </div>

    <div class="corner bottom-center">
      <BattleLog lines={battle.log} />
    </div>

    <div class="corner bottom-right">
      {#if aimForecast}
        <Forecast
          target={aimForecast.target}
          data={aimForecast.data}
          abilityName={aimForecast.abilityName}
          friendlyFire={aimForecast.friendlyFire}
        />
      {/if}

      {#if showCommands && active}
        <CommandMenu
          unit={active}
          phase={battle.phase}
          ability={battle.ability}
          onMove={commandMove}
          onAbility={commandAbility}
          onWait={commandWait}
          onCancel={cancel}
          onFacing={handleFacing}
        />
      {:else if battle.phase !== 'over'}
        <div class="waiting">
          {#if active}
            <span class="dot"></span> Turno de {active.name}…
          {:else}
            <span class="dot"></span> Calculando iniciativa…
          {/if}
        </div>
      {/if}
    </div>
  </div>

  {#if battle.winner}
    <ResultBanner winner={battle.winner} onRestart={restart} />
  {/if}

  <p class="keys">
    <kbd>Q</kbd><kbd>E</kbd> girar · <kbd>R</kbd> inclinar · <kbd>C</kbd> centrar ·
    <kbd>rueda</kbd> zoom · <kbd>botón central</kbd> desplazar · <kbd>Esc</kbd> cancelar
  </p>
</div>

<style>
  .stage {
    position: fixed;
    inset: 0;
    overflow: hidden;
    /* The sky. A cool vertical gradient with a warm haze near the horizon —
       the canvas above it is transparent, so this is the backdrop the whole
       battlefield sits in. */
    background:
      radial-gradient(120% 70% at 50% 100%, rgba(255, 214, 168, 0.35), transparent 60%),
      linear-gradient(180deg, #2c4f86 0%, #5b8ec4 45%, #9dc2e0 78%, #cfe0ea 100%);
    cursor: default;
    user-select: none;
  }

  .stage.dragging {
    cursor: grabbing;
  }

  .hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  /* Each corner is anchored on its own rather than sharing a grid track.
     In a grid, a row's height comes from its tallest cell, so one window
     growing would shove the others — and a window that moves under a resting
     cursor toggles its own hover state on and off forever. Anchored
     absolutely, a panel can only ever grow away from its corner.

     Only the windows themselves take pointer events; the gaps between them
     stay transparent so the map can be clicked through the HUD layer. */
  .corner {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    pointer-events: auto;
    width: max-content;
  }

  .top-left {
    top: 0.9rem;
    left: 0.9rem;
  }
  .top-right {
    top: 0.9rem;
    right: 0.9rem;
    align-items: flex-end;
  }
  /* Bottom row clears the shortcut strip. */
  .bottom-left {
    bottom: 1.9rem;
    left: 0.9rem;
  }
  .bottom-center {
    bottom: 1.9rem;
    left: 50%;
    transform: translateX(-50%);
  }
  .bottom-right {
    bottom: 1.9rem;
    right: 0.9rem;
    align-items: flex-end;
  }

  .header {
    color: #f3f7ff;
    text-shadow: 0 2px 6px rgba(0, 20, 50, 0.85);
  }

  .header h1 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: 0.03em;
  }

  .header p {
    margin: 0.1rem 0 0;
    font-size: 0.68rem;
    color: #d3e3fb;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ver {
    font-size: 0.58rem;
    opacity: 0.65;
    letter-spacing: 0.06em;
  }

  .waiting {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.72rem;
    color: #eaf1ff;
    background: linear-gradient(180deg, rgba(30, 62, 140, 0.8), rgba(10, 20, 56, 0.86));
    border: 2px solid rgba(214, 228, 255, 0.75);
    border-radius: 6px;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #ffd24a;
    box-shadow: 0 0 8px rgba(255, 210, 74, 0.9);
    animation: pulse 1.1s ease-in-out infinite;
  }

  @keyframes pulse {
    50% {
      opacity: 0.25;
    }
  }

  .keys {
    position: absolute;
    left: 50%;
    bottom: 0.35rem;
    transform: translateX(-50%);
    margin: 0;
    font-size: 0.6rem;
    color: rgba(240, 248, 255, 0.62);
    text-shadow: 0 1px 3px rgba(0, 20, 50, 0.9);
    pointer-events: none;
    white-space: nowrap;
  }

  .keys kbd {
    font: inherit;
    padding: 0 0.22rem;
    margin: 0 0.05rem;
    border: 1px solid rgba(240, 248, 255, 0.35);
    border-radius: 2px;
  }

  @media (max-width: 900px) {
    .bottom-center {
      display: none;
    }
    .keys {
      display: none;
    }
  }
</style>
