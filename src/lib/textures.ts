// Small generated textures: the tile cursor, the highlight panels laid over
// the terrain, unit drop shadows and the floating damage numbers. All painted
// to a canvas at load time so the project ships with no image assets at all.

import { CanvasTexture, LinearFilter, SRGBColorSpace, type Texture } from 'three';

function canvas2d(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')!];
}

function finish(c: HTMLCanvasElement): Texture {
  const t = new CanvasTexture(c);
  t.magFilter = LinearFilter;
  t.minFilter = LinearFilter;
  t.generateMipmaps = false;
  t.colorSpace = SRGBColorSpace;
  return t;
}

let cursorTexture: Texture | null = null;

/**
 * The tile cursor: a bright frame with corner brackets and nothing in the
 * middle, so the terrain underneath stays readable. Drawn white and tinted per
 * use through the material color.
 */
export function getCursorTexture(): Texture {
  if (cursorTexture) return cursorTexture;
  const S = 128;
  const [c, ctx] = canvas2d(S);
  const inset = 6;
  const arm = 34;
  const w = 7;

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(inset, inset, S - inset * 2, S - inset * 2);

  ctx.fillStyle = '#ffffff';
  const corners = [
    [inset, inset, 1, 1],
    [S - inset, inset, -1, 1],
    [inset, S - inset, 1, -1],
    [S - inset, S - inset, -1, -1],
  ] as const;
  for (const [x, y, sx, sy] of corners) {
    ctx.fillRect(Math.min(x, x + sx * arm), Math.min(y, y + sy * w), arm, w);
    ctx.fillRect(Math.min(x, x + sx * w), Math.min(y, y + sy * arm), w, arm);
  }

  cursorTexture = finish(c);
  return cursorTexture;
}

let panelTexture: Texture | null = null;

/**
 * The translucent plate dropped on a tile to mark movement or attack range.
 *
 * The interior is painted GREY and the rim white, which is the whole trick.
 * MeshBasicMaterial multiplies its colour by the texture's RGB, so a grey fill
 * comes out duller than a white rim tinted with the same colour — two
 * brightnesses out of one material and one draw call. Alpha alone could not do
 * it: the rim was already fully opaque and still washed into a fill sitting at
 * 0.78, which is why the outlines barely read.
 */
export function getPanelTexture(): Texture {
  if (panelTexture) return panelTexture;
  const S = 128;
  const [c, ctx] = canvas2d(S);
  const inset = 4;

  ctx.fillStyle = 'rgba(132,132,132,0.5)';
  ctx.fillRect(inset, inset, S - inset * 2, S - inset * 2);

  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = 11;
  ctx.strokeRect(inset + 5, inset + 5, S - inset * 2 - 10, S - inset * 2 - 10);

  panelTexture = finish(c);
  return panelTexture;
}

let shadowTexture: Texture | null = null;

/** Soft round blob under every unit — cheap contact shadow, no shadow maps. */
export function getShadowTexture(): Texture {
  if (shadowTexture) return shadowTexture;
  const S = 64;
  const [c, ctx] = canvas2d(S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  shadowTexture = finish(c);
  return shadowTexture;
}

// ---------------------------------------------------------------------------
// Floating numbers
// ---------------------------------------------------------------------------

export type TextTexture = { texture: Texture; aspect: number };

const textCache = new Map<string, TextTexture>();

/**
 * Damage and healing numbers that pop above a unit. Rendered large and
 * downscaled by the sprite quad, which keeps them sharp at any zoom without
 * needing a bitmap font.
 */
export function getTextTexture(text: string, fill: string, stroke = '#1a1024'): TextTexture {
  const key = text + '|' + fill;
  const cached = textCache.get(key);
  if (cached) return cached;

  const fontSize = 72;
  const pad = 18;
  const probe = document.createElement('canvas').getContext('2d')!;
  const font = `900 ${fontSize}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
  probe.font = font;
  const width = Math.ceil(probe.measureText(text).width) + pad * 2;
  const height = fontSize + pad * 2;

  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d')!;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Chunky dark outline first, then the fill, then a highlight along the top —
  // the three-pass recipe that makes numbers legible over any terrain.
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 12;
  ctx.strokeText(text, width / 2, height / 2);
  ctx.fillStyle = fill;
  ctx.fillText(text, width / 2, height / 2);

  const out = { texture: finish(c), aspect: width / height };
  textCache.set(key, out);
  return out;
}
