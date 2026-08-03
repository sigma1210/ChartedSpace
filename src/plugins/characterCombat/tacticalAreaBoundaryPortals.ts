import { tacticalRaisedAreaOutlineLines } from "./tacticalDrawnRaisedAreas";
import type { TacticalDrawnArea } from "./tacticalScenarioDefinitions";
import type { GridPoint } from "./types";
import type { TacticalWallPortalKind, TacticalWallPortalPlacementCandidate } from "./tacticalWallPortals";

type MeasuredLine = {
  from: GridPoint;
  to: GridPoint;
  start: number;
  end: number;
  length: number;
};

const measuredBoundary = (area: TacticalDrawnArea) => {
  let distance = 0;
  const lines: MeasuredLine[] = tacticalRaisedAreaOutlineLines(area).map((line) => {
    const length = Math.hypot(line.to.x - line.from.x, line.to.y - line.from.y);
    const measured = { ...line, start: distance, end: distance + length, length };
    distance += length;
    return measured;
  }).filter((line) => line.length > 1e-9);
  return { lines, length: distance };
};

const linePoint = (line: MeasuredLine, distance: number) => {
  const progress = line.length > 0 ? (distance - line.start) / line.length : 0;
  return {
    x: line.from.x + (line.to.x - line.from.x) * progress,
    y: line.from.y + (line.to.y - line.from.y) * progress,
  };
};

const boundaryPoint = (boundary: ReturnType<typeof measuredBoundary>, distance: number) => {
  const clamped = Math.max(0, Math.min(boundary.length, distance));
  const line = boundary.lines.find((candidate) => clamped <= candidate.end + 1e-9)
    ?? boundary.lines[boundary.lines.length - 1];
  return line ? linePoint(line, clamped) : { x: 0, y: 0 };
};

const physicalPortalDistance = (first: number, second: number, boundaryLength: number) => {
  const direct = Math.abs(first - second);
  return Math.min(direct, Math.max(0, boundaryLength - direct));
};

const wrappedBoundaryDistance = (distance: number, boundaryLength: number) =>
  ((distance % boundaryLength) + boundaryLength) % boundaryLength;

export const tacticalAreaBoundaryPortalPlacementCandidate = (
  areas: readonly TacticalDrawnArea[],
  point: GridPoint,
  kind: TacticalWallPortalKind,
  maximumDistance = 0.75,
): TacticalWallPortalPlacementCandidate | null => {
  const projected = areas.filter((area) => area.boundary === "wall").flatMap((area) => {
    const boundary = measuredBoundary(area);
    return boundary.lines.map((line) => {
      const dx = line.to.x - line.from.x;
      const dy = line.to.y - line.from.y;
      const progress = Math.max(0, Math.min(1,
        ((point.x - line.from.x) * dx + (point.y - line.from.y) * dy) / (line.length * line.length),
      ));
      const projectedPoint = {
        x: line.from.x + dx * progress,
        y: line.from.y + dy * progress,
      };
      return {
        area,
        boundary,
        projectedDistance: line.start + line.length * progress,
        distanceFromWall: Math.hypot(point.x - projectedPoint.x, point.y - projectedPoint.y),
      };
    });
  }).sort((first, second) => first.distanceFromWall - second.distanceFromWall);
  const nearest = projected[0];
  if (!nearest || nearest.distanceFromWall > maximumDistance || nearest.boundary.length < 1) return null;

  const slotCenters: number[] = [];
  for (let center = 0; center < nearest.boundary.length - 1e-9; center += 1) {
    slotCenters.push(center);
  }
  const nearestSlot = [...slotCenters].sort((first, second) =>
    physicalPortalDistance(first, nearest.projectedDistance, nearest.boundary.length)
      - physicalPortalDistance(second, nearest.projectedDistance, nearest.boundary.length))[0];
  if (nearestSlot === undefined) return null;
  const availableSlot = [...slotCenters]
    .filter((center) => (nearest.area.portals ?? []).every((portal) =>
      physicalPortalDistance(
        wrappedBoundaryDistance(portal.position * nearest.boundary.length, nearest.boundary.length),
        center,
        nearest.boundary.length,
      ) >= 1 - 1e-9))
    .sort((first, second) =>
      physicalPortalDistance(first, nearest.projectedDistance, nearest.boundary.length)
        - physicalPortalDistance(second, nearest.projectedDistance, nearest.boundary.length))[0];
  const centerDistance = availableSlot ?? nearestSlot;
  return {
    wallId: nearest.area.id,
    kind,
    position: centerDistance / nearest.boundary.length,
    center: boundaryPoint(nearest.boundary, centerDistance),
    edge: {
      from: boundaryPoint(nearest.boundary, centerDistance - 0.5),
      to: boundaryPoint(nearest.boundary, centerDistance + 0.5),
    },
    available: availableSlot !== undefined,
    distanceFromWall: nearest.distanceFromWall,
  };
};

export const tacticalAreaBoundaryPortalRepositionCandidate = (
  areas: readonly TacticalDrawnArea[],
  areaId: string,
  portalId: string,
  point: GridPoint,
  maximumDistance = 0.75,
) => {
  const area = areas.find((candidate) => candidate.id === areaId);
  const portal = area?.portals?.find((candidate) => candidate.id === portalId);
  if (!area || !portal) return null;
  return tacticalAreaBoundaryPortalPlacementCandidate(
    [{ ...area, portals: (area.portals ?? []).filter((candidate) => candidate.id !== portalId) }],
    point,
    portal.kind,
    maximumDistance,
  );
};

export const tacticalAreaBoundaryPortalLayout = (area: TacticalDrawnArea) => {
  const boundary = measuredBoundary(area);
  if (area.boundary !== "wall") throw new Error(`Area ${area.id} must have a wall boundary to contain portals.`);
  if (boundary.length < 1 && (area.portals?.length ?? 0) > 0) {
    throw new Error(`Area ${area.id} boundary is too short for a portal.`);
  }
  const portals = [...(area.portals ?? [])].map((portal) => {
    if (!Number.isFinite(portal.position) || portal.position < 0 || portal.position > 1) {
      throw new Error(`Portal ${portal.id} must have a position between 0 and 1.`);
    }
    const center = wrappedBoundaryDistance(portal.position * boundary.length, boundary.length);
    return { ...portal, center };
  }).sort((first, second) => first.center - second.center);
  portals.forEach((portal, index) => {
    if (portals.some((other, otherIndex) => otherIndex !== index
      && physicalPortalDistance(portal.center, other.center, boundary.length) < 1 - 1e-9)) {
      throw new Error(`Portal ${portal.id} overlaps another portal on area boundary ${area.id}.`);
    }
  });

  const openingIntervals = portals.flatMap((portal) => {
    const start = portal.center - 0.5;
    const end = portal.center + 0.5;
    if (start < 0) return [{ start: 0, end }, { start: boundary.length + start, end: boundary.length }];
    if (end > boundary.length) return [{ start, end: boundary.length }, { start: 0, end: end - boundary.length }];
    return [{ start, end }];
  });

  let wallIndex = 0;
  const walls = boundary.lines.flatMap((line) => {
    const cuts = [line.start, line.end, ...openingIntervals.flatMap((opening) => [opening.start, opening.end])]
      .filter((distance) => distance >= line.start - 1e-9 && distance <= line.end + 1e-9)
      .sort((first, second) => first - second)
      .filter((distance, index, values) => index === 0 || Math.abs(distance - values[index - 1]!) > 1e-9);
    return cuts.slice(0, -1).flatMap((start, index) => {
      const end = cuts[index + 1]!;
      if (end - start <= 1e-9) return [];
      const midpoint = (start + end) / 2;
      if (openingIntervals.some((opening) => midpoint > opening.start - 1e-9 && midpoint < opening.end + 1e-9)) return [];
      wallIndex += 1;
      return [{
        id: `${area.id}:boundary:section:${wallIndex}`,
        from: linePoint(line, start),
        to: linePoint(line, end),
      }];
    });
  });
  return {
    walls,
    portals: portals.map((portal) => ({
      id: portal.id,
      kind: portal.kind,
      from: boundaryPoint(boundary, wrappedBoundaryDistance(portal.center - 0.5, boundary.length)),
      to: boundaryPoint(boundary, wrappedBoundaryDistance(portal.center + 0.5, boundary.length)),
    })),
  };
};
