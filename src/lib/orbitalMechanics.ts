// ─── Stellar mass (solar masses) by spectral class ───────────────────────────

const STELLAR_MASS: Record<string, number> = {
  O: 20.0, B: 8.0, A: 2.5, F: 1.4,
  G: 1.0,  K: 0.65, M: 0.25, D: 0.6, BD: 0.05,
};

export const spectralMass = (spectral: string): number => {
  if (spectral === "BD") return STELLAR_MASS.BD;
  if (spectral.startsWith("D")) return STELLAR_MASS.D;
  return STELLAR_MASS[spectral[0] ?? "G"] ?? 1.0;
};

// ─── Kepler's 3rd law ─────────────────────────────────────────────────────────
// period in days = AU^1.5 × 365 / √(stellarMass in solar masses)

export const orbitalPeriodDays = (au: number, stellarMass = 1.0): number =>
  (Math.pow(Math.max(au, 0.001), 1.5) * 365) / Math.sqrt(Math.max(stellarMass, 0.001));

// ─── Imperial calendar ────────────────────────────────────────────────────────

const EPOCH_YEAR        = 1000; // Imperial year 1000, day 1
const GAME_START_YEAR   = 1106; // Imperial year 1106, day 1
const DAYS_PER_TURN     = 14;   // 2 turns per month ≈ 14 days/turn

export const GAME_START_ELAPSED = (GAME_START_YEAR - EPOCH_YEAR) * 365; // 38,690

export const elapsedDaysAtTurn = (currentTurn: number): number =>
  GAME_START_ELAPSED + (currentTurn - 1) * DAYS_PER_TURN;

// ─── Orbital angle at elapsed days ───────────────────────────────────────────
// Returns angle in radians (0 – 2π)

export const epochAngle = (au: number, elapsedDays: number, stellarMass = 1.0): number => {
  const period = orbitalPeriodDays(au, stellarMass);
  return ((2 * Math.PI * elapsedDays) / period) % (2 * Math.PI);
};
