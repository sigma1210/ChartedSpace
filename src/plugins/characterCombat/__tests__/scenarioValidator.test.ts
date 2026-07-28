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

  it("detects unreachable objectives and disconnected deck sections", () => {
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
    expect(codes).toContain("disconnected-deck");
  });
});
