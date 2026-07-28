import type { SnapShotResult } from "./combatResolution";

export const tacticalHitRollEvent = (result: SnapShotResult, targetNumber = result.targetNumber) => `raw 2d6 ${result.hitRoll} · DM ${result.hitModifier >= 0 ? "+" : ""}${result.hitModifier} · total ${result.hitTotal}/${targetNumber}`;
