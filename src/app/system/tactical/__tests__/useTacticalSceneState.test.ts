import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import { tacticalSceneFocus } from "../useTacticalSceneState";

describe("useTacticalSceneState", () => {
  it("centers the camera focus across all combatants", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const combatants = [
      { ...scenario.combatants[0]!, position: { x: 1, y: 1 } },
      { ...scenario.combatants[1]!, position: { x: 5, y: 3 } },
    ];

    expect(tacticalSceneFocus(combatants, 10, 8)).toEqual({
      focusX: -1.5,
      focusZ: -1.5,
    });
  });

  it("uses the map origin when there are no combatants", () => {
    expect(tacticalSceneFocus([], 10, 8)).toEqual({
      focusX: 0,
      focusZ: 0,
    });
  });
});
