import type { GridPoint } from "./types";
import type { TacticalNaturalTerrainPlacement } from "./tacticalScenarioDefinitions";

export const tacticalNaturalTerrainFootprintCells = (
  placement: TacticalNaturalTerrainPlacement,
  mapWidth: number,
  mapHeight: number,
): GridPoint[] => {
  if (placement.kind === "tree") return [{ ...placement.position }];
  const center = {
    x: placement.position.x + 0.5,
    y: placement.position.y + 0.5,
  };
  const minimumX = Math.max(0, Math.floor(center.x - placement.radius));
  const maximumX = Math.min(mapWidth - 1, Math.floor(center.x + placement.radius));
  const minimumY = Math.max(0, Math.floor(center.y - placement.radius));
  const maximumY = Math.min(mapHeight - 1, Math.floor(center.y + placement.radius));
  const cells: GridPoint[] = [];
  for (let x = minimumX; x <= maximumX; x += 1) {
    for (let y = minimumY; y <= maximumY; y += 1) {
      if (Math.hypot(x - placement.position.x, y - placement.position.y) <= placement.radius + 1e-9) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
};
