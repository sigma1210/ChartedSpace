import { parseStar, physicalRadius, type PrimaryStar } from './stellar';
import { orbitToScene } from './orbitData';
import type { SystemStar } from '../store/selectors/system.selectors';

// ─── Mass estimation (solar masses) ──────────────────────────────────────────
// Interpolated from subtype 0 to 9 within each class.

const MASS_BY_CLASS: Record<string, [number, number]> = {
  O: [40, 16], B: [16, 3],   A: [3, 1.75], F: [1.75, 1.1],
  G: [1.1, 0.85], K: [0.85, 0.5], M: [0.5, 0.08], D: [0.6, 0.6],
};

const LUM_FACTOR: Record<string, number> = { V: 1, IV: 1.3, II: 2.5, D: 1 };

export const deriveMass = (star: PrimaryStar): number => {
  if (star.spectralClass === 'D')  return 0.6;
  if (star.spectralClass === 'BD') return 0.05;
  const [m0, m9] = MASS_BY_CLASS[star.spectralClass] ?? [1, 1];
  const base = m0 + (m9 - m0) * (star.subtype / 9);
  return base * (LUM_FACTOR[star.luminosityClass] ?? 1);
};

// ─── Visual scale constants (Three.js scene units) ───────────────────────────

const BINARY_SEP = 5;     // total distance between binary pair
const OUTER_SEP  = 12;    // distance between inner barycenter and companion
const INNER_ω    = 0.25;  // rad/s — inner binary orbit speed
const OUTER_ω    = 0.055; // rad/s — outer orbit speed
const MIN_VR     = 0.12;  // minimum visual star radius
const MAX_VR     = 0.55;  // maximum visual star radius

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StarSlot {
  star: PrimaryStar;
  mass: number;
  visualRadius: number;
  orbitRadius: number; // scene units from its orbit center
}

export interface SystemLayout {
  type: 'single' | 'binary' | 'trinary';
  slots: StarSlot[];
  // Binary / outer orbit:
  outerAngularVelocity: number;
  // Trinary inner binary:
  innerAngularVelocity: number;
  innerBinaryRadius: number; // inner bary offset from system origin
  companionRadius: number;   // companion offset from system origin
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const visualR = (star: PrimaryStar, maxPhys: number): number => {
  const t = Math.sqrt(physicalRadius(star)) / Math.sqrt(maxPhys);
  return MIN_VR + t * (MAX_VR - MIN_VR);
};

// ─── Layout builders ──────────────────────────────────────────────────────────

const singleLayout = (star: PrimaryStar): SystemLayout => ({
  type: 'single',
  slots: [{ star, mass: deriveMass(star), visualRadius: MAX_VR * 0.8, orbitRadius: 0 }],
  outerAngularVelocity: 0,
  innerAngularVelocity: 0,
  innerBinaryRadius: 0,
  companionRadius: 0,
});

const binaryLayout = (a: PrimaryStar, b: PrimaryStar): SystemLayout => {
  const mA = deriveMass(a);
  const mB = deriveMass(b);
  const total = mA + mB;
  const maxPhys = Math.max(physicalRadius(a), physicalRadius(b));
  return {
    type: 'binary',
    slots: [
      { star: a, mass: mA, visualRadius: visualR(a, maxPhys), orbitRadius: BINARY_SEP * mB / total },
      { star: b, mass: mB, visualRadius: visualR(b, maxPhys), orbitRadius: BINARY_SEP * mA / total },
    ],
    outerAngularVelocity: OUTER_ω,
    innerAngularVelocity: 0,
    innerBinaryRadius: 0,
    companionRadius: 0,
  };
};

const trinaryLayout = (a: PrimaryStar, b: PrimaryStar, c: PrimaryStar): SystemLayout => {
  const mA = deriveMass(a);
  const mB = deriveMass(b);
  const mC = deriveMass(c);
  const mAB   = mA + mB;
  const total = mAB + mC;
  const maxPhys = Math.max(physicalRadius(a), physicalRadius(b), physicalRadius(c));
  return {
    type: 'trinary',
    slots: [
      { star: a, mass: mA, visualRadius: visualR(a, maxPhys), orbitRadius: BINARY_SEP * mB / (mA + mB) },
      { star: b, mass: mB, visualRadius: visualR(b, maxPhys), orbitRadius: BINARY_SEP * mA / (mA + mB) },
      { star: c, mass: mC, visualRadius: visualR(c, maxPhys), orbitRadius: OUTER_SEP  * mAB / total },
    ],
    outerAngularVelocity: OUTER_ω,
    innerAngularVelocity: INNER_ω,
    innerBinaryRadius: OUTER_SEP * mC  / total,
    companionRadius:   OUTER_SEP * mAB / total,
  };
};

// ─── Layout from SystemData ───────────────────────────────────────────────────
// Builds a SystemLayout directly from parsed SystemData.stars[].
// Uses radiusScale from the data for visual sizing instead of re-deriving
// from spectral physics, so canonical overrides (e.g. BD companion) render
// at the correct relative size.

const toSlot = (s: SystemStar, orbitRadius: number, maxScale: number): StarSlot => {
  const parsed = parseStar(s.spectral) ?? parseStar('G2 V')!;
  const t = Math.min(Math.sqrt(s.radiusScale / maxScale), 1.0);
  return {
    star:         parsed,
    mass:         deriveMass(parsed),
    visualRadius: MIN_VR + t * (MAX_VR - MIN_VR),
    orbitRadius,
  };
};

export const buildLayoutFromSystemData = (stars: SystemStar[]): SystemLayout => {
  if (stars.length === 0) return buildSystemLayout(null);

  const maxScale  = Math.max(...stars.map(s => s.radiusScale));
  const primary   = stars.find(s => s.role === 'primary') ?? stars[0];
  const close     = stars.find(s => s.role === 'close-companion');
  const far       = stars.find(s => s.role === 'far-companion');

  if (!close && !far) {
    return {
      type: 'single',
      slots: [toSlot(primary, 0, maxScale)],
      outerAngularVelocity: 0,
      innerAngularVelocity: 0,
      innerBinaryRadius: 0,
      companionRadius: 0,
    };
  }

  const companion = close ?? far!;
  if (!close || !far) {
    const pSlot = toSlot(primary, 0, maxScale);
    const cSlot = toSlot(companion, 0, maxScale);
    const total = pSlot.mass + cSlot.mass;
    // Close companion: use orbitToScene so it matches planet orbit scale.
    // Far companion: keep fixed visual constant — 4900 AU is not literally scaleable.
    const sep = companion.role === 'close-companion'
      ? orbitToScene(companion.orbitId ?? 0)
      : BINARY_SEP;
    return {
      type: 'binary',
      slots: [
        { ...pSlot, orbitRadius: sep * cSlot.mass / total },
        { ...cSlot, orbitRadius: sep * pSlot.mass / total },
      ],
      outerAngularVelocity: OUTER_ω,
      innerAngularVelocity: 0,
      innerBinaryRadius: 0,
      companionRadius: 0,
    };
  }

  // Trinary: primary + close-companion (inner pair) + far-companion (outer).
  // Inner separation driven by close companion's actual orbitId so it sits at
  // the same scale as planet orbits. Outer separation stays a fixed visual constant.
  const pSlot    = toSlot(primary, 0, maxScale);
  const cSlot    = toSlot(close, 0, maxScale);
  const fSlot    = toSlot(far, 0, maxScale);
  const mAB      = pSlot.mass + cSlot.mass;
  const total    = mAB + fSlot.mass;
  const innerSep = orbitToScene(close.orbitId ?? 0);
  return {
    type: 'trinary',
    slots: [
      { ...pSlot, orbitRadius: innerSep * cSlot.mass / (pSlot.mass + cSlot.mass) },
      { ...cSlot, orbitRadius: innerSep * pSlot.mass / (pSlot.mass + cSlot.mass) },
      { ...fSlot, orbitRadius: OUTER_SEP * mAB / total },
    ],
    outerAngularVelocity: OUTER_ω,
    innerAngularVelocity: INNER_ω,
    innerBinaryRadius:    OUTER_SEP * fSlot.mass / total,
    companionRadius:      OUTER_SEP * mAB / total,
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const buildSystemLayout = (
  stellar: string | string[] | null | undefined,
): SystemLayout => {
  const entries = Array.isArray(stellar) ? stellar : stellar ? [stellar] : [];
  const stars   = entries.map(parseStar).filter((s): s is PrimaryStar => s !== null);
  const list    = stars.length > 0 ? stars : [parseStar('G2 V')!];

  if (list.length === 1) return singleLayout(list[0]);
  if (list.length === 2) return binaryLayout(list[0], list[1]);
  return trinaryLayout(list[0], list[1], list[2]);
};
