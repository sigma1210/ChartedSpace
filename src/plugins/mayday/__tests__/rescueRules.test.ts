import { advanceEncounter } from "../maydayRules";
import { rescueResult, rescueScenario, rescueTurnLimit } from "../rescueRules";

describe("rescueRules", () => {
  it("defines an unarmed drifting rescue scenario", () => {
    const target = rescueScenario.encounter.ships.find((ship) => ship.side === "opponent");
    expect(rescueScenario.objective.kind).toBe("rescue-intercept");
    expect(rescueScenario.encounter.ships.every((ship) => ship.lasers === 0 && ship.missiles === 0)).toBe(true);
    expect(target).toMatchObject({ thrustRating: 0, velocity: { q: 1, r: -1 } });
    expect(target?.damage?.mDriveDisabled).toBe(true);
  });

  it("requires both the same hex and matching velocity", () => {
    const encounter = structuredClone(rescueScenario.encounter);
    const player = encounter.ships.find((ship) => ship.side === "player")!;
    const target = encounter.ships.find((ship) => ship.side === "opponent")!;
    player.position = { ...target.position };
    expect(rescueResult(encounter).status).toBe("in-progress");

    player.velocity = { ...target.velocity };
    expect(rescueResult(encounter)).toMatchObject({ status: "success", range: 0, relativeVelocity: 0 });
  });

  it("fails after the twelve-turn rescue window", () => {
    const encounter = structuredClone(rescueScenario.encounter);
    encounter.turn = rescueTurnLimit + 1;
    expect(rescueResult(encounter)).toMatchObject({ status: "failed", turnsRemaining: 0 });
  });

  it("integrates with movement turns while the disabled ship continues drifting", () => {
    const encounter = structuredClone(rescueScenario.encounter);
    const player = encounter.ships.find((ship) => ship.side === "player")!;
    const target = encounter.ships.find((ship) => ship.side === "opponent")!;
    player.position = { ...target.position };
    player.velocity = { ...target.velocity };

    const advanced = advanceEncounter(encounter, { q: 0, r: 0 }, { q: 0, r: 0 }, new Set()).encounter;

    expect(advanced.ships.find((ship) => ship.side === "opponent")?.velocity).toEqual(target.velocity);
    expect(rescueResult(advanced).status).toBe("success");
  });
});
