import type { GridPoint } from "./types";
import type { TacticalDrawnWall } from "./tacticalScenarioDefinitions";

export type TacticalWallPortalKind = "sliding-door" | "iris-valve";

export interface TacticalWallPortalPlacementCandidate {
  wallId: string;
  kind: TacticalWallPortalKind;
  position: number;
  center: GridPoint;
  edge: { from: GridPoint; to: GridPoint };
  available: boolean;
  distanceFromWall: number;
}

const pointAlongWall = (wall: TacticalDrawnWall, distance: number) => {
  const dx = wall.to.x - wall.from.x;
  const dy = wall.to.y - wall.from.y;
  const length = Math.hypot(dx, dy);
  return {
    x: wall.from.x + dx * distance / length,
    y: wall.from.y + dy * distance / length,
  };
};

export const tacticalWallPortalPlacementCandidate = (
  walls: readonly TacticalDrawnWall[],
  point: GridPoint,
  kind: TacticalWallPortalKind,
  maximumDistance = 0.75,
): TacticalWallPortalPlacementCandidate | null => {
  const projectedWalls = walls.flatMap((wall) => {
    const dx = wall.to.x - wall.from.x;
    const dy = wall.to.y - wall.from.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return [];
    const projectedDistance = Math.max(0, Math.min(
      length,
      ((point.x - wall.from.x) * dx + (point.y - wall.from.y) * dy) / length,
    ));
    const projectedPoint = pointAlongWall(wall, projectedDistance);
    return [{
      wall,
      length,
      projectedDistance,
      distanceFromWall: Math.hypot(point.x - projectedPoint.x, point.y - projectedPoint.y),
    }];
  }).sort((first, second) => first.distanceFromWall - second.distanceFromWall);
  const nearest = projectedWalls[0];
  if (!nearest || nearest.distanceFromWall > maximumDistance) return null;

  const slotCenters: number[] = [];
  for (let center = 0.5; center <= nearest.length - 0.5 + 1e-9; center += 1) slotCenters.push(center);
  const nearestSlot = [...slotCenters].sort(
    (first, second) => Math.abs(first - nearest.projectedDistance) - Math.abs(second - nearest.projectedDistance),
  )[0] ?? Math.max(0, Math.min(nearest.length, nearest.projectedDistance));
  const availableSlot = [...slotCenters]
    .filter((center) => (nearest.wall.portals ?? []).every(
      (portal) => Math.abs(portal.position * nearest.length - center) >= 1 - 1e-9,
    ))
    .sort((first, second) => Math.abs(first - nearest.projectedDistance) - Math.abs(second - nearest.projectedDistance))[0];
  const centerDistance = availableSlot ?? nearestSlot;
  const halfStart = Math.max(0, centerDistance - 0.5);
  const halfEnd = Math.min(nearest.length, centerDistance + 0.5);
  return {
    wallId: nearest.wall.id,
    kind,
    position: nearest.length > 0 ? centerDistance / nearest.length : 0,
    center: pointAlongWall(nearest.wall, centerDistance),
    edge: {
      from: pointAlongWall(nearest.wall, halfStart),
      to: pointAlongWall(nearest.wall, halfEnd),
    },
    available: availableSlot !== undefined && halfEnd - halfStart >= 1 - 1e-9,
    distanceFromWall: nearest.distanceFromWall,
  };
};
