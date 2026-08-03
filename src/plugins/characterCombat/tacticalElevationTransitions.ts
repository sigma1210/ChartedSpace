import { pointKey } from "./geometry";
import {
  resolveTacticalScenarioTerrain,
  type TacticalScenarioDefinitionFile,
} from "./tacticalScenarioDefinitions";
import type { GridPoint } from "./types";
import { tacticalMovementStepCrossesWall } from "./tacticalSegmentGeometry";
import { tacticalDrawnRaisedAreaCells } from "./tacticalDrawnRaisedAreas";
import type { TacticalLadderMount } from "./types";

export type TacticalElevationEdgeRotation = 0 | 90 | 180 | 270;

export interface TacticalElevationEdgeCandidate {
  key: string;
  lower: GridPoint;
  upper: GridPoint;
  lowerLevel: number;
  upperLevel: number;
  edge: { from: GridPoint; to: GridPoint };
  center: { x: number; y: number };
}

export interface TacticalElevationEdgePointer {
  x: number;
  y: number;
  edgeRotation?: TacticalElevationEdgeRotation;
  mapX?: number;
  mapY?: number;
}

export interface TacticalRampPlacementPreview {
  edge: TacticalElevationEdgeCandidate;
  lower: GridPoint;
  upper: GridPoint;
  path: GridPoint[];
  valid: boolean;
  error: string | null;
}

export const TACTICAL_RAMP_MINIMUM_RUN = 2;
const TACTICAL_LADDER_HALF_WIDTH = 0.27;
const TACTICAL_LADDER_CURVE_CLEARANCE = TACTICAL_LADDER_HALF_WIDTH + 0.33;
const TACTICAL_LADDER_FACE_OFFSET = 0.09;
const TACTICAL_LADDER_JOIN_ANGLE = 25 * Math.PI / 180;

const normalizeVector = (vector: { x: number; y: number }) => {
  const length = Math.hypot(vector.x, vector.y);
  return length > 1e-9
    ? { x: vector.x / length, y: vector.y / length }
    : { x: 1, y: 0 };
};

const segmentPointAndTangent = (
  segment: NonNullable<TacticalScenarioDefinitionFile["drawnRaisedAreas"]>[number]["segments"][number],
  t: number,
) => {
  if (segment.kind === "line") {
    return {
      point: {
        x: segment.from.x + (segment.to.x - segment.from.x) * t,
        y: segment.from.y + (segment.to.y - segment.from.y) * t,
      },
      tangent: normalizeVector({
        x: segment.to.x - segment.from.x,
        y: segment.to.y - segment.from.y,
      }),
    };
  }
  const oneMinusT = 1 - t;
  if (segment.kind === "cubic") {
    return {
      point: {
        x: oneMinusT ** 3 * segment.from.x
          + 3 * oneMinusT ** 2 * t * segment.control1.x
          + 3 * oneMinusT * t ** 2 * segment.control2.x
          + t ** 3 * segment.to.x,
        y: oneMinusT ** 3 * segment.from.y
          + 3 * oneMinusT ** 2 * t * segment.control1.y
          + 3 * oneMinusT * t ** 2 * segment.control2.y
          + t ** 3 * segment.to.y,
      },
      tangent: normalizeVector({
        x: 3 * oneMinusT ** 2 * (segment.control1.x - segment.from.x)
          + 6 * oneMinusT * t * (segment.control2.x - segment.control1.x)
          + 3 * t ** 2 * (segment.to.x - segment.control2.x),
        y: 3 * oneMinusT ** 2 * (segment.control1.y - segment.from.y)
          + 6 * oneMinusT * t * (segment.control2.y - segment.control1.y)
          + 3 * t ** 2 * (segment.to.y - segment.control2.y),
      }),
    };
  }
  return {
    point: {
      x: oneMinusT * oneMinusT * segment.from.x
        + 2 * oneMinusT * t * segment.control.x
        + t * t * segment.to.x,
      y: oneMinusT * oneMinusT * segment.from.y
        + 2 * oneMinusT * t * segment.control.y
        + t * t * segment.to.y,
    },
    tangent: normalizeVector({
      x: 2 * oneMinusT * (segment.control.x - segment.from.x)
        + 2 * t * (segment.to.x - segment.control.x),
      y: 2 * oneMinusT * (segment.control.y - segment.from.y)
        + 2 * t * (segment.to.y - segment.control.y),
    }),
  };
};

export const tacticalLadderMountForEdge = (
  definition: TacticalScenarioDefinitionFile,
  edge: TacticalElevationEdgeCandidate,
): { mount: TacticalLadderMount | null; error: string | null } => {
  const owningArea = (definition.drawnRaisedAreas ?? []).find((area) => {
    const cells = new Set(
      tacticalDrawnRaisedAreaCells(
        area,
        definition.map.width,
        definition.map.height,
      ).map(pointKey),
    );
    return cells.has(pointKey(edge.upper)) && !cells.has(pointKey(edge.lower));
  });
  if (!owningArea) return { mount: null, error: null };

  const samples = owningArea.segments.map((segment, segmentIndex) => {
    let closest = {
      segmentIndex,
      t: 0,
      ...segmentPointAndTangent(segment, 0),
      distance: Number.POSITIVE_INFINITY,
    };
    for (let index = 0; index <= 64; index += 1) {
      const t = index / 64;
      const sample = segmentPointAndTangent(segment, t);
      const distance = Math.hypot(
        sample.point.x - edge.center.x,
        sample.point.y - edge.center.y,
      );
      if (distance < closest.distance) closest = {
        segmentIndex,
        t,
        ...sample,
        distance,
      };
    }
    return closest;
  }).sort((first, second) => first.distance - second.distance);
  const closest = samples[0];
  if (!closest || closest.distance > 1.25) return { mount: null, error: null };

  let tangent = closest.tangent;
  const competing = samples.find((sample) =>
    sample.segmentIndex !== closest.segmentIndex
    && sample.distance <= closest.distance + 0.06
    && Math.hypot(
      sample.point.x - closest.point.x,
      sample.point.y - closest.point.y,
    ) <= 0.16);
  if (competing) {
    const alignment = Math.abs(
      tangent.x * competing.tangent.x + tangent.y * competing.tangent.y,
    );
    if (Math.acos(Math.max(-1, Math.min(1, alignment))) > TACTICAL_LADDER_JOIN_ANGLE) {
      return {
        mount: null,
        error: "Ladders cannot be mounted where raised-area curves meet with different tangents.",
      };
    }
    const direction = tangent.x * competing.tangent.x + tangent.y * competing.tangent.y < 0 ? -1 : 1;
    tangent = normalizeVector({
      x: tangent.x + competing.tangent.x * direction,
      y: tangent.y + competing.tangent.y * direction,
    });
  }

  const selectedSegment = owningArea.segments[closest.segmentIndex];
  const chordLength = Math.hypot(
    selectedSegment.to.x - selectedSegment.from.x,
    selectedSegment.to.y - selectedSegment.from.y,
  );
  if (Math.min(closest.t, 1 - closest.t) * chordLength < TACTICAL_LADDER_CURVE_CLEARANCE) {
    const joinsAtStart = closest.t <= 0.5;
    const previousIndex = (closest.segmentIndex - 1 + owningArea.segments.length)
      % owningArea.segments.length;
    const nextIndex = (closest.segmentIndex + 1) % owningArea.segments.length;
    const incoming = joinsAtStart
      ? segmentPointAndTangent(owningArea.segments[previousIndex], 1).tangent
      : segmentPointAndTangent(selectedSegment, 1).tangent;
    const outgoing = joinsAtStart
      ? segmentPointAndTangent(selectedSegment, 0).tangent
      : segmentPointAndTangent(owningArea.segments[nextIndex], 0).tangent;
    const alignment = Math.abs(
      incoming.x * outgoing.x + incoming.y * outgoing.y,
    );
    if (Math.acos(Math.max(-1, Math.min(1, alignment))) > TACTICAL_LADDER_JOIN_ANGLE) {
      return {
        mount: null,
        error: "Ladders cannot be mounted where raised-area curves meet with different tangents.",
      };
    }
  }

  const lowerCenter = { x: edge.lower.x + 0.5, y: edge.lower.y + 0.5 };
  const normalA = { x: -tangent.y, y: tangent.x };
  const towardLower = {
    x: lowerCenter.x - closest.point.x,
    y: lowerCenter.y - closest.point.y,
  };
  const outwardNormal = normalA.x * towardLower.x + normalA.y * towardLower.y >= 0
    ? normalA
    : { x: -normalA.x, y: -normalA.y };
  return {
    mount: {
      position: {
        x: closest.point.x + outwardNormal.x * TACTICAL_LADDER_FACE_OFFSET,
        y: closest.point.y + outwardNormal.y * TACTICAL_LADDER_FACE_OFFSET,
      },
      tangent: { ...tangent },
      outwardNormal,
    },
    error: null,
  };
};

export const tacticalElevationEdgeKey = (
  first: GridPoint,
  second: GridPoint,
) => [pointKey(first), pointKey(second)].sort().join("|");

export const tacticalAdjacentCellForEdge = (
  point: TacticalElevationEdgePointer,
): GridPoint => {
  const delta = ({
    0: { x: 0, y: -1 },
    90: { x: 1, y: 0 },
    180: { x: 0, y: 1 },
    270: { x: -1, y: 0 },
  } as const)[point.edgeRotation ?? 0];
  return { x: point.x + delta.x, y: point.y + delta.y };
};

export const tacticalElevationEdgeCandidates = (
  definition: TacticalScenarioDefinitionFile,
): TacticalElevationEdgeCandidate[] => {
  const terrain = resolveTacticalScenarioTerrain(definition);
  const occupiedEdges = new Set(
    (definition.elevationTransitions ?? []).map((transition) =>
      tacticalElevationEdgeKey(transition.lower, transition.upper)),
  );
  const candidates: TacticalElevationEdgeCandidate[] = [];
  const levelAt = (point: GridPoint) =>
    terrain.elevationLevelByCell[pointKey(point)] ?? 0;
  const addCandidate = (first: GridPoint, second: GridPoint) => {
    const firstLevel = levelAt(first);
    const secondLevel = levelAt(second);
    if (Math.abs(firstLevel - secondLevel) !== 1) return;
    const key = tacticalElevationEdgeKey(first, second);
    if (occupiedEdges.has(key)) return;
    const lower = firstLevel < secondLevel ? first : second;
    const upper = firstLevel < secondLevel ? second : first;
    const verticalEdge = first.x !== second.x;
    const boundary = verticalEdge
      ? {
        from: { x: Math.max(first.x, second.x), y: first.y },
        to: { x: Math.max(first.x, second.x), y: first.y + 1 },
      }
      : {
        from: { x: first.x, y: Math.max(first.y, second.y) },
        to: { x: first.x + 1, y: Math.max(first.y, second.y) },
      };
    candidates.push({
      key,
      lower: { ...lower },
      upper: { ...upper },
      lowerLevel: Math.min(firstLevel, secondLevel),
      upperLevel: Math.max(firstLevel, secondLevel),
      edge: boundary,
      center: {
        x: (boundary.from.x + boundary.to.x) / 2,
        y: (boundary.from.y + boundary.to.y) / 2,
      },
    });
  };

  for (let y = 0; y < definition.map.height; y += 1) {
    for (let x = 0; x < definition.map.width; x += 1) {
      if (x + 1 < definition.map.width) addCandidate({ x, y }, { x: x + 1, y });
      if (y + 1 < definition.map.height) addCandidate({ x, y }, { x, y: y + 1 });
    }
  }
  return candidates;
};

export const tacticalElevationEdgeCandidateAt = (
  candidates: TacticalElevationEdgeCandidate[],
  point: TacticalElevationEdgePointer,
) => {
  const adjacent = tacticalAdjacentCellForEdge(point);
  const key = tacticalElevationEdgeKey(point, adjacent);
  return candidates.find((candidate) => candidate.key === key) ?? null;
};

const distanceToElevationEdge = (
  candidate: TacticalElevationEdgeCandidate,
  point: { x: number; y: number },
) => {
  const minX = Math.min(candidate.edge.from.x, candidate.edge.to.x);
  const maxX = Math.max(candidate.edge.from.x, candidate.edge.to.x);
  const minY = Math.min(candidate.edge.from.y, candidate.edge.to.y);
  const maxY = Math.max(candidate.edge.from.y, candidate.edge.to.y);
  const nearest = {
    x: Math.max(minX, Math.min(maxX, point.x)),
    y: Math.max(minY, Math.min(maxY, point.y)),
  };
  return Math.hypot(point.x - nearest.x, point.y - nearest.y);
};

export const tacticalNearestElevationEdgeCandidate = (
  candidates: TacticalElevationEdgeCandidate[],
  point: TacticalElevationEdgePointer,
  maxDistance = 0.7,
) => {
  if (point.mapX === undefined || point.mapY === undefined) {
    return tacticalElevationEdgeCandidateAt(candidates, point);
  }
  const nearest = candidates
    .map((candidate) => ({
      candidate,
      distance: distanceToElevationEdge(candidate, {
        x: point.mapX!,
        y: point.mapY!,
      }),
    }))
    .sort((first, second) => first.distance - second.distance)[0];
  return nearest && nearest.distance <= maxDistance ? nearest.candidate : null;
};

export const tacticalRampPlacementPreview = (
  definition: TacticalScenarioDefinitionFile,
  edge: TacticalElevationEdgeCandidate,
  point: TacticalElevationEdgePointer,
): TacticalRampPlacementPreview => {
  const terrain = resolveTacticalScenarioTerrain(definition);
  const direction = {
    x: edge.lower.x - edge.upper.x,
    y: edge.lower.y - edge.upper.y,
  };
  const pointer = {
    x: point.mapX ?? point.x + 0.5,
    y: point.mapY ?? point.y + 0.5,
  };
  const upperCenter = { x: edge.upper.x + 0.5, y: edge.upper.y + 0.5 };
  const delta = { x: pointer.x - upperCenter.x, y: pointer.y - upperCenter.y };
  const projectedDistance = delta.x * direction.x + delta.y * direction.y;
  const perpendicularDistance = Math.abs(delta.x * direction.y - delta.y * direction.x);
  const run = Math.max(1, Math.round(projectedDistance));
  const lower = {
    x: edge.upper.x + direction.x * run,
    y: edge.upper.y + direction.y * run,
  };
  const path = Array.from({ length: run + 1 }, (_, index) => ({
    x: lower.x - direction.x * index,
    y: lower.y - direction.y * index,
  }));
  let error: string | null = null;
  if (perpendicularDistance > 0.75) {
    error = "A ramp must extend straight outward from the selected platform edge.";
  } else if (run < TACTICAL_RAMP_MINIMUM_RUN) {
    error = `A ramp must extend at least ${TACTICAL_RAMP_MINIMUM_RUN} squares from the platform.`;
  } else if (path.some((cell) =>
    cell.x < 0 || cell.y < 0 || cell.x >= definition.map.width || cell.y >= definition.map.height)) {
    error = "The ramp extends outside the map.";
  } else {
    const blockedCells = new Set([
      ...terrain.objects.map((object) => pointKey(object.position)),
      ...terrain.closeMachineryCells.map(pointKey),
    ]);
    const blocked = path.slice(0, -1).find((cell) => blockedCells.has(pointKey(cell)));
    if (blocked) {
      error = `The ramp crosses blocked terrain at ${pointKey(blocked)}.`;
    } else {
      const blockedStep = path.slice(1).find((cell, index) => [
        ...terrain.walls,
        ...terrain.doors,
      ].some((boundary) => tacticalMovementStepCrossesWall(path[index], cell, boundary)));
      if (blockedStep) {
        error = `The ramp crosses a wall or door before ${pointKey(blockedStep)}.`;
      }
      const occupiedTransitionCells = new Set(
        (definition.elevationTransitions ?? []).flatMap((transition) =>
          (transition.path ?? [transition.lower, transition.upper]).map(pointKey)),
      );
      const overlap = !error
        ? path.find((cell) => occupiedTransitionCells.has(pointKey(cell)))
        : undefined;
      if (overlap) {
        error = `The ramp overlaps another elevation transition at ${pointKey(overlap)}.`;
      }
      const farEndpointLevel = terrain.elevationLevelByCell[pointKey(lower)] ?? 0;
      const wrongRampLevel = path.slice(0, -1).find((cell) =>
        (terrain.elevationLevelByCell[pointKey(cell)] ?? 0) !== edge.lowerLevel);
      const wrongBridgeLevel = path.slice(1, -1).find((cell) =>
        (terrain.elevationLevelByCell[pointKey(cell)] ?? 0) !== edge.lowerLevel);
      if (!error && farEndpointLevel !== edge.lowerLevel
        && farEndpointLevel !== edge.upperLevel) {
        error = `The ramp must end on level ${edge.lowerLevel} or a matching level ${edge.upperLevel} platform.`;
      } else if (!error && farEndpointLevel === edge.upperLevel && wrongBridgeLevel) {
        error = `A bridge must cross level ${edge.lowerLevel} until it reaches the matching platform.`;
      } else if (!error && farEndpointLevel === edge.lowerLevel && wrongRampLevel) {
        error = `The ramp must remain on level ${edge.lowerLevel} until it reaches the platform.`;
      }
    }
  }
  return {
    edge,
    lower,
    upper: { ...edge.upper },
    path,
    valid: error === null,
    error,
  };
};

export const tacticalRampPlacementCandidate = (
  definition: TacticalScenarioDefinitionFile,
  edge: TacticalElevationEdgeCandidate,
  point: TacticalElevationEdgePointer,
) => {
  const preview = tacticalRampPlacementPreview(definition, edge, point);
  if (!preview.valid) throw new Error(preview.error ?? "That ramp is not valid.");
  let suffix = 1;
  let id = `ramp-${suffix}`;
  while ((definition.elevationTransitions ?? []).some((transition) => transition.id === id)) {
    suffix += 1;
    id = `ramp-${suffix}`;
  }
  const transition = {
    id,
    kind: "ramp" as const,
    lower: { ...preview.lower },
    upper: { ...preview.upper },
    path: preview.path.map((cell) => ({ ...cell })),
  };
  const candidate = {
    ...definition,
    elevationTransitions: [...(definition.elevationTransitions ?? []), transition],
  };
  resolveTacticalScenarioTerrain(candidate);
  return { definition: candidate, transition, preview };
};
