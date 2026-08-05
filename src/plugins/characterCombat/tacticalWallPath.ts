import type { GridPoint } from "./types";
import { tacticalQuadraticBezierWallSegments } from "./tacticalBezierWalls";

type WallPathSource = {
  id: string;
  from: GridPoint;
  to: GridPoint;
  control?: GridPoint;
};

export type TacticalWallPathSegment = {
  from: GridPoint;
  to: GridPoint;
  start: number;
  end: number;
};

export type TacticalWallPath = {
  length: number;
  segments: TacticalWallPathSegment[];
};

const interpolate = (from: GridPoint, to: GridPoint, progress: number): GridPoint => ({
  x: from.x + (to.x - from.x) * progress,
  y: from.y + (to.y - from.y) * progress,
});

export const tacticalWallPath = (wall: WallPathSource): TacticalWallPath => {
  const edges = wall.control
    ? tacticalQuadraticBezierWallSegments({ ...wall, control: wall.control })
    : [{ id: wall.id, from: wall.from, to: wall.to }];
  let cursor = 0;
  const segments = edges.flatMap((edge): TacticalWallPathSegment[] => {
    const length = Math.hypot(edge.to.x - edge.from.x, edge.to.y - edge.from.y);
    if (length <= 1e-9) return [];
    const segment = {
      from: { ...edge.from },
      to: { ...edge.to },
      start: cursor,
      end: cursor + length,
    };
    cursor += length;
    return [segment];
  });
  return { length: cursor, segments };
};

export const tacticalWallPathPoint = (
  path: TacticalWallPath,
  distance: number,
): GridPoint => {
  const bounded = Math.max(0, Math.min(path.length, distance));
  const segment = path.segments.find((item) => bounded <= item.end + 1e-9)
    ?? path.segments.at(-1);
  if (!segment) return { x: 0, y: 0 };
  const length = segment.end - segment.start;
  return interpolate(segment.from, segment.to, length > 0 ? (bounded - segment.start) / length : 0);
};

export const tacticalWallPathEdgesBetween = (
  path: TacticalWallPath,
  fromDistance: number,
  toDistance: number,
) => {
  const start = Math.max(0, Math.min(path.length, fromDistance));
  const end = Math.max(start, Math.min(path.length, toDistance));
  return path.segments.flatMap((segment) => {
    const overlapStart = Math.max(start, segment.start);
    const overlapEnd = Math.min(end, segment.end);
    if (overlapEnd - overlapStart <= 1e-9) return [];
    const length = segment.end - segment.start;
    return [{
      from: interpolate(segment.from, segment.to, (overlapStart - segment.start) / length),
      to: interpolate(segment.from, segment.to, (overlapEnd - segment.start) / length),
    }];
  });
};

export const tacticalNearestWallPathDistance = (
  path: TacticalWallPath,
  point: GridPoint,
) => path.segments.reduce((nearest, segment) => {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  const lengthSquared = dx * dx + dy * dy;
  const progress = lengthSquared > 0
    ? Math.max(0, Math.min(1, ((point.x - segment.from.x) * dx + (point.y - segment.from.y) * dy) / lengthSquared))
    : 0;
  const projected = interpolate(segment.from, segment.to, progress);
  const distanceFromWall = Math.hypot(point.x - projected.x, point.y - projected.y);
  const distance = segment.start + (segment.end - segment.start) * progress;
  return distanceFromWall < nearest.distanceFromWall
    ? { distance, distanceFromWall }
    : nearest;
}, { distance: 0, distanceFromWall: Number.POSITIVE_INFINITY });
