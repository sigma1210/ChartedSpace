import { Shape } from "three";
import { tacticalDrawnRaisedAreaCells } from "@/plugins/characterCombat/tacticalDrawnRaisedAreas";
import type { TacticalDrawnRaisedArea } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  TACTICAL_TERRAIN_GRID_LIFT,
  TACTICAL_WALL_HEIGHT,
} from "./tacticalSceneGeometry";

const CURVE_SEGMENTS = 32;
const INTERSECTION_TOLERANCE = 1e-6;

type OutlinePoint = { x: number; y: number };

const tacticalDrawnRaisedAreaOutlinePoints = (
  area: TacticalDrawnRaisedArea,
) => {
  const first = area.segments[0]?.from;
  if (!first) return [];
  const points: OutlinePoint[] = [{ ...first }];
  area.segments.forEach((segment) => {
    if (segment.kind === "line") {
      points.push({ ...segment.to });
      return;
    }
    for (let index = 1; index <= CURVE_SEGMENTS; index += 1) {
      const progress = index / CURVE_SEGMENTS;
      const inverse = 1 - progress;
      points.push({
        x: inverse * inverse * segment.from.x
          + 2 * inverse * progress * segment.control.x
          + progress * progress * segment.to.x,
        y: inverse * inverse * segment.from.y
          + 2 * inverse * progress * segment.control.y
          + progress * progress * segment.to.y,
      });
    }
  });
  const last = points.at(-1);
  if (
    last
    && (Math.abs(last.x - first.x) > INTERSECTION_TOLERANCE
      || Math.abs(last.y - first.y) > INTERSECTION_TOLERANCE)
  ) {
    points.push({ ...first });
  }
  return points;
};

const uniqueSorted = (values: number[]) => values
  .sort((left, right) => left - right)
  .filter((value, index, sorted) =>
    index === 0 || Math.abs(value - sorted[index - 1]!) > INTERSECTION_TOLERANCE);

const pairedIntervals = (intersections: number[]) => {
  const sorted = uniqueSorted(intersections);
  const intervals: [number, number][] = [];
  for (let index = 0; index + 1 < sorted.length; index += 2) {
    if (sorted[index + 1]! - sorted[index]! > INTERSECTION_TOLERANCE) {
      intervals.push([sorted[index]!, sorted[index + 1]!]);
    }
  }
  return intervals;
};

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

export const tacticalDrawnRaisedAreaGridLinePositions = (
  area: TacticalDrawnRaisedArea,
  elevationLevel: number,
  mapWidth: number,
  mapHeight: number,
) => {
  const outline = tacticalDrawnRaisedAreaOutlinePoints(area);
  if (outline.length < 4) return new Float32Array();
  const height = elevationLevel * TACTICAL_WALL_HEIGHT
    + TACTICAL_TERRAIN_GRID_LIFT;
  const positions: number[] = [];
  const minX = Math.min(...outline.map((point) => point.x));
  const maxX = Math.max(...outline.map((point) => point.x));
  const minY = Math.min(...outline.map((point) => point.y));
  const maxY = Math.max(...outline.map((point) => point.y));

  for (let x = Math.ceil(minX); x <= Math.floor(maxX); x += 1) {
    const intersections: number[] = [];
    for (let index = 0; index < outline.length - 1; index += 1) {
      const from = outline[index]!;
      const to = outline[index + 1]!;
      if ((from.x <= x && to.x > x) || (to.x <= x && from.x > x)) {
        intersections.push(
          from.y + (x - from.x) * (to.y - from.y) / (to.x - from.x),
        );
      }
    }
    pairedIntervals(intersections).forEach(([fromY, toY]) => {
      positions.push(
        x - mapWidth / 2,
        height,
        fromY - mapHeight / 2,
        x - mapWidth / 2,
        height,
        toY - mapHeight / 2,
      );
    });
  }

  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y += 1) {
    const intersections: number[] = [];
    for (let index = 0; index < outline.length - 1; index += 1) {
      const from = outline[index]!;
      const to = outline[index + 1]!;
      if ((from.y <= y && to.y > y) || (to.y <= y && from.y > y)) {
        intersections.push(
          from.x + (y - from.y) * (to.x - from.x) / (to.y - from.y),
        );
      }
    }
    pairedIntervals(intersections).forEach(([fromX, toX]) => {
      positions.push(
        fromX - mapWidth / 2,
        height,
        y - mapHeight / 2,
        toX - mapWidth / 2,
        height,
        y - mapHeight / 2,
      );
    });
  }

  for (let index = 0; index < outline.length - 1; index += 1) {
    const from = outline[index]!;
    const to = outline[index + 1]!;
    positions.push(
      from.x - mapWidth / 2,
      height,
      from.y - mapHeight / 2,
      to.x - mapWidth / 2,
      height,
      to.y - mapHeight / 2,
    );
  }

  return new Float32Array(positions);
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
