import type { MaydayEncounter, MaydayScenario } from "../maydayRules";
import { summarizeMaydayPlayerCombatResult } from "../combatResult";

const scenario = (): MaydayScenario => ({
  id: "current-ship",
  label: "Current Ship",
  detail: "Combat result test",
  objective: { kind: "combat-disable", label: "Disable the opponent" },
  encounter: {
    turn: 1,
    ships: [
      {
        id: "player",
        name: "Far Horizon",
        side: "player",
        position: { q: 0, r: 0 },
        velocity: { q: 0, r: 0 },
        thrustRating: 1,
        lasers: 1,
        missiles: 4,
        sandcasters: 1,
        sand: 3,
        targetType: "ship",
      },
    ],
  },
});

const completedEncounter = (): MaydayEncounter => ({
  ...scenario().encounter,
  turn: 4,
  ships: scenario().encounter.ships.map((ship) => ({ ...ship })),
});

describe("summarizeMaydayPlayerCombatResult", () => {
  it("summarizes an undamaged victory", () => {
    expect(summarizeMaydayPlayerCombatResult(
      scenario(),
      completedEncounter(),
      "success",
    )).toEqual({
      outcome: "victory",
      missilesConsumed: 0,
      sandConsumed: 0,
      damageSustained: {
        mDriveDisabled: false,
        jDriveDisabled: false,
        weaponsDisabled: false,
        computerDisabled: false,
        detonated: false,
      },
      destroyed: false,
    });
  });

  it("reports consumed missiles and sand", () => {
    const completed = completedEncounter();
    completed.ships[0] = { ...completed.ships[0], missiles: 1, sand: 1 };

    expect(summarizeMaydayPlayerCombatResult(scenario(), completed, "success")).toMatchObject({
      missilesConsumed: 3,
      sandConsumed: 2,
    });
  });

  it("reports newly sustained component damage", () => {
    const completed = completedEncounter();
    completed.ships[0] = {
      ...completed.ships[0],
      damage: {
        mDriveDisabled: true,
        jDriveDisabled: false,
        weaponsDisabled: true,
        computerDisabled: false,
        detonated: false,
      },
    };

    expect(summarizeMaydayPlayerCombatResult(scenario(), completed, "failed")?.damageSustained)
      .toEqual({
        mDriveDisabled: true,
        jDriveDisabled: false,
        weaponsDisabled: true,
        computerDisabled: false,
        detonated: false,
      });
  });

  it("reports a destroyed ship and defeat", () => {
    const completed = completedEncounter();
    completed.ships[0] = {
      ...completed.ships[0],
      damage: {
        mDriveDisabled: false,
        jDriveDisabled: false,
        weaponsDisabled: false,
        computerDisabled: false,
        detonated: true,
      },
    };

    expect(summarizeMaydayPlayerCombatResult(scenario(), completed, "failed")).toMatchObject({
      outcome: "defeat",
      destroyed: true,
      damageSustained: { detonated: true },
    });
  });

  it("returns null before the encounter is complete", () => {
    expect(summarizeMaydayPlayerCombatResult(
      scenario(),
      completedEncounter(),
      "in-progress",
    )).toBeNull();
  });
});
