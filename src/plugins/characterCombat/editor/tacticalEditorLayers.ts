import {
  tacticalPlacementSupportsConsoleOperations,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";

export type TacticalEditorLayerObjectKind =
  | "terrain-placement"
  | "enemy"
  | "wall"
  | "area"
  | "raised-area"
  | "terrain-region"
  | "primitive"
  | "natural-terrain"
  | "elevation-transition"
  | "portal"
  | "fire";

export type TacticalEditorLayerGroupId =
  | "areas"
  | "walls"
  | "elevation"
  | "terrain"
  | "fixtures"
  | "combatants"
  | "effects";

export type TacticalEditorLayerObject = {
  key: string;
  id: string;
  kind: TacticalEditorLayerObjectKind;
  label: string;
  detail: string;
  parentKey?: string;
  reorderable: boolean;
};

export type TacticalEditorLayerGroup = {
  id: TacticalEditorLayerGroupId;
  label: string;
  objects: TacticalEditorLayerObject[];
};

export const tacticalEditorLayerKey = (
  kind: TacticalEditorLayerObjectKind,
  id: string,
) => `${kind}:${id}`;

const titleCase = (value: string) => value
  .split("-")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

export const tacticalEditorLayerGroups = (
  definition: TacticalScenarioDefinitionFile,
): TacticalEditorLayerGroup[] => {
  const areas: TacticalEditorLayerObject[] = [
    ...(definition.drawnAreas ?? []).flatMap((area): TacticalEditorLayerObject[] => {
      const key = tacticalEditorLayerKey("area", area.id);
      return [{
        key,
        id: area.id,
        kind: "area",
        label: area.id,
        detail: `${titleCase(area.surface)} · level ${area.elevation} · ${titleCase(area.boundary)}${area.deployment ? " · Crew deployment" : ""}`,
        reorderable: true,
      }, ...(area.portals ?? []).map((portal) => ({
        key: tacticalEditorLayerKey("portal", portal.id),
        id: portal.id,
        kind: "portal" as const,
        label: portal.id,
        detail: portal.kind === "iris-valve" ? "Iris valve" : "Door",
        parentKey: key,
        reorderable: false,
      }))];
    }),
    ...(definition.drawnRaisedAreas ?? []).map((area) => ({
      key: tacticalEditorLayerKey("raised-area", area.id),
      id: area.id,
      kind: "raised-area" as const,
      label: area.id,
      detail: `Raised area · ${area.segments.length} segments`,
      reorderable: true,
    })),
    ...(definition.drawnTerrainRegions ?? []).map((region) => ({
      key: tacticalEditorLayerKey("terrain-region", region.id),
      id: region.id,
      kind: "terrain-region" as const,
      label: region.id,
      detail: `${titleCase(region.kind)} · ${region.segments.length} segments`,
      reorderable: true,
    })),
    ...(definition.drawnTerrainPrimitives ?? [])
      .filter((primitive) => primitive.terrainType !== "wall")
      .map((primitive) => ({
        key: tacticalEditorLayerKey("primitive", primitive.id),
        id: primitive.id,
        kind: "primitive" as const,
        label: primitive.id,
        detail: `Circle · ${titleCase(primitive.terrainType)}`,
        reorderable: true,
      })),
  ];

  const walls: TacticalEditorLayerObject[] = [];
  (definition.drawnWalls ?? []).forEach((wall) => {
    const key = tacticalEditorLayerKey("wall", wall.id);
    walls.push({
      key,
      id: wall.id,
      kind: "wall",
      label: wall.id,
      detail: wall.control ? "Curved wall" : "Wall",
      reorderable: true,
    });
    (wall.portals ?? []).forEach((portal) => walls.push({
      key: tacticalEditorLayerKey("portal", portal.id),
      id: portal.id,
      kind: "portal",
      label: portal.id,
      detail: portal.kind === "iris-valve" ? "Iris valve" : "Door",
      parentKey: key,
      reorderable: false,
    }));
  });
  (definition.drawnTerrainPrimitives ?? [])
    .filter((primitive) => primitive.terrainType === "wall")
    .forEach((primitive) => {
      const key = tacticalEditorLayerKey("primitive", primitive.id);
      walls.push({
        key,
        id: primitive.id,
        kind: "primitive",
        label: primitive.id,
        detail: "Circular wall",
        reorderable: true,
      });
      (primitive.portals ?? []).forEach((portal) => walls.push({
        key: tacticalEditorLayerKey("portal", portal.id),
        id: portal.id,
        kind: "portal",
        label: portal.id,
        detail: portal.kind === "iris-valve" ? "Iris valve" : "Door",
        parentKey: key,
        reorderable: false,
      }));
    });

  const placements = definition.terrainPlacements.map((placement) => ({
    key: tacticalEditorLayerKey("terrain-placement", placement.id),
    id: placement.id,
    kind: "terrain-placement" as const,
    label: placement.id,
    detail: titleCase(placement.terrainDefinitionId),
    reorderable: true,
    fixture: tacticalPlacementSupportsConsoleOperations(placement),
  }));

  return [
    { id: "areas", label: "Areas", objects: areas },
    { id: "walls", label: "Walls & openings", objects: walls },
    {
      id: "elevation",
      label: "Elevation transitions",
      objects: (definition.elevationTransitions ?? []).map((transition) => ({
        key: tacticalEditorLayerKey("elevation-transition", transition.id),
        id: transition.id,
        kind: "elevation-transition",
        label: transition.id,
        detail: titleCase(transition.kind),
        reorderable: true,
      })),
    },
    {
      id: "terrain",
      label: "Terrain objects",
      objects: [
        ...placements.filter((placement) => !placement.fixture),
        ...(definition.naturalTerrainPlacements ?? []).map((placement) => ({
          key: tacticalEditorLayerKey("natural-terrain", placement.id),
          id: placement.id,
          kind: "natural-terrain" as const,
          label: placement.id,
          detail: `${titleCase(placement.kind)} · radius ${placement.radius}`,
          reorderable: true,
        })),
      ],
    },
    {
      id: "fixtures",
      label: "Fixtures & consoles",
      objects: placements.filter((placement) => placement.fixture),
    },
    {
      id: "combatants",
      label: "Combatant placements",
      objects: (definition.enemyPlacements ?? []).map((enemy) => ({
        key: tacticalEditorLayerKey("enemy", enemy.id),
        id: enemy.id,
        kind: "enemy",
        label: enemy.name,
        detail: titleCase(enemy.type),
        reorderable: true,
      })),
    },
    {
      id: "effects",
      label: "Effects & hazards",
      objects: definition.fireCells.map((point) => {
        const id = `${point.x}:${point.y}`;
        return {
          key: tacticalEditorLayerKey("fire", id),
          id,
          kind: "fire",
          label: `Fire ${point.x}, ${point.y}`,
          detail: "Fire",
          reorderable: true,
        };
      }),
    },
  ];
};

export const tacticalEditorLayerKeys = (definition: TacticalScenarioDefinitionFile) =>
  tacticalEditorLayerGroups(definition).flatMap((group) => group.objects.map((object) => object.key));

export const moveTacticalEditorLayerObject = <T,>(
  items: readonly T[],
  index: number,
  direction: -1 | 1,
): T[] => {
  const destination = index + direction;
  if (index < 0 || index >= items.length || destination < 0 || destination >= items.length) {
    return [...items];
  }
  const next = [...items];
  [next[index], next[destination]] = [next[destination]!, next[index]!];
  return next;
};

export const tacticalEditorVisibleDefinition = (
  definition: TacticalScenarioDefinitionFile,
  hiddenKeys: ReadonlySet<string>,
): TacticalScenarioDefinitionFile => {
  if (hiddenKeys.size === 0) return definition;
  return {
    ...definition,
    terrainPlacements: definition.terrainPlacements.filter((placement) =>
      !hiddenKeys.has(tacticalEditorLayerKey("terrain-placement", placement.id))),
    enemyPlacements: (definition.enemyPlacements ?? []).filter((enemy) =>
      !hiddenKeys.has(tacticalEditorLayerKey("enemy", enemy.id))),
    drawnWalls: (definition.drawnWalls ?? [])
      .filter((wall) => !hiddenKeys.has(tacticalEditorLayerKey("wall", wall.id)))
      .map((wall) => ({
        ...wall,
        portals: (wall.portals ?? []).filter((portal) =>
          !hiddenKeys.has(tacticalEditorLayerKey("portal", portal.id))),
      })),
    drawnRaisedAreas: (definition.drawnRaisedAreas ?? []).filter((area) =>
      !hiddenKeys.has(tacticalEditorLayerKey("raised-area", area.id))),
    drawnAreas: (definition.drawnAreas ?? [])
      .filter((area) => !hiddenKeys.has(tacticalEditorLayerKey("area", area.id)))
      .map((area) => ({
        ...area,
        portals: (area.portals ?? []).filter((portal) =>
          !hiddenKeys.has(tacticalEditorLayerKey("portal", portal.id))),
      })),
    drawnTerrainRegions: (definition.drawnTerrainRegions ?? []).filter((region) =>
      !hiddenKeys.has(tacticalEditorLayerKey("terrain-region", region.id))),
    drawnTerrainPrimitives: (definition.drawnTerrainPrimitives ?? [])
      .filter((primitive) => !hiddenKeys.has(tacticalEditorLayerKey("primitive", primitive.id)))
      .map((primitive) => ({
        ...primitive,
        portals: (primitive.portals ?? []).filter((portal) =>
          !hiddenKeys.has(tacticalEditorLayerKey("portal", portal.id))),
      })),
    naturalTerrainPlacements: (definition.naturalTerrainPlacements ?? []).filter((placement) =>
      !hiddenKeys.has(tacticalEditorLayerKey("natural-terrain", placement.id))),
    elevationTransitions: (definition.elevationTransitions ?? []).filter((transition) =>
      !hiddenKeys.has(tacticalEditorLayerKey("elevation-transition", transition.id))),
    fireCells: definition.fireCells.filter((point) =>
      !hiddenKeys.has(tacticalEditorLayerKey("fire", `${point.x}:${point.y}`))),
  };
};
