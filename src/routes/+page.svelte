<script lang="ts">
  // The battle screen: a Threlte canvas with the HUD floating over it.
  //
  // This file owns exactly two things — the camera's user-facing state and the
  // input bindings. Everything about the battle itself lives in
  // `battle.svelte.ts`; the windows below are pure readers of it.

  import { Canvas } from '@threlte/core';
  import { untrack } from 'svelte';
  import { NoToneMapping } from 'three';

  import Scene from '$lib/Scene.svelte';
  import {
    activeUnit,
    battle,
    cancel,
    commandList,
    confirmFacing,
    confirmTile,
    cursorCoord,
    heightOf,
    map,
    previewFacing,
    restart,
    runCommand,
    stepAimCursor,
    stepMoveCursor,
    upcomingTurns,
  } from '$lib/battle.svelte';
  import { forecast, isValidTarget } from '$lib/combat';
  import { facingTo, tileAt, tileKey, type Coord, type Facing } from '$lib/grid';
  import { tilesInBurst } from '$lib/pathfinding';
  import { isAlive, unitAt } from '$lib/units';

  import BattleLog from '$lib/ui/BattleLog.svelte';
  import CameraControls from '$lib/ui/CameraControls.svelte';
  import CommandMenu from '$lib/ui/CommandMenu.svelte';
  import Forecast from '$lib/ui/Forecast.svelte';
  import ResultBanner from '$lib/ui/ResultBanner.svelte';
  import TileInfo from '$lib/ui/TileInfo.svelte';
  import TurnOrder from '$lib/ui/TurnOrder.svelte';
  import UnitPanel from '$lib/ui/UnitPanel.svelte';

  const APP_VERSION = '0.12.3';

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
      commandIndex = 0;
    }
  });

  // ---- Pointer: wheel zoom, drag to pan -----------------------------------
  //
  // Any button drags the view, the left one included — but the left button also
  // picks a tile, so the two have to be told apart. A press only becomes a drag
  // once it has travelled DRAG_THRESHOLD pixels; below that it stays a click and
  // reaches the board untouched.

  /** Pixels of travel before a press stops being a click and becomes a drag. */
  const DRAG_THRESHOLD = 5;

  let dragging = $state(false);
  let pressing = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  /** Set when a drag ends, so the click the browser fires next is discarded. */
  let swallowClick = false;

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 5 : -5);
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    // Only the middle and right buttons get their default suppressed: doing it
    // to the left one would interfere with the click we still want to deliver.
    if (e.button !== 0) e.preventDefault();
    pressing = true;
    dragging = false;
    swallowClick = false;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
  }

  function onPointerMove(e: PointerEvent) {
    if (!pressing) return;

    if (!dragging) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return;
      dragging = true;
      // Captured only now, once it is certainly a drag. Capturing on press
      // would reroute the pointer-up and the click along with it, and an
      // ordinary click on a tile would stop landing on the board.
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    // Orthographic: one world unit is exactly `zoom` pixels, so this drags the
    // ground under the cursor at 1:1 whatever the zoom level.
    pan = { x: pan.x - dx / zoom, y: pan.y + dy / zoom };
  }

  function onPointerUp(e: PointerEvent) {
    if (!pressing) return;
    pressing = false;
    if (dragging) {
      swallowClick = true;
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
    dragging = false;
  }

  /**
   * Eats the click the browser fires after a drag. Runs in the capture phase,
   * so it gets there before the canvas does its own hit test and the drag never
   * moves a unit by accident.
   */
  function onClickCapture(e: MouseEvent) {
    if (!swallowClick) return;
    swallowClick = false;
    e.stopPropagation();
    e.preventDefault();
  }

  // ---- Order menu ---------------------------------------------------------

  /** Highlighted row of the order window. Shared by the arrows and the mouse. */
  let commandIndex = $state(0);

  const commands = $derived(battle.phase === 'command' ? commandList() : []);

  // Keep the highlight on a row that can actually be run: a command goes
  // disabled while the menu is open (Mover, the moment you have moved) and a
  // new turn brings a different list entirely.
  $effect(() => {
    const list = commands;
    if (!list.length) return;
    const i = untrack(() => commandIndex);
    if (!list[i]?.enabled) {
      const first = list.findIndex((c) => c.enabled);
      if (first >= 0) commandIndex = first;
    }
  });

  /** Walks the highlight, skipping rows Enter could not run. Wraps around. */
  function stepCommand(delta: 1 | -1) {
    const list = commands;
    if (!list.length) return;
    let i = commandIndex;
    for (let n = 0; n < list.length; n++) {
      i = (i + delta + list.length) % list.length;
      if (list[i].enabled) {
        commandIndex = i;
        return;
      }
    }
  }

  function runIndex(i: number) {
    const entry = commands[i];
    if (entry) runCommand(entry);
  }

  // ---- Keyboard -----------------------------------------------------------

  // Arrows drive the cursor only where there is genuinely a tile to choose:
  // picking a destination, and aiming the unit in the orientation step. Outside
  // those two the cursor is a turn indicator and nothing moves it.

  /** The four grid axes, in the order the arrows map to them at yawIndex 0. */
  const GRID_DIRS: Coord[] = [
    { x: 0, y: -1 }, // norte
    { x: 1, y: 0 }, // este
    { x: 0, y: 1 }, // sur
    { x: -1, y: 0 }, // oeste
  ];

  const ARROW_BASE: Record<string, number> = {
    arrowup: 0,
    arrowright: 1,
    arrowdown: 2,
    arrowleft: 3,
  };

  /**
   * Arrows are screen-relative, not grid-relative — this is the whole trick.
   *
   * The camera sits at 45° to the grid, so the four grid axes project to the
   * four screen *diagonals*: at the default view, north runs up-and-right,
   * east down-and-right, and so on. Pressing ↑ therefore has to mean "north",
   * and each quarter turn of the camera rotates the whole mapping by one step —
   * which is exactly a shift of `-yawIndex` around the ring of four.
   *
   * Keyed off `yawIndex` rather than the live `yaw`, so a press landing in the
   * middle of a rotation animation still resolves to the angle being turned to.
   */
  function arrowToGrid(base: number): Coord {
    return GRID_DIRS[(((base - yawIndex) % 4) + 4) % 4];
  }

  function onKeyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();

    if (k === 'q') return rotate(-1);
    if (k === 'e') return rotate(1);
    if (k === 'r') return (pitchHigh = !pitchHigh);
    if (k === 'c') return recenter();
    if (k === '+' || k === '=') return zoomBy(6);
    if (k === '-') return zoomBy(-6);
    if (k === 'escape') return cancel();

    const arrow = ARROW_BASE[k];
    if (arrow !== undefined) {
      // In the order window the arrows walk a list, so up means up — the
      // rotation into the board's frame would be nonsense here.
      if (battle.phase === 'command') {
        if (k === 'arrowup' || k === 'arrowdown') {
          e.preventDefault();
          stepCommand(k === 'arrowdown' ? 1 : -1);
        }
        return;
      }
      if (
        battle.phase === 'facing' ||
        battle.phase === 'move' ||
        battle.phase === 'target'
      ) {
        e.preventDefault();
        const d = arrowToGrid(arrow);
        if (battle.phase === 'facing') previewFacing(facingTo({ x: 0, y: 0 }, d));
        else if (battle.phase === 'move') stepMoveCursor(d.x, d.y);
        else stepAimCursor(d.x, d.y);
      }
      return;
    }

    // A button keeps focus after being clicked and fires its own activation on
    // Enter; without this guard the order would run twice.
    const onButton = (e.target as HTMLElement | null)?.tagName === 'BUTTON';
    if ((k === 'enter' || k === ' ') && !onButton) {
      if (battle.phase === 'command') {
        e.preventDefault();
        runIndex(commandIndex);
        return;
      }
      if (battle.phase === 'facing') {
        e.preventDefault();
        const acting = activeUnit();
        if (acting) confirmFacing(acting.facing);
        return;
      }
      if (battle.phase === 'move' || battle.phase === 'target') {
        e.preventDefault();
        const c = cursorCoord();
        if (c) confirmTile(c.x, c.y);
        return;
      }
    }

    const u = activeUnit();
    if (!u || u.team !== 'ally') return;

    // Number shortcuts stay, and run the very same rows the arrows walk.
    if (battle.phase === 'command') {
      if (k === '0') {
        const wait = commands.findIndex((c) => c.kind === 'wait');
        if (wait >= 0) runIndex(wait);
        return;
      }
      const idx = Number(k) - 1;
      if (Number.isInteger(idx) && idx >= 0 && idx < commands.length) {
        if (commands[idx].kind !== 'wait') runIndex(idx);
      }
    }
  }

  // ---- Derived views ------------------------------------------------------

  const active = $derived(activeUnit());

  // The terrain window follows the cursor, which is the acting unit except
  // while a destination is being chosen — where the height of the square you
  // are about to step onto is exactly what you need to read. The unit window
  // stays on the acting unit; inspecting another one means reading its row in
  // the turn order.
  const cursor = $derived(cursorCoord());
  const cursorTile = $derived(cursor ? tileAt(map, cursor.x, cursor.y) : null);
  const cursorOccupant = $derived(
    cursor ? unitAt(battle.units, cursor.x, cursor.y)?.name : undefined
  );
  const panelUnit = $derived(active);
  const playerTurn = $derived(!!active && active.team === 'ally' && isAlive(active));

  const queue = $derived(upcomingTurns(7));

  /**
   * The odds, for whoever is under the aiming cursor. Same maths the roll uses,
   * so the window cannot promise something the dice will not honour.
   */
  const aimForecast = $derived.by(() => {
    const aim = battle.aim;
    const ability = battle.ability;
    const u = activeUnit();
    if (battle.phase !== 'target' || !aim || !ability || !u) return null;
    const target = unitAt(battle.units, aim.x, aim.y);
    if (!target) return null;

    // Everyone else the burst would touch. The figures below describe the unit
    // on the cursor alone, so a silent area ability would read as safer than it
    // is when it is about to catch three more.
    let alsoCaught = 0;
    if (ability.aoe > 0) {
      const cells = tilesInBurst(map, aim, ability.aoe);
      alsoCaught = battle.units.filter(
        (o) => isAlive(o) && o.id !== target.id && cells.has(tileKey(o.x, o.y))
      ).length;
    }

    return {
      target,
      abilityName: ability.name,
      data: forecast(u, heightOf(u), target, heightOf(target), ability),
      // Aiming at your own side is allowed — a fireball does not check tabards
      // — but the window says so before you commit.
      friendlyFire: !isValidTarget(u, target, ability),
      alsoCaught,
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
  onclickcapture={onClickCapture}
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
      <TileInfo tile={cursorTile} occupant={cursorOccupant} />
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
      <!-- Grows upward from the anchored corner, so the order window below it
           never shifts under the pointer. -->
      {#if aimForecast}
        <Forecast
          target={aimForecast.target}
          data={aimForecast.data}
          abilityName={aimForecast.abilityName}
          friendlyFire={aimForecast.friendlyFire}
          alsoCaught={aimForecast.alsoCaught}
        />
      {/if}

      {#if showCommands && active}
        <CommandMenu
          unit={active}
          phase={battle.phase}
          ability={battle.ability}
          {commands}
          selected={commandIndex}
          onSelect={(i) => (commandIndex = i)}
          onRun={runIndex}
          onCancel={cancel}
          onFacing={handleFacing}
          onPreviewFacing={previewFacing}
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
    <kbd>↑↓</kbd> órdenes · <kbd>flechas</kbd> o <kbd>clic</kbd> elegir casilla ·
    <kbd>Enter</kbd> confirmar · <kbd>1</kbd>…<kbd>0</kbd> órdenes · <kbd>Q</kbd><kbd>E</kbd> girar ·
    <kbd>R</kbd> inclinar · <kbd>C</kbd> centrar · <kbd>rueda</kbd> zoom ·
    <kbd>arrastrar</kbd> desplazar · <kbd>Esc</kbd> cancelar
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
