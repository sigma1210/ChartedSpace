import { coverAssessment, filledLiquidHydrogenCellKeys, hasLineOfSight, pointKey, reachableOpenMapMovement, scenarioAvoidingLiquidHydrogenForPathfinding, shortestPathToAny, sidestepAndBackstepMoves, tacticalOccupantCounts, terrainHeightAt } from "../geometry";
import { buildDefaultTacticalScenario } from "../defaultTacticalScenario";
import { cloneTacticalScenarioDefinition, defaultTacticalScenarioDefinition, resolveTacticalScenarioTerrain, tacticalTerrainPalette } from "../tacticalScenarioDefinitions";
import { combatantFacingForTacticalRotation, createControlRoom, interactiveHumanModelFacingForTacticalRotation, tacticalMovementEdgeKey, tacticalTerrainBlockedCells, tacticalTerrainBlockedEdges, tacticalWallCornerPoints, tacticalWallVisualRuns } from "../tacticalTerrain";

const drawnRectangle = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => ({
  id,
  segments: [
    { kind: "line" as const, from: { x, y }, to: { x: x + width, y } },
    { kind: "line" as const, from: { x: x + width, y }, to: { x: x + width, y: y + height } },
    { kind: "line" as const, from: { x: x + width, y: y + height }, to: { x, y: y + height } },
    { kind: "line" as const, from: { x, y: y + height }, to: { x, y } },
  ],
});

describe("tactical Control Room", () => {
  it("maps editor rotations to combatant facing directions", () => {
    expect(([0, 90, 180, 270] as const).map(combatantFacingForTacticalRotation)).toEqual(["north", "east", "south", "west"]);
  });

  it("corrects the interactive-human model's reversed forward direction", () => {
    expect(([0, 90, 180, 270] as const).map(interactiveHumanModelFacingForTacticalRotation)).toEqual(["south", "west", "north", "east"]);
  });

  it("resolves six-square edge deployment zones and a placeable 9x9 interior zone", () => {
    const edgeTerrain = resolveTacticalScenarioTerrain(defaultTacticalScenarioDefinition);
    expect(edgeTerrain.deploymentCells).toHaveLength(72 * 6);
    expect(edgeTerrain.deploymentCells).toContainEqual({ x: 0, y: 42 });
    expect(edgeTerrain.deploymentCells).not.toContainEqual({ x: 0, y: 41 });

    const interior = resolveTacticalScenarioTerrain({
      ...defaultTacticalScenarioDefinition,
      deploymentEdges: [],
      terrainPlacements: [{ id: "interior-deployment", terrainDefinitionId: "deployment-zone-9x9", origin: { x: 10, y: 12 }, rotation: 0 }],
      enemyPlacements: [],
    });
    expect(interior.deploymentCells).toHaveLength(81);
    expect(interior.deploymentCells).toEqual(expect.arrayContaining([{ x: 10, y: 12 }, { x: 18, y: 20 }]));
    expect(interior.terrainObjects).toEqual([]);
    expect(tacticalTerrainPalette.find((item) => item.id === "deployment-zone-9x9")).toMatchObject({ label: "Deployment Zone 9x9", size: { width: 9, height: 9 } });
  });
  it("clones an editable scenario draft without changing the immutable base definition", () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.title = "Edited Draft";
    draft.map.width = 80;
    draft.terrainPlacements[0].origin = { x: 20, y: 30 };

    expect(defaultTacticalScenarioDefinition).toMatchObject({ title: "Control Room Assault", map: { width: 72 }, terrainPlacements: [{ origin: { x: 44, y: 38 } }] });
    expect(buildDefaultTacticalScenario("exterior-dark", draft)).toMatchObject({ title: "Edited Draft", width: 80 });
    expect(resolveTacticalScenarioTerrain(draft).terrainObjects.find((object) => object.id === "control-room-alpha:terminal")).toMatchObject({ position: { x: 24, y: 34 } });
  });

  it("carries editor-placed fires into playtest and rejects invalid fire cells", () => {
    const definition = { ...defaultTacticalScenarioDefinition, fireCells: [{ x: 4, y: 5 }] };

    expect(buildDefaultTacticalScenario("exterior-lit", definition).fireCells).toEqual([{ x: 4, y: 5 }]);
    expect(() => resolveTacticalScenarioTerrain({ ...definition, fireCells: [{ x: 4, y: 5 }, { x: 4, y: 5 }] })).toThrow("Duplicate scenario fire at 4:5");
    expect(() => resolveTacticalScenarioTerrain({ ...definition, fireCells: [{ x: definition.map.width, y: 5 }] })).toThrow("Scenario fire extends outside the map");
  });

  it("resolves the default control room from scenario and terrain JSON", () => {
    const terrain = resolveTacticalScenarioTerrain(defaultTacticalScenarioDefinition);

    expect(terrain.terrainObjects.filter((object) => object.kind === "wall")).toHaveLength(32);
    expect(terrain.terrainObjects.filter((object) => object.kind === "door")).toHaveLength(4);
    expect(terrain.interiorCells).toHaveLength(81);
    expect(terrain.lightSources).toHaveLength(4);
    expect(terrain.terrainObjects.find((object) => object.kind === "terminal")).toMatchObject({
      id: "control-room-alpha:terminal",
      position: { x: 48, y: 42 },
      terminalKind: "security",
      label: "Security Terminal",
      facing: 180,
    });
  });

  it("does not expose fixed raised-area pieces in the terrain palette", () => {
    expect(tacticalTerrainPalette.filter((item) =>
      item.id.startsWith("raised-area"))).toEqual([]);
  });

  it("resolves a drawn raised area without requiring stairs", () => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      drawnRaisedAreas: [{
        id: "drawn-platform",
        segments: [
          { kind: "line" as const, from: { x: 2, y: 2 }, to: { x: 5, y: 2 } },
          { kind: "line" as const, from: { x: 5, y: 2 }, to: { x: 5, y: 5 } },
          { kind: "line" as const, from: { x: 5, y: 5 }, to: { x: 2, y: 5 } },
          { kind: "line" as const, from: { x: 2, y: 5 }, to: { x: 2, y: 2 } },
        ],
      }],
    };

    const terrain = resolveTacticalScenarioTerrain(definition);
    const scenario = buildDefaultTacticalScenario(undefined, definition);

    expect(
      Object.entries(terrain.elevationLevelByCell)
        .filter(([, level]) => level === 1)
        .map(([key]) => key),
    ).toEqual(expect.arrayContaining([
      "2:2", "3:2", "4:2",
      "2:3", "3:3", "4:3",
      "2:4", "3:4", "4:4",
    ]));
    expect(terrain.elevationAccessCells).not.toEqual(
      expect.arrayContaining([
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
      ]),
    );
    expect(scenario.drawnRaisedAreas).toEqual(definition.drawnRaisedAreas);
  });

  it("stacks nested drawn raised areas across three elevation levels", () => {
    const rectangle = (id: string, from: { x: number; y: number }, to: { x: number; y: number }) => ({
      id,
      segments: [
        { kind: "line" as const, from, to: { x: to.x, y: from.y } },
        { kind: "line" as const, from: { x: to.x, y: from.y }, to },
        { kind: "line" as const, from: to, to: { x: from.x, y: to.y } },
        { kind: "line" as const, from: { x: from.x, y: to.y }, to: from },
      ],
    });
    const definition = {
      ...defaultTacticalScenarioDefinition,
      drawnRaisedAreas: [
        rectangle("drawn-top", { x: 6, y: 6 }, { x: 8, y: 8 }),
        rectangle("drawn-base", { x: 2, y: 2 }, { x: 12, y: 12 }),
        rectangle("drawn-middle", { x: 4, y: 4 }, { x: 10, y: 10 }),
      ],
    };

    const terrain = resolveTacticalScenarioTerrain(definition);
    const scenario = buildDefaultTacticalScenario(undefined, definition);

    expect(terrain.drawnRaisedAreaLevels).toEqual({
      "drawn-top": 3,
      "drawn-base": 1,
      "drawn-middle": 2,
    });
    expect(terrain.elevationLevelByCell["2:2"]).toBe(1);
    expect(terrain.elevationLevelByCell["4:4"]).toBe(2);
    expect(terrain.elevationLevelByCell["6:6"]).toBe(3);
    expect(scenario.drawnRaisedAreaLevels).toEqual(terrain.drawnRaisedAreaLevels);
    expect(terrainHeightAt(scenario, { x: 6, y: 6 })).toBeCloseTo(1.95);
  });

  it("resolves stairs, ladders, and ramps between adjacent raised levels", () => {
    const base = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    base.drawnRaisedAreas = [{
      id: "transition-platform",
      segments: [
        { kind: "line", from: { x: 10, y: 10 }, to: { x: 20, y: 10 } },
        { kind: "line", from: { x: 20, y: 10 }, to: { x: 20, y: 20 } },
        { kind: "line", from: { x: 20, y: 20 }, to: { x: 10, y: 20 } },
        { kind: "line", from: { x: 10, y: 20 }, to: { x: 10, y: 10 } },
      ],
    }];
    const stairs = resolveTacticalScenarioTerrain({
      ...base,
      elevationTransitions: [{
        id: "stairs-a",
        kind: "stairs",
        lower: { x: 9, y: 15 },
        upper: { x: 10, y: 15 },
      }],
    });
    const ladder = resolveTacticalScenarioTerrain({
      ...base,
      elevationTransitions: [{
        id: "ladder-a",
        kind: "ladder",
        lower: { x: 9, y: 16 },
        upper: { x: 10, y: 16 },
      }],
    });
    const ramp = resolveTacticalScenarioTerrain({
      ...base,
      elevationTransitions: [{
        id: "ramp-a",
        kind: "ramp",
        lower: { x: 7, y: 12 },
        upper: { x: 10, y: 12 },
        path: [{ x: 7, y: 12 }, { x: 8, y: 12 }, { x: 9, y: 12 }, { x: 10, y: 12 }],
      }],
    });

    expect(stairs.elevationTransitions[0]).toMatchObject({
      kind: "stairs",
      lowerLevel: 0,
      upperLevel: 1,
      path: [{ x: 9, y: 15 }, { x: 10, y: 15 }],
    });
    expect(ladder.elevationTransitions[0]).toMatchObject({
      kind: "ladder",
      movementCost: 3,
      lowerLevel: 0,
      upperLevel: 1,
    });
    expect(ramp.elevationTransitions[0]).toMatchObject({
      kind: "ramp",
      lowerLevel: 0,
      upperLevel: 1,
      path: [{ x: 7, y: 12 }, { x: 8, y: 12 }, { x: 9, y: 12 }, { x: 10, y: 12 }],
    });

    const stairMoves = reachableOpenMapMovement({
      width: base.map.width,
      height: base.map.height,
      origin: { x: 9, y: 15 },
      facing: "east",
      allowance: 3,
      trotting: false,
      elevationLevelByCell: stairs.elevationLevelByCell,
      elevationTransitions: stairs.elevationTransitions,
    });
    const ladderMoves = reachableOpenMapMovement({
      width: base.map.width,
      height: base.map.height,
      origin: { x: 9, y: 16 },
      facing: "east",
      allowance: 3,
      trotting: false,
      elevationLevelByCell: ladder.elevationLevelByCell,
      elevationTransitions: ladder.elevationTransitions,
    });
    const rampMoves = reachableOpenMapMovement({
      width: base.map.width,
      height: base.map.height,
      origin: { x: 7, y: 12 },
      facing: "east",
      allowance: 6,
      trotting: false,
      elevationLevelByCell: ramp.elevationLevelByCell,
      elevationTransitions: ramp.elevationTransitions,
    });
    const rampApproachMoves = reachableOpenMapMovement({
      width: base.map.width,
      height: base.map.height,
      origin: { x: 7, y: 13 },
      facing: "north",
      allowance: 12,
      trotting: false,
      elevationLevelByCell: ramp.elevationLevelByCell,
      elevationTransitions: ramp.elevationTransitions,
    });
    const rampDescentMoves = reachableOpenMapMovement({
      width: base.map.width,
      height: base.map.height,
      origin: { x: 10, y: 12 },
      originElevationLevel: 1,
      facing: "west",
      allowance: 6,
      trotting: false,
      elevationLevelByCell: ramp.elevationLevelByCell,
      elevationTransitions: ramp.elevationTransitions,
    });
    const rampSideEntryMoves = reachableOpenMapMovement({
      width: base.map.width,
      height: base.map.height,
      origin: { x: 8, y: 13 },
      facing: "north",
      allowance: 2,
      trotting: false,
      elevationLevelByCell: ramp.elevationLevelByCell,
      elevationTransitions: ramp.elevationTransitions,
    });

    expect(stairMoves.get("10:15")).toMatchObject({ cost: 2, finalElevationLevel: 1 });
    expect(ladderMoves.get("10:16")).toMatchObject({
      cost: 3,
      finalElevationLevel: 1,
      costBreakdown: ["ladder 3 AP"],
    });
    expect(rampMoves.get("10:12")).toMatchObject({
      cost: 6,
      finalElevationLevel: 1,
    });
    expect(rampMoves.get("8:12")).toMatchObject({
      cost: 2,
      finalElevationLevel: 0,
    });
    expect(rampMoves.get("9:12")).toMatchObject({
      cost: 4,
      finalElevationLevel: 0,
    });
    expect(rampApproachMoves.get("10:12")?.path).toEqual([
      { x: 7, y: 12 },
      { x: 8, y: 12 },
      { x: 9, y: 12 },
      { x: 10, y: 12 },
    ]);
    expect(rampDescentMoves.get("7:12")?.path).toEqual([
      { x: 9, y: 12 },
      { x: 8, y: 12 },
      { x: 7, y: 12 },
    ]);
    expect(rampSideEntryMoves.has("8:12")).toBe(false);
  });

  it("rejects elevation transitions that do not connect adjacent levels", () => {
    expect(() => resolveTacticalScenarioTerrain({
      ...defaultTacticalScenarioDefinition,
      elevationTransitions: [{
        id: "unsupported-ladder",
        kind: "ladder",
        lower: { x: 2, y: 2 },
        upper: { x: 3, y: 2 },
      }],
    })).toThrow("must connect adjacent levels");
  });

  it("resolves a flat ramp as a traversable bridge between matching platforms", () => {
    const base = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    base.terrainPlacements = [];
    base.drawnRaisedAreas = [
      {
        id: "west-platform",
        segments: [
          { kind: "line", from: { x: 5, y: 10 }, to: { x: 8, y: 10 } },
          { kind: "line", from: { x: 8, y: 10 }, to: { x: 8, y: 13 } },
          { kind: "line", from: { x: 8, y: 13 }, to: { x: 5, y: 13 } },
          { kind: "line", from: { x: 5, y: 13 }, to: { x: 5, y: 10 } },
        ],
      },
      {
        id: "east-platform",
        segments: [
          { kind: "line", from: { x: 10, y: 10 }, to: { x: 13, y: 10 } },
          { kind: "line", from: { x: 13, y: 10 }, to: { x: 13, y: 13 } },
          { kind: "line", from: { x: 13, y: 13 }, to: { x: 10, y: 13 } },
          { kind: "line", from: { x: 10, y: 13 }, to: { x: 10, y: 10 } },
        ],
      },
    ];
    const scenario = resolveTacticalScenarioTerrain({
      ...base,
      elevationTransitions: [{
        id: "flat-bridge",
        kind: "ramp",
        lower: { x: 7, y: 11 },
        upper: { x: 10, y: 11 },
        path: [
          { x: 7, y: 11 },
          { x: 8, y: 11 },
          { x: 9, y: 11 },
          { x: 10, y: 11 },
        ],
      }],
    });

    expect(scenario.elevationTransitions[0]).toMatchObject({
      kind: "ramp",
      lowerLevel: 1,
      upperLevel: 1,
    });
    const moves = reachableOpenMapMovement({
      width: scenario.width,
      height: scenario.height,
      origin: { x: 7, y: 11 },
      originElevationLevel: 1,
      facing: "east",
      allowance: 6,
      trotting: false,
      elevationLevelByCell: scenario.elevationLevelByCell,
      elevationTransitions: scenario.elevationTransitions,
    });
    expect(moves.get("10:11")).toMatchObject({
      finalElevationLevel: 1,
      pathElevationLevels: [1, 1, 1],
    });
    expect(moves.get("8:11")).toMatchObject({ finalElevationLevel: 1 });
  });

  it("rejects partially overlapping drawn raised areas", () => {
    const rectangle = (id: string, from: { x: number; y: number }, to: { x: number; y: number }) => ({
      id,
      segments: [
        { kind: "line" as const, from, to: { x: to.x, y: from.y } },
        { kind: "line" as const, from: { x: to.x, y: from.y }, to },
        { kind: "line" as const, from: to, to: { x: from.x, y: to.y } },
        { kind: "line" as const, from: { x: from.x, y: to.y }, to: from },
      ],
    });

    expect(() => resolveTacticalScenarioTerrain({
      ...defaultTacticalScenarioDefinition,
      drawnRaisedAreas: [
        rectangle("first", { x: 2, y: 2 }, { x: 8, y: 8 }),
        rectangle("second", { x: 6, y: 6 }, { x: 12, y: 12 }),
      ],
    })).toThrow("partially overlap");
  });

  it("resolves a 1x1 hatch as an independent floor portal", () => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [
        ...defaultTacticalScenarioDefinition.terrainPlacements,
        { id: "hatch-a", terrainDefinitionId: "hatch-1x1", origin: { x: 30, y: 30 }, rotation: 0 as const },
      ],
    };

    const terrain = resolveTacticalScenarioTerrain(definition);
    expect(tacticalTerrainPalette.find((item) => item.id === "hatch-1x1")).toMatchObject({ label: "Hatch 1x1", size: { width: 1, height: 1 }, previewCells: [{ x: 0, y: 0 }] });
    expect(terrain.terrainObjects.find((object) => object.id === "hatch-a:hatch")).toMatchObject({ kind: "hatch", position: { x: 30, y: 30 }, open: false });
  });

  it("rejects overlapping hatch placements", () => {
    const hatch = { id: "hatch-a", terrainDefinitionId: "hatch-1x1", origin: { x: 30, y: 30 }, rotation: 0 as const };
    expect(() => resolveTacticalScenarioTerrain({ ...defaultTacticalScenarioDefinition, terrainPlacements: [...defaultTacticalScenarioDefinition.terrainPlacements, hatch] })).not.toThrow();
    expect(() => resolveTacticalScenarioTerrain({ ...defaultTacticalScenarioDefinition, terrainPlacements: [...defaultTacticalScenarioDefinition.terrainPlacements, hatch, { ...hatch, id: "hatch-b" }] })).toThrow("overlap");
  });

  it.each([
    { id: "liquid-hydrogen-2x2", label: "Liquid Hydrogen 2x2", size: 2, cells: 4 },
    { id: "liquid-hydrogen-3x3", label: "Liquid Hydrogen 3x3", size: 3, cells: 9 },
    { id: "liquid-hydrogen-4x4", label: "Liquid Hydrogen 4x4", size: 4, cells: 16 },
  ])("resolves $label as a filled liquid-hydrogen area", ({ id, label, size, cells }) => {
    const definition = { ...defaultTacticalScenarioDefinition, terrainPlacements: [{ id: "hydrogen", terrainDefinitionId: id, origin: { x: 10, y: 10 }, rotation: 0 as const }] };
    const scenario = buildDefaultTacticalScenario("exterior-lit", definition);
    expect(tacticalTerrainPalette.find((item) => item.id === id)).toMatchObject({ label, size: { width: size, height: size } });
    expect(scenario.liquidHydrogenAreas).toEqual([{ id: "hydrogen", cells: expect.any(Array), filled: true, elevationLevel: 0 }]);
    expect(scenario.liquidHydrogenAreas?.[0].cells).toHaveLength(cells);
    expect(filledLiquidHydrogenCellKeys(scenario).size).toBe(cells);
    expect(hasLineOfSight(scenario, { x: 9, y: 10 }, { x: 10 + size, y: 10 })).toBe(true);
  });

  it("treats an empty liquid-hydrogen area as ordinary floor and excludes filled cells from enemy paths", () => {
    const emptyDefinition = { ...defaultTacticalScenarioDefinition, terrainPlacements: [{ id: "hydrogen", terrainDefinitionId: "liquid-hydrogen-2x2", origin: { x: 10, y: 10 }, rotation: 0 as const, terrainSettings: { filled: false } }] };
    const emptyScenario = buildDefaultTacticalScenario("exterior-lit", emptyDefinition);
    expect(emptyScenario.liquidHydrogenAreas?.[0]).toMatchObject({ filled: false });
    expect(filledLiquidHydrogenCellKeys(emptyScenario).size).toBe(0);
    expect(scenarioAvoidingLiquidHydrogenForPathfinding(emptyScenario).objects).toEqual(emptyScenario.objects);

    const filledScenario = buildDefaultTacticalScenario("exterior-lit", { ...emptyDefinition, terrainPlacements: [{ ...emptyDefinition.terrainPlacements[0], terrainSettings: { filled: true } }] });
    expect(scenarioAvoidingLiquidHydrogenForPathfinding(filledScenario).objects.filter((object) => object.label === "Liquid Hydrogen")).toHaveLength(4);
    const enemy = filledScenario.combatants.find((unit) => unit.side === "enemy")!;
    enemy.position = { x: 8, y: 10 };
    const route = shortestPathToAny(scenarioAvoidingLiquidHydrogenForPathfinding(filledScenario), enemy.id, [{ x: 13, y: 10 }]);
    expect(route).not.toBeNull();
    expect(route?.some((point) => filledLiquidHydrogenCellKeys(filledScenario).has(pointKey(point)))).toBe(false);
  });

  it("resolves a curved drawn close-machinery region into gameplay cells", () => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [],
      drawnTerrainRegions: [{
        id: "curved-machinery",
        kind: "close-machinery" as const,
        segments: [
          { kind: "quadratic" as const, from: { x: 2, y: 2 }, control: { x: 4, y: 0 }, to: { x: 6, y: 2 } },
          { kind: "line" as const, from: { x: 6, y: 2 }, to: { x: 6, y: 6 } },
          { kind: "line" as const, from: { x: 6, y: 6 }, to: { x: 2, y: 6 } },
          { kind: "line" as const, from: { x: 2, y: 6 }, to: { x: 2, y: 2 } },
        ],
      }],
    };
    const terrain = resolveTacticalScenarioTerrain(definition);
    const scenario = buildDefaultTacticalScenario("exterior-lit", definition);

    expect(terrain.closeMachineryCells).toContainEqual({ x: 3, y: 1 });
    expect(scenario.closeMachineryCells).toEqual(terrain.closeMachineryCells);
    expect(scenario.drawnTerrainRegions).toEqual(definition.drawnTerrainRegions);
    expect(scenario.drawnTerrainRegions).not.toBe(definition.drawnTerrainRegions);
    expect(scenario.terrainByCell?.["3:1"]).toBeUndefined();
  });

  it("resolves filled and empty drawn liquid-hydrogen regions at their supporting elevation", () => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [],
      drawnRaisedAreas: [drawnRectangle("platform", 10, 10, 6, 6)],
      drawnTerrainRegions: [
        { ...drawnRectangle("filled-hydrogen", 11, 11, 2, 2), kind: "liquid-hydrogen" as const },
        { ...drawnRectangle("empty-hydrogen", 13, 13, 2, 2), kind: "liquid-hydrogen" as const, settings: { filled: false } },
      ],
    };
    const terrain = resolveTacticalScenarioTerrain(definition);
    const scenario = buildDefaultTacticalScenario("exterior-lit", definition);

    expect(terrain.liquidHydrogenAreas).toEqual([
      { id: "filled-hydrogen", cells: expect.any(Array), filled: true, elevationLevel: 1 },
      { id: "empty-hydrogen", cells: expect.any(Array), filled: false, elevationLevel: 1 },
    ]);
    expect(filledLiquidHydrogenCellKeys(scenario)).toEqual(new Set(["11:11", "12:11", "11:12", "12:12"]));
  });

  it("applies terrain overlap and raised-support validation to drawn regions", () => {
    const machinery = { ...drawnRectangle("machinery", 10, 10, 3, 3), kind: "close-machinery" as const };
    const hydrogen = { ...drawnRectangle("hydrogen", 11, 11, 2, 2), kind: "liquid-hydrogen" as const };
    expect(() => resolveTacticalScenarioTerrain({
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [],
      drawnTerrainRegions: [machinery, hydrogen],
    })).toThrow("overlaps close machinery");

    expect(() => resolveTacticalScenarioTerrain({
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [],
      drawnRaisedAreas: [drawnRectangle("platform", 10, 10, 2, 2)],
      drawnTerrainRegions: [{ ...hydrogen, segments: drawnRectangle("ignored", 11, 11, 2, 2).segments }],
    })).toThrow("must fit entirely within one raised-area placement");
  });

  it("places liquid hydrogen on one raised area without losing its elevation and rejects overhang", () => {
    const supported = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{ id: "hydrogen", terrainDefinitionId: "liquid-hydrogen-2x2", origin: { x: 10, y: 10 }, rotation: 0 as const }],
      drawnRaisedAreas: [drawnRectangle("platform", 10, 10, 3, 3)],
    };
    expect(resolveTacticalScenarioTerrain(supported).liquidHydrogenAreas[0]).toMatchObject({ elevationLevel: 1, filled: true });
    const overhanging = { ...supported, terrainPlacements: [{ ...supported.terrainPlacements[0], origin: { x: 12, y: 12 } }] };
    expect(() => resolveTacticalScenarioTerrain(overhanging)).toThrow("must fit entirely within one raised-area placement");
  });

  it.each([
    { id: "close-machinery-1x1", label: "Close Machinery 1x1", size: 1, cells: 1 },
    { id: "close-machinery-2x2", label: "Close Machinery 2x2", size: 2, cells: 4 },
    { id: "close-machinery-3x3", label: "Close Machinery 3x3", size: 3, cells: 9 },
    { id: "close-machinery-4x4", label: "Close Machinery 4x4", size: 4, cells: 16 },
  ])("resolves $label as traversable machinery cells", ({ id, label, size, cells }) => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{ id: `${id}-1`, terrainDefinitionId: id, origin: { x: 10, y: 10 }, rotation: 90 as const }],
    };
    const terrain = resolveTacticalScenarioTerrain(definition);

    expect(tacticalTerrainPalette.find((item) => item.id === id)).toMatchObject({ label, size: { width: size, height: size } });
    expect(terrain.closeMachineryCells).toHaveLength(cells);
    expect(Object.values(terrain.terrainByCell)).not.toContain("close-machinery");
    expect(terrain.terrainObjects).toHaveLength(0);
  });

  it("places close machinery on one raised area without replacing its elevation", () => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{ id: "machinery", terrainDefinitionId: "close-machinery-3x3", origin: { x: 11, y: 11 }, rotation: 90 as const }],
      drawnRaisedAreas: [drawnRectangle("platform", 10, 10, 5, 5)],
    };
    const terrain = resolveTacticalScenarioTerrain(definition);
    const scenario = buildDefaultTacticalScenario("exterior-lit", definition);

    expect(terrain.closeMachineryCells).toHaveLength(9);
    expect(terrain.terrainByCell["11:11"]).toBe("elevated");
    expect(scenario.closeMachineryCells).toContainEqual({ x: 11, y: 11 });
    expect(scenario.terrainByCell?.["11:11"]).toBe("elevated");
  });

  it("rejects close machinery that overhangs a raised area", () => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{ id: "machinery", terrainDefinitionId: "close-machinery-4x4", origin: { x: 10, y: 10 }, rotation: 0 as const }],
      drawnRaisedAreas: [drawnRectangle("platform", 10, 10, 3, 3)],
    };

    expect(() => resolveTacticalScenarioTerrain(definition)).toThrow("must fit entirely within one raised-area placement");
  });

  it("places machinery and a console on stacked drawn raised areas", () => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [
        { id: "machinery", terrainDefinitionId: "close-machinery-1x1", origin: { x: 12, y: 12 }, rotation: 0 as const },
        { id: "console", terrainDefinitionId: "console-1x1", origin: { x: 13, y: 13 }, rotation: 0 as const },
      ],
      drawnRaisedAreas: [
        drawnRectangle("top", 12, 12, 3, 3),
        drawnRectangle("base", 10, 10, 7, 7),
        drawnRectangle("middle", 11, 11, 5, 5),
      ],
    };
    const terrain = resolveTacticalScenarioTerrain(definition);
    const scenario = buildDefaultTacticalScenario("exterior-lit", definition);

    expect(terrain.elevationLevelByCell["10:10"]).toBe(1);
    expect(terrain.elevationLevelByCell["11:11"]).toBe(2);
    expect(terrain.elevationLevelByCell["12:12"]).toBe(3);
    expect(terrain.elevationLevelByCell["13:11"]).toBe(2);
    expect(terrain.closeMachineryCells).toContainEqual({ x: 12, y: 12 });
    expect(terrain.terrainObjects.find((object) => object.id === "console:terminal")).toMatchObject({ position: { x: 13, y: 13 } });
    expect(terrainHeightAt(scenario, { x: 13, y: 13 })).toBeCloseTo(1.95);
  });

  it.each([
    { id: "bridge-1x5", length: 5 },
    { id: "bridge-1x7", length: 7 },
    { id: "bridge-1x9", length: 9 },
  ])("provides the $id palette piece", ({ id, length }) => {
    expect(tacticalTerrainPalette.find((item) => item.id === id)).toMatchObject({ size: { width: 1, height: length } });
  });

  it("connects equal-height raised areas while preserving movement below the bridge", () => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{ id: "bridge", terrainDefinitionId: "bridge-1x5", origin: { x: 11, y: 12 }, rotation: 0 as const }],
      drawnRaisedAreas: [
        drawnRectangle("north-platform", 10, 10, 3, 3),
        drawnRectangle("south-platform", 10, 16, 3, 3),
      ],
    };
    const scenario = buildDefaultTacticalScenario("exterior-lit", definition);
    expect(scenario.bridges).toEqual([{ id: "bridge", elevationLevel: 1, cells: [{ x: 11, y: 12 }, { x: 11, y: 13 }, { x: 11, y: 14 }, { x: 11, y: 15 }, { x: 11, y: 16 }] }]);

    const deckMoves = reachableOpenMapMovement({ width: scenario.width, height: scenario.height, origin: { x: 11, y: 12 }, originElevationLevel: 1, facing: "south", allowance: 6, trotting: false, terrainByCell: scenario.terrainByCell, elevationLevelByCell: scenario.elevationLevelByCell, bridges: scenario.bridges, elevationAccessCells: scenario.elevationAccessCells });
    expect(deckMoves.get("11:15")).toMatchObject({ finalElevationLevel: 1, pathElevationLevels: [1, 1, 1] });

    const groundMoves = reachableOpenMapMovement({ width: scenario.width, height: scenario.height, origin: { x: 10, y: 14 }, originElevationLevel: 0, facing: "east", allowance: 2, trotting: false, terrainByCell: scenario.terrainByCell, elevationLevelByCell: scenario.elevationLevelByCell, bridges: scenario.bridges, elevationAccessCells: scenario.elevationAccessCells });
    expect(groundMoves.get("11:14")).toMatchObject({ finalElevationLevel: 0 });

    scenario.combatants[0].position = { x: 11, y: 14 };
    scenario.combatants[0].elevationLevel = 1;
    scenario.combatants[1].position = { x: 11, y: 14 };
    scenario.combatants[1].elevationLevel = 0;
    const occupants = tacticalOccupantCounts(scenario);
    expect(occupants.get("11:14@1")).toBe(1);
    expect(occupants.get("11:14@0")).toBe(1);
  });

  it("places a bridge whose full stated length spans the open gap", () => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{ id: "bridge", terrainDefinitionId: "bridge-1x5", origin: { x: 11, y: 13 }, rotation: 0 as const }],
      drawnRaisedAreas: [
        drawnRectangle("north-platform", 10, 10, 3, 3),
        drawnRectangle("south-platform", 10, 18, 3, 3),
      ],
    };

    const scenario = buildDefaultTacticalScenario("exterior-lit", definition);

    expect(scenario.bridges).toEqual([{ id: "bridge", elevationLevel: 1, cells: [{ x: 11, y: 13 }, { x: 11, y: 14 }, { x: 11, y: 15 }, { x: 11, y: 16 }, { x: 11, y: 17 }] }]);
  });

  it("rejects a bridge without two raised supports at the same height", () => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{ id: "bridge", terrainDefinitionId: "bridge-1x5", origin: { x: 11, y: 12 }, rotation: 0 as const }],
      drawnRaisedAreas: [drawnRectangle("north-platform", 10, 10, 3, 3)],
    };
    expect(() => resolveTacticalScenarioTerrain(definition)).toThrow("must connect two raised areas at the same height");
  });

  it("resolves and configures a placeable 1x1 console", () => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{
        id: "standalone-console",
        terrainDefinitionId: "console-1x1",
        origin: { x: 10, y: 10 },
        rotation: 90 as const,
        objectSettings: { terminal: { label: "Reactor Console", terminalKind: "engineering" as const } },
      }],
    };
    const terrain = resolveTacticalScenarioTerrain(definition);

    expect(tacticalTerrainPalette.find((item) => item.id === "console-1x1")).toMatchObject({ label: "Console 1x1", size: { width: 1, height: 1 }, previewCells: [{ x: 0, y: 0 }] });
    expect(terrain.terrainObjects).toContainEqual(expect.objectContaining({
      id: "standalone-console:terminal",
      kind: "terminal",
      position: { x: 10, y: 10 },
      facing: 90,
      label: "Reactor Console",
      terminalKind: "engineering",
      completesScenario: false,
    }));
  });

  it("resolves an interactive human as a stationary, non-targetable terminal using the female model", () => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{
        id: "informant",
        terrainDefinitionId: "interactive-human",
        origin: { x: 10, y: 10 },
        rotation: 90 as const,
        objectSettings: { terminal: { label: "Mara Venn" } },
      }],
    };

    const terrain = resolveTacticalScenarioTerrain(definition);

    expect(tacticalTerrainPalette.find((item) => item.id === "interactive-human")).toMatchObject({ label: "Interactive Human", size: { width: 1, height: 1 }, previewCells: [{ x: 0, y: 0 }] });
    expect(terrain.terrainObjects).toContainEqual(expect.objectContaining({
      id: "informant:terminal",
      kind: "terminal",
      position: { x: 10, y: 10 },
      facing: 90,
      label: "Mara Venn",
      blocking: true,
      targetable: false,
      visualKind: "human",
      modelPath: "/models/character-combat/female.glb",
    }));
  });

  it("places a console on a raised area while preserving the raised cell", () => {
    const definition = {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{ id: "standalone-console", terrainDefinitionId: "console-1x1", origin: { x: 11, y: 11 }, rotation: 0 as const }],
      drawnRaisedAreas: [drawnRectangle("platform", 10, 10, 3, 3)],
    };
    const terrain = resolveTacticalScenarioTerrain(definition);

    expect(terrain.terrainByCell["11:11"]).toBe("elevated");
    expect(terrain.terrainObjects.find((object) => object.id === "standalone-console:terminal")).toMatchObject({ position: { x: 11, y: 11 } });
  });

  it("rejects a console on stairs, close machinery, or another console", () => {
    expect(() => resolveTacticalScenarioTerrain({
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{ id: "stairs-console", terrainDefinitionId: "console-1x1", origin: { x: 11, y: 9 }, rotation: 0 as const }],
      drawnRaisedAreas: [drawnRectangle("platform", 10, 10, 3, 3)],
      elevationTransitions: [{
        id: "stairs",
        kind: "stairs",
        lower: { x: 11, y: 9 },
        upper: { x: 11, y: 10 },
      }],
    })).toThrow("overlaps stairs");

    expect(() => resolveTacticalScenarioTerrain({
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [
        { id: "machinery", terrainDefinitionId: "close-machinery-1x1", origin: { x: 20, y: 20 }, rotation: 0 },
        { id: "machinery-console", terrainDefinitionId: "console-1x1", origin: { x: 20, y: 20 }, rotation: 0 },
      ],
    })).toThrow("overlaps close machinery");

    expect(() => resolveTacticalScenarioTerrain({
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [
        { id: "console-a", terrainDefinitionId: "console-1x1", origin: { x: 20, y: 20 }, rotation: 0 },
        { id: "console-b", terrainDefinitionId: "console-1x1", origin: { x: 20, y: 20 }, rotation: 0 },
      ],
    })).toThrow("Tactical terminals console-a:terminal and console-b:terminal overlap");
  });

  it("charges 6 AP to enter each close-machinery square", () => {
    const movement = (allowance: number) => reachableOpenMapMovement({
      width: 6,
      height: 4,
      origin: { x: 1, y: 1 },
      facing: "east",
      allowance,
      trotting: false,
      closeMachineryCells: [{ x: 2, y: 1 }, { x: 3, y: 1 }],
    });

    expect(movement(5).has("2:1")).toBe(false);
    expect(movement(6).get("2:1")?.cost).toBe(6);
    expect(movement(6).has("3:1")).toBe(false);
  });

  it("applies AHL close-machinery fire and cover restrictions", () => {
    const scenario = buildDefaultTacticalScenario("exterior-lit");
    const attacker = scenario.combatants.find((unit) => unit.side === "player")!;
    const target = scenario.combatants.find((unit) => unit.side === "enemy")!;
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    scenario.terrainByCell = {};
    scenario.closeMachineryCells = [{ x: 4, y: 4 }];
    attacker.position = { x: 2, y: 4 };
    target.position = { x: 7, y: 4 };

    expect(hasLineOfSight(scenario, attacker.position, target.position)).toBe(false);
    target.position = { x: 5, y: 4 };
    expect(hasLineOfSight(scenario, attacker.position, target.position)).toBe(true);
    expect(coverAssessment(scenario, attacker.id, target.id)).toEqual({ value: 2, source: "close-machinery" });

    attacker.position = { x: 3, y: 4 };
    expect(coverAssessment(scenario, attacker.id, target.id)).toEqual({ value: 0, source: null });
  });

  it("resolves multiple independently rotated placements from one palette definition", () => {
    const terrain = resolveTacticalScenarioTerrain({
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [
        defaultTacticalScenarioDefinition.terrainPlacements[0],
        {
          id: "control-room-beta",
          terrainDefinitionId: "control-room",
          origin: { x: 10, y: 20 },
          rotation: 90,
          objectSettings: { terminal: { label: "Engineering Console", terminalKind: "engineering", facing: 90 } },
        },
      ],
    });

    expect(terrain.terrainObjects).toHaveLength(74);
    expect(terrain.interiorCells).toHaveLength(162);
    expect(terrain.lightSources).toHaveLength(8);
    expect(new Set(terrain.terrainObjects.map((object) => object.id)).size).toBe(terrain.terrainObjects.length);
    expect(terrain.terrainObjects.find((object) => object.id === "control-room-beta:north:wall:0")).toMatchObject({
      edge: { from: { x: 19, y: 20 }, to: { x: 19, y: 21 } },
    });
    expect(terrain.terrainObjects.find((object) => object.id === "control-room-beta:terminal")).toMatchObject({
      position: { x: 14, y: 24 },
      terminalKind: "engineering",
      label: "Engineering Console",
      facing: 180,
    });
  });

  it("merges matching boundaries when control rooms are placed directly beside each other", () => {
    const terrain = resolveTacticalScenarioTerrain({
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [
        { id: "control-room-north", terrainDefinitionId: "control-room", origin: { x: 10, y: 10 }, rotation: 0 },
        { id: "control-room-south", terrainDefinitionId: "control-room", origin: { x: 10, y: 19 }, rotation: 0 },
      ],
    });

    expect(terrain.terrainObjects.filter((object) => object.kind === "wall")).toHaveLength(56);
    expect(terrain.terrainObjects.filter((object) => object.kind === "door")).toHaveLength(7);
    expect(new Set(terrain.walls.map((wall) => `${wall.from.x}:${wall.from.y}:${wall.to.x}:${wall.to.y}`)).size).toBe(terrain.walls.length);
    expect(() => buildDefaultTacticalScenario("exterior-dark", {
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [
        { id: "control-room-north", terrainDefinitionId: "control-room", origin: { x: 10, y: 10 }, rotation: 0 },
        { id: "control-room-south", terrainDefinitionId: "control-room", origin: { x: 10, y: 19 }, rotation: 0 },
      ],
    })).not.toThrow();
  });

  it("rejects overlapping terrain placements", () => {
    expect(() => resolveTacticalScenarioTerrain({
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [
        defaultTacticalScenarioDefinition.terrainPlacements[0],
        {
          ...defaultTacticalScenarioDefinition.terrainPlacements[0],
          id: "control-room-overlap",
          origin: { x: 48, y: 58 },
        },
      ],
    })).toThrow("overlap");
  });

  it("rejects a placement whose doorway would connect outside the map", () => {
    expect(() => resolveTacticalScenarioTerrain({
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{
        id: "control-room-east-edge",
        terrainDefinitionId: "control-room",
        origin: { x: 63, y: 20 },
        rotation: 0,
      }],
    })).toThrow("doorway that does not connect two valid map cells");

    expect(() => resolveTacticalScenarioTerrain({
      ...defaultTacticalScenarioDefinition,
      terrainPlacements: [{
        id: "control-room-near-east-edge",
        terrainDefinitionId: "control-room",
        origin: { x: 62, y: 20 },
        rotation: 0,
      }],
    })).not.toThrow();
  });

  it("creates a 9 by 9 room with independent perimeter targets and four centered doors", () => {
    const room = createControlRoom({ id: "bridge", origin: { x: 10, y: 20 }, terminal: { kind: "navigation", label: "Helm" } });
    const walls = room.objects.filter((object) => object.kind === "wall");
    const doors = room.objects.filter((object) => object.kind === "door");

    expect(room).toMatchObject({ width: 9, height: 9 });
    expect(walls).toHaveLength(32);
    expect(doors).toHaveLength(4);
    expect(new Set(room.objects.map((object) => object.id)).size).toBe(room.objects.length);
    expect(doors.map((door) => door.edge)).toEqual(expect.arrayContaining([
      { from: { x: 14, y: 20 }, to: { x: 15, y: 20 } },
      { from: { x: 14, y: 29 }, to: { x: 15, y: 29 } },
      { from: { x: 10, y: 24 }, to: { x: 10, y: 25 } },
      { from: { x: 19, y: 24 }, to: { x: 19, y: 25 } },
    ]));
  });

  it("uses the supplied terminal definition at the room center", () => {
    const room = createControlRoom({ id: "engineering", origin: { x: 2, y: 3 }, terminal: { kind: "engineering", label: "Reactor Control", operational: false } });
    expect(room.objects.find((object) => object.kind === "terminal")).toMatchObject({
      id: "engineering:terminal", position: { x: 6, y: 7 }, terminalKind: "engineering", label: "Reactor Control", operational: false,
    });
  });

  it("rotates wall orientation and terminal facing while preserving the footprint", () => {
    const room = createControlRoom({ id: "comms", origin: { x: 30, y: 40 }, rotation: 90, terminal: { kind: "communications", label: "Comms", facing: 90 } });
    expect(room.objects.find((object) => object.id === "comms:north:wall:0")).toMatchObject({ edge: { from: { x: 39, y: 40 }, to: { x: 39, y: 41 } } });
    expect(room.objects.find((object) => object.kind === "terminal")).toMatchObject({ position: { x: 34, y: 44 }, facing: 180 });
  });

  it("blocks the terminal cell and represents walls and doors as blocked edges", () => {
    const room = createControlRoom({ id: "security", origin: { x: 0, y: 0 }, terminal: { kind: "security", label: "Security" } });
    const blockedCells = tacticalTerrainBlockedCells(room.objects);
    const blockedEdges = tacticalTerrainBlockedEdges(room.objects);
    expect(blockedCells).toEqual(new Set(["4:4"]));
    expect(blockedEdges.size).toBe(36);
  });

  it("prevents orthogonal and diagonal movement through the continuous boundary", () => {
    const room = createControlRoom({ id: "security", origin: { x: 10, y: 20 }, terminal: { kind: "security", label: "Security" } });
    const moves = reachableOpenMapMovement({
      width: 100, height: 100, origin: { x: 14, y: 19 }, facing: "south", allowance: 3, trotting: false,
      blockedCells: tacticalTerrainBlockedCells(room.objects), blockedEdges: tacticalTerrainBlockedEdges(room.objects),
    });
    expect(moves.has(pointKey({ x: 14, y: 20 }))).toBe(false);
    expect(moves.has(pointKey({ x: 15, y: 20 }))).toBe(false);
  });

  it("offers the five AHL sidestep and backstep squares for 4 AP without changing facing", () => {
    const moves = sidestepAndBackstepMoves({ width: 10, height: 10, origin: { x: 5, y: 5 }, facing: "north", allowance: 4 });

    expect([...moves.keys()].sort()).toEqual(["4:5", "4:6", "5:6", "6:5", "6:6"]);
    expect([...moves.values()].every((move) => move.cost === 4 && move.path.length === 1 && move.finalFacing === "north")).toBe(true);
    expect(moves.has("5:4")).toBe(false);
    expect(moves.has("4:4")).toBe(false);
    expect(moves.has("6:4")).toBe(false);
  });

  it("does not offer sidestep and backstep through blocked cells or edges", () => {
    const origin = { x: 5, y: 5 };
    const moves = sidestepAndBackstepMoves({
      width: 10,
      height: 10,
      origin,
      facing: "north",
      allowance: 4,
      blockedCells: new Set(["4:5"]),
      blockedEdges: new Set([tacticalMovementEdgeKey(origin, { x: 6, y: 5 })]),
    });

    expect(moves.has("4:5")).toBe(false);
    expect(moves.has("6:5")).toBe(false);
    expect(moves.has("5:6")).toBe(true);
  });

  it("adds AHL active-occupant congestion to movement and enforces the four-character limit", () => {
    const congested = reachableOpenMapMovement({
      width: 10,
      height: 10,
      origin: { x: 5, y: 5 },
      facing: "south",
      allowance: 6,
      trotting: false,
      activeOccupantsByCell: new Map([["5:6", 2]]),
    });
    expect(congested.get("5:6")).toMatchObject({ cost: 4, costBreakdown: ["congestion +2"] });

    const full = reachableOpenMapMovement({
      width: 10,
      height: 10,
      origin: { x: 5, y: 5 },
      facing: "south",
      allowance: 6,
      trotting: false,
      activeOccupantsByCell: new Map([["5:6", 4]]),
    });
    expect(full.has("5:6")).toBe(false);
  });

  it("adds congestion to the fixed AHL sidestep and backstep cost", () => {
    const moves = sidestepAndBackstepMoves({
      width: 10,
      height: 10,
      origin: { x: 5, y: 5 },
      facing: "north",
      allowance: 5,
      activeOccupantsByCell: new Map([["5:6", 1]]),
    });
    expect(moves.get("5:6")).toMatchObject({ cost: 5, costBreakdown: ["congestion +1"], finalFacing: "north" });
  });

  it("combines intact targets into smooth visual runs with clean corner joins", () => {
    const room = createControlRoom({ id: "bridge", origin: { x: 10, y: 20 }, terminal: { kind: "navigation", label: "Helm" } });
    const runs = tacticalWallVisualRuns(room.objects);
    expect(runs).toHaveLength(8);
    expect(runs.every((run) => run.segmentIds.length === 4)).toBe(true);
    expect(tacticalWallCornerPoints(room.objects)).toEqual(expect.arrayContaining([
      { x: 10, y: 20 }, { x: 19, y: 20 }, { x: 10, y: 29 }, { x: 19, y: 29 },
    ]));
    expect(tacticalWallCornerPoints(room.objects)).toHaveLength(4);
  });

  it("resolves and renders an independently drawn diagonal wall", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.drawnWalls = [{ id: "diagonal-bulkhead", from: { x: 2, y: 2 }, to: { x: 7, y: 5 } }];

    const terrain = resolveTacticalScenarioTerrain(definition);
    const wall = terrain.terrainObjects.find((object) => object.id === "diagonal-bulkhead");
    const run = tacticalWallVisualRuns(terrain.terrainObjects).find((candidate) => candidate.segmentIds.includes("diagonal-bulkhead"));

    expect(terrain.walls).toContainEqual(definition.drawnWalls[0]);
    expect(wall).toMatchObject({
      kind: "wall",
      edge: { from: { x: 2, y: 2 }, to: { x: 7, y: 5 } },
      blocking: true,
      targetable: true,
    });
    expect(run?.edge).toEqual({ from: { x: 2, y: 2 }, to: { x: 7, y: 5 } });
  });

  it("places drawn walls and wall portals on their supporting raised level", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.drawnRaisedAreas = [{
      id: "wall-platform",
      segments: [
        { kind: "line", from: { x: 10, y: 10 }, to: { x: 20, y: 10 } },
        { kind: "line", from: { x: 20, y: 10 }, to: { x: 20, y: 20 } },
        { kind: "line", from: { x: 20, y: 20 }, to: { x: 10, y: 20 } },
        { kind: "line", from: { x: 10, y: 20 }, to: { x: 10, y: 10 } },
      ],
    }];
    definition.drawnWalls = [{
      id: "elevated-bulkhead",
      from: { x: 12, y: 14 },
      to: { x: 18, y: 14 },
      portals: [
        { id: "elevated-door", kind: "sliding-door", position: 0.3 },
        { id: "elevated-iris", kind: "iris-valve", position: 0.7 },
      ],
    }];

    const terrain = resolveTacticalScenarioTerrain(definition);
    const boundaries = terrain.terrainObjects.filter((object) =>
      object.kind === "wall" || object.kind === "door");
    const run = tacticalWallVisualRuns(boundaries).find((candidate) =>
      candidate.segmentIds.some((id) => id.startsWith("elevated-bulkhead")));

    expect(boundaries.filter((object) =>
      object.id.startsWith("elevated-bulkhead")
      || object.id === "elevated-door"
      || object.id === "elevated-iris")
      .every((object) => object.elevationLevel === 1)).toBe(true);
    expect(run?.elevationLevel).toBe(1);
  });

  it("rejects a drawn wall that crosses multiple elevation levels", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.drawnRaisedAreas = [{
      id: "wall-platform",
      segments: [
        { kind: "line", from: { x: 10, y: 10 }, to: { x: 20, y: 10 } },
        { kind: "line", from: { x: 20, y: 10 }, to: { x: 20, y: 20 } },
        { kind: "line", from: { x: 20, y: 20 }, to: { x: 10, y: 20 } },
        { kind: "line", from: { x: 10, y: 20 }, to: { x: 10, y: 10 } },
      ],
    }];
    definition.drawnWalls = [{
      id: "unsupported-bulkhead",
      from: { x: 5, y: 15 },
      to: { x: 25, y: 15 },
    }];

    expect(() => resolveTacticalScenarioTerrain(definition))
      .toThrow("crosses multiple elevation levels");
  });

  it("resolves a quadratic Bezier wall into stable blocking segments", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.drawnWalls = [{
      id: "curved-bulkhead",
      from: { x: 2, y: 2 },
      control: { x: 6.25, y: 8.5 },
      to: { x: 10, y: 2 },
    }];

    const terrain = resolveTacticalScenarioTerrain(definition);
    const curveObjects = terrain.terrainObjects.filter((object) => object.id.startsWith("curved-bulkhead:curve:"));
    const curveWalls = terrain.walls.filter((wall) => wall.id.startsWith("curved-bulkhead:curve:"));

    expect(curveObjects.length).toBeGreaterThan(1);
    expect(curveWalls).toHaveLength(curveObjects.length);
    expect(curveWalls[0].from).toEqual({ x: 2, y: 2 });
    expect(curveWalls.at(-1)?.to).toEqual({ x: 10, y: 2 });
    expect(curveObjects.every((object) => object.kind === "wall" && object.blocking)).toBe(true);
    expect(tacticalTerrainBlockedEdges(curveObjects).size).toBeGreaterThan(0);
  });

  it("rejects curved walls whose control point leaves the playable map", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.drawnWalls = [{
      id: "outside-curve",
      from: { x: 2, y: 2 },
      control: { x: -0.25, y: 8 },
      to: { x: 10, y: 2 },
    }];

    expect(() => resolveTacticalScenarioTerrain(definition)).toThrow("Drawn wall outside-curve extends outside the map.");
  });

  it("blocks movement and sight lines that cross a diagonal wall", () => {
    const scenario = buildDefaultTacticalScenario();
    scenario.walls = [{ id: "diagonal-bulkhead", from: { x: 1, y: 0 }, to: { x: 3, y: 2 } }];
    scenario.terrainObjects = undefined;
    scenario.objects = [];
    scenario.doors = [];
    scenario.closeMachineryCells = [];
    scenario.terrainByCell = {};
    scenario.elevationLevelByCell = {};
    const blockedEdges = tacticalTerrainBlockedEdges(resolveTacticalScenarioTerrain({
      ...cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
      terrainPlacements: [],
      drawnWalls: scenario.walls,
    }).terrainObjects);
    const moves = reachableOpenMapMovement({
      width: scenario.width,
      height: scenario.height,
      origin: { x: 1, y: 1 },
      facing: "north",
      allowance: 6,
      trotting: false,
      blockedEdges,
    });

    expect(moves.has("2:0")).toBe(false);
    expect(hasLineOfSight(scenario, { x: 1, y: 1 }, { x: 2, y: 0 })).toBe(false);
  });

  it("resolves a one-unit portal into a diagonal wall while preserving solid sections", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.drawnWalls = [{
      id: "portal-wall",
      from: { x: 10, y: 10 },
      to: { x: 18, y: 14 },
      portals: [{ id: "portal-wall-iris", kind: "iris-valve", position: 0.5 }],
    }];

    const terrain = resolveTacticalScenarioTerrain(definition);
    const portal = terrain.doors.find((door) => door.id === "portal-wall-iris");
    const solidSections = terrain.walls.filter((wall) => wall.id.startsWith("portal-wall:section:"));
    const portalLength = portal ? Math.hypot(portal.to.x - portal.from.x, portal.to.y - portal.from.y) : 0;
    const solidLength = solidSections.reduce((total, wall) => total + Math.hypot(wall.to.x - wall.from.x, wall.to.y - wall.from.y), 0);

    expect(portal).toMatchObject({ open: false, portalType: "iris-valve" });
    expect(portalLength).toBeCloseTo(1);
    expect(solidSections).toHaveLength(2);
    expect(solidLength + portalLength).toBeCloseTo(Math.hypot(8, 4));
    expect(buildDefaultTacticalScenario(undefined, definition).doors).toContainEqual(portal);
  });
});
