import {
  hexRange,
  sameVector,
  subtractVector,
  type MaydayEncounter,
  type MaydayScenario,
} from "./maydayRules";

export const rescueScenarioId = "rescue-intercept";
export const rescueTurnLimit = 15;

export interface RescueResult {
  status: "in-progress" | "success" | "failed";
  range: number | null;
  relativeVelocity: number | null;
  turnsRemaining: number;
  progress: string;
}

export interface RescueDockingProgress {
  matchedTurns: number;
}

export const initialRescueDockingProgress = (): RescueDockingProgress => ({ matchedTurns: 0 });

export const nextRescueDockingProgress = (
  encounter: MaydayEncounter,
  current: RescueDockingProgress,
): RescueDockingProgress => {
  const player = encounter.ships.find((ship) => ship.side === "player");
  const target = encounter.ships.find((ship) => ship.side === "opponent");
  const matched = Boolean(
    player
    && target
    && sameVector(player.position, target.position)
    && sameVector(player.velocity, target.velocity),
  );
  return { matchedTurns: matched ? current.matchedTurns + 1 : 0 };
};

export const rescueDockingResult = (
  encounter: MaydayEncounter,
  progress: RescueDockingProgress,
): RescueResult => {
  const result = rescueResult(encounter);
  if (result.status === "failed") return result;
  if (progress.matchedTurns >= 2) {
    return { ...result, status: "success", progress: "Docking transfer complete" };
  }
  if (progress.matchedTurns === 1) {
    return { ...result, status: "in-progress", progress: "Match established; hold for one more turn" };
  }
  return { ...result, status: "in-progress" };
};

export const rescueScenario: MaydayScenario = {
  id: rescueScenarioId,
  label: "Rescue Intercept",
  detail: "Match position and velocity with a disabled ship before time runs out.",
  objective: {
    kind: "rescue-intercept",
    label: `Match the disabled ship's position and velocity by turn ${rescueTurnLimit}.`,
  },
  encounter: {
    turn: 1,
    ships: [
      {
        id: "rescue-ship",
        name: "Rescue Ship",
        side: "player",
        position: { q: -6, r: 2 },
        velocity: { q: 1, r: 0 },
        thrustRating: 2,
        lasers: 0,
        missiles: 0,
        sandcasters: 0,
        sand: 0,
        targetType: "ship",
      },
      {
        id: "disabled-ship",
        name: "Disabled Ship",
        side: "opponent",
        position: { q: 4, r: -2 },
        velocity: { q: 1, r: -1 },
        thrustRating: 0,
        lasers: 0,
        missiles: 0,
        sandcasters: 0,
        sand: 0,
        targetType: "ship",
        damage: {
          mDriveDisabled: true,
          jDriveDisabled: false,
          weaponsDisabled: true,
          computerDisabled: false,
          detonated: false,
        },
      },
    ],
  },
};

export const rescueResult = (encounter: MaydayEncounter): RescueResult => {
  const player = encounter.ships.find((ship) => ship.side === "player");
  const target = encounter.ships.find((ship) => ship.side === "opponent");
  const turnsRemaining = Math.max(0, rescueTurnLimit - encounter.turn + 1);
  if (!player || !target) {
    return { status: "failed", range: null, relativeVelocity: null, turnsRemaining, progress: "Rescue target unavailable" };
  }

  const range = hexRange(player.position, target.position);
  const relativeVelocity = hexRange(
    { q: 0, r: 0 },
    subtractVector(player.velocity, target.velocity),
  );
  if (sameVector(player.position, target.position) && sameVector(player.velocity, target.velocity)) {
    return { status: "success", range, relativeVelocity, turnsRemaining, progress: "Position and velocity matched" };
  }
  if (encounter.turn > rescueTurnLimit) {
    return { status: "failed", range, relativeVelocity, turnsRemaining: 0, progress: "Rescue window expired" };
  }
  return {
    status: "in-progress",
    range,
    relativeVelocity,
    turnsRemaining,
    progress: `Range ${range}; relative velocity ${relativeVelocity}; ${turnsRemaining} turns remaining`,
  };
};
