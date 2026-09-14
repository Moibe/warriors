// Procedural pixel-art sprites.
//
// Nothing here is a file on disk: the fighters are *drawn in code*, from ASCII
// art painted through a per-role palette, with headgear, face paint and weapons
// stamped on top as small overlays.
//
// The hard part of a gang game is the opposite of the usual one. A gang wears
// ONE outfit — that is what makes it a gang — so the nine Warriors cannot be
// told apart by their clothes, and recoloring the uniform would be the wrong
// answer. What varies instead is the person inside it: skin, hair, and what
// each of them has on his head. The vest, the denim and the skull on the back
// stay identical down to the pixel.
//
// Everything is drawn at true pixel scale (a 20×32 canvas, one canvas pixel per
// art pixel) and magnified by the GPU with a nearest-neighbour filter, which is
// what keeps the edges hard instead of the mush you get from upscaling in 2D.

import { CanvasTexture, NearestFilter, SRGBColorSpace, type Texture } from 'three';
import {
  JOBS,
  type FaceId,
  type HatId,
  type JobId,
  type Palette,
  type ProjectileId,
  type WeaponId,
} from './jobs';

/** Sprite sheet cell, in art pixels. Wide enough for hats and drawn weapons. */
export const SPRITE_W = 20;
export const SPRITE_H = 32;

/**
 * World height of a sprite quad, in tile widths. A shade over one tile makes
 * characters read as people standing on the street rather than as chess pieces.
 */
export const SPRITE_WORLD_H = 1.55;
export const SPRITE_WORLD_W = (SPRITE_WORLD_H * SPRITE_W) / SPRITE_H;

export type Pose = 'front' | 'back' | 'down';

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
//   A gang colors  B trim/boots  C trousers  M metal/cap  W wood/leather
//   P headwear  G face paint  F accent (the skull, the pinstripes)
//   (space) = leave transparent

/** Plain street clothes — kept for gangs that are neither of these two. */
const PLAIN_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
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

const PLAIN_BACK = template(BODY_AT.ox, BODY_AT.oy, [
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

/** The Warriors: leather cut open over a bare chest, bare arms, denim. */
const WARRIOR_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
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
  '   OAAASSAAAO   ',
  '  OSAABSSBAASO  ',
  '  OSAABSSBAASO  ',
  '  OSAABSSBAASO  ',
  '  OSOAASSAAOSO  ',
  '   OOAASSAAOO   ',
  '    OBBBBBBO    ',
  '    OCCCCCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '    OBBOOBBO    ',
  '   OBBBOOBBBO   ',
  '   OOOO  OOOO   ',
]);

/** From behind, the cut is closed and the skull rides across the back. */
const WARRIOR_BACK = template(BODY_AT.ox, BODY_AT.oy, [
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
  '  OSAFFFFFFASO  ',
  '  OSAAFFFFAASO  ',
  '  OSAAFOOFAASO  ',
  '  OSOAAFFAAOSO  ',
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

/** The Furies: pinstripes, navy socks, cleats. */
const FURY_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
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
  '  OABABABABAAO  ',
  '  OABABABABAAO  ',
  '  OSBABABABASO  ',
  '  OSOABABAAOSO  ',
  '   OOABABAAOO   ',
  '    OBBBBBBO    ',
  '    OCCCCCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '    OBBOOBBO    ',
  '    OBBOOBBO    ',
  '   OBBBOOBBBO   ',
  '   OOOO  OOOO   ',
]);

const FURY_BACK = template(BODY_AT.ox, BODY_AT.oy, [
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
  '  OABABABABAAO  ',
  '  OABABABABAAO  ',
  '  OSBABABABASO  ',
  '  OSOABABAAOSO  ',
  '   OOABABAAOO   ',
  '    OBBBBBBO    ',
  '    OCCCCCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '    OBBOOBBO    ',
  '    OBBOOBBO    ',
  '   OBBBOOBBBO   ',
  '   OOOO  OOOO   ',
]);

// --- Recoil -----------------------------------------------------------------
// The frame held for a moment after taking a hit: head a row higher with the
// eyes screwed shut and the mouth open, arms flung wide, legs braced apart. The
// raised head is why headgear, face paint and weapons get nudged with it.

const WARRIOR_HURT_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
  '     OOOOOO     ',
  '    OHHHHHHO    ',
  '   OHHHHHHHHO   ',
  '   OHSSSSSSHO   ',
  '   OHSSSSSSHO   ',
  '   OHOOSSOOHO   ',
  '   OHSSSSSSHO   ',
  '    OSSOOSSO    ',
  '     OKKKKO     ',
  '   OAAASSAAAO   ',
  ' OSOAABSSBAAOSO ',
  ' OSOAABSSBAAOSO ',
  '  OAABSSSSBAAO  ',
  '  OAABSSSSBAAO  ',
  '   OOAASSAAOO   ',
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

const WARRIOR_HURT_BACK = template(BODY_AT.ox, BODY_AT.oy, [
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
  ' OSOAFFFFFFAOSO ',
  '  OAAFFFFFFAAO  ',
  '  OAAFOOOOFAAO  ',
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

const FURY_HURT_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
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
  ' OSOABABABAAOSO ',
  ' OSOABABABAAOSO ',
  '  OABABABABAO   ',
  '  OABABABABAO   ',
  '   OOABABAAOO   ',
  '    OBBBBBBO    ',
  '    OCCCCCCO    ',
  '   OCCOOOOCCO   ',
  '   OCCOOOOCCO   ',
  '  OBBOOOOOOBBO  ',
  '  OBBOOOOOOBBO  ',
  '  OBBBOOOOBBBO  ',
  '  OOOO    OOOO  ',
  '                ',
]);

const FURY_HURT_BACK = template(BODY_AT.ox, BODY_AT.oy, [
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
  ' OSOABABABAAOSO ',
  ' OSOABABABAAOSO ',
  '  OABABABABAO   ',
  '  OABABABABAO   ',
  '   OOABABAAOO   ',
  '    OBBBBBBO    ',
  '    OCCCCCCO    ',
  '   OCCOOOOCCO   ',
  '   OCCOOOOCCO   ',
  '  OBBOOOOOOBBO  ',
  '  OBBOOOOOOBBO  ',
  '  OBBBOOOOBBBO  ',
  '  OOOO    OOOO  ',
  '                ',
]);

// ---------------------------------------------------------------------------
// Headgear — stamped over the body. This is most of what tells nine men in the
// same vest apart, so it does a lot of work for very few pixels.
// ---------------------------------------------------------------------------

const HAT_AFRO = template(BODY_AT.ox, BODY_AT.oy - 1, [
  '    OOOOOOOO    ',
  '   OHHHHHHHHO   ',
  '  OHHHHHHHHHHO  ',
  '  OHHHHHHHHHHO  ',
  '  OHH      HHO  ',
  '  OHH      HHO  ',
  '   OHH    HHO   ',
  '    OO    OO    ',
]);

const HAT_BRIM = template(BODY_AT.ox, BODY_AT.oy, [
  '      OOOO      ',
  '     OPPPPO     ',
  '     OPPPPO     ',
  '   OPPPPPPPPO   ',
  '  OPPPPPPPPPPO  ',
  '  OOOOOOOOOOOO  ',
]);

const HAT_BANDANA = template(BODY_AT.ox, BODY_AT.oy + 3, [
  '   OPPPPPPPPO   ',
  '   OPPPPPPPPO   ',
]);

const HAT_CAP = template(BODY_AT.ox, BODY_AT.oy, [
  '      OOOO      ',
  '     OMMMMO     ',
  '    OMMMMMMO    ',
  '   OMMMMMMMMO   ',
  '   OOOOOOOOOOO  ',
]);

const HATS: Record<Exclude<HatId, null>, Template> = {
  afro: HAT_AFRO,
  brim: HAT_BRIM,
  bandana: HAT_BANDANA,
  cap: HAT_CAP,
};

/**
 * The Furies' makeup. It goes on over the face, so the eyes underneath still
 * show through the paint — which is what makes it read as a painted man rather
 * than as a mask.
 */
const FACE_FURY = template(BODY_AT.ox, BODY_AT.oy + 4, [
  '   OGGGGGGGGO   ',
  '   OGFFGGFFGO   ',
  '   OGEEGGEEGO   ',
  '   OGGGGGGGGO   ',
  '    OGGGGGGO    ',
]);

/**
 * The same paint on a face with its eyes shut.
 *
 * An eye does not close by changing colour — `E` and `O` are the same value on
 * screen — it closes by changing *shape*, growing a pixel outward until it
 * meets the edge of the face, which is the rule the recoil frames already use.
 *
 * This also fixes something that was wrong before any of the fallen work: the
 * paint goes on AFTER the body, and `FACE_FURY`'s open eye lands exactly on the
 * row where `FURY_HURT_FRONT` has its eyes screwed shut. All nine of them were
 * taking a bat to the head wide-eyed.
 */
const FACE_FURY_SHUT = template(BODY_AT.ox, BODY_AT.oy + 4, [
  '   OGGGGGGGGO   ',
  '   OGFFGGFFGO   ',
  '   OOOOGGOOOO   ',
  '   OGGGGGGGGO   ',
  '    OGGOOGGO    ',
]);

const FACES: Record<Exclude<FaceId, null>, Template> = {
  fury: FACE_FURY,
};

const FACES_SHUT: Record<Exclude<FaceId, null>, Template> = {
  fury: FACE_FURY_SHUT,
};

// ---------------------------------------------------------------------------
// Weapons — positioned so the grip lands in the right hand (canvas y ≈ 21).
// A weapon belongs to the UNIT, not the role: it can be knocked loose or taken.
// ---------------------------------------------------------------------------

const WEAPON_BAT = template(13, 9, [
  '  OO  ',
  ' OWWO ',
  ' OWWO ',
  ' OWWO ',
  ' OWWO ',
  ' OWWO ',
  ' OWWO ',
  ' OWWO ',
  '  OWO ',
  '  OWO ',
  '  OWO ',
  '  OWO ',
  '  OWO ',
  '  OWO ',
  '  OOO ',
]);

const WEAPON_KNIFE = template(14, 16, [
  ' OOO ',
  ' OMO ',
  ' OMO ',
  ' OMO ',
  'OOOOO',
  ' OWO ',
  ' OWO ',
  ' OOO ',
]);

const WEAPON_PIPE = template(14, 10, [
  ' OOO ',
  ' OMO ',
  ' OMO ',
  ' OMO ',
  ' OMO ',
  ' OMO ',
  ' OMO ',
  ' OMO ',
  ' OWO ',
  ' OWO ',
  ' OWO ',
  ' OOO ',
]);

/**
 * The nickel revolver, and the only thing in the room that shines. Drawn small
 * and held low: at this size a gun has to be read by its outline — barrel,
 * cylinder, grip — because there is no room for a gun to look like anything.
 */
const WEAPON_PISTOL = template(14, 17, [
  ' OOO ',
  ' OMO ',
  'OOMOO',
  'OMMMO',
  'OWMOO',
  'OWWO ',
  ' OOO ',
]);

const WEAPON_CAN = template(14, 17, [
  ' OOO ',
  ' OMO ',
  'OOOOO',
  'OMFMO',
  'OMFMO',
  'OMFMO',
  'OOOOO',
]);

const WEAPONS: Record<Exclude<WeaponId, 'none'>, Template> = {
  bat: WEAPON_BAT,
  knife: WEAPON_KNIFE,
  pipe: WEAPON_PIPE,
  can: WEAPON_CAN,
  pistol: WEAPON_PISTOL,
};

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
 * How far the accessories move to stay attached to the recoil pose: the head
 * rides a row higher and the hands swing up and outward. Without this the cap
 * floats off the skull and the bat hangs in mid-air.
 */
/**
 * Where the head went. The cap and the war paint follow it down and to the left
 * so they stay on the face instead of hovering over the square the man used to
 * occupy. The weapon has no entry because a body does not hold one any more:
 * nine bats drawn upright on the pavement is exactly the clutter this is
 * avoiding, and the unit keeps the weapon in its data either way.
 */
const DOWN_OFFSET = { hat: { dx: -4, dy: 14 }, face: { dx: -4, dy: 14 } };

const RECOIL_OFFSET = {
  hat: { dx: 0, dy: -1 },
  face: { dx: 0, dy: -1 },
  weapon: { dx: 1, dy: -3 },
};

/**
 * A Turnbull A.C. Three things separate him from everyone else on the board
 * without reading a single detail: there is no hairline (the skin runs up over
 * the crown and the nape drops to shadow, which is a shaved head and not a
 * cartoon bald man), there is no neck — the jaw sits straight on the shoulders —
 * and he is the widest silhouette in the game. The vest is buttoned shut, so
 * where a Warrior shows bare chest he shows a dark slab with a sliver of dirty
 * undershirt at the collar.
 */
const TURNBULL_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
  '                ',
  '     OOOOOO     ',
  '    OHHSSHHO    ',
  '   OHHHSSHHHO   ',
  '   OHSSSSSSHO   ',
  '   OHSJSSJSHO   ',
  '   OHSESSESHO   ',
  '   OJSSSSSSJO   ',
  '    OJJSSJJO    ',
  '  OAAAAGGAAAAO  ',
  ' OSKAAAGGAAAKSO ',
  ' OSKAAABBAAAKSO ',
  ' OSKAAABBAAAKSO ',
  ' OSKAAABBAAAKSO ',
  ' OSOAAAAAAAAOSO ',
  '  OOAAAAAAAAOO  ',
  '   OBBBWWBBBO   ',
  '   OCCCCCCCCO   ',
  '   OCCCOOCCCO   ',
  '   OCCCOOCCCO   ',
  '   OBBBOOBBBO   ',
  '   OBBBOOBBBO   ',
  '  OBBBBOOBBBBO  ',
  '  OOOOO  OOOOO  ',
]);

/** From behind, the club patch: the bull's head between the lettering. */
const TURNBULL_BACK = template(BODY_AT.ox, BODY_AT.oy, [
  '                ',
  '     OOOOOO     ',
  '    OHHSSHHO    ',
  '   OHHHSSHHHO   ',
  '   OHHHHHHHHO   ',
  '   OHHHHHHHHO   ',
  '   OHHJJJJHHO   ',
  '   OJJJJJJJJO   ',
  '    OJJJJJJO    ',
  '  OAAAAGGAAAAO  ',
  ' OSKAFFFFFFAKSO ',
  ' OSKAAAAAAAAKSO ',
  ' OSKAFAAAAFAKSO ',
  ' OSKAAFFFFAAKSO ',
  ' OSOAAFOOFAAOSO ',
  '  OOAAAAAAAAOO  ',
  '   OBBBWWBBBO   ',
  '   OCCCCCCCCO   ',
  '   OCCCOOCCCO   ',
  '   OCCCOOCCCO   ',
  '   OBBBOOBBBO   ',
  '   OBBBOOBBBO   ',
  '  OBBBBOOBBBBO  ',
  '  OOOOO  OOOOO  ',
]);


const TURNBULL_HURT_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
  '     OOOOOO     ',
  '    OHHSSHHO    ',
  '   OHHHSSHHHO   ',
  '   OHSSSSSSHO   ',
  '   OHSJSSJSHO   ',
  '   OHOOSSOOHO   ',
  '   OJSSSSSSJO   ',
  '    OJSOOSJO    ',
  '  OAAAAGGAAAAO  ',
  'OSKOAAAGGAAAOKSO',
  'OSKOAAABBAAAOKSO',
  '  OAAAABBAAAAO  ',
  '  OAAAABBAAAAO  ',
  '  OAAAABBAAAAO  ',
  '  OOAAAAAAAAOO  ',
  '   OBBBWWBBBO   ',
  '   OCCCCCCCCO   ',
  '  OCCCOOOOCCCO  ',
  '  OCCCOOOOCCCO  ',
  ' OBBBOOOOOOBBBO ',
  ' OBBBOOOOOOBBBO ',
  'OBBBBOOOOOOBBBBO',
  'OOOOO      OOOOO',
  '                ',
]);


const TURNBULL_HURT_BACK = template(BODY_AT.ox, BODY_AT.oy, [
  '     OOOOOO     ',
  '    OHHSSHHO    ',
  '   OHHHSSHHHO   ',
  '   OHHHHHHHHO   ',
  '   OHHHHHHHHO   ',
  '   OHHJJJJHHO   ',
  '   OJJJJJJJJO   ',
  '    OJJJJJJO    ',
  '  OAAAAGGAAAAO  ',
  'OSKOAFFFFFFAOKSO',
  'OSKOAAAAAAAAOKSO',
  '  OAAFAAAAFAAO  ',
  '  OAAAFFFFAAAO  ',
  '  OAAAFOOFAAAO  ',
  '  OOAAAAAAAAOO  ',
  '   OBBBWWBBBO   ',
  '   OCCCCCCCCO   ',
  '  OCCCOOOOCCCO  ',
  '  OCCCOOOOCCCO  ',
  ' OBBBOOOOOOBBBO ',
  ' OBBBOOOOOOBBBO ',
  'OBBBBOOOOOOBBBBO',
  'OOOOO      OOOOO',
  '                ',
]);

/**
 * An Orphan. The other three gangs are recognised by what they *wear* — a cap,
 * a skull, a gold bull. These have nothing worth wearing, so the silhouette has
 * to carry them instead, and it does it with hair: a bell of it twelve pixels
 * wide falling past the jaw onto the shoulders, so the head is as broad as the
 * body and there is no clean break between them. Nobody else on the board has
 * that outline. The vest is buttoned over an undershirt that shows at the
 * collar and again at the hip — cheap cloth, not leather, and no emblem.
 */
const ORPHAN_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
  '                ',
  '    OOOOOOOO    ',
  '   OHHHHHHHHO   ',
  '  OHHHHHHHHHHO  ',
  '  OHHSSSSSSHHO  ',
  '  OHHSSSSSSHHO  ',
  '  OHHSESSESHHO  ',
  '  OHHJSSSSJHHO  ',
  '   OHHSSSSHHO   ',
  '   OHHOKKOHHO   ',
  '  OHHAAGGAAHHO  ',
  '  OSSAAABAASSO  ',
  '  OSSAAABAASSO  ',
  '  OSSAAABAASSO  ',
  '  OKKAAAAAAKKO  ',
  '   OOAAAAAAOO   ',
  '    OBBBBGGO    ',
  '    OCCCCCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '   OBBBOOBBBO   ',
  '   OOOO  OOOO   ',
]);

/** From behind: their name, painted on by hand. Letters, not an emblem. */
const ORPHAN_BACK = template(BODY_AT.ox, BODY_AT.oy, [
  '                ',
  '    OOOOOOOO    ',
  '   OHHHHHHHHO   ',
  '  OHHHHHHHHHHO  ',
  '  OHHHHHHHHHHO  ',
  '  OHHHHHHHHHHO  ',
  '  OHHJJJJJJHHO  ',
  '  OHHJJJJJJHHO  ',
  '   OHJJJJJJHO   ',
  '   OHHJJJJHHO   ',
  '  OHHAJJJJAHHO  ',
  '  OSSAAAAAASSO  ',
  '  OSSAFFAFASSO  ',
  '  OSSAFFAAASSO  ',
  '  OKKAAAAAAKKO  ',
  '   OOAAAAAAOO   ',
  '    OBBBBGGO    ',
  '    OCCCCCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '    OCCOOCCO    ',
  '   OBBBOOBBBO   ',
  '   OOOO  OOOO   ',
]);

const ORPHAN_HURT_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
  '    OOOOOOOO    ',
  '   OHHHHHHHHO   ',
  '  OHHHHHHHHHHO  ',
  '  OHHSSSSSSHHO  ',
  '  OHHSSSSSSHHO  ',
  '  OHHOOSSOOHHO  ',
  '  OHHJSSSSJHHO  ',
  '   OHHSOOSHHO   ',
  '   OHHOKKOHHO   ',
  '  OHHAAGGAAHHO  ',
  ' OKKOAAABAAOKKO ',
  ' OKKOAAABAAOKKO ',
  '    OAAABAAO    ',
  '    OAAAAAAO    ',
  '    OOAAAAOO    ',
  '    OBBBBGGO    ',
  '    OCCCCCCO    ',
  '   OCCOOOOCCO   ',
  '   OCCOOOOCCO   ',
  '  OCCOOOOOOCCO  ',
  '  OCCOOOOOOCCO  ',
  '  OBBBOOOOBBBO  ',
  '  OOOO    OOOO  ',
  '                ',
]);

const ORPHAN_HURT_BACK = template(BODY_AT.ox, BODY_AT.oy, [
  '    OOOOOOOO    ',
  '   OHHHHHHHHO   ',
  '  OHHHHHHHHHHO  ',
  '  OHHHHHHHHHHO  ',
  '  OHHHHHHHHHHO  ',
  '  OHHJJJJJJHHO  ',
  '  OHHJJJJJJHHO  ',
  '   OHJJJJJJHO   ',
  '   OHHJJJJHHO   ',
  '  OHHAJJJJAHHO  ',
  ' OKKOAAAAAAOKKO ',
  ' OKKOAFFAFAOKKO ',
  '    OAFFAAAO    ',
  '    OAAAAAAO    ',
  '    OOAAAAOO    ',
  '    OBBBBGGO    ',
  '    OCCCCCCO    ',
  '   OCCOOOOCCO   ',
  '   OCCOOOOCCO   ',
  '  OCCOOOOOOCCO  ',
  '  OCCOOOOOOCCO  ',
  '  OBBBOOOOBBBO  ',
  '  OOOO    OOOO  ',
  '                ',
]);


// ---------------------------------------------------------------------------
// The fallen
// ---------------------------------------------------------------------------
//
// A man who goes down stays down, on the square where it happened, for the rest
// of the battle.
//
// The hard part is that these sprites are screen-aligned billboards: they always
// face the camera, so a body cannot actually lie flat. It has to be *drawn*
// lying down. Three rules do the work, and all five gangs obey them so the
// bodies stay interchangeable:
//
//   · The head is not at the top. It sits at the bottom-left with the torso
//     beside it rather than under it, which kills any reading of a man standing
//     or crouching before the eye finishes the silhouette.
//   · Everything below the neck is foreshortened up and to the right, the way a
//     body lying away from this camera actually projects. The head alone stays
//     full size: it is nearest the lens, and it is what carries who this was —
//     which is what will matter the day somebody can be picked back up.
//   · Eyes shut and mouth open, borrowed from the recoil frames. Without it a
//     level head reads as resting rather than out.
//
// The box is wider than it is tall — that proportion is half the message — and
// flush with the bottom of the cell, so the last row of pixels IS the pavement
// and the existing anchoring needs no adjustment at all.

/** Bodies lie in a 20x10 box pinned to the bottom of the sprite cell. */
const DOWN_AT = { ox: 0, oy: 22 };

/** The generic body, and the shape the other four are cut from. */
const PLAIN_DOWN = template(DOWN_AT.ox, DOWN_AT.oy, [
  '                 OBO',
  '   OOOOOO       OBBO',
  '  OHHHHHHO     OCBBO',
  ' OHHHHHHHHO   OCCCCO',
  ' OHSSSSSSHO OBBCCCO ',
  ' OHSSSSSSHOOAAAABBO ',
  ' OHSOSSOSHOOAAAAAO  ',
  ' OHSSSSSSHOOAABAAO  ',
  '  OKSOOSKOOAAAAO    ',
  '   OKKKKO OASSO     ',
]);

/**
 * A Warrior on his back. The winged skull is on the vest's back and this one
 * landed face up, so it is gone — and that is the right trade: an anonymous
 * corpse with a handsome emblem is no use to anybody, while the face and the
 * hair are what will let you pick Cochise out from Fox. What identifies him
 * instead is the other thing only he has: bare skin running up the middle of
 * the torso between the two open edges of the cut.
 */
const WARRIOR_DOWN = template(DOWN_AT.ox, DOWN_AT.oy, [
  '                 OBO',
  '   OOOOOO       OBBO',
  '  OHHHHHHO     OCBBO',
  ' OHHHHHHHHO   OCCCCO',
  ' OHSSSSSSHO OBBCCCO ',
  ' OHSSSSSSHOOABSSBBO ',
  ' OHSOSSOSHOOBSSBAO  ',
  ' OHSSSSSSHOOSSBAAO  ',
  '  OKSOOSKOOSSBAO    ',
  '   OKKKKO OKSSO     ',
]);

/**
 * A Fury on his back. The white face is the brightest thing in the game and it
 * lands low-left, where no standing man ever has a head — on asphalt at night
 * the eye finds that oval before it finds the shape around it. The pinstripes
 * hold the same columns on every row so they stay lines instead of turning into
 * checks.
 */
const FURY_DOWN = template(DOWN_AT.ox, DOWN_AT.oy, [
  '                 OBO',
  '   OOOOOO       OBBO',
  '  OHHHHHHO     OBBBO',
  ' OHHHHHHHHO   OCCBBO',
  ' OHSSSSSSHO OBBCCCO ',
  ' OHSSSSSSHOOBABABBO ',
  ' OHSOSSOSHOOBABABO  ',
  ' OHSSSSSSHOOBABABO  ',
  '  OKSOOSKOOABABO    ',
  '   OKKKKO OASSO     ',
]);

/**
 * A Turnbull on his back, and the only pale head on the ground: his scalp lives
 * in the hair slots, so where the other four gangs land with a dark mass above
 * the face, this one has none. Every band is a pixel wider than the reference —
 * he is still the biggest man on the board lying down. The gold bull is sewn on
 * his back and does not show.
 */
const TURNBULL_DOWN = template(DOWN_AT.ox, DOWN_AT.oy, [
  '                OBBO',
  '   OOOOOO      OBBBO',
  '  OHHSSHHO    OCCBBO',
  ' OHHHSSHHHO  OCCCCCO',
  ' OHSSSSSSHO OBWWCCO ',
  ' OHSJSSJSHOOAAAABBO ',
  ' OHSOSSOSHOOAAABAAO ',
  ' OJSSSSSSJOOAABAAAO ',
  '  OJJOOJJOOGGAAAO   ',
  '   OJJJJO OKSSO     ',
]);

/**
 * An Orphan on his back. The hair is the whole gang's silhouette and it is the
 * one part that does not foreshorten, so their widest feature stays full size
 * while the body compresses: a spill of hair on the pavement with a face inside
 * it. Their hand-painted name is on the back and does not show.
 */
const ORPHAN_DOWN = template(DOWN_AT.ox, DOWN_AT.oy, [
  '                 OBO',
  '  OOOOOOOO      OBBO',
  ' OHHHHHHHHO    OCBBO',
  'OHHHHHHHHHHO  OCCCCO',
  'OHHSSSSSSHHO OBBCCCO',
  'OHHSSSSSSHHOOAAGBBO ',
  'OHHSOSSOSHHOOAAABAO ',
  'OHHJKSSKJHHOOAABAO  ',
  'HOHHKOOKHHOOGAAAO   ',
  'HOHHOKKOHHOGSSO     ',
]);

/**
 * A Lizzie.
 *
 * The other three gangs are a garment repeated nine times — that is what makes
 * them gangs, and it is how you read them across a dark board. These have no
 * shared garment at all, which is the truth about them and a problem for a
 * sprite. So the recognition is carried by the silhouette instead: they are the
 * only people in the game with hair this wide, this much skin showing, and eye
 * makeup where the Furies have war paint. `A` is the one slot that varies from
 * woman to woman here — the board cannot be read by colour in this battle,
 * which is exactly what the room is for.
 */
const LIZZIE_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
  '                ',
  '   OOOOOOOOOO   ',
  '  OHHHHHHHHHHO  ',
  ' OHHHHHHHHHHHHO ',
  '  OHHSSSSSSHHO  ',
  '   OHSGSSGSHO   ',
  '   OHGESSEGHO   ',
  '   OHSSFFSSHO   ',
  '    OSSSSSSO    ',
  '     OFFFFO     ',
  '   OSSSSSSSSO   ',
  '  OSSAAAAAASSO  ',
  '  OSAAAAAAAASO  ',
  '  OSAAAAAAAASO  ',
  '   OKAAAAAAKO   ',
  '    OSAAAASO    ',
  '    OBBBBBBO    ',
  '   OCCCCCCCCO   ',
  '   OCCCOOCCCO   ',
  '    OSSOOSSO    ',
  '    OSSOOSSO    ',
  '    OBBOOBBO    ',
  '   OBBBOOBBBO   ',
  '   OOOO  OOOO   ',
]);

/** From behind: no emblem, no letters. There was never anything to sew on. */
const LIZZIE_BACK = template(BODY_AT.ox, BODY_AT.oy, [
  '                ',
  '   OOOOOOOOOO   ',
  '  OHHHHHHHHHHO  ',
  ' OHHHHHHHHHHHHO ',
  '  OFFFFFFFFFFO  ',
  '   OHHHHHHHHO   ',
  '   OHHJJJJHHO   ',
  '   OHHJJJJHHO   ',
  '    OHJJJJHO    ',
  '     OFFFFO     ',
  '   OSSSSSSSSO   ',
  '  OSSAAAAAASSO  ',
  '  OSAAAAAAAASO  ',
  '  OSAAAAAAAASO  ',
  '   OKAAAAAAKO   ',
  '    OSAAAASO    ',
  '    OBBBBBBO    ',
  '   OCCCCCCCCO   ',
  '   OCCCOOCCCO   ',
  '    OSSOOSSO    ',
  '    OSSOOSSO    ',
  '    OBBOOBBO    ',
  '   OBBBOOBBBO   ',
  '   OOOO  OOOO   ',
]);


const LIZZIE_HURT_FRONT = template(BODY_AT.ox, BODY_AT.oy, [
  '   OOOOOOOOOO   ',
  '  OHHHHHHHHHHO  ',
  ' OHHHHHHHHHHHHO ',
  '  OHHSSSSSSHHO  ',
  '   OHSGSSGSHO   ',
  '   OHGOOOOGHO   ',
  '   OHSSSSSSHO   ',
  '    OFSOOSFO    ',
  '     OFFFFO     ',
  '   OSSSSSSSSO   ',
  ' OSOSAAAAAASOSO ',
  ' OSOSAAAAAASOSO ',
  '  OSAAAAAAAASO  ',
  '   OKAAAAAAKO   ',
  '    OSAAAASO    ',
  '    OBBBBBBO    ',
  '   OCCCCCCCCO   ',
  '  OCCCOOOOCCCO  ',
  '  OSSOOOOOOSSO  ',
  '  OSSOOOOOOSSO  ',
  '  OBBOOOOOOBBO  ',
  '  OBBBOOOOBBBO  ',
  '  OOOO    OOOO  ',
  '                ',
]);


const LIZZIE_HURT_BACK = template(BODY_AT.ox, BODY_AT.oy, [
  '   OOOOOOOOOO   ',
  '  OHHHHHHHHHHO  ',
  ' OHHHHHHHHHHHHO ',
  '  OFFFFFFFFFFO  ',
  '   OHHHHHHHHO   ',
  '   OHHJJJJHHO   ',
  '   OHHJJJJHHO   ',
  '    OHJJJJHO    ',
  '     OFFFFO     ',
  '   OSSSSSSSSO   ',
  ' OSOSAAAAAASOSO ',
  ' OSOSAAAAAASOSO ',
  '  OSAAAAAAAASO  ',
  '   OKAAAAAAKO   ',
  '    OSAAAASO    ',
  '    OBBBBBBO    ',
  '   OCCCCCCCCO   ',
  '  OCCCOOOOCCCO  ',
  '  OSSOOOOOOSSO  ',
  '  OSSOOOOOOSSO  ',
  '  OBBOOOOOOBBO  ',
  '  OBBBOOOOBBBO  ',
  '  OOOO    OOOO  ',
  '                ',
]);

/** Down: the hair spreads and the band stays. It is all she ever wore of theirs. */
const LIZZIE_DOWN = template(DOWN_AT.ox, DOWN_AT.oy, [
  '                OBBO',
  '  OOOOOOOOOO    OBBO',
  ' OHHHHHHHHHHO  OBBBO',
  ' OHFFFFFFFFHO OSSBBO',
  ' OHHSSSSSSHHO OSSCO ',
  '  OHSSSSSSHO OACCCO ',
  '  OHGOSSOGHOOAAAABO ',
  '  OHSSSSSSHOOAAABAO ',
  '   OKSOOSKOOFFAAAO  ',
  '    OKKKKO OKSSO    ',
]);

const BODIES = {
  plain: {
    front: PLAIN_FRONT,
    back: PLAIN_BACK,
    hurtFront: PLAIN_FRONT,
    hurtBack: PLAIN_BACK,
    down: PLAIN_DOWN,
  },
  warrior: {
    front: WARRIOR_FRONT,
    back: WARRIOR_BACK,
    hurtFront: WARRIOR_HURT_FRONT,
    hurtBack: WARRIOR_HURT_BACK,
    down: WARRIOR_DOWN,
  },
  fury: {
    front: FURY_FRONT,
    back: FURY_BACK,
    hurtFront: FURY_HURT_FRONT,
    hurtBack: FURY_HURT_BACK,
    down: FURY_DOWN,
  },
  turnbull: {
    front: TURNBULL_FRONT,
    back: TURNBULL_BACK,
    hurtFront: TURNBULL_HURT_FRONT,
    hurtBack: TURNBULL_HURT_BACK,
    down: TURNBULL_DOWN,
  },
  orphan: {
    front: ORPHAN_FRONT,
    back: ORPHAN_BACK,
    hurtFront: ORPHAN_HURT_FRONT,
    hurtBack: ORPHAN_HURT_BACK,
    down: ORPHAN_DOWN,
  },
  lizzie: {
    front: LIZZIE_FRONT,
    back: LIZZIE_BACK,
    hurtFront: LIZZIE_HURT_FRONT,
    hurtBack: LIZZIE_HURT_BACK,
    down: LIZZIE_DOWN,
  },
} as const;

/** The value a body is mixed toward: the shadow slate the boards are lit with. */
const NIGHT_INK = { r: 0x23, g: 0x2a, b: 0x33 };
/**
 * How far toward it. Measured rather than guessed: at 0.45 a Turnbull vanished
 * outright — his denim is already almost exactly this slate — and the whole
 * gang turned into a dark smear with a face on the end. A body has to sit a
 * step below a man on his feet, not fall off the board.
 */
const NIGHT_MIX = 0.22;

function mixHex(hex: string, toward: { r: number; g: number; b: number }, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round((n >> 16) * (1 - k) + toward.r * k);
  const g = Math.round(((n >> 8) & 255) * (1 - k) + toward.g * k);
  const b = Math.round((n & 255) * (1 - k) + toward.b * k);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/**
 * The palette a fallen man is painted in.
 *
 * Every slot moves toward the night except the outline, which goes the other way
 * and darkens: the silhouette has to hold on grass as well as it holds on
 * asphalt, and it is the line of contact under the head and the hand that keeps
 * the body from reading as part of the pavement.
 */
function nightPalette(p: Palette): Palette {
  const out = {} as Palette;
  for (const key of Object.keys(p) as (keyof Palette)[]) {
    out[key] = mixHex(p[key], NIGHT_INK, NIGHT_MIX);
  }
  out.O = '#0d0b11';
  return out;
}

/**
 * Paints one sprite cell at 1:1 pixel scale.
 *
 * `flip` mirrors the whole cell instead of authoring left-facing art: with two
 * poses — toward and away from the camera — and a horizontal flip we cover the
 * four views the isometric camera can produce.
 */
export function renderUnitCanvas(
  jobId: JobId,
  palette: Palette,
  pose: Pose,
  flip: boolean,
  hurt = false,
  weapon: WeaponId = 'none',
  hat?: HatId
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
  const set = BODIES[job.sprite.body];
  const down = pose === 'down';
  const front = pose === 'front';

  // A body is painted in a lower key than a man on his feet, and by mixing the
  // palette rather than dimming the material: a darkened colour keeps its punch,
  // and eighteen punchy bodies compete with the nine men still fighting. Mixing
  // toward the night takes the punch out and leaves the hue, so a Fury on the
  // ground is still visibly a Fury.
  const ink = down ? nightPalette(palette) : palette;

  const body = down
    ? set.down
    : hurt
      ? front
        ? set.hurtFront
        : set.hurtBack
      : front
        ? set.front
        : set.back;
  const nudge = down ? DOWN_OFFSET : hurt ? RECOIL_OFFSET : null;

  drawTemplate(ctx, body, ink);

  // Paint goes on before the cap, so the brim sits over the forehead.
  if (job.sprite.face && (front || down)) {
    // Eyes shut whenever he is not upright and looking at you.
    const faces = down || hurt ? FACES_SHUT : FACES;
    drawTemplate(ctx, faces[job.sprite.face], ink, nudge?.face.dx ?? 0, nudge?.face.dy ?? 0);
  }
  const worn = hat !== undefined ? hat : job.sprite.hat;
  if (worn) {
    drawTemplate(ctx, HATS[worn], ink, nudge?.hat.dx ?? 0, nudge?.hat.dy ?? 0);
  }
  // Whatever he was holding is on the floor somewhere and no longer matters.
  if (weapon !== 'none' && !down) {
    drawTemplate(ctx, WEAPONS[weapon], ink, RECOIL_OFFSET.weapon.dx * (hurt ? 1 : 0), RECOIL_OFFSET.weapon.dy * (hurt ? 1 : 0));
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
  hurt: boolean,
  weapon: WeaponId,
  hat: HatId | undefined
) {
  const tint = override
    ? Object.entries(override)
        .map(([k, v]) => k + v)
        .sort()
        .join('')
    : '';
  return `${jobId}|${tint}|${pose}|${flip ? 'f' : 'n'}|${hurt ? 'h' : 'r'}|${weapon}|${hat ?? '-'}`;
}

/**
 * A GPU texture for one (role, recolor, pose, flip, hurt, weapon) combination.
 * Cached, since the pose is re-derived whenever the camera turns and a fresh
 * canvas upload per frame would be wasteful.
 */
export function getUnitTexture(
  jobId: JobId,
  override: Partial<Palette> | undefined,
  pose: Pose,
  flip: boolean,
  hurt = false,
  weapon: WeaponId = 'none',
  hat?: HatId
): Texture {
  const key = cacheKey(jobId, override, pose, flip, hurt, weapon, hat);
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = renderUnitCanvas(
    jobId,
    paletteFor(jobId, override),
    pose,
    flip,
    hurt,
    weapon,
    hat
  );
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
// Thrown things
// ---------------------------------------------------------------------------
//
// These do not take a gang's palette. A bottle is glass and a brick is a brick
// whoever throws it, and tinting them by team would say the wrong thing — what
// matters in flight is reading *what* is coming, not who sent it.

/** Art box for a thrown object, in pixels. Square, so it can spin. */
const PROJECTILE_BOX = 10;

/** World size of the quad, in tile widths — a fist-sized thing at this scale. */
export const PROJECTILE_WORLD = 0.52;

const THROWN_COLORS: Record<string, string> = {
  O: '#15111a',
  G: '#3f7a4a', // glass
  L: '#8fd0a0', // where the light catches it
  N: '#2b5637', // the neck, in shadow
  R: '#9c4c37', // fired clay
  D: '#74341f', // its shadowed face
  S: '#c9b9a2', // a fleck of mortar still stuck on
};

const THROWN: Record<ProjectileId, string[]> = {
  bottle: [
    '    OO    ',
    '    ON    ',
    '   OGGO   ',
    '   OGLO   ',
    '  OGGGGO  ',
    '  OGLGGO  ',
    '  OGGGGO  ',
    '  OGGGGO  ',
    '   OOOO   ',
    '          ',
  ],
  brick: [
    '          ',
    '          ',
    '          ',
    ' OOOOOOOO ',
    ' ORRRRRRO ',
    ' ORRDRRSO ',
    ' ODDDDDDO ',
    ' OOOOOOOO ',
    '          ',
    '          ',
  ],
};

const projectileCache = new Map<ProjectileId, Texture>();

export function getProjectileTexture(id: ProjectileId): Texture {
  const cached = projectileCache.get(id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = PROJECTILE_BOX;
  canvas.height = PROJECTILE_BOX;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const rows = THROWN[id];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const color = THROWN_COLORS[rows[r][c]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(c, r, 1, 1);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;
  projectileCache.set(id, texture);
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
  scale = 4,
  hat?: HatId
): string {
  if (typeof document === 'undefined') return '';
  const key = cacheKey(jobId, override, 'front', false, false, 'none', hat) + '|' + scale;
  const cached = portraitCache.get(key);
  if (cached) return cached;

  // Weaponless on purpose: a portrait is a face, and a bat swinging through the
  // frame would crop as a brown bar across it.
  const source = renderUnitCanvas(
    jobId,
    paletteFor(jobId, override),
    'front',
    false,
    false,
    'none',
    hat
  );
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
