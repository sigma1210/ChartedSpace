import {
  addVector,
  candidateThrusts,
  hexRange,
  sameVector,
  type MaydayEncounter,
  type MaydayScenario,
  type MaydayShip,
  type MaydaySide,
  type MaydayVector,
} from "./maydayRules";

export const grandPrixScenarioId = "grand-prix";

export interface GrandPrixCheckpoint {
  id: "alpha" | "beta" | "gamma" | "delta";
  label: "Alpha" | "Beta" | "Gamma" | "Delta";
  position: MaydayVector;
}

export interface GrandPrixRacerProgress {
  shipId: string;
  side: MaydaySide;
  nextCheckpointIndex: number;
  finished: boolean;
}

export interface GrandPrixState {
  checkpoints: GrandPrixCheckpoint[];
  racers: GrandPrixRacerProgress[];
  weaponsEnabled: boolean;
  winner: MaydaySide | "tie" | null;
}

export interface GrandPrixLegEvent {
  shipId: string;
  side: MaydaySide;
  checkpoint: GrandPrixCheckpoint;
  nextCheckpoint: GrandPrixCheckpoint | null;
}

export interface GrandPrixMarkerState {
  completed: boolean;
  playerTarget: boolean;
  opponentTarget: boolean;
}

export interface GrandPrixLandingPreview {
  currentRange: number;
  projectedRange: number;
  projectedVelocity: MaydayVector;
  status: "approaching" | "landing-confirmed" | "too-fast";
}

export const grandPrixCheckpoints: GrandPrixCheckpoint[] = [
  { id: "alpha", label: "Alpha", position: { q: 0, r: 0 } },
  { id: "beta", label: "Beta", position: { q: 18, r: 0 } },
  { id: "gamma", label: "Gamma", position: { q: 18, r: -18 } },
  { id: "delta", label: "Delta", position: { q: 0, r: -18 } },
  { id: "alpha", label: "Alpha", position: { q: 0, r: 0 } },
];

export const grandPrixScenario: MaydayScenario = {
  id: grandPrixScenarioId,
  label: "Grand Prix",
  detail: "Land at Beta, Gamma, and Delta, then return to Alpha before the opposing racer.",
  objective: { kind: "grand-prix", label: "Complete the Alpha-Beta-Gamma-Delta-Alpha circuit first." },
  encounter: {
    turn: 1,
    ships: [
      { id: "player-racer", name: "Player Racer", side: "player", position: { q: 0, r: 0 }, velocity: { q: 0, r: 0 }, thrustRating: 2, lasers: 0, missiles: 0, sandcasters: 0, sand: 0, targetType: "craft" },
      { id: "opponent-racer", name: "Opponent Racer", side: "opponent", position: { q: 0, r: 0 }, velocity: { q: 0, r: 0 }, thrustRating: 2, lasers: 0, missiles: 0, sandcasters: 0, sand: 0, targetType: "craft" },
    ],
  },
};

export const chooseGrandPrixThrust = (ship: MaydayShip, checkpoint: GrandPrixCheckpoint) => {
  const choices = candidateThrusts(ship.thrustRating);
  return choices.reduce((best, vector) => {
    const velocity = addVector(ship.velocity, vector);
    const position = addVector(ship.position, velocity);
    const distance = hexRange(position, checkpoint.position);
    const speed = hexRange({ q: 0, r: 0 }, velocity);
    const score = distance * 4 + speed;
    return score < best.score ? { vector, score } : best;
  }, { vector: choices[0], score: Number.POSITIVE_INFINITY }).vector;
};

export const createGrandPrixState = (
  encounter: MaydayEncounter,
  weaponsEnabled = false,
): GrandPrixState => ({
  checkpoints: grandPrixCheckpoints.map((checkpoint) => ({
    ...checkpoint,
    position: { ...checkpoint.position },
  })),
  racers: encounter.ships.map((ship) => ({
    shipId: ship.id,
    side: ship.side,
    nextCheckpointIndex: 1,
    finished: false,
  })),
  weaponsEnabled,
  winner: null,
});

export const isGrandPrixLanding = (
  position: MaydayVector,
  velocity: MaydayVector,
  checkpoint: GrandPrixCheckpoint,
) => sameVector(position, checkpoint.position) && velocity.q === 0 && velocity.r === 0;

export const advanceGrandPrixState = (
  state: GrandPrixState,
  encounter: MaydayEncounter,
): GrandPrixState => {
  if (state.winner) return state;

  const racers = state.racers.map((racer) => {
    if (racer.finished) return racer;
    const ship = encounter.ships.find((candidate) => candidate.id === racer.shipId);
    const checkpoint = state.checkpoints[racer.nextCheckpointIndex];
    if (!ship || !checkpoint || !isGrandPrixLanding(ship.position, ship.velocity, checkpoint)) {
      return racer;
    }

    const nextCheckpointIndex = racer.nextCheckpointIndex + 1;
    return {
      ...racer,
      nextCheckpointIndex,
      finished: nextCheckpointIndex >= state.checkpoints.length,
    };
  });

  const finishers = racers.filter((racer) => racer.finished && !state.racers.find(
    (previous) => previous.shipId === racer.shipId,
  )?.finished);
  const winner = finishers.length > 1
    ? "tie"
    : finishers[0]?.side ?? null;

  return { ...state, racers, winner };
};

export const nextGrandPrixCheckpoint = (
  state: GrandPrixState,
  shipId: string,
) => {
  const racer = state.racers.find((candidate) => candidate.shipId === shipId);
  return racer && !racer.finished ? state.checkpoints[racer.nextCheckpointIndex] ?? null : null;
};

export const completedGrandPrixLegs = (
  previous: GrandPrixState,
  next: GrandPrixState,
): GrandPrixLegEvent[] => next.racers.flatMap((racer) => {
  const prior = previous.racers.find((candidate) => candidate.shipId === racer.shipId);
  if (!prior || racer.nextCheckpointIndex <= prior.nextCheckpointIndex) return [];

  const completedIndex = racer.nextCheckpointIndex - 1;
  const checkpoint = next.checkpoints[completedIndex];
  if (!checkpoint) return [];
  return [{
    shipId: racer.shipId,
    side: racer.side,
    checkpoint,
    nextCheckpoint: racer.finished ? null : next.checkpoints[racer.nextCheckpointIndex] ?? null,
  }];
});

export const grandPrixMarkerState = (
  state: GrandPrixState,
  checkpointIndex: number,
): GrandPrixMarkerState => {
  const player = state.racers.find((racer) => racer.side === "player");
  const opponent = state.racers.find((racer) => racer.side === "opponent");
  const targetsMarker = (racer: GrandPrixRacerProgress | undefined) =>
    racer?.nextCheckpointIndex === checkpointIndex
    || (checkpointIndex === 0 && racer?.nextCheckpointIndex === state.checkpoints.length - 1);

  return {
    completed: checkpointIndex === 0 || (player?.nextCheckpointIndex ?? 1) > checkpointIndex,
    playerTarget: targetsMarker(player),
    opponentTarget: targetsMarker(opponent),
  };
};

export const grandPrixLandingPreview = (
  ship: MaydayShip,
  thrust: MaydayVector,
  checkpoint: GrandPrixCheckpoint,
): GrandPrixLandingPreview => {
  const projectedVelocity = addVector(ship.velocity, thrust);
  const projectedPosition = addVector(ship.position, projectedVelocity);
  const projectedRange = hexRange(projectedPosition, checkpoint.position);
  const stopped = projectedVelocity.q === 0 && projectedVelocity.r === 0;

  return {
    currentRange: hexRange(ship.position, checkpoint.position),
    projectedRange,
    projectedVelocity,
    status: projectedRange === 0
      ? stopped ? "landing-confirmed" : "too-fast"
      : "approaching",
  };
};
