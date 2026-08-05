/** @jest-environment jsdom */

import { render } from "@testing-library/react";
import TacticalEditorTerrainCellsLayer, {
  type TacticalEditorTerrainCellsLayerProps,
} from "../TacticalEditorTerrainCellsLayer";

const renderLayer = (terrain: TacticalEditorTerrainCellsLayerProps["terrain"]) => render(
  <svg><TacticalEditorTerrainCellsLayer terrain={terrain} /></svg>,
);

const emptyTerrain = (): TacticalEditorTerrainCellsLayerProps["terrain"] => ({
  deploymentCells: [],
  interiorCells: [],
  terrainByCell: {},
  elevationLevelByCell: {},
  closeMachineryCells: [],
  liquidHydrogenAreas: [],
  bridges: [],
});

describe("TacticalEditorTerrainCellsLayer", () => {
  it("renders deployment, interior, machinery, liquid-hydrogen, and bridge cells", () => {
    const terrain = emptyTerrain();
    terrain.deploymentCells = [{ x: 0, y: 0 }];
    terrain.interiorCells = [{ x: 1, y: 0 }];
    terrain.closeMachineryCells = [{ x: 8, y: 0 }];
    terrain.liquidHydrogenAreas = [
      { id: "filled", cells: [{ x: 9, y: 0 }], filled: true, elevationLevel: 0 },
      { id: "empty", cells: [{ x: 10, y: 0 }], filled: false, elevationLevel: 0 },
    ];
    terrain.bridges = [{ id: "bridge", cells: [{ x: 11, y: 0 }], elevationLevel: 0 }];

    const { container } = renderLayer(terrain);
    const rectAt = (x: number, y: number) => container.querySelector(`rect[x="${x}"][y="${y}"]`);

    expect(rectAt(0.05, 0.05)?.getAttribute("fill")).toBe("#22c55e");
    expect(rectAt(0.05, 0.05)?.getAttribute("pointer-events")).toBe("none");
    expect(rectAt(1, 0)?.getAttribute("fill")).toBe("#164e63");
    expect(rectAt(8, 0)?.getAttribute("opacity")).toBe("0.62");
    expect(rectAt(9.06, 0.06)?.getAttribute("stroke")).toBe("#cffafe");
    expect(rectAt(10.06, 0.06)?.getAttribute("fill")).toBe("#0f172a");
    expect(rectAt(11.08, 0.08)?.getAttribute("fill")).toBe("#7c3aed");
  });

  it("preserves the fill and opacity mapping for resolved terrain types", () => {
    const terrain = emptyTerrain();
    terrain.terrainByCell = {
      "2:0": "elevated",
      "3:0": "grass",
      "4:0": "sand",
      "5:0": "water",
      "6:0": "bush",
      "7:0": "rock",
    };
    terrain.elevationLevelByCell = { "2:0": 3 };

    const { container } = renderLayer(terrain);
    const appearanceAt = (x: number) => {
      const rect = container.querySelector(`rect[x="${x}"][y="0"]`);
      return [rect?.getAttribute("fill"), rect?.getAttribute("opacity")];
    };

    expect(appearanceAt(2)).toEqual(["#67e8f9", "0.78"]);
    expect(appearanceAt(3)).toEqual(["#3f7d20", "0.24"]);
    expect(appearanceAt(4)).toEqual(["#c2a15a", "0.24"]);
    expect(appearanceAt(5)).toEqual(["#2563a8", "0.42"]);
    expect(appearanceAt(6)).toEqual(["#4d7c0f", "0.2"]);
    expect(appearanceAt(7)).toEqual(["#475569", "0.46"]);
  });
});
