/** @jest-environment jsdom */

import { renderHook } from "@testing-library/react";
import { tacticalDrawnRaisedAreaCells } from "@/plugins/characterCombat/tacticalDrawnRaisedAreas";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalDrawnArea,
  type TacticalDrawnTerrainRegion,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { useTacticalEditorAreaCells } from "../useTacticalEditorAreaCells";

jest.mock("@/plugins/characterCombat/tacticalDrawnRaisedAreas", () => ({
  ...jest.requireActual("@/plugins/characterCombat/tacticalDrawnRaisedAreas"),
  tacticalDrawnRaisedAreaCells: jest.fn(() => [{ x: 2, y: 3 }]),
}));

const mockedAreaCells = jest.mocked(tacticalDrawnRaisedAreaCells);

const definitionWithAreas = () => {
  const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  const area: TacticalDrawnArea = {
    id: "room",
    segments: [],
    surface: "grass",
    elevation: 0,
    boundary: "none",
  };
  const region: TacticalDrawnTerrainRegion = {
    id: "sand",
    kind: "sand",
    segments: [],
  };
  definition.drawnAreas = [area];
  definition.drawnTerrainRegions = [region];
  return { definition, area, region };
};

describe("useTacticalEditorAreaCells", () => {
  beforeEach(() => mockedAreaCells.mockClear());

  it("does not recalculate area cells when unrelated definition state changes", () => {
    const { definition, area, region } = definitionWithAreas();
    const { result, rerender } = renderHook(
      ({ current }) => useTacticalEditorAreaCells(current),
      { initialProps: { current: definition } },
    );

    expect(mockedAreaCells).toHaveBeenCalledTimes(2);
    expect(result.current.drawnAreaCells.get(area)).toEqual([{ x: 2, y: 3 }]);
    expect(result.current.terrainRegionCells.get(region)).toEqual([{ x: 2, y: 3 }]);

    rerender({ current: { ...definition, title: "Renamed scenario" } });
    expect(mockedAreaCells).toHaveBeenCalledTimes(2);

    const changedArea = { ...area, surface: "sand" as const };
    rerender({ current: { ...definition, drawnAreas: [changedArea] } });
    expect(mockedAreaCells).toHaveBeenCalledTimes(3);
    expect(result.current.drawnAreaCells.get(changedArea)).toEqual([{ x: 2, y: 3 }]);
  });

  it("keeps invalid outlines editable by indexing an empty cell list", () => {
    const { definition, area } = definitionWithAreas();
    mockedAreaCells.mockImplementationOnce(() => {
      throw new Error("Invalid outline");
    });

    const { result } = renderHook(() => useTacticalEditorAreaCells(definition));

    expect(result.current.drawnAreaCells.get(area)).toEqual([]);
  });
});
