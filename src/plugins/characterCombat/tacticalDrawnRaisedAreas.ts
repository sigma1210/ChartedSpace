import { tacticalQuadraticBezierPoint } from "./tacticalBezierWalls";
import type {
  TacticalDrawnRaisedArea,
  TacticalRaisedAreaOutlineSegment,
} from "./tacticalScenarioDefinitions";
import type { GridPoint } from "./types";

type OutlineLine = {
  from: GridPoint;
  to: GridPoint;
};

const EPSILON = 1e-9;
const samePoint = (first: GridPoint, second: GridPoint) =>
  Math.abs(first.x - second.x) <= EPSILON
  && Math.abs(first.y - second.y) <= EPSILON;
const cross = (first: GridPoint, second: GridPoint, third: GridPoint) =>
  (second.x - first.x) * (third.y - first.y)
  - (second.y - first.y) * (third.x - first.x);
const pointOnLine = (point: GridPoint, line: OutlineLine) =>
  Math.abs(cross(line.from, line.to, point)) <= EPSILON
  && point.x >= Math.min(line.from.x, line.to.x) - EPSILON
  && point.x <= Math.max(line.from.x, line.to.x) + EPSILON
  && point.y >= Math.min(line.from.y, line.to.y) - EPSILON
  && point.y <= Math.max(line.from.y, line.to.y) + EPSILON;
const linesIntersect = (first: OutlineLine, second: OutlineLine) => {
  const firstStart = cross(first.from, first.to, second.from);
  const firstEnd = cross(first.from, first.to, second.to);
  const secondStart = cross(second.from, second.to, first.from);
  const secondEnd = cross(second.from, second.to, first.to);
  if (
    ((firstStart > EPSILON && firstEnd < -EPSILON)
      || (firstStart < -EPSILON && firstEnd > EPSILON))
    && ((secondStart > EPSILON && secondEnd < -EPSILON)
      || (secondStart < -EPSILON && secondEnd > EPSILON))
  ) return true;
  return pointOnLine(second.from, first)
    || pointOnLine(second.to, first)
    || pointOnLine(first.from, second)
    || pointOnLine(first.to, second);
};

const flattenedSegmentLines = (
  segment: TacticalRaisedAreaOutlineSegment,
): OutlineLine[] => {
  if (segment.kind === "line") {
    return [{ from: { ...segment.from }, to: { ...segment.to } }];
  }
  const samplingLength = Math.max(
    Math.hypot(
      segment.control.x - segment.from.x,
      segment.control.y - segment.from.y,
    ) + Math.hypot(
      segment.to.x - segment.control.x,
      segment.to.y - segment.control.y,
    ),
    2 * Math.max(
      Math.hypot(
        segment.control.x - segment.from.x,
        segment.control.y - segment.from.y,
      ),
      Math.hypot(
        segment.to.x - segment.control.x,
        segment.to.y - segment.control.y,
      ),
    ),
  );
  const segmentCount = Math.max(1, Math.ceil(samplingLength / 0.25));
  return Array.from({ length: segmentCount }, (_, index) => ({
    from: tacticalQuadraticBezierPoint(
      segment,
      index / segmentCount,
    ),
    to: tacticalQuadraticBezierPoint(
      segment,
      (index + 1) / segmentCount,
    ),
  }));
};

export const tacticalRaisedAreaOutlineLines = (
  area: TacticalDrawnRaisedArea,
) => area.segments.flatMap(flattenedSegmentLines);

const validateOutline = (
  area: TacticalDrawnRaisedArea,
  mapWidth: number,
  mapHeight: number,
) => {
  if (!area.id.trim()) throw new Error("A drawn raised area requires an ID.");
  if (area.segments.length < 3) {
    throw new Error(`Drawn raised area ${area.id} requires at least three segments.`);
  }
  const validVertex = (point: GridPoint) =>
    Number.isFinite(point.x)
    && Number.isFinite(point.y)
    && point.x >= 0
    && point.y >= 0
    && point.x <= mapWidth
    && point.y <= mapHeight;
  area.segments.forEach((segment, index) => {
    if (
      !validVertex(segment.from)
      || !validVertex(segment.to)
      || (segment.kind === "quadratic" && !validVertex(segment.control))
    ) {
      throw new Error(`Drawn raised area ${area.id} extends outside the map.`);
    }
    if (samePoint(segment.from, segment.to)) {
      throw new Error(`Drawn raised area ${area.id} contains an empty segment.`);
    }
    const next = area.segments[(index + 1) % area.segments.length];
    if (!samePoint(segment.to, next.from)) {
      throw new Error(`Drawn raised area ${area.id} outline must be closed.`);
    }
  });

  const lines = tacticalRaisedAreaOutlineLines(area);
  for (let firstIndex = 0; firstIndex < lines.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < lines.length; secondIndex += 1) {
      const adjacent = secondIndex === firstIndex + 1
        || (firstIndex === 0 && secondIndex === lines.length - 1);
      if (adjacent) continue;
      if (linesIntersect(lines[firstIndex], lines[secondIndex])) {
        throw new Error(`Drawn raised area ${area.id} outline intersects itself.`);
      }
    }
  }
};

const pointInsideOutline = (point: GridPoint, lines: OutlineLine[]) => {
  if (lines.some((line) => pointOnLine(point, line))) return true;
  let inside = false;
  lines.forEach((line) => {
    const crosses = (line.from.y > point.y) !== (line.to.y > point.y);
    if (!crosses) return;
    const crossingX = line.from.x
      + (point.y - line.from.y)
      * (line.to.x - line.from.x)
      / (line.to.y - line.from.y);
    if (crossingX > point.x) inside = !inside;
  });
  return inside;
};

export const tacticalDrawnRaisedAreaCells = (
  area: TacticalDrawnRaisedArea,
  mapWidth: number,
  mapHeight: number,
) => {
  validateOutline(area, mapWidth, mapHeight);
  const lines = tacticalRaisedAreaOutlineLines(area);
  const cells: GridPoint[] = [];
  for (let x = 0; x < mapWidth; x += 1) {
    for (let y = 0; y < mapHeight; y += 1) {
      if (pointInsideOutline({ x: x + 0.5, y: y + 0.5 }, lines)) {
        cells.push({ x, y });
      }
    }
  }
  if (cells.length === 0) {
    throw new Error(`Drawn raised area ${area.id} must contain at least one grid cell.`);
  }
  return cells;
};
