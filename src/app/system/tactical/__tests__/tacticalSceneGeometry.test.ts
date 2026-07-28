import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import {
  TACTICAL_WALL_HEIGHT,
  tacticalCombatantHeight,
  tacticalRaisedSurfaceHeightAt,
  tacticalVisualHeightAt,
} from "../tacticalSceneGeometry";

describe("tactical scene geometry", () => {
  it("preserves raised-surface and stair-access visual heights", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const point = { x: 1, y: 1 };
    scenario.terrainByCell = { "1:1": "elevated" };
    scenario.elevationLevelByCell = { "1:1": 1 };
    scenario.elevationAccessCells = [];

    expect(tacticalRaisedSurfaceHeightAt(scenario, point)).toBeCloseTo(
      TACTICAL_WALL_HEIGHT,
    );
    expect(tacticalVisualHeightAt(scenario, point)).toBeCloseTo(
      TACTICAL_WALL_HEIGHT,
    );

    scenario.elevationAccessCells = [point];
    expect(tacticalVisualHeightAt(scenario, point)).toBeCloseTo(
      TACTICAL_WALL_HEIGHT * 1.5,
    );
  });

  it("places combatants on their active bridge elevation", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const combatant = scenario.combatants[0]!;
    combatant.position = { x: 2, y: 2 };
    combatant.elevationLevel = 2;
    scenario.bridges = [{
      id: "bridge-test",
      cells: [combatant.position],
      elevationLevel: 2,
    }];

    expect(tacticalCombatantHeight(scenario, combatant)).toBeCloseTo(
      TACTICAL_WALL_HEIGHT * 2,
    );
  });
});
