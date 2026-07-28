import { validateCombatScenario } from "../scenarioValidator";
import { buildDefaultTacticalScenario } from "../defaultTacticalScenario";

describe("character combat scenario validator", () => {
  it("accepts the default tactical scenario", () => {
    expect(validateCombatScenario(buildDefaultTacticalScenario())).toEqual([]);
  });

  it("reports duplicate IDs, overlaps, and out-of-bounds positions precisely", () => {
    const scenario = buildDefaultTacticalScenario();
    scenario.objects[0].id = scenario.walls[0].id;
    scenario.objects[0].position = { ...scenario.combatants[0].position };
    scenario.combatants[1].position = { x: 99, y: 99 };
    const codes = validateCombatScenario(scenario).map((error) => error.code);
    expect(codes).toEqual(expect.arrayContaining(["duplicate-id", "occupied-cell", "position-bounds"]));
  });

  it("rejects a door covered by a wall", () => {
    const scenario = buildDefaultTacticalScenario();
    const door = scenario.doors[0];
    scenario.walls.push({ id: "bad-door-wall", from: { ...door.from }, to: { ...door.to } });
    expect(validateCombatScenario(scenario)).toEqual(expect.arrayContaining([expect.objectContaining({ code: "door-covered", message: expect.stringContaining(door.id) })]));
  });

  it("accepts a non-zero diagonal wall segment", () => {
    const scenario = buildDefaultTacticalScenario();
    scenario.walls.push({ id: "diagonal-wall", from: { x: 1, y: 1 }, to: { x: 5, y: 4 } });
    expect(validateCombatScenario(scenario).map((error) => error.code)).not.toContain("invalid-segment");
  });

  it("detects unreachable objectives without rejecting intentional sealed deck sections", () => {
    const source = buildDefaultTacticalScenario();
    const scenario = {
      ...source,
      width: 3,
      height: 2,
      walls: [{ id: "deck-divider", from: { x: 1, y: 0 }, to: { x: 1, y: 2 } }],
      doors: [],
      objects: [{ id: "isolated-console", kind: "console" as const, position: { x: 2, y: 0 } }],
      combatants: [{ ...source.combatants[0], position: { x: 0, y: 0 } }],
      deploymentCells: undefined,
    };
    const codes = validateCombatScenario(scenario).map((error) => error.code);
    expect(codes).toContain("objective-unreachable");
    expect(codes).not.toContain("disconnected-deck");
  });

  it("allows a wall to divide otherwise empty playable deck areas", () => {
    const source = buildDefaultTacticalScenario();
    const scenario = {
      ...source,
      width: 3,
      height: 2,
      walls: [{ id: "deck-divider", from: { x: 1, y: 0 }, to: { x: 1, y: 2 } }],
      doors: [],
      objects: [],
      combatants: [{ ...source.combatants[0], position: { x: 0, y: 0 } }],
      deploymentCells: undefined,
    };

    expect(validateCombatScenario(scenario)).toEqual([]);
  });
});
