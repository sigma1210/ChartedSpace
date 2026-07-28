import type { GridPoint, WallSegment } from "./types";

const pointKey = (point: GridPoint) => `${point.x}:${point.y}`;
const movementEdgeKey = (first: GridPoint, second: GridPoint) => [pointKey(first), pointKey(second)].sort().join("|");

const crossProduct = (first: GridPoint, second: GridPoint, third: GridPoint) =>
  (second.x - first.x) * (third.y - first.y) - (second.y - first.y) * (third.x - first.x);

const pointOnSegment = (point: GridPoint, from: GridPoint, to: GridPoint) =>
  crossProduct(from, to, point) === 0
  && point.x >= Math.min(from.x, to.x)
  && point.x <= Math.max(from.x, to.x)
  && point.y >= Math.min(from.y, to.y)
  && point.y <= Math.max(from.y, to.y);

export const tacticalSegmentsIntersect = (
  firstFrom: GridPoint,
  firstTo: GridPoint,
  secondFrom: GridPoint,
  secondTo: GridPoint,
) => {
  const firstStart = crossProduct(firstFrom, firstTo, secondFrom);
  const firstEnd = crossProduct(firstFrom, firstTo, secondTo);
  const secondStart = crossProduct(secondFrom, secondTo, firstFrom);
  const secondEnd = crossProduct(secondFrom, secondTo, firstTo);
  if (
    ((firstStart > 0 && firstEnd < 0) || (firstStart < 0 && firstEnd > 0))
    && ((secondStart > 0 && secondEnd < 0) || (secondStart < 0 && secondEnd > 0))
  ) return true;
  return pointOnSegment(secondFrom, firstFrom, firstTo)
    || pointOnSegment(secondTo, firstFrom, firstTo)
    || pointOnSegment(firstFrom, secondFrom, secondTo)
    || pointOnSegment(firstTo, secondFrom, secondTo);
};

const doubledCellCenter = (point: GridPoint): GridPoint => ({
  x: point.x * 2 + 1,
  y: point.y * 2 + 1,
});

const doubledVertex = (point: GridPoint): GridPoint => ({
  x: point.x * 2,
  y: point.y * 2,
});

export const tacticalMovementStepCrossesWall = (
  from: GridPoint,
  to: GridPoint,
  wall: Pick<WallSegment, "from" | "to">,
) => tacticalSegmentsIntersect(
  doubledCellCenter(from),
  doubledCellCenter(to),
  doubledVertex(wall.from),
  doubledVertex(wall.to),
);

export const tacticalWallSegmentKey = (wall: Pick<WallSegment, "from" | "to">) => {
  const first = `${wall.from.x}:${wall.from.y}`;
  const second = `${wall.to.x}:${wall.to.y}`;
  return [first, second].sort().join("|");
};

export const tacticalWallBlockedMovementEdgeKeys = (
  wall: Pick<WallSegment, "from" | "to">,
) => {
  const blocked = new Set<string>();
  const minX = Math.floor(Math.min(wall.from.x, wall.to.x)) - 1;
  const maxX = Math.ceil(Math.max(wall.from.x, wall.to.x));
  const minY = Math.floor(Math.min(wall.from.y, wall.to.y)) - 1;
  const maxY = Math.ceil(Math.max(wall.from.y, wall.to.y));
  const diagonal = wall.from.x !== wall.to.x && wall.from.y !== wall.to.y;
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      const from = { x, y };
      for (const to of [
        { x: x + 1, y },
        { x, y: y + 1 },
        ...(diagonal ? [
          { x: x + 1, y: y + 1 },
          { x: x + 1, y: y - 1 },
        ] : []),
      ]) {
        if (tacticalMovementStepCrossesWall(from, to, wall)) {
          blocked.add(movementEdgeKey(from, to));
        }
      }
    }
  }
  return blocked;
};

export const tacticalCellsAlongWall = (
  wall: Pick<WallSegment, "from" | "to">,
) => {
  const cells: GridPoint[] = [];
  const minX = Math.floor(Math.min(wall.from.x, wall.to.x)) - 1;
  const maxX = Math.floor(Math.max(wall.from.x, wall.to.x));
  const minY = Math.floor(Math.min(wall.from.y, wall.to.y)) - 1;
  const maxY = Math.floor(Math.max(wall.from.y, wall.to.y));
  for (let x = Math.max(0, minX); x <= maxX; x += 1) {
    for (let y = Math.max(0, minY); y <= maxY; y += 1) {
      const corners = [
        { x, y },
        { x: x + 1, y },
        { x: x + 1, y: y + 1 },
        { x, y: y + 1 },
      ];
      const endpointInside = [wall.from, wall.to].some((point) =>
        point.x >= x && point.x <= x + 1 && point.y >= y && point.y <= y + 1);
      const crossesBoundary = corners.some((corner, index) =>
        tacticalSegmentsIntersect(
          wall.from,
          wall.to,
          corner,
          corners[(index + 1) % corners.length],
        ));
      if (endpointInside || crossesBoundary) cells.push({ x, y });
    }
  }
  return cells;
};

export const tacticalCellsSeparatedBySegment = (
  segment: Pick<WallSegment, "from" | "to">,
) => {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  const length = Math.hypot(dx, dy);
  const center = {
    x: (segment.from.x + segment.to.x) / 2,
    y: (segment.from.y + segment.to.y) / 2,
  };
  const normal = length > 0
    ? { x: -dy / length, y: dx / length }
    : { x: 0, y: 0 };
  const cellOnSide = (direction: number, distance: number) => ({
    x: Math.floor(center.x + normal.x * distance * direction),
    y: Math.floor(center.y + normal.y * distance * direction),
  });
  let distance = 0.51;
  let first = cellOnSide(1, distance);
  let second = cellOnSide(-1, distance);
  while (first.x === second.x && first.y === second.y && distance < 2) {
    distance += 0.5;
    first = cellOnSide(1, distance);
    second = cellOnSide(-1, distance);
  }
  return {
    first,
    second,
  };
};
