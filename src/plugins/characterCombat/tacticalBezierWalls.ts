import type { GridPoint, WallSegment } from "./types";

export interface TacticalQuadraticBezierWall {
  id: string;
  from: GridPoint;
  control: GridPoint;
  to: GridPoint;
}

export const tacticalQuadraticBezierPoint = (
  wall: Pick<TacticalQuadraticBezierWall, "from" | "control" | "to">,
  position: number,
): GridPoint => {
  const inverse = 1 - position;
  return {
    x: inverse * inverse * wall.from.x + 2 * inverse * position * wall.control.x + position * position * wall.to.x,
    y: inverse * inverse * wall.from.y + 2 * inverse * position * wall.control.y + position * position * wall.to.y,
  };
};

export const tacticalQuadraticBezierWallSegments = (
  wall: TacticalQuadraticBezierWall,
  maximumSegmentLength = 0.5,
): WallSegment[] => {
  if (!Number.isFinite(maximumSegmentLength) || maximumSegmentLength <= 0) {
    throw new Error("Bezier wall segment length must be positive.");
  }
  const firstControlLength = Math.hypot(
    wall.control.x - wall.from.x,
    wall.control.y - wall.from.y,
  );
  const secondControlLength = Math.hypot(
    wall.to.x - wall.control.x,
    wall.to.y - wall.control.y,
  );
  const samplingLength = Math.max(
    firstControlLength + secondControlLength,
    2 * Math.max(firstControlLength, secondControlLength),
  );
  const segmentCount = Math.max(1, Math.ceil(samplingLength / maximumSegmentLength));
  return Array.from({ length: segmentCount }, (_, index) => ({
    id: `${wall.id}:curve:${index + 1}`,
    from: tacticalQuadraticBezierPoint(wall, index / segmentCount),
    to: tacticalQuadraticBezierPoint(wall, (index + 1) / segmentCount),
  }));
};
