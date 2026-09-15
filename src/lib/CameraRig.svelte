<script module lang="ts">
  /**
   * How many azimuths the camera stops at, evenly spaced round the circle.
   *
   * It was FOUR, because that is the vocabulary Final Fantasy Tactics gives
   * the player and because it looked load-bearing: `yawIndex` is what the
   * arrow keys are rotated through to keep pointing the way the player sees,
   * and a quarter-turn ring made that a shift of one. It turned out to be load-
   * bearing in exactly one place and not in the two that were feared.
   *
   *   · THE SPRITES never cared. A unit picks its pose from a dot product
   *     against the LIVE azimuth — `toward` decides front or back, `right`
   *     decides the mirror — so they resolve at any angle and always did.
   *   · THE PROPS never cared either, and the occlusion arithmetic they are
   *     budgeted against is safest away from the diagonal, not nearer it: at
   *     45° a grid step toward the camera is 0.707 of a tile and the sight line
   *     drops 0.408, while face-on it is a whole tile and drops 0.577. The
   *     diagonal is the WORST case and every height table in this project was
   *     already written for it.
   *   · THE ARROW KEYS did care, and they are handled by rounding the azimuth
   *     to the nearest quarter — see `arrowToGrid`.
   *
   * So this is a dial, and eight is a doubling rather than a limit. Raise it
   * and the swing gets smoother and Q/E get slower; the only thing that breaks
   * at any value is nothing.
   */
  export const YAW_STOPS = 8;
  /** Radians per stop. */
  export const YAW_STEP_RAD = (Math.PI * 2) / YAW_STOPS;
</script>

<script lang="ts">
  // The isometric camera.
  //
  // Orthographic, locked to YAW_STOPS azimuths evenly spaced round the circle
  // and two elevations — a wider version of the camera vocabulary Final Fantasy
  // Tactics gives the player, and the same reason its maps can hide things
  // behind cliffs and still be fair: whatever a ledge conceals, a rotation
  // reveals.
  //
  // Every parameter is eased rather than snapped. The swing between angles is
  // most of what makes the camera feel like a camera instead of a cut, and it
  // is most of why more stops feel better: the same easing over a smaller gap
  // reads as a turn rather than as a jump.

  import { T, useTask } from '@threlte/core';
  import { untrack } from 'svelte';
  import type { OrthographicCamera } from 'three';

  let {
    /** Stops from the default view, `YAW_STOPS` to the circle. Unbounded, so
     *  it never wraps. */
    yawIndex = 0,
    /** The raised "look down" angle, toggled the way FFT's R2/L2 do. */
    pitchHigh = false,
    zoom = 46,
    target = { x: 0, y: 0, z: 0 },
    /** Read back by the sprites, which need the azimuth to pick a pose. */
    yaw = $bindable(Math.PI / 4),
  }: {
    yawIndex?: number;
    pitchHigh?: boolean;
    zoom?: number;
    target?: { x: number; y: number; z: number };
    yaw?: number;
  } = $props();

  /** 45° puts tile edges on the screen diagonals — the isometric look. */
  const BASE_YAW = Math.PI / 4;
  const PITCH_LOW = 0.52; // ≈30°, the default three-quarter view
  const PITCH_HIGH = 0.92; // ≈53°, for reading a crowded map
  /** Orthographic, so this only sets the clip range, not the apparent size. */
  const DISTANCE = 45;

  const targetYaw = $derived(BASE_YAW + yawIndex * YAW_STEP_RAD);
  const targetPitch = $derived(pitchHigh ? PITCH_HIGH : PITCH_LOW);

  let camera = $state.raw<OrthographicCamera | undefined>(undefined);

  // Live values chased toward the targets each frame. Seeded once from the
  // initial props — untrack makes that deliberate rather than a stale read.
  let curYaw = untrack(() => targetYaw);
  let curPitch = untrack(() => targetPitch);
  let curZoom = untrack(() => zoom);
  let curX = untrack(() => target.x);
  let curY = untrack(() => target.y);
  let curZ = untrack(() => target.z);

  /** Frame-rate independent exponential ease. */
  function chase(current: number, goal: number, rate: number, dt: number) {
    return current + (goal - current) * (1 - Math.exp(-rate * dt));
  }

  useTask((delta) => {
    const dt = Math.min(delta, 0.05); // a stalled tab shouldn't teleport the view
    curYaw = chase(curYaw, targetYaw, 7, dt);
    curPitch = chase(curPitch, targetPitch, 8, dt);
    curZoom = chase(curZoom, zoom, 9, dt);
    curX = chase(curX, target.x, 9, dt);
    curY = chase(curY, target.y, 9, dt);
    curZ = chase(curZ, target.z, 9, dt);
    yaw = curYaw;

    const cam = camera;
    if (!cam) return;
    const cosPitch = Math.cos(curPitch);
    cam.position.set(
      curX + Math.sin(curYaw) * cosPitch * DISTANCE,
      curY + Math.sin(curPitch) * DISTANCE,
      curZ + Math.cos(curYaw) * cosPitch * DISTANCE
    );
    cam.lookAt(curX, curY, curZ);
    if (Math.abs(cam.zoom - curZoom) > 0.001) {
      cam.zoom = curZoom;
      cam.updateProjectionMatrix();
    }
  });
</script>

<T.OrthographicCamera bind:ref={camera} makeDefault near={0.1} far={200} {zoom} />
