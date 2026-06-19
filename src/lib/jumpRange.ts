import { parseHex } from "./hex";
import type { SectorDetail, SectorMeta, World } from "../types";

const offsetToAxial = (col: number, row: number) => ({
  q: col - 1,
  r: (row - 1) - Math.floor((col - 1) / 2),
});

const axialToOffset = (q: number, r: number) => ({
  col: q + 1,
  row: r + Math.floor(q / 2) + 1,
});

const hexShapeCells = (radius: number): Array<[number, number]> => {
  const cells: Array<[number, number]> = [];
  for (let q = -radius; q <= radius; q++) {
    for (
      let r = Math.max(-radius, -q - radius);
      r <= Math.min(radius, -q + radius);
      r++
    ) {
      cells.push([q, r]);
    }
  }
  return cells;
};

const fmtHex = (col: number, row: number): string =>
  `${String(col).padStart(2, "0")}${String(row).padStart(2, "0")}`;

const axialDistance = (dq: number, dr: number): number =>
  Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq - dr));

export interface JumpRangeTarget {
  key: string;
  sectorAbbr: string;
  hex: string;
  name: string | null;
  starport: string | null;
  distance: number;
  dq: number;
  dr: number;
  world: World | null;
}

export interface JumpRangeCell {
  key: string;
  dq: number;
  dr: number;
  isCenter: boolean;
  distance: number;
  sectorAbbr: string | null;
  hex: string | null;
  name: string | null;
  starport: string | null;
  world: World | null;
  inRange: boolean;
}

interface JumpRangeArgs {
  shipHex: string | null | undefined;
  shipSectorAbbr: string | null | undefined;
  jumpRating: number;
  allSectors: SectorMeta[];
}

export const neededJumpSectorAbbrs = ({
  shipHex,
  shipSectorAbbr,
  jumpRating,
  allSectors,
}: JumpRangeArgs): string[] => {
  if (!shipHex || !shipSectorAbbr) return [];

  const shipCoord = parseHex(shipHex);
  const shipSectorMeta = allSectors.find(
    (sector) => sector.Abbreviation === shipSectorAbbr,
  );
  if (!shipCoord || !shipSectorMeta) return [];

  const shipAxial = offsetToAxial(shipCoord.col, shipCoord.row);
  const abbrs = new Set<string>([shipSectorAbbr]);

  for (const [dq, dr] of hexShapeCells(jumpRating)) {
    const { col, row } = axialToOffset(shipAxial.q + dq, shipAxial.r + dr);
    const sectorDx = Math.floor((col - 1) / 32);
    const sectorDy = Math.floor((row - 1) / 40);
    if (sectorDx === 0 && sectorDy === 0) continue;

    const meta = allSectors.find(
      (sector) =>
        sector.X === shipSectorMeta.X + sectorDx &&
        sector.Y === shipSectorMeta.Y + sectorDy,
    );
    if (meta) abbrs.add(meta.Abbreviation);
  }

  return Array.from(abbrs);
};

interface BuildJumpRangeTargetsArgs extends JumpRangeArgs {
  sectorData: Record<string, SectorDetail | undefined>;
}

export const buildJumpRangeTargets = ({
  shipHex,
  shipSectorAbbr,
  jumpRating,
  allSectors,
  sectorData,
}: BuildJumpRangeTargetsArgs): JumpRangeTarget[] =>
  buildJumpRangeCells({
    shipHex,
    shipSectorAbbr,
    jumpRating,
    allSectors,
    sectorData,
  })
    .filter((cell): cell is JumpRangeCell & { sectorAbbr: string; hex: string } =>
      cell.inRange && !!cell.sectorAbbr && !!cell.hex)
    .map((cell) => ({
      key: `${cell.sectorAbbr}:${cell.hex}`,
      sectorAbbr: cell.sectorAbbr,
      hex: cell.hex,
      name: cell.name,
      starport: cell.starport,
      distance: cell.distance,
      dq: cell.dq,
      dr: cell.dr,
      world: cell.world,
    }))
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return (a.name ?? a.hex).localeCompare(b.name ?? b.hex);
    });

export const buildJumpRangeCells = ({
  shipHex,
  shipSectorAbbr,
  jumpRating,
  allSectors,
  sectorData,
}: BuildJumpRangeTargetsArgs): JumpRangeCell[] => {
  if (!shipHex || !shipSectorAbbr) return [];

  const shipCoord = parseHex(shipHex);
  const shipSectorMeta = allSectors.find(
    (sector) => sector.Abbreviation === shipSectorAbbr,
  );
  if (!shipCoord || !shipSectorMeta) return [];

  const shipAxial = offsetToAxial(shipCoord.col, shipCoord.row);
  const cells: JumpRangeCell[] = [];

  for (const [dq, dr] of hexShapeCells(jumpRating)) {
    const { col, row } = axialToOffset(shipAxial.q + dq, shipAxial.r + dr);
    const sectorDx = Math.floor((col - 1) / 32);
    const sectorDy = Math.floor((row - 1) / 40);
    const localCol = col - sectorDx * 32;
    const localRow = row - sectorDy * 40;

    const targetSector =
      sectorDx === 0 && sectorDy === 0
        ? shipSectorAbbr
        : allSectors.find(
            (sector) =>
              sector.X === shipSectorMeta.X + sectorDx &&
              sector.Y === shipSectorMeta.Y + sectorDy,
          )?.Abbreviation ?? null;

    if (!targetSector) continue;

    const localHex = fmtHex(localCol, localRow);
    const world = sectorData[targetSector]?.worlds.find(
      (candidate) => candidate.hex === localHex,
    );
    const isCenter = dq === 0 && dr === 0;

    cells.push({
      key: isCenter ? "center" : `${dq},${dr}`,
      dq,
      dr,
      isCenter,
      distance: axialDistance(dq, dr),
      sectorAbbr: targetSector,
      hex: localHex,
      name: world?.name ?? null,
      starport: world?.uwp.starport ?? null,
      world: world ?? null,
      inRange: !isCenter,
    });
  }

  return cells;
};
