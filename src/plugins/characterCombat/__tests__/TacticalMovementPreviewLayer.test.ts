import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import { tacticalMovementPerimeterPositions } from "../TacticalMovementPreviewLayer";

describe("TacticalMovementPreviewLayer", () => {
  it("draws four perimeter edges around one reachable cell", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const cells = new Map([
      ["1:1", { x: 1, y: 1 }],
    ]);

    expect(
      tacticalMovementPerimeterPositions(cells, scenario),
    ).toHaveLength(24);
  });

  it("omits the shared edge between adjacent reachable cells", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const cells = new Map([
      ["1:1", { x: 1, y: 1 }],
      ["2:1", { x: 2, y: 1 }],
    ]);

    expect(
      tacticalMovementPerimeterPositions(cells, scenario),
    ).toHaveLength(36);
  });
});
