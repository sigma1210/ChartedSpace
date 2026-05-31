// ─── Stellar data parser and color mapper ────────────────────────────────────
//
// Spectral classification format: "[Class][Subtype] [Luminosity]"
//   e.g. "G2 V", "K3 IV", "M7 II", "D" (white dwarf)
//
// Class order hot→cool: O B A F G K M
// Subtype 0 = hottest end of class, 9 = coolest end (approaching next class)
// world.stellar is string[] — first entry is the primary star

export interface StarColors {
  core: string;   // hottest point — center of texture gradient
  mid: string;    // middle of disc
  limb: string;   // edge of sphere (limb darkening)
  glow: string;   // corona / additive-blended halo sprite
}

export interface PrimaryStar {
  raw: string;
  spectralClass: string;
  subtype: number;
  luminosityClass: string;
  colors: StarColors;
}

// ─── Per-class color anchors at subtype 0 ────────────────────────────────────
// Each entry: [core, mid, limb, glow]
// Subtype 9 of class N is treated as subtype 0 of class N+1.

type RGBA = [number, number, number]; // 0-255

const ANCHORS: Record<string, [RGBA, RGBA, RGBA, RGBA]> = {
  //            core               mid               limb              glow
  O: [[155, 185, 255], [130, 160, 255], [ 90, 110, 220], [120, 160, 255]],
  B: [[190, 210, 255], [170, 195, 255], [140, 170, 240], [160, 200, 255]],
  A: [[220, 230, 255], [205, 218, 255], [180, 198, 250], [200, 220, 255]],
  F: [[255, 252, 230], [255, 245, 200], [240, 220, 170], [255, 240, 180]],
  G: [[255, 248, 180], [255, 220, 100], [220, 140,  40], [255, 200,  60]],
  K: [[255, 200, 120], [255, 160,  60], [200, 100,  20], [255, 140,  40]],
  M: [[255, 140,  60], [220,  80,  20], [160,  30,   5], [230,  80,  10]],
  D: [[200, 220, 255], [180, 205, 255], [160, 190, 250], [170, 200, 255]],
};

// Subtype-9 tail for M (the coolest end before brown dwarfs)
const M_TAIL: [RGBA, RGBA, RGBA, RGBA] = [
  [200, 60, 20], [160, 30, 8], [100, 15, 3], [180, 40, 10],
];

const CLASS_ORDER = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const lerp = (a: number, b: number, t: number) =>
  Math.round(a + (b - a) * t);

const lerpColor = (c1: RGBA, c2: RGBA, t: number): RGBA =>
  [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

const toHex = ([r, g, b]: RGBA) =>
  `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

const interpColors = (
  a: [RGBA, RGBA, RGBA, RGBA],
  b: [RGBA, RGBA, RGBA, RGBA],
  t: number,
): StarColors => ({
  core: toHex(lerpColor(a[0], b[0], t)),
  mid:  toHex(lerpColor(a[1], b[1], t)),
  limb: toHex(lerpColor(a[2], b[2], t)),
  glow: toHex(lerpColor(a[3], b[3], t)),
});

// ─── Physical radius table (solar radii at subtype 0 and subtype 9) ──────────
// Rows: spectral class.  Columns: luminosity class V / IV / II.
// Interpolate linearly across subtype 0→9 within each cell.

const RADIUS_TABLE: Record<string, Record<string, [number, number]>> = {
  //          V              IV           II
  O: { V: [12,   7  ], IV: [20, 12 ], II: [40, 25 ] },
  B: { V: [ 7,   2.5], IV: [12,  5 ], II: [25, 15 ] },
  A: { V: [ 2.5, 1.5], IV: [ 6,  3 ], II: [40, 20 ] },
  F: { V: [ 1.5, 1.1], IV: [ 4,  2 ], II: [30, 15 ] },
  G: { V: [ 1.1, 0.85],IV: [ 3,  1.5], II:[20, 10 ] },
  K: { V: [ 0.85,0.55],IV: [ 2.5,1  ], II:[15,  8 ] },
  M: { V: [ 0.55,0.1 ], IV: [ 1.5,0.5], II:[100,30] },
};

export const physicalRadius = (star: PrimaryStar): number => {
  if (star.spectralClass === 'D') return 0.013; // white dwarf ~Earth-size
  const classEntry = RADIUS_TABLE[star.spectralClass];
  if (!classEntry) return 1;
  const [r0, r9] = classEntry[star.luminosityClass] ?? classEntry['V'] ?? [1, 1];
  return r0 + (r9 - r0) * (star.subtype / 9);
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const DEFAULT_COLORS: StarColors = {
  core: '#fff5a0', mid: '#ffcc00', limb: '#cc2200', glow: '#ff8800',
};

export const parseStar = (raw: string): PrimaryStar | null => {
  if (!raw?.trim()) return null;

  const parts = raw.trim().split(/\s+/);
  const classStr   = parts[0] ?? '';
  const luminosity = parts[1] ?? 'V';

  if (classStr === 'D') {
    return {
      raw,
      spectralClass: 'D',
      subtype: 0,
      luminosityClass: 'D',
      colors: interpColors(ANCHORS.D, ANCHORS.D, 0),
    };
  }

  const spectralClass = classStr[0]?.toUpperCase() ?? '';
  const subtype = parseInt(classStr.slice(1), 10);
  const sub = isNaN(subtype) ? 0 : Math.max(0, Math.min(9, subtype));
  const t = sub / 10;

  const anchorA = ANCHORS[spectralClass];
  if (!anchorA) {
    return {
      raw, spectralClass, subtype: sub, luminosityClass: luminosity,
      colors: DEFAULT_COLORS,
    };
  }

  const nextClass = CLASS_ORDER[CLASS_ORDER.indexOf(spectralClass) + 1];
  const anchorB = spectralClass === 'M' ? M_TAIL : (ANCHORS[nextClass] ?? anchorA);

  return {
    raw,
    spectralClass,
    subtype: sub,
    luminosityClass: luminosity,
    colors: interpColors(anchorA, anchorB, t),
  };
};

export const parseAllStars = (
  stellar: string | string[] | null | undefined,
): PrimaryStar[] => {
  const entries = Array.isArray(stellar) ? stellar : stellar ? [stellar] : [];
  return entries.map(parseStar).filter((s): s is PrimaryStar => s !== null);
};

export const parsePrimaryStar = (
  stellar: string | string[] | null | undefined,
): PrimaryStar | null => parseAllStars(stellar)[0] ?? null;
