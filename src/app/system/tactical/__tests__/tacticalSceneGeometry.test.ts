import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import { defaultTacticalScenarioDefinition } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  TACTICAL_STAIR_PLATFORM_HEIGHT,
  TACTICAL_RAMP_DECK_THICKNESS,
  TACTICAL_TERRAIN_GRID_LIFT,
  TACTICAL_WALL_HEIGHT,
  tacticalBoundaryBaseHeight,
  tacticalCombatantHeight,
  tacticalElevationTransitionVisualPlacement,
  tacticalMovementVisualHeightAt,
  tacticalRampCellAtWorldPoint,
  tacticalRampGridLinePositions,
  tacticalRampSurfaceHeightAt,
  tacticalRaisedGridLinePositions,
  tacticalRaisedSurfaceHeightAt,
  tacticalStairPlatformPlacement,
  tacticalVisualHeightAt,
} from "../tacticalSceneGeometry";

describe("tactical scene geometry", () => {
  it("places tactical boundaries on their resolved elevation surface", () => {
    expect(tacticalBoundaryBaseHeight()).toBe(0);
    expect(tacticalBoundaryBaseHeight(1)).toBe(TACTICAL_WALL_HEIGHT);
    expect(tacticalBoundaryBaseHeight(3)).toBe(TACTICAL_WALL_HEIGHT * 3);
  });

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

    scenario.elevationAccessCells = [];
    scenario.elevationTransitions = [{
      id: "explicit-stairs",
      kind: "stairs",
      lower: stair,
      upper: { x: 1, y: 2 },
      path: [stair, { x: 1, y: 2 }],
      lowerLevel: 0,
      upperLevel: 1,
    }];
    expect(tacticalVisualHeightAt(scenario, stair)).toBeCloseTo(
      TACTICAL_STAIR_PLATFORM_HEIGHT,
    );
  });

  it("creates distinct visual geometry for explicit stairs, ladders, and ramps", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const base = {
      id: "transition-test",
      lower: { x: 1, y: 1 },
      upper: { x: 2, y: 1 },
      path: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
      lowerLevel: 0,
      upperLevel: 1,
    };

    expect(tacticalElevationTransitionVisualPlacement(scenario, { ...base, kind: "stairs" })).toMatchObject({
      kind: "stairs",
      height: TACTICAL_STAIR_PLATFORM_HEIGHT,
    });
    const eastWestLadder = tacticalElevationTransitionVisualPlacement(scenario, { ...base, kind: "ladder", movementCost: 3 });
    expect(eastWestLadder).toMatchObject({
      kind: "ladder",
      height: TACTICAL_WALL_HEIGHT,
    });
    if (eastWestLadder.kind === "ladder") {
      expect(eastWestLadder.rotation[1]).toBeCloseTo(Math.PI / 2);
      expect(eastWestLadder.position[0]).toBeLessThan(
        (base.lower.x + base.upper.x + 1 - scenario.width) / 2,
      );
    }
    const northSouthLadder = tacticalElevationTransitionVisualPlacement(scenario, {
      ...base,
      kind: "ladder",
      upper: { x: 1, y: 2 },
      path: [{ x: 1, y: 1 }, { x: 1, y: 2 }],
      movementCost: 3,
    });
    if (northSouthLadder.kind === "ladder") {
      expect(northSouthLadder.rotation[1]).toBeCloseTo(0);
      expect(northSouthLadder.position[2]).toBeLessThan(
        (base.lower.y + 2 + 1 - scenario.height) / 2,
      );
    }
    const curveMountedLadder = tacticalElevationTransitionVisualPlacement(scenario, {
      ...base,
      kind: "ladder",
      movementCost: 3,
      ladderMount: {
        position: { x: 9.8, y: 11.4 },
        tangent: { x: 0.6, y: 0.8 },
        outwardNormal: { x: -0.8, y: 0.6 },
      },
    });
    expect(curveMountedLadder).toMatchObject({
      kind: "ladder",
      position: [
        9.8 - scenario.width / 2,
        TACTICAL_WALL_HEIGHT / 2,
        11.4 - scenario.height / 2,
      ],
    });
    if (curveMountedLadder.kind === "ladder") {
      expect(curveMountedLadder.rotation[1]).toBeCloseTo(Math.atan2(-0.8, 0.6));
    }
    const ramp = tacticalElevationTransitionVisualPlacement(scenario, { ...base, kind: "ramp" });
    expect(ramp).toMatchObject({ kind: "ramp", longAxis: "x" });
    if (ramp.kind === "ramp") {
      expect(ramp.length).toBeCloseTo(Math.hypot(1, TACTICAL_WALL_HEIGHT));
      expect(ramp.rotation[2]).toBeCloseTo(Math.atan2(TACTICAL_WALL_HEIGHT, 1));
    }
    const bridge = tacticalElevationTransitionVisualPlacement(scenario, {
      ...base,
      kind: "ramp",
      lower: { x: 1, y: 1 },
      upper: { x: 4, y: 1 },
      path: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
      ],
      lowerLevel: 1,
      upperLevel: 1,
    });
    expect(bridge).toMatchObject({
      kind: "ramp",
      length: 3,
      rotation: [0, 0, 0],
      longAxis: "x",
    });
    scenario.elevationTransitions = [{
      ...base,
      kind: "ramp",
      lower: { x: 1, y: 1 },
      upper: { x: 4, y: 1 },
      path: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
      ],
      lowerLevel: 1,
      upperLevel: 1,
    }];
    expect(tacticalRampSurfaceHeightAt(
      scenario,
      { x: 2, y: 1 },
      1,
    )).toBeCloseTo(TACTICAL_WALL_HEIGHT);
    expect(tacticalRampSurfaceHeightAt(
      scenario,
      { x: 2, y: 1 },
      0,
    )).toBeNull();
  });

  it("interpolates model height across every ramp cell and maps ramp clicks to that cell", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const ramp = {
      id: "walkable-ramp",
      kind: "ramp" as const,
      lower: { x: 7, y: 12 },
      upper: { x: 10, y: 12 },
      path: [
        { x: 7, y: 12 },
        { x: 8, y: 12 },
        { x: 9, y: 12 },
        { x: 10, y: 12 },
      ],
      lowerLevel: 0,
      upperLevel: 1,
    };
    scenario.elevationTransitions = [ramp];

    expect(tacticalRampSurfaceHeightAt(scenario, ramp.lower)).toBeCloseTo(0);
    expect(tacticalRampSurfaceHeightAt(scenario, { x: 8, y: 12 })).toBeCloseTo(
      TACTICAL_WALL_HEIGHT / 3,
    );
    expect(tacticalMovementVisualHeightAt(
      scenario,
      { x: 9, y: 12 },
      0,
    )).toBeCloseTo(TACTICAL_WALL_HEIGHT * 2 / 3);
    expect(tacticalRampSurfaceHeightAt(scenario, ramp.upper)).toBeCloseTo(
      TACTICAL_WALL_HEIGHT,
    );
    const combatant = scenario.combatants[0]!;
    combatant.position = { x: 8, y: 12 };
    combatant.elevationLevel = 0;
    expect(tacticalCombatantHeight(scenario, combatant)).toBeCloseTo(
      TACTICAL_WALL_HEIGHT / 3,
    );

    expect(tacticalRampCellAtWorldPoint(scenario, ramp, {
      x: 8.5 - scenario.width / 2,
      z: 12.5 - scenario.height / 2,
    })).toEqual({ x: 8, y: 12 });
  });

  it("builds grid lines on exposed raised cells and along ramp sections", () => {
    const raisedGrid = tacticalRaisedGridLinePositions({
      width: 10,
      height: 10,
      elevationLevelByCell: {
        "2:2": 1,
        "3:2": 1,
      },
    });
    expect(raisedGrid).toHaveLength(7 * 2 * 3);
    Array.from(raisedGrid).filter((_, index) => index % 3 === 1)
      .forEach((height) => expect(height).toBeCloseTo(
        TACTICAL_WALL_HEIGHT + TACTICAL_TERRAIN_GRID_LIFT,
      ));
    const clippedRaisedGrid = tacticalRaisedGridLinePositions({
      width: 10,
      height: 10,
      elevationLevelByCell: {
        "2:2": 1,
        "3:2": 1,
      },
    }, new Map([["2:2", new Set([1])]]));
    expect(clippedRaisedGrid).toHaveLength(4 * 2 * 3);

    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const placement = tacticalElevationTransitionVisualPlacement(scenario, {
      id: "grid-ramp",
      kind: "ramp",
      lower: { x: 8, y: 11 },
      upper: { x: 10, y: 11 },
      path: [{ x: 8, y: 11 }, { x: 9, y: 11 }, { x: 10, y: 11 }],
      lowerLevel: 0,
      upperLevel: 1,
    });
    expect(placement.kind).toBe("ramp");
    if (placement.kind === "ramp") {
      const rampGrid = tacticalRampGridLinePositions(placement, 2);
      expect(rampGrid).toHaveLength(5 * 2 * 3);
      Array.from(rampGrid).filter((_, index) => index % 3 === 1)
        .forEach((height) => expect(height).toBeCloseTo(
          TACTICAL_RAMP_DECK_THICKNESS / 2 + TACTICAL_TERRAIN_GRID_LIFT,
        ));
    }
  });
});
