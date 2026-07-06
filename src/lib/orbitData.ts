import type { World } from '../types';
import { isAsteroid } from './worldMap';

// ─── Orbit AU distances (index = orbit number 0–20) ──────────────────────────

export const ORBIT_AU = [
  0.2, 0.4, 0.7, 1, 1.6, 2.8, 5.2, 10, 20, 40, 77,
  154, 308, 615, 1230, 2500, 4900, 9800, 19500, 39500, 78700,
];

// ─── Star hz / fao lookup (473 entries from stardata.js) ─────────────────────
// hz = habitable zone orbit number, fao = first available orbit

const STAR_HZ: Record<string, { hz: number; fao: number }> = {
  "O2 Ia": { hz: 14.6, fao: 9 }, "O3 Ia": { hz: 14.1, fao: 8 }, "O4 Ia": { hz: 13.6, fao: 8 },
  "O5 Ia": { hz: 13.4, fao: 8 }, "O6 Ia": { hz: 13.2, fao: 8 }, "O7 Ia": { hz: 13.1, fao: 7 },
  "O8 Ia": { hz: 12.9, fao: 7 }, "O9 Ia": { hz: 12.6, fao: 7 }, "B0 Ia": { hz: 13.3, fao: 8 },
  "B1 Ia": { hz: 13.2, fao: 8 }, "B2 Ia": { hz: 13.1, fao: 8 }, "B3 Ia": { hz: 13.0, fao: 8 },
  "B4 Ia": { hz: 12.8, fao: 8 }, "B5 Ia": { hz: 12.5, fao: 7 }, "B6 Ia": { hz: 12.5, fao: 7 },
  "B7 Ia": { hz: 12.4, fao: 7 }, "B8 Ia": { hz: 12.3, fao: 7 }, "B9 Ia": { hz: 12.2, fao: 7 },
  "A0 Ia": { hz: 12.1, fao: 7 }, "A1 Ia": { hz: 12.1, fao: 7 }, "A2 Ia": { hz: 12.1, fao: 7 },
  "A3 Ia": { hz: 12.0, fao: 7 }, "A4 Ia": { hz: 12.0, fao: 7 }, "A5 Ia": { hz: 11.9, fao: 7 },
  "A6 Ia": { hz: 11.9, fao: 7 }, "A7 Ia": { hz: 11.8, fao: 7 }, "A8 Ia": { hz: 11.8, fao: 7 },
  "A9 Ia": { hz: 11.7, fao: 7 }, "F0 Ia": { hz: 11.7, fao: 6 }, "F1 Ia": { hz: 11.6, fao: 6 },
  "F2 Ia": { hz: 11.6, fao: 6 }, "F3 Ia": { hz: 11.6, fao: 6 }, "F4 Ia": { hz: 11.6, fao: 6 },
  "F5 Ia": { hz: 11.5, fao: 6 }, "F6 Ia": { hz: 11.6, fao: 6 }, "F7 Ia": { hz: 11.6, fao: 6 },
  "F8 Ia": { hz: 11.7, fao: 6 }, "F9 Ia": { hz: 11.7, fao: 6 }, "G0 Ia": { hz: 11.7, fao: 7 },
  "G1 Ia": { hz: 11.8, fao: 7 }, "G2 Ia": { hz: 11.9, fao: 7 }, "G3 Ia": { hz: 11.9, fao: 7 },
  "G4 Ia": { hz: 12.0, fao: 7 }, "G5 Ia": { hz: 12.0, fao: 7 }, "G6 Ia": { hz: 12.0, fao: 7 },
  "G7 Ia": { hz: 12.0, fao: 7 }, "G8 Ia": { hz: 12.1, fao: 7 }, "G9 Ia": { hz: 12.1, fao: 7 },
  "K0 Ia": { hz: 12.1, fao: 7 }, "K1 Ia": { hz: 12.1, fao: 7 }, "K2 Ia": { hz: 12.1, fao: 7 },
  "K3 Ia": { hz: 12.1, fao: 7 }, "K4 Ia": { hz: 12.1, fao: 7 }, "K5 Ia": { hz: 12.1, fao: 7 },
  "K6 Ia": { hz: 12.1, fao: 7 }, "K7 Ia": { hz: 12.1, fao: 7 }, "K8 Ia": { hz: 12.1, fao: 7 },
  "K9 Ia": { hz: 12.2, fao: 7 }, "M0 Ia": { hz: 12.2, fao: 7 }, "M1 Ia": { hz: 12.2, fao: 7 },
  "M2 Ia": { hz: 12.2, fao: 7 }, "M3 Ia": { hz: 12.2, fao: 7 }, "M4 Ia": { hz: 12.2, fao: 7 },
  "M5 Ia": { hz: 12.2, fao: 7 }, "M6 Ia": { hz: 12.2, fao: 8 }, "M7 Ia": { hz: 12.2, fao: 8 },
  "M8 Ia": { hz: 12.3, fao: 8 }, "M9 Ia": { hz: 12.3, fao: 8 },
  "O2 Ib": { hz: 14.6, fao: 9 }, "O3 Ib": { hz: 14.1, fao: 8 }, "O4 Ib": { hz: 13.6, fao: 8 },
  "O5 Ib": { hz: 13.4, fao: 8 }, "O6 Ib": { hz: 13.2, fao: 8 }, "O7 Ib": { hz: 13.1, fao: 7 },
  "O8 Ib": { hz: 12.9, fao: 7 }, "O9 Ib": { hz: 12.6, fao: 7 }, "B0 Ib": { hz: 12.8, fao: 8 },
  "B1 Ib": { hz: 12.6, fao: 8 }, "B2 Ib": { hz: 12.4, fao: 8 }, "B3 Ib": { hz: 12.3, fao: 8 },
  "B4 Ib": { hz: 12.0, fao: 8 }, "B5 Ib": { hz: 11.5, fao: 6 }, "B6 Ib": { hz: 11.4, fao: 6 },
  "B7 Ib": { hz: 11.3, fao: 6 }, "B8 Ib": { hz: 11.1, fao: 6 }, "B9 Ib": { hz: 11.0, fao: 6 },
  "A0 Ib": { hz: 10.7, fao: 5 }, "A1 Ib": { hz: 10.6, fao: 5 }, "A2 Ib": { hz: 10.6, fao: 5 },
  "A3 Ib": { hz: 10.5, fao: 5 }, "A4 Ib": { hz: 10.5, fao: 5 }, "A5 Ib": { hz: 10.5, fao: 5 },
  "A6 Ib": { hz: 10.4, fao: 5 }, "A7 Ib": { hz: 10.4, fao: 5 }, "A8 Ib": { hz: 10.3, fao: 5 },
  "A9 Ib": { hz: 10.2, fao: 5 }, "F0 Ib": { hz: 10.2, fao: 5 }, "F1 Ib": { hz: 10.1, fao: 5 },
  "F2 Ib": { hz: 10.1, fao: 5 }, "F3 Ib": { hz: 10.1, fao: 5 }, "F4 Ib": { hz: 10.0, fao: 5 },
  "F5 Ib": { hz: 9.9, fao: 4 },  "F6 Ib": { hz: 10.0, fao: 4 }, "F7 Ib": { hz: 10.0, fao: 4 },
  "F8 Ib": { hz: 10.1, fao: 4 }, "F9 Ib": { hz: 10.1, fao: 4 }, "G0 Ib": { hz: 10.1, fao: 4 },
  "G1 Ib": { hz: 10.1, fao: 4 }, "G2 Ib": { hz: 10.1, fao: 4 }, "G3 Ib": { hz: 10.2, fao: 4 },
  "G4 Ib": { hz: 10.2, fao: 4 }, "G5 Ib": { hz: 10.2, fao: 5 }, "G6 Ib": { hz: 10.3, fao: 5 },
  "G7 Ib": { hz: 10.3, fao: 5 }, "G8 Ib": { hz: 10.4, fao: 5 }, "G9 Ib": { hz: 10.4, fao: 5 },
  "K0 Ib": { hz: 10.5, fao: 5 }, "K1 Ib": { hz: 10.6, fao: 5 }, "K2 Ib": { hz: 10.7, fao: 5 },
  "K3 Ib": { hz: 10.8, fao: 5 }, "K4 Ib": { hz: 10.8, fao: 5 }, "K5 Ib": { hz: 10.9, fao: 6 },
  "K6 Ib": { hz: 11.1, fao: 6 }, "K7 Ib": { hz: 11.2, fao: 6 }, "K8 Ib": { hz: 11.3, fao: 6 },
  "K9 Ib": { hz: 11.4, fao: 6 }, "M0 Ib": { hz: 11.5, fao: 6 }, "M1 Ib": { hz: 11.6, fao: 6 },
  "M2 Ib": { hz: 11.7, fao: 6 }, "M3 Ib": { hz: 11.8, fao: 6 }, "M4 Ib": { hz: 11.9, fao: 6 },
  "M5 Ib": { hz: 12.0, fao: 7 }, "M6 Ib": { hz: 11.9, fao: 7 }, "M7 Ib": { hz: 12.1, fao: 7 },
  "M8 Ib": { hz: 12.1, fao: 7 }, "M9 Ib": { hz: 12.2, fao: 8 },
  "O2 II": { hz: 14.4, fao: 9 }, "O3 II": { hz: 13.9, fao: 8 }, "O4 II": { hz: 13.5, fao: 8 },
  "O5 II": { hz: 13.3, fao: 8 }, "O6 II": { hz: 13.1, fao: 7 }, "O7 II": { hz: 12.9, fao: 7 },
  "O8 II": { hz: 12.6, fao: 7 }, "O9 II": { hz: 12.5, fao: 7 }, "B0 II": { hz: 12.4, fao: 7 },
  "B1 II": { hz: 12.3, fao: 7 }, "B2 II": { hz: 12.1, fao: 7 }, "B3 II": { hz: 11.9, fao: 7 },
  "B4 II": { hz: 11.5, fao: 7 }, "B5 II": { hz: 10.8, fao: 5 }, "B6 II": { hz: 10.7, fao: 5 },
  "B7 II": { hz: 10.5, fao: 5 }, "B8 II": { hz: 10.3, fao: 5 }, "B9 II": { hz: 10.0, fao: 5 },
  "A0 II": { hz: 9.2, fao: 3 },  "A1 II": { hz: 9.2, fao: 3 },  "A2 II": { hz: 9.1, fao: 3 },
  "A3 II": { hz: 8.9, fao: 3 },  "A4 II": { hz: 8.7, fao: 3 },  "A5 II": { hz: 8.5, fao: 2 },
  "A6 II": { hz: 8.5, fao: 2 },  "A7 II": { hz: 8.4, fao: 2 },  "A8 II": { hz: 8.4, fao: 2 },
  "A9 II": { hz: 8.3, fao: 2 },  "F0 II": { hz: 8.3, fao: 2 },  "F1 II": { hz: 8.3, fao: 2 },
  "F2 II": { hz: 8.2, fao: 2 },  "F3 II": { hz: 8.2, fao: 2 },  "F4 II": { hz: 8.2, fao: 2 },
  "F5 II": { hz: 8.2, fao: 2 },  "F6 II": { hz: 8.2, fao: 2 },  "F7 II": { hz: 8.2, fao: 2 },
  "F8 II": { hz: 8.2, fao: 2 },  "F9 II": { hz: 8.2, fao: 2 },  "G0 II": { hz: 8.2, fao: 2 },
  "G1 II": { hz: 8.3, fao: 2 },  "G2 II": { hz: 8.3, fao: 2 },  "G3 II": { hz: 8.3, fao: 2 },
  "G4 II": { hz: 8.4, fao: 2 },  "G5 II": { hz: 8.4, fao: 2 },  "G6 II": { hz: 8.4, fao: 2 },
  "G7 II": { hz: 8.5, fao: 2 },  "G8 II": { hz: 8.5, fao: 2 },  "G9 II": { hz: 8.5, fao: 2 },
  "K0 II": { hz: 8.5, fao: 2 },  "K1 II": { hz: 8.8, fao: 2 },  "K2 II": { hz: 9.0, fao: 2 },
  "K3 II": { hz: 9.1, fao: 2 },  "K4 II": { hz: 9.2, fao: 2 },  "K5 II": { hz: 9.3, fao: 3 },
  "K6 II": { hz: 9.4, fao: 3 },  "K7 II": { hz: 9.6, fao: 3 },  "K8 II": { hz: 9.7, fao: 3 },
  "K9 II": { hz: 9.8, fao: 3 },  "M0 II": { hz: 9.8, fao: 4 },  "M1 II": { hz: 10.1, fao: 4 },
  "M2 II": { hz: 10.3, fao: 4 }, "M3 II": { hz: 10.4, fao: 4 }, "M4 II": { hz: 10.5, fao: 4 },
  "M5 II": { hz: 10.7, fao: 6 }, "M6 II": { hz: 10.6, fao: 6 }, "M7 II": { hz: 10.7, fao: 6 },
  "M8 II": { hz: 10.7, fao: 6 }, "M9 II": { hz: 10.7, fao: 6 },
  "O2 III": { hz: 14.3, fao: 9 }, "O3 III": { hz: 13.7, fao: 8 }, "O4 III": { hz: 13.4, fao: 8 },
  "O5 III": { hz: 13.2, fao: 8 }, "O6 III": { hz: 13.0, fao: 7 }, "O7 III": { hz: 12.7, fao: 7 },
  "O8 III": { hz: 12.4, fao: 7 }, "O9 III": { hz: 11.8, fao: 6 }, "B0 III": { hz: 12.1, fao: 7 },
  "B1 III": { hz: 12.0, fao: 7 }, "B2 III": { hz: 11.7, fao: 7 }, "B3 III": { hz: 11.5, fao: 7 },
  "B4 III": { hz: 11.1, fao: 7 }, "B5 III": { hz: 10.1, fao: 4 }, "B6 III": { hz: 10.0, fao: 4 },
  "B7 III": { hz: 9.7, fao: 4 },  "B8 III": { hz: 9.4, fao: 4 },  "B9 III": { hz: 9.0, fao: 4 },
  "A0 III": { hz: 7.7, fao: 1 },  "A1 III": { hz: 7.6, fao: 1 },  "A2 III": { hz: 7.5, fao: 1 },
  "A3 III": { hz: 7.3, fao: 1 },  "A4 III": { hz: 7.2, fao: 1 },  "A5 III": { hz: 7.1, fao: 1 },
  "A6 III": { hz: 7.0, fao: 1 },  "A7 III": { hz: 6.9, fao: 1 },  "A8 III": { hz: 6.8, fao: 1 },
  "A9 III": { hz: 6.7, fao: 1 },  "F0 III": { hz: 6.6, fao: 1 },  "F1 III": { hz: 6.5, fao: 1 },
  "F2 III": { hz: 6.5, fao: 1 },  "F3 III": { hz: 6.5, fao: 1 },  "F4 III": { hz: 6.4, fao: 1 },
  "F5 III": { hz: 6.4, fao: 1 },  "F6 III": { hz: 6.4, fao: 1 },  "F7 III": { hz: 6.4, fao: 1 },
  "F8 III": { hz: 6.5, fao: 1 },  "F9 III": { hz: 6.5, fao: 1 },  "G0 III": { hz: 6.5, fao: 1 },
  "G1 III": { hz: 6.6, fao: 1 },  "G2 III": { hz: 6.7, fao: 1 },  "G3 III": { hz: 6.8, fao: 1 },
  "G4 III": { hz: 6.8, fao: 1 },  "G5 III": { hz: 6.9, fao: 1 },  "G6 III": { hz: 7.0, fao: 1 },
  "G7 III": { hz: 7.0, fao: 1 },  "G8 III": { hz: 7.1, fao: 1 },  "G9 III": { hz: 7.1, fao: 1 },
  "K0 III": { hz: 7.2, fao: 1 },  "K1 III": { hz: 7.2, fao: 1 },  "K2 III": { hz: 7.4, fao: 1 },
  "K3 III": { hz: 7.6, fao: 1 },  "K4 III": { hz: 7.7, fao: 1 },  "K5 III": { hz: 7.8, fao: 1 },
  "K6 III": { hz: 7.9, fao: 1 },  "K7 III": { hz: 8.0, fao: 1 },  "K8 III": { hz: 8.1, fao: 1 },
  "K9 III": { hz: 8.1, fao: 1 },  "M0 III": { hz: 8.1, fao: 2 },  "M1 III": { hz: 8.5, fao: 2 },
  "M2 III": { hz: 8.8, fao: 2 },  "M3 III": { hz: 9.0, fao: 2 },  "M4 III": { hz: 9.2, fao: 2 },
  "M5 III": { hz: 9.3, fao: 4 },  "M6 III": { hz: 9.2, fao: 4 },  "M7 III": { hz: 9.3, fao: 4 },
  "M8 III": { hz: 9.4, fao: 4 },  "M9 III": { hz: 9.4, fao: 5 },
  "O2 IV": { hz: 14.1, fao: 8 }, "O3 IV": { hz: 13.5, fao: 8 }, "O4 IV": { hz: 13.2, fao: 8 },
  "O5 IV": { hz: 12.9, fao: 7 }, "O6 IV": { hz: 12.6, fao: 7 }, "O7 IV": { hz: 12.4, fao: 7 },
  "O8 IV": { hz: 12.2, fao: 6 }, "O9 IV": { hz: 11.6, fao: 6 }, "B0 IV": { hz: 11.9, fao: 7 },
  "B1 IV": { hz: 11.7, fao: 7 }, "B2 IV": { hz: 11.5, fao: 7 }, "B3 IV": { hz: 11.2, fao: 7 },
  "B4 IV": { hz: 10.8, fao: 7 }, "B5 IV": { hz: 9.2, fao: 3 },  "B6 IV": { hz: 9.1, fao: 3 },
  "B7 IV": { hz: 8.8, fao: 3 },  "B8 IV": { hz: 8.5, fao: 3 },  "B9 IV": { hz: 8.2, fao: 3 },
  "A0 IV": { hz: 7.3, fao: 1 },  "A1 IV": { hz: 7.2, fao: 1 },  "A2 IV": { hz: 7.1, fao: 1 },
  "A3 IV": { hz: 7.0, fao: 1 },  "A4 IV": { hz: 6.7, fao: 1 },  "A5 IV": { hz: 6.3, fao: 0 },
  "A6 IV": { hz: 6.2, fao: 0 },  "A7 IV": { hz: 6.1, fao: 0 },  "A8 IV": { hz: 6.0, fao: 0 },
  "A9 IV": { hz: 5.9, fao: 0 },  "F0 IV": { hz: 5.7, fao: 0 },  "F1 IV": { hz: 5.6, fao: 0 },
  "F2 IV": { hz: 5.6, fao: 0 },  "F3 IV": { hz: 5.5, fao: 0 },  "F4 IV": { hz: 5.4, fao: 0 },
  "F5 IV": { hz: 5.3, fao: 0 },  "F6 IV": { hz: 5.3, fao: 0 },  "F7 IV": { hz: 5.2, fao: 0 },
  "F8 IV": { hz: 5.1, fao: 0 },  "F9 IV": { hz: 5.0, fao: 0 },  "G0 IV": { hz: 4.8, fao: 0 },
  "G1 IV": { hz: 4.8, fao: 0 },  "G2 IV": { hz: 4.7, fao: 0 },  "G3 IV": { hz: 4.7, fao: 0 },
  "G4 IV": { hz: 4.6, fao: 0 },  "G5 IV": { hz: 4.6, fao: 0 },  "G6 IV": { hz: 4.5, fao: 0 },
  "G7 IV": { hz: 4.5, fao: 0 },  "G8 IV": { hz: 4.5, fao: 0 },  "G9 IV": { hz: 4.5, fao: 0 },
  "K0 IV": { hz: 4.5, fao: 0 },  "K1 IV": { hz: 4.5, fao: 0 },  "K2 IV": { hz: 4.5, fao: 0 },
  "K3 IV": { hz: 4.5, fao: 0 },  "K4 IV": { hz: 4.5, fao: 0 },  "K5 IV": { hz: 4.5, fao: 0 },
  "K6 IV": { hz: 4.5, fao: 0 },  "K7 IV": { hz: 4.5, fao: 0 },  "K8 IV": { hz: 4.5, fao: 0 },
  "K9 IV": { hz: 4.5, fao: 0 },
  "O2 V": { hz: 13.6, fao: 8 }, "O3 V": { hz: 13.3, fao: 8 }, "O4 V": { hz: 12.8, fao: 7 },
  "O5 V": { hz: 12.4, fao: 7 }, "O6 V": { hz: 12.2, fao: 6 }, "O7 V": { hz: 12.1, fao: 6 },
  "O8 V": { hz: 11.8, fao: 6 }, "O9 V": { hz: 11.5, fao: 6 }, "B0 V": { hz: 11.6, fao: 6 },
  "B1 V": { hz: 11.4, fao: 6 }, "B2 V": { hz: 11.3, fao: 6 }, "B3 V": { hz: 11.1, fao: 6 },
  "B4 V": { hz: 10.5, fao: 6 }, "B5 V": { hz: 8.9, fao: 4 },  "B6 V": { hz: 8.7, fao: 4 },
  "B7 V": { hz: 8.5, fao: 4 },  "B8 V": { hz: 8.3, fao: 4 },  "B9 V": { hz: 7.9, fao: 4 },
  "A0 V": { hz: 7.1, fao: 0 },  "A1 V": { hz: 6.9, fao: 0 },  "A2 V": { hz: 6.7, fao: 0 },
  "A3 V": { hz: 6.4, fao: 0 },  "A4 V": { hz: 6.1, fao: 0 },  "A5 V": { hz: 5.5, fao: 0 },
  "A6 V": { hz: 5.5, fao: 0 },  "A7 V": { hz: 5.4, fao: 0 },  "A8 V": { hz: 5.3, fao: 0 },
  "A9 V": { hz: 5.2, fao: 0 },  "F0 V": { hz: 5.1, fao: 0 },  "F1 V": { hz: 4.9, fao: 0 },
  "F2 V": { hz: 4.8, fao: 0 },  "F3 V": { hz: 4.6, fao: 0 },  "F4 V": { hz: 4.5, fao: 0 },
  "F5 V": { hz: 4.3, fao: 0 },  "F6 V": { hz: 4.2, fao: 0 },  "F7 V": { hz: 4.1, fao: 0 },
  "F8 V": { hz: 3.8, fao: 0 },  "F9 V": { hz: 3.5, fao: 0 },  "G0 V": { hz: 3.2, fao: 0 },
  "G1 V": { hz: 3.1, fao: 0 },  "G2 V": { hz: 3.0, fao: 0 },  "G3 V": { hz: 2.8, fao: 0 },
  "G4 V": { hz: 2.6, fao: 0 },  "G5 V": { hz: 2.4, fao: 0 },  "G6 V": { hz: 2.3, fao: 0 },
  "G7 V": { hz: 2.2, fao: 0 },  "G8 V": { hz: 2.1, fao: 0 },  "G9 V": { hz: 2.0, fao: 0 },
  "K0 V": { hz: 1.9, fao: 0 },  "K1 V": { hz: 1.7, fao: 0 },  "K2 V": { hz: 1.5, fao: 0 },
  "K3 V": { hz: 1.2, fao: 0 },  "K4 V": { hz: 0.9, fao: 0 },  "K5 V": { hz: 0.4, fao: 0 },
  "K6 V": { hz: 0.4, fao: 0 },  "K7 V": { hz: 0.3, fao: 0 },  "K8 V": { hz: 0.2, fao: 0 },
  "K9 V": { hz: 0.1, fao: 0 },  "M0 V": { hz: 0, fao: 0 },    "M1 V": { hz: 0, fao: 0 },
  "M2 V": { hz: 0, fao: 0 },    "M3 V": { hz: 0, fao: 0 },    "M4 V": { hz: 0, fao: 0 },
  "M5 V": { hz: 0, fao: 0 },    "M6 V": { hz: 0, fao: 0 },    "M7 V": { hz: 0, fao: 0 },
  "M8 V": { hz: 0, fao: 0 },    "M9 V": { hz: 0, fao: 0 },
  "F5 VI": { hz: 3.0, fao: 0 }, "F6 VI": { hz: 2.8, fao: 0 }, "F7 VI": { hz: 2.5, fao: 0 },
  "F8 VI": { hz: 2.2, fao: 0 }, "F9 VI": { hz: 1.9, fao: 0 }, "G0 VI": { hz: 1.6, fao: 0 },
  "G1 VI": { hz: 1.5, fao: 0 }, "G2 VI": { hz: 1.4, fao: 0 }, "G3 VI": { hz: 1.3, fao: 0 },
  "G4 VI": { hz: 1.2, fao: 0 }, "G5 VI": { hz: 1.1, fao: 0 }, "G6 VI": { hz: 1.1, fao: 0 },
  "G7 VI": { hz: 1.0, fao: 0 }, "G8 VI": { hz: 0.9, fao: 0 }, "G9 VI": { hz: 0.8, fao: 0 },
  "K0 VI": { hz: 0.7, fao: 0 }, "K1 VI": { hz: 0.6, fao: 0 }, "K2 VI": { hz: 0.4, fao: 0 },
  "K3 VI": { hz: 0.3, fao: 0 }, "K4 VI": { hz: 0.1, fao: 0 }, "K5 VI": { hz: 0, fao: 0 },
  "K6 VI": { hz: 0, fao: 0 },   "K7 VI": { hz: 0, fao: 0 },   "K8 VI": { hz: 0, fao: 0 },
  "K9 VI": { hz: 0, fao: 0 },   "M0 VI": { hz: 0, fao: 0 },   "M1 VI": { hz: 0, fao: 0 },
  "M2 VI": { hz: 0, fao: 0 },   "M3 VI": { hz: 0, fao: 0 },   "M4 VI": { hz: 0, fao: 0 },
  "M5 VI": { hz: 0, fao: 0 },   "M6 VI": { hz: 0, fao: 0 },   "M7 VI": { hz: 0, fao: 0 },
  "M8 VI": { hz: 0, fao: 0 },   "M9 VI": { hz: 0, fao: 0 },
  "D": { hz: 0, fao: 0 }, "BD": { hz: 0, fao: 0 }, "B": { hz: 0, fao: 0 },
  "N": { hz: 0, fao: 0 },
};

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export const lookupHz = (starStr: string): number => {
  const s = starStr.trim();
  if (STAR_HZ[s]) return STAR_HZ[s].hz;
  // Try "G2V" → "G2 V"
  const norm = s.replace(/([A-Z]\d)([IVXD]+)$/, '$1 $2');
  return STAR_HZ[norm]?.hz ?? 3;
};

// ─── Scene unit scale ─────────────────────────────────────────────────────────
// Linear in orbit number (not AU) so inner and outer orbits are both visible.

export const orbitToScene = (orbitNum: number): number =>
  Math.max(1.2, 1.5 + orbitNum * 1.3);

// ─── Seeded deterministic RNG (xorshift32 from world hex) ────────────────────

const hexHash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h || 1;
};

export const seededRng = (hex: string): (() => number) => {
  let seed = hexHash(hex);
  return () => {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0xFFFFFFFF;
  };
};

// ─── World placement types ────────────────────────────────────────────────────

export type WorldBodyType = 'mainWorld' | 'gasGiant' | 'belt' | 'otherWorld';

export interface WorldPlacement {
  type:        WorldBodyType;
  orbitNum:    number;
  sceneRadius: number;
  angle0:      number; // initial angle (radians)
  label?:      string;
  isMainWorld?: boolean;
  satellite?:  { moonRadius: number }; // gas giant hosting the main world as a moon
}

// ─── Build placements ─────────────────────────────────────────────────────────

export const buildWorldPlacements = (world: World): WorldPlacement[] => {
  const stellar  = Array.isArray(world.stellar) ? world.stellar : world.stellar ? [world.stellar] : [];
  const primary  = stellar[0] ?? 'G2 V';
  const hz       = lookupHz(primary);
  const hzOrbit  = Math.max(1, Math.round(hz));

  const gasCount  = typeof world.pbg === 'object' ? world.pbg.gasGiants : 0;
  const beltCount = typeof world.pbg === 'object' ? world.pbg.belts     : 0;

  const rng       = seededRng(world.hex);
  const used      = new Set<number>();
  const result: WorldPlacement[] = [];

  const place = (orbitNum: number): number => {
    let o = orbitNum;
    while (used.has(o)) o++;
    used.add(o);
    return o;
  };

  // Main world at hz orbit (±1 seeded variation, avoids 0)
  const mainOrbit = place(Math.max(1, hzOrbit + Math.round((rng() - 0.5) * 2)));
  const mainIsAsteroid = isAsteroid(world);
  result.push({
    type: mainIsAsteroid ? 'belt' : 'mainWorld',
    orbitNum: mainOrbit,
    sceneRadius: orbitToScene(mainOrbit),
    angle0: rng() * Math.PI * 2,
    label: world.name,
    isMainWorld: true,
  });

  // Inner asteroid belt (if any) — orbit 2 or near fao
  if (beltCount > 0) {
    const bOrbit = place(Math.max(1, Math.min(mainOrbit - 1, 2)));
    result.push({ type: 'belt', orbitNum: bOrbit, sceneRadius: orbitToScene(bOrbit), angle0: 0, isMainWorld: false });
  }
  if (beltCount > 1) {
    const bOrbit = place(mainOrbit + 3 + Math.round(rng()));
    result.push({ type: 'belt', orbitNum: bOrbit, sceneRadius: orbitToScene(bOrbit), angle0: 0, isMainWorld: false });
  }

  // Gas giants — start 2 orbits beyond main world
  const ggBase = mainOrbit + 2;
  for (let i = 0; i < Math.min(gasCount, 5); i++) {
    const ggOrbit = place(ggBase + i);
    result.push({
      type: 'gasGiant',
      orbitNum: ggOrbit,
      sceneRadius: orbitToScene(ggOrbit),
      angle0: rng() * Math.PI * 2,
    });
  }

  // Remaining worlds — fill slots around hz
  const otherCount = Math.max(0, world.worldsInSystem - 1 - Math.min(gasCount, 5) - beltCount);
  for (let i = 0; i < Math.min(otherCount, 4); i++) {
    const cand = hzOrbit - 1 - i;
    if (cand >= 1) {
      const oOrbit = place(cand);
      result.push({
        type: 'otherWorld',
        orbitNum: oOrbit,
        sceneRadius: orbitToScene(oOrbit),
        angle0: rng() * Math.PI * 2,
      });
    }
  }

  return result;
};
