import { Shape } from "three";
import { tacticalDrawnRaisedAreaCells } from "@/plugins/characterCombat/tacticalDrawnRaisedAreas";
import type { TacticalDrawnRaisedArea } from "@/plugins/characterCombat/tacticalScenarioDefinitions";

export const tacticalDrawnRaisedAreaShape = (
  area: TacticalDrawnRaisedArea,
  mapWidth: number,
  mapHeight: number,
) => {
  const shape = new Shape();
  const first = area.segments[0]?.from;
  if (!first) return shape;
  shape.moveTo(first.x - mapWidth / 2, first.y - mapHeight / 2);
  area.segments.forEach((segment) => {
    if (segment.kind === "quadratic") {
      shape.quadraticCurveTo(
        segment.control.x - mapWidth / 2,
        segment.control.y - mapHeight / 2,
        segment.to.x - mapWidth / 2,
        segment.to.y - mapHeight / 2,
      );
    } else {
      shape.lineTo(
        segment.to.x - mapWidth / 2,
        segment.to.y - mapHeight / 2,
      );
    }
  });
  shape.closePath();
  return shape;
};

export const tacticalDrawnRaisedAreaCellKeys = (
  areas: TacticalDrawnRaisedArea[],
  mapWidth: number,
  mapHeight: number,
) => new Set(
  areas.flatMap((area) => tacticalDrawnRaisedAreaCells(area, mapWidth, mapHeight))
    .map((point) => `${point.x}:${point.y}`),
);

export const tacticalDrawnRaisedAreaTopLevelByCell = (
  areas: TacticalDrawnRaisedArea[],
  levels: Record<string, number>,
  mapWidth: number,
  mapHeight: number,
) => {
  const result = new Map<string, number>();
  areas.forEach((area) => {
    const level = levels[area.id] ?? 1;
    tacticalDrawnRaisedAreaCells(area, mapWidth, mapHeight).forEach((point) => {
      const key = `${point.x}:${point.y}`;
      result.set(key, Math.max(result.get(key) ?? 0, level));
    });
  });
  return result;
};

export const tacticalDrawnRaisedAreaLevelsByCell = (
  areas: TacticalDrawnRaisedArea[],
  levels: Record<string, number>,
  mapWidth: number,
  mapHeight: number,
) => {
  const result = new Map<string, Set<number>>();
  areas.forEach((area) => {
    const level = levels[area.id] ?? 1;
    tacticalDrawnRaisedAreaCells(area, mapWidth, mapHeight).forEach((point) => {
      const key = `${point.x}:${point.y}`;
      const cellLevels = result.get(key) ?? new Set<number>();
      cellLevels.add(level);
      result.set(key, cellLevels);
    });
  });
  return result;
};
