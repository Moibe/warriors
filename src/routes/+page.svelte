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
    advanceIntro,
    aimHasTarget,
    aimingAtBarrier,
    barrierDamage,
    barrierHpTotal,
    barrierStanding,
    barrierTileHp,
    battle,
    cancel,
    commandList,
    confirmFacing,
    confirmTile,
    cursorCoord,
    heightOf,
    stage as currentStage,
    startStage,
    previewFacing,
    restart,
    runCommand,
    skipIntro,
    stepAimCursor,
    stepMoveCursor,
    upcomingTurns,
  hoveredUnit,
} from '$lib/battle.svelte';
  import { forecast, isValidTarget } from '$lib/combat';
  import { facingTo, tileAt, tileKey, type Coord, type Facing } from '$lib/grid';
  import { tilesInBurst } from '$lib/pathfinding';
  import { fallenAt, isAlive, unitAt, unitById } from '$lib/units';

  import BattleLog from '$lib/ui/BattleLog.svelte';
  import { YAW_STOPS } from '$lib/CameraRig.svelte';
  import CameraControls from '$lib/ui/CameraControls.svelte';
  import CommandMenu from '$lib/ui/CommandMenu.svelte';
  import Forecast from '$lib/ui/Forecast.svelte';
  import Window from '$lib/ui/Window.svelte';
  import IntroDialogue from '$lib/ui/IntroDialogue.svelte';
  import ResultBanner from '$lib/ui/ResultBanner.svelte';
  import StageSelect from '$lib/ui/StageSelect.svelte';
  import { STAGE_LIST, type StageId } from '$lib/stages';
  import EscapeTally from '$lib/ui/EscapeTally.svelte';
  import HeadMark from '$lib/ui/HeadMark.svelte';
  import TileInfo from '$lib/ui/TileInfo.svelte';
  import TurnOrder from '$lib/ui/TurnOrder.svelte';
  import UnitPanel from '$lib/ui/UnitPanel.svelte';

  const APP_VERSION = '1.19.1';

  const stage = $derived(currentStage());
  const map = $derived(stage.map);

  let pickerOpen = $state(false);
  let picker = $state.raw<StageSelect | undefined>(undefined);

  function openPicker() {
    pickerOpen = true;
  }

  function pickStage(id: StageId) {
    pickerOpen = false;
    // The view belongs to the old board: a pan the player nudged and a zoom
    // they chose for a 14-wide park would frame a 16-wide street wrong.
    yawIndex = 0;
    pitchHigh = false;
    pan = { x: 0, y: 0 };
    lastActive = null;
    commandIndex = 0;
    startStage(id);
  }

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

  // ---- Pointer: wheel zoom, drag to pan, middle drag to turn --------------
  //
  // Left and right drag the view; the left button also picks a tile, so the two
  // have to be told apart. A press only becomes a drag once it has travelled
  // DRAG_THRESHOLD pixels; below that it stays a click and reaches the board
  // untouched.
  //
  // THE MIDDLE BUTTON TURNS THE CAMERA, and it turns it in STOPS rather than
  // freely — `YAW_STOPS` of them round the circle, eight at the time of
  // writing. Stops rather than a continuous yaw because `yawIndex` is what the
  // arrow keys are rotated through to keep pointing the way the player sees,
  // and a camera resting between two stops would leave that mapping resting
  // between two answers. The sprites, which were the other reason to fear this,
  // turned out not to care at all: they pick a pose from a dot product against
  // the live azimuth and resolve at any angle.
  //
  // So the drag accumulates and SPENDS itself: every YAW_STEP pixels sideways
  // is one quarter turn, every PITCH_STEP up or down is the raised angle on or
  // off. Keep dragging and it keeps turning, one face at a time. The rig eases
  // between angles anyway, so a fast sweep reads as the camera swinging round
  // rather than as a stack of cuts — which is the same thing Q and E already do
  // and the whole reason the easing is in there.

  // ---- And the division of the three buttons ------------------------------
  //
  //   LEFT    picks a tile, and drags the view.
  //   MIDDLE  drags the camera round, a quarter turn at a time.
  //   RIGHT   cancels, and does nothing else at all.
  //
  // The right button used to drag the view as well, which meant it could only
  // cancel on a press that had NOT travelled — a rule that worked and that
  // nobody should have to know. A button that does one thing needs no rule: it
  // is Esc with a mouse under it, it fires the moment it goes down, and the
  // question "was that a click or a drag?" never comes up for it. The two
  // gestures it gave up are both still there, on the two buttons whose whole
  // job is gestures.

  /** Pixels of travel before a press stops being a click and becomes a drag. */
  const DRAG_THRESHOLD = 5;
  /**
   * Sideways pixels per STOP. Derived from the circle rather than written down,
   * so the distance to drag a full turn stays the same however many stops the
   * camera has: 440 px round, whether that is four faces or eight.
   */
  const YAW_STEP = 440 / YAW_STOPS;
  /** Vertical pixels before the raised angle goes on or comes off. */
  const PITCH_STEP = 90;

  let dragging = $state(false);
  /** A middle-button drag turns the camera instead of sliding it. */
  let turning = $state(false);
  let pressing = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  /** Drag distance banked but not yet spent on a quarter turn / a tilt. */
  let spinX = 0;
  let spinY = 0;
  /** Set when a drag ends, so the click the browser fires next is discarded. */
  let swallowClick = false;
  /**
   * Which button is down, because only the left one owes us a `click`.
   *
   * The middle and right buttons end a drag with `auxclick`, which the capture
   * handler below never sees — so arming the swallow for them leaves it armed,
   * and it goes off on the player's next real click on a tile instead. Harmless
   * while nothing dragged with those buttons; the middle button turning the
   * camera is exactly the thing that makes it happen every time.
   */
  let pressButton = 0;

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 5 : -5);
  }

  function onPointerDown(e: PointerEvent) {
    // The dialogue owns the pointer outright while it is up — its own veil
    // already catches the click that advances it, and letting a drag reach
    // the camera underneath a line nobody has finished reading yet would pan
    // the board behind a screen the player cannot act on anyway.
    if (battle.phase === 'intro') return;

    // RIGHT IS ESC. It never enters the press/drag machine below, so it can
    // never be half a gesture: down, cancelled, done. Returning here is the
    // whole implementation — there is no matching case in `onPointerUp`,
    // because there is nothing left over to finish.
    if (e.button === 2) {
      e.preventDefault();
      cancel();
      return;
    }
    if (e.button !== 0 && e.button !== 1) return;
    // Only the middle button gets its default suppressed: doing it to the left
    // one would interfere with the click we still want to deliver.
    if (e.button !== 0) e.preventDefault();
    pressing = true;
    pressButton = e.button;
    dragging = false;
    turning = e.button === 1;
    swallowClick = false;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    spinX = spinY = 0;
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

    if (turning) {
      // Bank the travel and spend it a quarter turn at a time. `while` rather
      // than `if` so a flick that crosses two steps in one frame turns twice
      // instead of dropping one on the floor.
      spinX += dx;
      while (spinX >= YAW_STEP) {
        spinX -= YAW_STEP;
        rotate(1);
      }
      while (spinX <= -YAW_STEP) {
        spinX += YAW_STEP;
        rotate(-1);
      }
      // Up raises, down lowers — set, never toggled, so the gesture always
      // means the same thing. Dragging further up once it is already raised
      // spends nothing and leaves the banked travel where it is.
      spinY += dy;
      if (spinY <= -PITCH_STEP) {
        spinY = 0;
        pitchHigh = true;
      } else if (spinY >= PITCH_STEP) {
        spinY = 0;
        pitchHigh = false;
      }
      return;
    }

    // Orthographic: one world unit is exactly `zoom` pixels, so this drags the
    // ground under the cursor at 1:1 whatever the zoom level.
    pan = { x: pan.x - dx / zoom, y: pan.y + dy / zoom };
  }

  function onPointerUp(e: PointerEvent) {
    if (!pressing) return;
    pressing = false;
    if (dragging) {
      swallowClick = pressButton === 0;
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
    dragging = false;
    turning = false;
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
   * The camera starts at 45° to the grid, so the four grid axes project to the
   * four screen *diagonals*: at the default view, north runs up-and-right, east
   * down-and-right, and so on. Pressing ↑ therefore has to mean "north", and
   * turning the camera rotates the whole mapping with it.
   *
   * THE ROUNDING IS THE WHOLE OF WHAT MORE THAN FOUR STOPS COSTS. There are
   * only four grid axes and the camera now stops at eight angles, so at half of
   * them "up" falls exactly between two of them and no mapping is more correct
   * than another. Rounding the azimuth to the nearest quarter turn is the
   * honest answer: the arrows follow the camera to the nearest face and stay
   * put across the half-stop either side of it, so a press always lands on the
   * axis the player would have pointed at, and the ambiguity never surfaces as
   * a key that does two different things at the same angle.
   *
   * Keyed off `yawIndex` rather than the live `yaw`, so a press landing in the
   * middle of a rotation animation still resolves to the angle being turned to.
   */
  function arrowToGrid(base: number): Coord {
    const quarter = Math.round((yawIndex * 4) / YAW_STOPS);
    return GRID_DIRS[(((base - quarter) % 4) + 4) % 4];
  }

  function onKeyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();

    // While the picker is up it owns the keyboard outright. Without this the
    // arrows would still be walking the cursor around the board underneath.
    if (pickerOpen) {
      if (k === 'escape') pickerOpen = false;
      else if (k === 'arrowup') picker?.step(-1);
      else if (k === 'arrowdown') picker?.step(1);
      else if (k === 'enter') picker?.confirm();
      else return;
      return e.preventDefault();
    }

    // Same for the dialogue: Enter or Space reads the next line, Escape drops
    // the whole thing, and nothing else this board answers to should reach
    // past it while the clock is still held.
    if (battle.phase === 'intro') {
      if (k === 'escape') skipIntro();
      else if (k === 'enter' || k === ' ') advanceIntro();
      else return;
      return e.preventDefault();
    }

    if (k === 'm') return openPicker();

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
  // are about to step onto is exactly what you need to read.
  const cursor = $derived(cursorCoord());
  const cursorTile = $derived(cursor ? tileAt(map, cursor.x, cursor.y) : null);
  /** Whoever the game cursor is on: the aimed target, or the acting unit. */
  const cursorUnit = $derived(cursor ? unitAt(battle.units, cursor.x, cursor.y) : undefined);
  const cursorOccupant = $derived(cursorUnit?.name);
  /** Whoever the MOUSE is on, which is a different question from the cursor. */
  const hovered = $derived(hoveredUnit());
  // A body holds its square without standing on it: nothing can finish a move
  // there, so calling the tile clear would be a lie the player then walks into.
  const cursorBody = $derived(
    cursor && !cursorOccupant ? fallenAt(battle.units, cursor.x, cursor.y)?.name : undefined
  );
  // The unit window follows the pointer, the way FFT's does.
  //
  // It used to stay pinned to the acting unit, and inspecting anybody else meant
  // reading his row in the turn order, or the one word the terrain window gave
  // you: "Ocupada · Sully". That is not inspecting, that is being told a name in
  // the wrong corner of the screen in seven-point type. The moment a board asked
  // the player to pick ONE enemy out of nine by name - Sully, on the Orphans'
  // block, whose fall turns Mercy - the pinned window stopped being a
  // convenience and became the reason you could not play the rule.
  //
  // So, in order: whoever is under the MOUSE; failing that whoever the game
  // cursor is on, which while aiming is the man you are about to hit; failing
  // that the acting unit. The title says which. Hover your own man and you get
  // him back, so the pinned readout loses nothing that matters, and an enemy's
  // portrait, job and bar become readable for the price of moving the mouse -
  // which is what a mouse is for.
  //
  // The terrain window stays on the game cursor on purpose. A keyboard player
  // choosing a destination needs the height of the square he is about to step
  // onto, not the height of wherever the mouse was left.
  const panelUnit = $derived(hovered ?? cursorUnit ?? active);
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

  // The fence gets its own readout: it has no hit points bar, no angle and no
  // odds, and the unit forecast would have to lie about all three.
  const barrierForecast = $derived.by(() => {
    const ability = battle.ability;
    const u = activeUnit();
    const b = stage.exit?.barrier;
    const aim = battle.aim;
    if (!aimingAtBarrier() || !ability || !u || !b || !aim) return null;
    // THIS TILE'S pool, not the run's total: the swing only ever touches the
    // one square aimed at, so "le quedan" has to answer for that square.
    return {
      label: b.label,
      abilityName: ability.name,
      damage: barrierDamage(u, ability),
      hp: barrierTileHp(aim.x, aim.y),
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
  <title>The Warriors · {stage.name}</title>
</svelte:head>

<svelte:window onkeydown={onKeyDown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="stage"
  class:dragging
  class:turning
  style="--sky-zenith:{stage.sky.zenith}; --sky-upper:{stage.sky.upper}; --sky-lower:{stage.sky.lower}; --sky-horizon:{stage.sky.horizon}; --sky-glow:{stage.sky.glow}"
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
    {#key stage.id}
      <Scene {yawIndex} {pitchHigh} {zoom} {pan} bind:yaw />
    {/key}
  </Canvas>

  <div class="hud">
    <div class="corner top-left">
      <div class="header">
        <button class="stage-name" onclick={openPicker} title="Cambiar de batalla (M)">
          {stage.name}
        </button>
        <p>
          contra {stage.rival}
        </p>
        <p>
          Turno {battle.turn}
          <span class="ver">v{APP_VERSION}</span>
        </p>
      </div>
      <TileInfo tile={cursorTile} occupant={cursorOccupant} body={cursorBody} />
      {#if stage.exit}
        <EscapeTally
          units={battle.units}
          needed={stage.exit.needed}
          label={stage.exit.label}
          barrier={stage.exit.barrier && barrierStanding()
            ? { label: stage.exit.barrier.label, hp: barrierHpTotal(), hpMax: stage.exit.barrier.hp }
            : undefined}
        />
      {/if}
      {#if stage.head}
        <HeadMark unit={unitById(battle.units, stage.head.id)} label={stage.head.label} />
      {/if}
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
          title={panelUnit.id === battle.activeId ? 'En turno' : 'Bajo el cursor'}
        />
      {/if}
    </div>

    <div class="corner bottom-center">
      <BattleLog lines={battle.log} />
    </div>

    <div class="corner bottom-right">
      <!-- Grows upward from the anchored corner, so the order window below it
           never shifts under the pointer. -->
      {#if barrierForecast}
        <Window title="Previsión">
          <p class="fence-line">{barrierForecast.abilityName} → {barrierForecast.label}</p>
          <p class="fence-dmg">{barrierForecast.damage} <span>DAÑO · siempre acierta</span></p>
          <p class="fence-left">Le quedan {barrierForecast.hp}</p>
        </Window>
      {/if}
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
          canConfirm={aimHasTarget()}
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

  {#if battle.intro && !pickerOpen}
    <IntroDialogue />
  {/if}

  {#if battle.winner && !pickerOpen}
    <ResultBanner
      winner={battle.winner}
      outcome={stage.outcome}
      onRestart={restart}
      onChangeStage={openPicker}
    />
  {/if}

  {#if pickerOpen}
    <StageSelect
      bind:this={picker}
      stages={STAGE_LIST}
      currentId={stage.id}
      onPick={pickStage}
      onClose={() => (pickerOpen = false)}
    />
  {/if}

  <p class="keys">
    <kbd>↑↓</kbd> órdenes · <kbd>flechas</kbd> o <kbd>clic</kbd> elegir casilla ·
    <kbd>Enter</kbd> confirmar · <kbd>1</kbd>…<kbd>0</kbd> órdenes · <kbd>Q</kbd><kbd>E</kbd> girar ·
    <kbd>R</kbd> inclinar · <kbd>C</kbd> centrar · <kbd>M</kbd> batalla · <kbd>rueda</kbd> zoom ·
    <kbd>arrastrar</kbd> desplazar · <kbd>botón central</kbd> girar ·
    <kbd>Esc</kbd> o <kbd>derecho</kbd> cancelar
  </p>
</div>

<style>
  /* The fence readout: the unit forecast's voice, minus the odds it has none of. */
  .fence-line {
    font-size: 0.72rem;
    color: #a9c0e6;
    margin: 0 0 0.25rem;
  }

  .fence-dmg {
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1;
    color: #ffe27a;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.75);
    margin: 0 0 0.4rem;
  }

  .fence-dmg span {
    font-size: 0.6rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #93aad2;
    margin-left: 0.3rem;
  }

  .fence-left {
    font-size: 0.7rem;
    color: #ffb35c;
    margin: 0;
  }

  .stage {
    position: fixed;
    inset: 0;
    overflow: hidden;
    /* The sky. Night over the Hudson: deep blue overhead washing out to the
       sodium glow the city throws up along the horizon —
       the canvas above it is transparent, so this is the backdrop the whole
       battlefield sits in. */
    background:
      radial-gradient(120% 60% at 50% 100%, var(--sky-glow, rgba(255, 176, 92, 0.3)), transparent 62%),
      linear-gradient(
        180deg,
        var(--sky-zenith, #070c1c) 0%,
        var(--sky-upper, #111a36) 40%,
        var(--sky-lower, #253356) 72%,
        var(--sky-horizon, #4a4a63) 100%
      );
    cursor: default;
    user-select: none;
  }

  .stage.dragging {
    cursor: grabbing;
  }

  /* Sideways, because that is the axis that does something: the vertical drag
     has only two stops and it finds them in one push. */
  .stage.turning {
    cursor: ew-resize;
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
    /* These two are the only parts of the HUD with no window behind them: they
       sit straight on the sky. That was safe for four battles of navy night and
       stops being safe the morning the sky turns gold, so they carry their own
       ground now rather than trusting a drop shadow picked against dark blue. */
    background: rgba(6, 12, 32, 0.45);
    padding: 0.3rem 0.6rem 0.35rem;
    border-radius: 5px;
    display: inline-block;
  }

  /* A button, but it has to carry the weight the heading used to. The only
     hover tell is the underline: this corner is anchored, and anything that
     changes the element's size under a stationary pointer starts a loop. */
  .header .stage-name {
    display: block;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: 0.03em;
    text-align: left;
    text-shadow: inherit;
    cursor: pointer;
    pointer-events: auto;
  }

  .header .stage-name:hover,
  .header .stage-name:focus-visible {
    color: #ffe27a;
    text-decoration: underline;
    text-underline-offset: 3px;
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
    color: rgba(240, 248, 255, 0.72);
    text-shadow: 0 1px 3px rgba(0, 20, 50, 0.9);
    background: rgba(6, 12, 32, 0.5);
    padding: 0.14rem 0.55rem;
    border-radius: 3px;
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
