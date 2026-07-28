import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import { tacticalFogCellKeys } from "../TacticalVisibilityLayer";

describe("TacticalVisibilityLayer", () => {
  it("separates explored and unexplored fog while excluding visible cells", () => {
    const scenario = {
      ...buildDefaultTacticalScenario("exterior-dark"),
      width: 2,
      height: 2,
    };
    const visible = new Map<string, unknown>([["0:0", true]]);
    const explored = new Set(["0:0", "1:0"]);

    expect(tacticalFogCellKeys(scenario, visible, explored)).toEqual({
      exploredKeys: ["1:0"],
      unexploredKeys: ["0:1", "1:1"],
    });
  });

  it("produces no fog cells when the complete map is visible", () => {
    const scenario = {
      ...buildDefaultTacticalScenario("exterior-dark"),
      width: 1,
      height: 1,
    };

    expect(
      tacticalFogCellKeys(
        scenario,
        new Map<string, unknown>([["0:0", true]]),
        new Set(),
      ),
    ).toEqual({ exploredKeys: [], unexploredKeys: [] });
  });
});
