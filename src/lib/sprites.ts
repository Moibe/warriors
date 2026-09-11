// Procedural pixel-art sprites.
//
// FFT's characters are hand-drawn 2D sprites standing on a 3D map. We can't
// ship those, so the sprites here are *drawn in code*: a shared humanoid
// silhouette written as ASCII art, painted through a per-job palette, with
// headgear and weapons stamped on top as small overlays. One body template
// plus a handful of 6×16 accessories covers the whole roster, and adding a new
// look is a matter of writing a few more rows of text.
//
// Everything is drawn at true pixel scale (a 20×32 canvas, one canvas pixel per
// art pixel) and magnified by the GPU with a nearest-neighbour filter, which is
// what keeps the edges hard instead of the mush you get from upscaling in 2D.

import { CanvasTexture, NearestFilter, SRGBColorSpace, type Texture } from 'three';
import { JOBS, type HatId, type JobId, type Palette, type WeaponId } from './jobs';

/** Sprite sheet cell, in art pixels. Wide enough for hats and drawn weapons. */
export const SPRITE_W = 20;
export const SPRITE_H = 32;

/**
 * World height of a sprite quad, in tile widths. A shade over one tile makes
 * characters read as people standing on the terrain rather than as chess
 * pieces — the proportion the original uses.
 */
export const SPRITE_WORLD_H = 1.55;
export const SPRITE_WORLD_W = (SPRITE_WORLD_H * SPRITE_W) / SPRITE_H;

export type Pose = 'front' | 'back';

type Template = {
  /** Top-left corner in canvas pixels. */
  ox: number;
  oy: number;
  rows: string[];
};

/** Body art lives in a 16×24 box, centred horizontally, feet on the bottom. */
const BODY_AT = { ox: 2, oy: 8 };

function template(ox: number, oy: number, rows: string[]): Template {
  if (import.meta.env.DEV) {
    const w = rows[0]?.length ?? 0;
    const bad = rows.findIndex((r) => r.length !== w);
    if (bad >= 0) {
      throw new Error(`Sprite template row ${bad} is ${rows[bad].length} wide, expected ${w}`);
    }
  }
  return { ox, oy, rows };
}

// ---------------------------------------------------------------------------
// Bodies
// ---------------------------------------------------------------------------
//   O outline   S skin      K skin shadow  H hair    J hair shadow  E eye
//   A primary   B secondary C cloth        M metal   W wood         P headwear
//   G monster   F accent    (space) = leave transparent

const HUMAN_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
  '                ',
  '     OOOOOO     ',
  '    OHHHHHHO    ',
  '   OHHHHHHHHO   ',
  '   OHSSSSSSHO   ',
  '   OHSSSSSSHO   ',
  '   OHSESSESHO   ',
  '   OHSSSSSSHO   ',
  '    OSSSSSSO    ',
  '     OKKKKO     ',
  '   OAAAAAAAAO   ',
  '  OAAAAAAAAAAO  ',
  '  OAABAAAABAAO  ',
  '  OSABAAAABASO  ',
  '  OSOAAAAAAOSO  ',
  '   OOAAAAAAOO   ',
  '    OBBBBBBO    ',
  '    OCCCCCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '    OBBOOBBO    ',
  '   OBBBOOBBBO   ',
  '   OOOO  OOOO   ',
]);

const HUMAN_BACK = template(BODY_AT.ox, BODY_AT.oy, [
  '                ',
  '     OOOOOO     ',
  '    OHHHHHHO    ',
  '   OHHHHHHHHO   ',
  '   OHHHHHHHHO   ',
  '   OHHHHHHHHO   ',
  '   OHHJJJJHHO   ',
  '   OHHHHHHHHO   ',
  '    OHHHHHHO    ',
  '     OKKKKO     ',
  '   OAAAAAAAAO   ',
  '  OAAAAAAAAAAO  ',
  '  OAAAAAAAAAAO  ',
  '  OSAAAAAAAASO  ',
  '  OSOAAAAAAOSO  ',
  '   OOAAAAAAOO   ',
  '    OBBBBBBO    ',
  '    OCCCCCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '    OBBOOBBO    ',
  '   OBBBOOBBBO   ',
  '   OOOO  OOOO   ',
]);

const MONSTER_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
  '                ',
  '                ',
  '   OO      OO   ',
  '   OGO    OGO   ',
  '   OGGGGGGGGO   ',
  '   OGGGGGGGGO   ',
  '   OGEEGGEEGO   ',
  '   OGGGJJGGGO   ',
  '    OGOOOOGO    ',
  '    OGGGGGGO    ',
  '     OKKKKO     ',
  '   OAAAAAAAAO   ',
  '  OGAAAAAAAAGO  ',
  '  OGAABBBBAAGO  ',
  '  OGOAAAAAAOGO  ',
  '   OOAAAAAAOO   ',
  '    OBBBBBBO    ',
  '    OGGOOGGO    ',
  '    OGGOOGGO    ',
  '    OGGOOGGO    ',
  '   OGGGOOGGGO   ',
  '   OOOO  OOOO   ',
  '                ',
  '                ',
]);

const MONSTER_BACK = template(BODY_AT.ox, BODY_AT.oy, [
  '                ',
  '                ',
  '   OO      OO   ',
  '   OGO    OGO   ',
  '   OGGGGGGGGO   ',
  '   OGGGGGGGGO   ',
  '   OGGGGGGGGO   ',
  '   OGGGJJGGGO   ',
  '    OGGGGGGO    ',
  '    OGGGGGGO    ',
  '     OKKKKO     ',
  '   OAAAAAAAAO   ',
  '  OGAAAAAAAAGO  ',
  '  OGAABBBBAAGO  ',
  '  OGOAAAAAAOGO  ',
  '   OOAAAAAAOO   ',
  '    OBBBBBBO    ',
  '    OGGOOGGO    ',
  '    OGGOOGGO    ',
  '    OGGOOGGO    ',
  '   OGGGOOGGGO   ',
  '   OOOO  OOOO   ',
  '                ',
  '                ',
]);

// --- Recoil -----------------------------------------------------------------
// The frame shown for a moment after taking a hit. Everything is off its
// resting mark: the head rides one row higher with the eyes screwed shut and
// the mouth open, the arms are flung wide, and the legs brace apart. The raised
// head is why headgear and weapons get nudged along with it when drawing.

const HUMAN_HURT_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
  '     OOOOOO     ',
  '    OHHHHHHO    ',
  '   OHHHHHHHHO   ',
  '   OHSSSSSSHO   ',
  '   OHSSSSSSHO   ',
  '   OHOOSSOOHO   ',
  '   OHSSSSSSHO   ',
  '    OSSOOSSO    ',
  '     OKKKKO     ',
  '   OAAAAAAAAO   ',
  ' OSOAAAAAAAAOSO ',
  ' OSOAAAAAAAAOSO ',
  '  OAABAAAABAAO  ',
  '  OAABAAAABAAO  ',
  '   OOAAAAAAOO   ',
  '    OBBBBBBO    ',
  '    OCCCCCCO    ',
  '   OCCOOOOCCO   ',
  '   OCCOOOOCCO   ',
  '  OCCOOOOOOCCO  ',
  '  OBBOOOOOOBBO  ',
  '  OBBBOOOOBBBO  ',
  '  OOOO    OOOO  ',
  '                ',
]);

const HUMAN_HURT_BACK = template(BODY_AT.ox, BODY_AT.oy, [
  '     OOOOOO     ',
  '    OHHHHHHO    ',
  '   OHHHHHHHHO   ',
  '   OHHHHHHHHO   ',
  '   OHHHHHHHHO   ',
  '   OHHJJJJHHO   ',
  '   OHHHHHHHHO   ',
  '    OHHHHHHO    ',
  '     OKKKKO     ',
  '   OAAAAAAAAO   ',
  ' OSOAAAAAAAAOSO ',
  ' OSOAAAAAAAAOSO ',
  '  OAABAAAABAAO  ',
  '  OAABAAAABAAO  ',
  '   OOAAAAAAOO   ',
  '    OBBBBBBO    ',
  '    OCCCCCCO    ',
  '   OCCOOOOCCO   ',
  '   OCCOOOOCCO   ',
  '  OCCOOOOOOCCO  ',
  '  OBBOOOOOOBBO  ',
  '  OBBBOOOOBBBO  ',
  '  OOOO    OOOO  ',
  '                ',
]);

const MONSTER_HURT_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
  '                ',
  '   OO      OO   ',
  '   OGO    OGO   ',
  '   OGGGGGGGGO   ',
  '   OGGGGGGGGO   ',
  '   OGOOGGOOGO   ',
  '   OGGGJJGGGO   ',
  '    OGOOOOGO    ',
  '    OGGGGGGO    ',
  '     OKKKKO     ',
  '   OAAAAAAAAO   ',
  ' OGOAAAAAAAAOGO ',
  ' OGOAAAAAAAAOGO ',
  '  OGAABBBBAAGO  ',
  '   OOAAAAAAOO   ',
  '    OBBBBBBO    ',
  '   OGGOOOOGGO   ',
  '   OGGOOOOGGO   ',
  '  OGGOOOOOOGGO  ',
  '  OGGGOOOOGGGO  ',
  '  OOOO    OOOO  ',
  '                ',
  '                ',
  '                ',
]);

const MONSTER_HURT_BACK = template(BODY_AT.ox, BODY_AT.oy, [
  '                ',
  '   OO      OO   ',
  '   OGO    OGO   ',
  '   OGGGGGGGGO   ',
  '   OGGGGGGGGO   ',
  '   OGGGGGGGGO   ',
  '   OGGGJJGGGO   ',
  '    OGGGGGGO    ',
  '    OGGGGGGO    ',
  '     OKKKKO     ',
  '   OAAAAAAAAO   ',
  ' OGOAAAAAAAAOGO ',
  ' OGOAAAAAAAAOGO ',
  '  OGAABBBBAAGO  ',
  '   OOAAAAAAOO   ',
  '    OBBBBBBO    ',
  '   OGGOOOOGGO   ',
  '   OGGOOOOGGO   ',
  '  OGGOOOOOOGGO  ',
  '  OGGGOOOOGGGO  ',
  '  OOOO    OOOO  ',
  '                ',
  '                ',
  '                ',
]);

// ---------------------------------------------------------------------------
// Headgear — stamped over the body, so a slit or an opening simply leaves the
// face underneath showing through.
// ---------------------------------------------------------------------------

const HAT_HELM = template(BODY_AT.ox, BODY_AT.oy, [
  '       FF       ',
  '     OOOOOO     ',
  '    OMMMMMMO    ',
  '   OMMMMMMMMO   ',
  '   OMMMMMMMMO   ',
  '   OMMMMMMMMO   ',
  '   OM      MO   ', // visor slit — the eyes below show through
  '   OMMMMMMMMO   ',
  '    OMMMMMMO    ',
]);

const HAT_POINTY = template(3, 1, [
  '      OO      ',
  '     OPPO     ',
  '     OPPO     ',
  '    OPPPPO    ',
  '    OPPPPO    ',
  '   OPPPPPPO   ',
  '  OPPPPPPPPO  ',
  ' OPPPPPPPPPPO ',
  ' OOOOOOOOOOOO ',
]);

const HAT_BRIM = template(BODY_AT.ox, BODY_AT.oy, [
  '      OOOO      ',
  '     OPPPPOFF   ', // feather off the side
  '     OPPPPO     ',
  '   OPPPPPPPPO   ',
  '  OPPPPPPPPPPO  ',
  '  OOOOOOOOOOOO  ',
]);

const HAT_HOOD = template(BODY_AT.ox, BODY_AT.oy, [
  '                ',
  '     OOOOOO     ',
  '    OPPPPPPO    ',
  '   OPPPPPPPPO   ',
  '   OPP    PPO   ',
  '   OPP    PPO   ',
  '   OPP    PPO   ',
  '   OPPP  PPPO   ',
  '  OPPPPPPPPPPO  ',
  '  OPPPPPPPPPPO  ',
]);

const HATS: Record<Exclude<HatId, null>, Template> = {
  helm: HAT_HELM,
  pointy: HAT_POINTY,
  brim: HAT_BRIM,
  hood: HAT_HOOD,
};

// ---------------------------------------------------------------------------
// Weapons — positioned so the grip lands in the right hand (canvas y ≈ 21).
// ---------------------------------------------------------------------------

const WEAPON_SWORD = template(13, 9, [
  '  OO  ',
  ' OMMO ',
  ' OMMO ',
  ' OMMO ',
  ' OMMO ',
  ' OMMO ',
  ' OMMO ',
  ' OMMO ',
  ' OMMO ',
  'OOOOOO',
  'OBBBBO',
  'OOOOOO',
  ' OWWO ',
  ' OWWO ',
  ' OBBO ',
  ' OOOO ',
]);

const WEAPON_BOW = template(13, 13, [
  '  OOO ',
  ' OWWO ',
  ' OWO  ',
  'OWWO  ',
  'OWO   ',
  'OWO   ',
  'OWO   ',
  'OWO   ',
  'OWO   ',
  'OWO   ',
  'OWO   ',
  'OWWO  ',
  ' OWO  ',
  ' OWWO ',
  '  OOO ',
]);

const WEAPON_STAFF = template(14, 6, [
  ' OOO ',
  'OMMMO',
  'OMMMO',
  ' OOO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OOO ',
]);

const WEAPON_DAGGER = template(14, 16, [
  ' OOO ',
  ' OMO ',
  ' OMO ',
  ' OMO ',
  'OOOOO',
  ' OWO ',
  ' OWO ',
  ' OOO ',
]);

const WEAPON_CLUB = template(14, 12, [
  ' OOO ',
  'OWWWO',
  'OWWWO',
  'OWWWO',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OOO ',
]);

const WEAPONS: Record<Exclude<WeaponId, 'none'>, Template> = {
  sword: WEAPON_SWORD,
  bow: WEAPON_BOW,
  staff: WEAPON_STAFF,
  dagger: WEAPON_DAGGER,
  club: WEAPON_CLUB,
};

const SHIELD = template(1, 19, [
  ' OOOO ',
  'OBAAAO',
  'OBAAAO',
  'OBAAAO',
  'OBAAAO',
  ' OAAO ',
  ' OAAO ',
  '  OO  ',
]);

// ---------------------------------------------------------------------------
// Painting
// ---------------------------------------------------------------------------

function drawTemplate(
  ctx: CanvasRenderingContext2D,
  tpl: Template,
  palette: Palette,
  dx = 0,
  dy = 0
) {
  const slots = palette as unknown as Record<string, string | undefined>;
  for (let r = 0; r < tpl.rows.length; r++) {
    const row = tpl.rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === ' ') continue;
      const color = slots[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(tpl.ox + c + dx, tpl.oy + r + dy, 1, 1);
    }
  }
}

/**
 * How far headgear, weapon and shield have to move to stay attached to the
 * recoil pose: the head rides a row higher, and the hands swing up and outward.
 * Without this the helmet floats off the skull and the sword hangs in mid-air.
 */
const RECOIL_OFFSET = {
  hat: { dx: 0, dy: -1 },
  weapon: { dx: 1, dy: -3 },
  shield: { dx: -1, dy: -3 },
};

/**
 * Paints one sprite cell at 1:1 pixel scale.
 *
 * `flip` mirrors the whole cell instead of authoring left-facing art: with only
 * two poses (toward and away from the camera) and a horizontal flip we cover
 * the four views the isometric camera can produce.
 */
export function renderUnitCanvas(
  jobId: JobId,
  palette: Palette,
  pose: Pose,
  flip: boolean,
  hurt = false
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  if (flip) {
    ctx.translate(SPRITE_W, 0);
    ctx.scale(-1, 1);
  }

  const job = JOBS[jobId];
  const monster = job.sprite.body === 'monster';
  const front = pose === 'front';
  const body = monster
    ? hurt
      ? front
        ? MONSTER_HURT_FRONT
        : MONSTER_HURT_BACK
      : front
        ? MONSTER_FRONT
        : MONSTER_BACK
    : hurt
      ? front
        ? HUMAN_HURT_FRONT
        : HUMAN_HURT_BACK
      : front
        ? HUMAN_FRONT
        : HUMAN_BACK;

  const nudge = hurt ? RECOIL_OFFSET : null;

  drawTemplate(ctx, body, palette);
  if (job.sprite.shield) {
    drawTemplate(ctx, SHIELD, palette, nudge?.shield.dx ?? 0, nudge?.shield.dy ?? 0);
  }
  if (job.sprite.hat) {
    drawTemplate(ctx, HATS[job.sprite.hat], palette, nudge?.hat.dx ?? 0, nudge?.hat.dy ?? 0);
  }
  if (job.sprite.weapon !== 'none') {
    drawTemplate(
      ctx,
      WEAPONS[job.sprite.weapon],
      palette,
      nudge?.weapon.dx ?? 0,
      nudge?.weapon.dy ?? 0
    );
  }

  return canvas;
}

// ---------------------------------------------------------------------------
// Texture cache
// ---------------------------------------------------------------------------

const textureCache = new Map<string, Texture>();

function paletteFor(jobId: JobId, override?: Partial<Palette>): Palette {
  const base = JOBS[jobId].sprite.palette;
  return override ? { ...base, ...override } : base;
}

function cacheKey(
  jobId: JobId,
  override: Partial<Palette> | undefined,
  pose: Pose,
  flip: boolean,
  hurt: boolean
) {
  const tint = override
    ? Object.entries(override)
        .map(([k, v]) => k + v)
        .sort()
        .join('')
    : '';
  return `${jobId}|${tint}|${pose}|${flip ? 'f' : 'n'}|${hurt ? 'h' : 'r'}`;
}

/**
 * A GPU texture for one (job, recolor, pose, flip) combination. Cached, since a
 * battle re-derives which pose to show every time the camera turns and a fresh
 * canvas upload per frame would be wasteful.
 */
export function getUnitTexture(
  jobId: JobId,
  override: Partial<Palette> | undefined,
  pose: Pose,
  flip: boolean,
  hurt = false
): Texture {
  const key = cacheKey(jobId, override, pose, flip, hurt);
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = renderUnitCanvas(jobId, paletteFor(jobId, override), pose, flip, hurt);
  const texture = new CanvasTexture(canvas);
  // Nearest on both filters is the whole point: hard pixel edges at any zoom.
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}

// ---------------------------------------------------------------------------
// Portraits
// ---------------------------------------------------------------------------

/** Head-and-shoulders crop of the sprite, upscaled for the unit window. */
const PORTRAIT_CROP = { x: 1, y: 5, w: 18, h: 20 };

const portraitCache = new Map<string, string>();

export function getPortraitUrl(
  jobId: JobId,
  override?: Partial<Palette>,
  scale = 4
): string {
  if (typeof document === 'undefined') return '';
  const key = cacheKey(jobId, override, 'front', false, false) + '|' + scale;
  const cached = portraitCache.get(key);
  if (cached) return cached;

  const source = renderUnitCanvas(jobId, paletteFor(jobId, override), 'front', false);
  const out = document.createElement('canvas');
  out.width = PORTRAIT_CROP.w * scale;
  out.height = PORTRAIT_CROP.h * scale;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    source,
    PORTRAIT_CROP.x,
    PORTRAIT_CROP.y,
    PORTRAIT_CROP.w,
    PORTRAIT_CROP.h,
    0,
    0,
    out.width,
    out.height
  );
  const url = out.toDataURL();
  portraitCache.set(key, url);
  return url;
}
