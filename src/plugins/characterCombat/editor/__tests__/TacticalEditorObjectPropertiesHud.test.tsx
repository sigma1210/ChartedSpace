/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import type { TacticalNaturalTerrainPlacement } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import TacticalEditorObjectPropertiesHud from "../TacticalEditorObjectPropertiesHud";

const renderHud = (overrides: Partial<ComponentProps<
  typeof TacticalEditorObjectPropertiesHud
>> = {}) => {
  const props: ComponentProps<typeof TacticalEditorObjectPropertiesHud> = {
    layout: { visible: true, pinned: false, position: { x: 10, y: 10 } },
    onLayoutChange: jest.fn(),
    naturalTerrain: null,
    naturalTerrainFootprintCellCount: 0,
    terrainRegion: null,
    onUpdateNaturalTerrainRadius: jest.fn(),
    onDeleteNaturalTerrain: jest.fn(),
    onUpdateTerrainRegionFilled: jest.fn(),
    onDeleteTerrainRegion: jest.fn(),
    ...overrides,
  };

  render(<PluginHudLayer><TacticalEditorObjectPropertiesHud {...props} /></PluginHudLayer>);
  return props;
};

describe("TacticalEditorObjectPropertiesHud", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it.each([
    ["tree", "Tree", "trunk blocks one square"],
    ["bush", "Bush", "7 cover squares · 2 AP"],
    ["rock", "Rock", "7 cover squares · 3 AP"],
  ] as const)("renders %s properties", (kind, label, description) => {
    const naturalTerrain: TacticalNaturalTerrainPlacement = {
      id: `${kind}-1`,
      kind,
      position: { x: 4, y: 6 },
      radius: 1.5,
    };

    renderHud({ naturalTerrain, naturalTerrainFootprintCellCount: 7 });

    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText(new RegExp(description))).toBeTruthy();
  });

  it("forwards natural-terrain radius and deletion", () => {
    const props = renderHud({
      naturalTerrain: {
        id: "bush-1",
        kind: "bush",
        position: { x: 4, y: 6 },
        radius: 1.5,
      },
      naturalTerrainFootprintCellCount: 7,
    });

    fireEvent.change(screen.getByLabelText("Bush radius"), { target: { value: "2.25" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete bush" }));

    expect(props.onUpdateNaturalTerrainRadius).toHaveBeenCalledWith(2.25);
    expect(props.onDeleteNaturalTerrain).toHaveBeenCalledTimes(1);
  });

  it("forwards legacy liquid-hydrogen fill and deletion", () => {
    const props = renderHud({
      terrainRegion: {
        id: "hydrogen-1",
        kind: "liquid-hydrogen",
        segments: [],
        settings: { filled: true },
      },
    });

    fireEvent.click(screen.getByLabelText("Liquid hydrogen region filled"));
    fireEvent.click(screen.getByRole("button", { name: "Delete terrain region" }));

    expect(props.onUpdateTerrainRegionFilled).toHaveBeenCalledWith(false);
    expect(props.onDeleteTerrainRegion).toHaveBeenCalledTimes(1);
  });
});
