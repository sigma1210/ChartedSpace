import {
  advanceGrandPrixState,
  chooseGrandPrixThrust,
  completedGrandPrixLegs,
  createGrandPrixState,
  grandPrixCheckpoints,
  isGrandPrixLanding,
  nextGrandPrixCheckpoint,
  grandPrixScenario,
  grandPrixMarkerState,
  grandPrixLandingPreview,
} from "../grandPrixRules";
import type { MaydayEncounter, MaydayShip } from "../maydayRules";

const ship = (id: string, side: "player" | "opponent"): MaydayShip => ({
  id,
  name: id,
  side,
  position: { q: 0, r: 0 },
  velocity: { q: 0, r: 0 },
  thrustRating: 1,
  lasers: 0,
  targetType: "craft",
});

const encounter = (ships = [ship("player", "player"), ship("opponent", "opponent")]): MaydayEncounter => ({
  turn: 1,
  ships,
});

describe("grandPrixRules", () => {
  it("provides a selectable movement-only Grand Prix scenario", () => {
    expect(grandPrixScenario).toMatchObject({
      id: "grand-prix",
      label: "Grand Prix",
      objective: { kind: "grand-prix" },
    });
    expect(grandPrixScenario.encounter.ships.every((racer) => racer.lasers === 0 && racer.missiles === 0)).toBe(true);
  });

  it("starts each racer at Beta with weapons disabled", () => {
    const state = createGrandPrixState(encounter());

    expect(state.weaponsEnabled).toBe(false);
    expect(state.winner).toBeNull();
    expect(nextGrandPrixCheckpoint(state, "player")?.label).toBe("Beta");
  });

  it("requires the racer to stop on the checkpoint hex", () => {
    const beta = grandPrixCheckpoints[1];

    expect(isGrandPrixLanding(beta.position, { q: 1, r: 0 }, beta)).toBe(false);
    expect(isGrandPrixLanding({ q: 17, r: 0 }, { q: 0, r: 0 }, beta)).toBe(false);
    expect(isGrandPrixLanding(beta.position, { q: 0, r: 0 }, beta)).toBe(true);
  });

  it("advances only the next ordered checkpoint", () => {
    const state = createGrandPrixState(encounter());
    const player = ship("player", "player");
    player.position = grandPrixCheckpoints[2].position;

    const skipped = advanceGrandPrixState(state, encounter([player]));
    expect(nextGrandPrixCheckpoint(skipped, player.id)?.label).toBe("Beta");

    player.position = grandPrixCheckpoints[1].position;
    const landed = advanceGrandPrixState(skipped, encounter([player]));
    expect(nextGrandPrixCheckpoint(landed, player.id)?.label).toBe("Gamma");
  });

  it("awards the race after Delta and the return landing at Alpha", () => {
    let state = createGrandPrixState(encounter());
    const player = ship("player", "player");

    for (const checkpoint of grandPrixCheckpoints.slice(1)) {
      player.position = checkpoint.position;
      state = advanceGrandPrixState(state, encounter([player]));
    }

    expect(state.winner).toBe("player");
    expect(state.racers.find((racer) => racer.shipId === player.id)?.finished).toBe(true);
    expect(nextGrandPrixCheckpoint(state, player.id)).toBeNull();
  });

  it("supports the optional weapons setting", () => {
    expect(createGrandPrixState(encounter(), true).weaponsEnabled).toBe(true);
  });

  it("chooses opponent thrust toward its next checkpoint", () => {
    const racer = ship("opponent", "opponent");
    racer.thrustRating = 2;

    expect(chooseGrandPrixThrust(racer, grandPrixCheckpoints[1])).toEqual({ q: 1, r: 0 });
  });

  it("reports player and opponent leg completions", () => {
    const previous = createGrandPrixState(encounter());
    const player = ship("player", "player");
    const opponent = ship("opponent", "opponent");
    player.position = grandPrixCheckpoints[1].position;
    opponent.position = grandPrixCheckpoints[1].position;
    const next = advanceGrandPrixState(previous, encounter([player, opponent]));

    expect(completedGrandPrixLegs(previous, next)).toEqual([
      expect.objectContaining({ side: "player", checkpoint: grandPrixCheckpoints[1], nextCheckpoint: grandPrixCheckpoints[2] }),
      expect.objectContaining({ side: "opponent", checkpoint: grandPrixCheckpoints[1], nextCheckpoint: grandPrixCheckpoints[2] }),
    ]);
  });

  it("identifies completed and current destination markers", () => {
    const initial = createGrandPrixState(encounter());
    expect(grandPrixMarkerState(initial, 0)).toEqual({ completed: true, playerTarget: false, opponentTarget: false });
    expect(grandPrixMarkerState(initial, 1)).toEqual({ completed: false, playerTarget: true, opponentTarget: true });

    const player = ship("player", "player");
    player.position = grandPrixCheckpoints[1].position;
    const afterBeta = advanceGrandPrixState(initial, encounter([player, ship("opponent", "opponent")]));
    expect(grandPrixMarkerState(afterBeta, 1)).toMatchObject({ completed: true, playerTarget: false });
    expect(grandPrixMarkerState(afterBeta, 2)).toMatchObject({ completed: false, playerTarget: true });
  });

  it("previews a stopped landing and a high-speed pass", () => {
    const beta = grandPrixCheckpoints[1];
    const brakingShip = ship("player", "player");
    brakingShip.position = { q: 17, r: 0 };
    brakingShip.velocity = { q: 1, r: 0 };

    expect(grandPrixLandingPreview(brakingShip, { q: -1, r: 0 }, beta)).toMatchObject({
      currentRange: 1,
      projectedRange: 1,
      projectedVelocity: { q: 0, r: 0 },
      status: "approaching",
    });

    brakingShip.position = { q: 16, r: 0 };
    expect(grandPrixLandingPreview(brakingShip, { q: 0, r: 0 }, beta)).toMatchObject({
      projectedRange: 1,
      status: "approaching",
    });

    brakingShip.position = { q: 17, r: 0 };
    expect(grandPrixLandingPreview(brakingShip, { q: 0, r: 0 }, beta)).toMatchObject({
      projectedRange: 0,
      status: "too-fast",
    });

    brakingShip.position = beta.position;
    brakingShip.velocity = { q: 0, r: 0 };
    expect(grandPrixLandingPreview(brakingShip, { q: 0, r: 0 }, beta).status).toBe("landing-confirmed");
  });

  it("guides the opponent to stop at every world and finish the course", () => {
    const player = ship("player", "player");
    let opponent = ship("opponent", "opponent");
    opponent.thrustRating = 2;
    let race = createGrandPrixState(encounter([player, opponent]));
    const landed: string[] = [];

    for (let turn = 0; turn < 200 && race.winner === null; turn += 1) {
      const checkpoint = nextGrandPrixCheckpoint(race, opponent.id);
      expect(checkpoint).not.toBeNull();
      const thrust = chooseGrandPrixThrust(opponent, checkpoint!);
      const velocity = {
        q: opponent.velocity.q + thrust.q,
        r: opponent.velocity.r + thrust.r,
      };
      opponent = {
        ...opponent,
        velocity,
        position: {
          q: opponent.position.q + velocity.q,
          r: opponent.position.r + velocity.r,
        },
      };
      const previousIndex = race.racers.find((racer) => racer.shipId === opponent.id)!.nextCheckpointIndex;
      race = advanceGrandPrixState(race, encounter([player, opponent]));
      const nextIndex = race.racers.find((racer) => racer.shipId === opponent.id)!.nextCheckpointIndex;
      if (nextIndex > previousIndex) landed.push(checkpoint!.label);
    }

    expect(landed).toEqual(["Beta", "Gamma", "Delta", "Alpha"]);
    expect(race.winner).toBe("opponent");
  });
});
