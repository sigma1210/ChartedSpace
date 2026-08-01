import type {
  TacticalAreaOutlineSegment,
  TacticalDrawnCirclePrimitive,
} from "./tacticalScenarioDefinitions";
import type { TacticalWallPortalKind, TacticalWallPortalPlacementCandidate } from "./tacticalWallPortals";

const CIRCLE_SEGMENT_COUNT = 8;

export const tacticalCirclePrimitiveOutline = (
  primitive: Pick<TacticalDrawnCirclePrimitive, "center" | "radius">,
): TacticalAreaOutlineSegment[] => {
  const vertices = Array.from({ length: CIRCLE_SEGMENT_COUNT }, (_, index) => {
    const angle = index * Math.PI * 2 / CIRCLE_SEGMENT_COUNT;
    return {
      x: primitive.center.x + Math.cos(angle) * primitive.radius,
      y: primitive.center.y + Math.sin(angle) * primitive.radius,
    };
  });
  const halfAngle = Math.PI / CIRCLE_SEGMENT_COUNT;
  const controlRadius = primitive.radius / Math.cos(halfAngle);

  return vertices.map((from, index) => {
    const to = vertices[(index + 1) % vertices.length];
    const middleAngle = (index + 0.5) * Math.PI * 2 / CIRCLE_SEGMENT_COUNT;
    return {
      kind: "quadratic",
      from: { ...from },
      control: {
        x: primitive.center.x + Math.cos(middleAngle) * controlRadius,
        y: primitive.center.y + Math.sin(middleAngle) * controlRadius,
      },
      to: { ...to },
    };
  });
};

const normalizeCirclePosition = (position: number) => ((position % 1) + 1) % 1;
const circularPositionDistance = (first: number, second: number) =>
  Math.abs(((first - second + 0.5) % 1 + 1) % 1 - 0.5);
const circlePointAt = (
  circle: Pick<TacticalDrawnCirclePrimitive, "center" | "radius">,
  position: number,
) => {
  const angle = normalizeCirclePosition(position) * Math.PI * 2;
  return {
    x: circle.center.x + Math.cos(angle) * circle.radius,
    y: circle.center.y + Math.sin(angle) * circle.radius,
  };
};
const circlePortalHalfPosition = (radius: number) =>
  Math.asin(Math.min(1, 0.5 / radius)) / (Math.PI * 2);

export const tacticalCirclePortalPlacementCandidate = (
  circles: readonly TacticalDrawnCirclePrimitive[],
  point: { x: number; y: number },
  kind: TacticalWallPortalKind,
  maximumDistance = 0.75,
  ignoredPortalId?: string,
): TacticalWallPortalPlacementCandidate | null => {
  const candidates = circles
    .filter((circle) => circle.terrainType === "wall")
    .map((circle) => {
      const dx = point.x - circle.center.x;
      const dy = point.y - circle.center.y;
      const angle = Math.atan2(dy, dx);
      const position = normalizeCirclePosition(angle / (Math.PI * 2));
      const center = circlePointAt(circle, position);
      return {
        circle,
        position,
        center,
        distanceFromWall: Math.abs(Math.hypot(dx, dy) - circle.radius),
      };
    })
    .sort((first, second) => first.distanceFromWall - second.distanceFromWall);
  const nearest = candidates[0];
  if (!nearest || nearest.distanceFromWall > maximumDistance) return null;
  const halfPortalPosition = circlePortalHalfPosition(nearest.circle.radius);
  const available = nearest.circle.radius >= 0.5
    && (nearest.circle.portals ?? []).every((portal) =>
      portal.id === ignoredPortalId
      || circularPositionDistance(portal.position, nearest.position) >= halfPortalPosition * 2 - 1e-9);
  return {
    wallId: nearest.circle.id,
    kind,
    position: nearest.position,
    center: nearest.center,
    edge: {
      from: circlePointAt(nearest.circle, nearest.position - halfPortalPosition),
      to: circlePointAt(nearest.circle, nearest.position + halfPortalPosition),
    },
    available,
    distanceFromWall: nearest.distanceFromWall,
  };
};

export const tacticalCirclePortalRepositionCandidate = (
  circles: readonly TacticalDrawnCirclePrimitive[],
  circleId: string,
  portalId: string,
  point: { x: number; y: number },
  maximumDistance = 0.75,
) => {
  const circle = circles.find((candidate) => candidate.id === circleId);
  const portal = circle?.portals?.find((candidate) => candidate.id === portalId);
  if (!circle || !portal) return null;
  return tacticalCirclePortalPlacementCandidate(
    [circle],
    point,
    portal.kind,
    maximumDistance,
    portalId,
  );
};

export const tacticalCircleWallBoundary = (
  circle: TacticalDrawnCirclePrimitive,
  maximumWallLength = 0.25,
) => {
  const circumference = Math.PI * 2 * circle.radius;
  const halfPortalPosition = circlePortalHalfPosition(circle.radius);
  // Leave a very small clearance beyond each one-unit portal chord. Without
  // this, a sight or movement ray along a cell center can touch the first wall
  // segment at the portal endpoint and incorrectly treat an open portal as shut.
  const halfOpeningPosition = halfPortalPosition + 0.01 / circumference;
  const nodeCount = Math.max(8, Math.ceil(circumference / maximumWallLength));
  const nodes = new Set(Array.from({ length: nodeCount }, (_, index) => index / nodeCount));
  (circle.portals ?? []).forEach((portal) => {
    nodes.add(normalizeCirclePosition(portal.position - halfOpeningPosition));
    nodes.add(normalizeCirclePosition(portal.position + halfOpeningPosition));
  });
  const positions = [...nodes].sort((first, second) => first - second);
  const walls: { id: string; from: { x: number; y: number }; to: { x: number; y: number } }[] = [];
  positions.forEach((fromPosition, index) => {
    const rawTo = index === positions.length - 1 ? positions[0] + 1 : positions[index + 1];
    const middle = normalizeCirclePosition((fromPosition + rawTo) / 2);
    const insidePortal = (circle.portals ?? []).some((portal) =>
      circularPositionDistance(middle, portal.position) < halfOpeningPosition - 1e-9);
    if (insidePortal) return;
    walls.push({
      id: `${circle.id}:wall:${walls.length + 1}`,
      from: circlePointAt(circle, fromPosition),
      to: circlePointAt(circle, rawTo),
    });
  });
  return {
    walls,
    portals: (circle.portals ?? []).map((portal) => ({
      ...portal,
      from: circlePointAt(circle, portal.position - halfPortalPosition),
      to: circlePointAt(circle, portal.position + halfPortalPosition),
    })),
  };
};
