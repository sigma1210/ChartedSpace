import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import { defaultTacticalScenarioDefinition } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  TACTICAL_STAIR_PLATFORM_HEIGHT,
  TACTICAL_WALL_HEIGHT,
  tacticalCombatantHeight,
  tacticalMovementVisualHeightAt,
  tacticalRaisedSurfaceHeightAt,
  tacticalStairPlatformPlacement,
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

  it("renders a lower-level stair destination at the stair midpoint", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const stair = { x: 1, y: 1 };
    scenario.elevationAccessCells = [stair];
    scenario.terrainByCell = { "1:2": "elevated" };
    scenario.elevationLevelByCell = { "1:2": 1 };

    expect(
      tacticalMovementVisualHeightAt(scenario, stair, 0),
    ).toBeCloseTo(TACTICAL_STAIR_PLATFORM_HEIGHT);
    expect(TACTICAL_STAIR_PLATFORM_HEIGHT).toBeCloseTo(
      TACTICAL_WALL_HEIGHT / 2,
    );
  });

  it.each([
    "raised-area",
    "raised-area-5x5",
    "raised-area-3x7",
    "raised-area-3x5",
    "raised-area-3x3",
  ])("uses the same platform geometry for %s stairs", (terrainDefinitionId) => {
    const scenario = buildDefaultTacticalScenario("exterior-dark", {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{
        id: `test:${terrainDefinitionId}`,
        terrainDefinitionId,
        origin: { x: 10, y: 10 },
        rotation: 0,
      }],
    });
    const stair = scenario.elevationAccessCells?.[0];

    expect(stair).toBeDefined();
    expect(
      tacticalStairPlatformPlacement(scenario, stair!),
    ).toEqual({
      baseHeight: 0,
      height: TACTICAL_STAIR_PLATFORM_HEIGHT,
      centerHeight: TACTICAL_STAIR_PLATFORM_HEIGHT / 2,
      topHeight: TACTICAL_STAIR_PLATFORM_HEIGHT,
    });
  });
});
