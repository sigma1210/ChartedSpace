import type { MaydayScenario } from "../maydayRules";
import {
  buildMaydayPlayerShip,
  buildMaydayScenarioForPlayerShip,
} from "../playerShipAdapter";

const trainingScenario = (): MaydayScenario => ({
  id: "training",
  label: "Training",
  detail: "Integration test scenario",
  objective: {
    kind: "combat-disable",
    label: "Disable the opponent",
  },
  encounter: {
    turn: 3,
    ships: [
      {
        id: "training-player",
        name: "Training Ship",
        side: "player",
        position: { q: -4, r: 2 },
        velocity: { q: 2, r: -1 },
        thrustRating: 6,
        lasers: 6,
        missiles: 12,
        sandcasters: 1,
        sand: 12,
        targetType: "ship",
      },
      {
        id: "opponent",
        name: "Opponent",
        side: "opponent",
        position: { q: 5, r: -2 },
        velocity: { q: -1, r: 1 },
        thrustRating: 2,
        lasers: 2,
        missiles: 4,
        sandcasters: 1,
        sand: 2,
        targetType: "ship",
      },
    ],
  },
});

describe("buildMaydayPlayerShip", () => {
  it("maps a Free Trader to the existing Mayday template", () => {
    const result = buildMaydayPlayerShip({
      id: "ship-123",
      name: "Far Horizon",
      type: "Free Trader",
    });

    expect(result).toEqual({
      id: "ship-123",
      name: "Far Horizon",
      side: "player",
      position: { q: 0, r: 0 },
      velocity: { q: 0, r: 0 },
      thrustRating: 1,
      lasers: 1,
      gunnery: 0,
      gunneryOperator: null,
      missiles: 2,
      sandcasters: 1,
      sand: 2,
      targetType: "ship",
    });
  });

  it("selects the highest-Gunnery unassigned crew member", () => {
    const result = buildMaydayPlayerShip({
      id: "ship-123",
      name: "Far Horizon",
      type: "Free Trader",
      crew: [
        {
          role: "unassigned",
          characterName: "Ari",
          npcName: null,
          keySkillName: null,
          keySkillLevel: 0,
          skills: [{ name: "Gunnery", level: 1 }],
        },
        {
          role: "unassigned",
          characterName: "Bea",
          npcName: null,
          keySkillName: null,
          keySkillLevel: 0,
          skills: [{ name: "Gunnery", level: 3 }],
        },
      ],
    });

    expect(result).toMatchObject({
      gunnery: 3,
      gunneryOperator: "Bea",
    });
  });

  it("excludes assigned crew even when they have greater Gunnery skill", () => {
    const result = buildMaydayPlayerShip({
      id: "ship-123",
      name: "Far Horizon",
      type: "Free Trader",
      crew: [
        {
          role: "pilot",
          characterName: "Assigned Pilot",
          npcName: null,
          keySkillName: "Pilot",
          keySkillLevel: 3,
          skills: [{ name: "Gunnery", level: 5 }],
        },
        {
          role: "unassigned",
          characterName: "Available Crew",
          npcName: null,
          keySkillName: null,
          keySkillLevel: 0,
          skills: [{ name: "Gunnery", level: 2 }],
        },
      ],
    });

    expect(result).toMatchObject({
      gunnery: 2,
      gunneryOperator: "Available Crew",
    });
  });

  it("matches a supported template identifier", () => {
    const result = buildMaydayPlayerShip({
      id: "ship-456",
      name: "Watchful",
      type: "patrol-craft",
    });

    expect(result).toMatchObject({
      id: "ship-456",
      name: "Watchful",
      thrustRating: 3,
      lasers: 2,
      missiles: 6,
      sand: 4,
    });
  });

  it("returns null for an unsupported ship type", () => {
    expect(buildMaydayPlayerShip({
      id: "ship-789",
      name: "Unknown Hull",
      type: "Laboratory Ship",
    })).toBeNull();
  });

  it("builds a scenario with the real ship identity and template capabilities", () => {
    const result = buildMaydayScenarioForPlayerShip(trainingScenario(), {
      id: "ship-123",
      name: "Far Horizon",
      type: "Free Trader",
    });

    expect(result?.encounter.ships[0]).toMatchObject({
      id: "ship-123",
      name: "Far Horizon",
      side: "player",
      position: { q: -4, r: 2 },
      velocity: { q: 2, r: -1 },
      thrustRating: 1,
      lasers: 1,
      missiles: 2,
      sand: 2,
    });
    expect(result?.encounter.ships[1]).toMatchObject({
      id: "opponent",
      name: "Opponent",
      position: { q: 5, r: -2 },
      velocity: { q: -1, r: 1 },
    });
    expect(result?.encounter.turn).toBe(3);
    expect(result?.objective).toEqual(trainingScenario().objective);
  });

  it("does not modify the original scenario", () => {
    const source = trainingScenario();
    const sourceSnapshot = structuredClone(source);

    const result = buildMaydayScenarioForPlayerShip(source, {
      id: "ship-123",
      name: "Far Horizon",
      type: "Free Trader",
    });

    expect(result).not.toBe(source);
    expect(result?.encounter).not.toBe(source.encounter);
    expect(result?.encounter.ships).not.toBe(source.encounter.ships);
    expect(source).toEqual(sourceSnapshot);
  });

  it("returns null when the scenario has no player ship", () => {
    const source = trainingScenario();
    source.encounter.ships = source.encounter.ships.filter((ship) => ship.side !== "player");

    expect(buildMaydayScenarioForPlayerShip(source, {
      id: "ship-123",
      name: "Far Horizon",
      type: "Free Trader",
    })).toBeNull();
  });

  it("returns null when the player ship type is unsupported", () => {
    expect(buildMaydayScenarioForPlayerShip(trainingScenario(), {
      id: "ship-789",
      name: "Unknown Hull",
      type: "Laboratory Ship",
    })).toBeNull();
  });
});
