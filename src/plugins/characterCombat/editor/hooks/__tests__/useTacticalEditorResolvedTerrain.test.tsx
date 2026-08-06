/** @jest-environment jsdom */

import { renderHook } from "@testing-library/react";
import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  resolveTacticalEditorTerrain,
  useTacticalEditorResolvedTerrain,
} from "../useTacticalEditorResolvedTerrain";

const definition = (overrides: Partial<TacticalScenarioDefinitionFile> = {}): TacticalScenarioDefinitionFile => ({
  schemaVersion: 1,
  id: "terrain-resolution-test",
  title: "Terrain resolution test",
  briefing: "",
  objective: "",
  map: { width: 20, height: 12 },
  terrainPlacements: [],
  fireCells: [],
  smokeCells: [],
  ...overrides,
});

describe("useTacticalEditorResolvedTerrain", () => {
  it("returns resolved terrain for a valid definition", () => {
    const scenario = definition();
    const { result } = renderHook(() => useTacticalEditorResolvedTerrain(scenario));

    expect(result.current.error).toBeNull();
    expect(result.current.terrain).toMatchObject({
      walls: [],
      doors: [],
      terrainObjects: [],
      drawnAreas: [],
    });
  });

  it("returns the resolver error message for an invalid definition", () => {
    const scenario = definition({
      terrainPlacements: [{
        id: "missing",
        terrainDefinitionId: "missing-definition",
        origin: { x: 2, y: 2 },
        rotation: 0,
      }],
    });
    const { result } = renderHook(() => useTacticalEditorResolvedTerrain(scenario));

    expect(result.current.terrain).toBeNull();
    expect(result.current.error).toContain("missing-definition");
  });

  it("normalizes non-Error resolver failures", () => {
    const result = resolveTacticalEditorTerrain(definition(), () => {
      throw "resolution failed";
    });

    expect(result).toEqual({
      terrain: null,
      error: "The draft could not be resolved.",
    });
  });

  it("recomputes when the definition changes and memoizes an unchanged definition", () => {
    const valid = definition();
    const invalid = definition({
      terrainPlacements: [{
        id: "missing",
        terrainDefinitionId: "missing-definition",
        origin: { x: 2, y: 2 },
        rotation: 0,
      }],
    });
    const { result, rerender } = renderHook(({ scenario }) => useTacticalEditorResolvedTerrain(scenario), {
      initialProps: { scenario: valid },
    });
    const firstResult = result.current;

    rerender({ scenario: valid });
    expect(result.current).toBe(firstResult);
    rerender({ scenario: invalid });
    expect(result.current).not.toBe(firstResult);
    expect(result.current.terrain).toBeNull();
    expect(result.current.error).toContain("missing-definition");
  });
});
