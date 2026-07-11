import { buildTrainingScenario } from "../trainingScenario";
import { buildArmorySweepScenario, buildCaptureBridgeScenario, buildCargoDeckScenario, buildCarrierDeckScenario, buildEngineRoomScenario, buildHoldAirlockScenario, buildRescueScenario, characterCombatScenarios } from "../scenarios";
import { validateCombatScenario } from "../scenarioValidator";

describe("character combat scenario validator", () => {
  it("accepts every registered scenario", () => {
    expect([buildTrainingScenario(), buildEngineRoomScenario(), buildCargoDeckScenario(), buildCarrierDeckScenario(), buildRescueScenario(), buildHoldAirlockScenario(), buildArmorySweepScenario(), buildCaptureBridgeScenario()].map((scenario) => validateCombatScenario(scenario))).toEqual([[], [], [], [], [], [], [], []]);
    expect(() => characterCombatScenarios.forEach((entry) => entry.build())).not.toThrow();
  });

  it("reports duplicate IDs, overlaps, and out-of-bounds positions precisely", () => {
    const scenario = buildTrainingScenario();
    scenario.objects[0].id = scenario.walls[0].id;
    scenario.objects[1].position = { ...scenario.combatants[0].position };
    scenario.combatants[1].position = { x: 99, y: 99 };
    const codes = validateCombatScenario(scenario).map((error) => error.code);
    expect(codes).toEqual(expect.arrayContaining(["duplicate-id", "occupied-cell", "position-bounds"]));
  });

  it("rejects a door covered by a wall", () => {
    const scenario = buildTrainingScenario();
    const door = scenario.doors[0];
    scenario.walls.push({ id: "bad-door-wall", from: { ...door.from }, to: { ...door.to } });
    expect(validateCombatScenario(scenario)).toEqual(expect.arrayContaining([expect.objectContaining({ code: "door-covered", message: expect.stringContaining(door.id) })]));
  });

  it("detects unreachable objectives and disconnected deck sections", () => {
    const scenario = buildTrainingScenario();
    scenario.walls.push({ id: "deck-divider", from: { x: 6, y: 0 }, to: { x: 6, y: 8 } });
    const codes = validateCombatScenario(scenario).map((error) => error.code);
    expect(codes).toContain("objective-unreachable");
    expect(codes).toContain("disconnected-deck");
  });
});
