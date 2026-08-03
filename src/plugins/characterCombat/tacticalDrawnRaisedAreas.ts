import { tacticalQuadraticBezierPoint } from "./tacticalBezierWalls";
import type {
  TacticalDrawnArea,
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
  const controls = segment.kind === "quadratic"
    ? [segment.from, segment.control, segment.to]
    : [segment.from, segment.control1, segment.control2, segment.to];
  const samplingLength = controls.slice(0, -1).reduce((length, point, index) =>
    length + Math.hypot(controls[index + 1]!.x - point.x, controls[index + 1]!.y - point.y), 0);
  const segmentCount = Math.max(1, Math.ceil(samplingLength / 0.25));
  return Array.from({ length: segmentCount }, (_, index) => ({
    from: segment.kind === "quadratic"
      ? tacticalQuadraticBezierPoint(segment, index / segmentCount)
      : cubicBezierPoint(segment, index / segmentCount),
    to: segment.kind === "quadratic"
      ? tacticalQuadraticBezierPoint(segment, (index + 1) / segmentCount)
      : cubicBezierPoint(segment, (index + 1) / segmentCount),
  }));
};

const cubicBezierPoint = (
  segment: Extract<TacticalRaisedAreaOutlineSegment, { kind: "cubic" }>,
  progress: number,
): GridPoint => {
  const inverse = 1 - progress;
  return {
    x: inverse ** 3 * segment.from.x
      + 3 * inverse ** 2 * progress * segment.control1.x
      + 3 * inverse * progress ** 2 * segment.control2.x
      + progress ** 3 * segment.to.x,
    y: inverse ** 3 * segment.from.y
      + 3 * inverse ** 2 * progress * segment.control1.y
      + 3 * inverse * progress ** 2 * segment.control2.y
      + progress ** 3 * segment.to.y,
  };
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
      || (segment.kind === "cubic" && (!validVertex(segment.control1) || !validVertex(segment.control2)))
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

/** Later entries are frontmost, matching the editor Layers ordering. */
export const tacticalDrawnAreaOwnerByCell = (
  areas: TacticalDrawnArea[],
  mapWidth: number,
  mapHeight: number,
) => {
  const owners = new Map<string, TacticalDrawnArea>();
  areas.forEach((area) => {
    tacticalDrawnRaisedAreaCells(area, mapWidth, mapHeight).forEach((point) => {
      owners.set(`${point.x}:${point.y}`, area);
    });
  });
  return owners;
};
