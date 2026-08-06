/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type {
  TacticalEnemyPlacement,
  TacticalTerrainPlacement,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import TacticalEditorScenarioMarkersLayer, {
  type TacticalEditorScenarioMarkersLayerProps,
} from "../TacticalEditorScenarioMarkersLayer";

const placement: TacticalTerrainPlacement = {
  id: "bridge",
  terrainDefinitionId: "bridge-wide",
  origin: { x: 6, y: 3 },
  rotation: 90,
};

const enemy: TacticalEnemyPlacement = {
  id: "guard",
  type: "gang-member",
  name: "Guard",
  position: { x: 2, y: 2 },
  facing: "east",
  avatarPath: "/guard.png",
};

const props = (): TacticalEditorScenarioMarkersLayerProps => ({
  placementControls: [{ placement, size: { width: 2, height: 4 } }],
  fireCells: [{ x: 4, y: 5 }],
  enemies: [enemy],
  enemyHover: null,
  enemyPreviewActive: false,
  selectedPlacementId: null,
  selectedEnemyId: null,
  selectedFire: null,
  interactionDisabled: false,
  onBeginPlacementDrag: jest.fn(),
  onSelectFire: jest.fn(),
  onBeginEnemyDrag: jest.fn(),
});

const fireMarker = (container: HTMLElement) => container.querySelector('circle[cx="4.5"][cy="5.5"]')!;

describe("TacticalEditorScenarioMarkersLayer", () => {
  it("renders prepared placement dimensions, rotation, and selected styling", () => {
    const layerProps = { ...props(), selectedPlacementId: "bridge" };
    render(<svg><TacticalEditorScenarioMarkersLayer {...layerProps} /></svg>);

    const control = screen.getByTestId("terrain-placement-control-bridge");
    expect(control.getAttribute("width")).toBe("2");
    expect(control.getAttribute("height")).toBe("4");
    expect(control.getAttribute("data-rotation")).toBe("90");
    expect(control.getAttribute("stroke")).toBe("#fef08a");
    expect(control.getAttribute("fill")).toBe("#22d3ee");
  });

  it("renders and selects fire markers without bubbling", () => {
    const layerProps = { ...props(), selectedFire: { x: 4, y: 5 } };
    const onParentPointerDown = jest.fn();
    const { container } = render(<svg onPointerDown={onParentPointerDown}><TacticalEditorScenarioMarkersLayer {...layerProps} /></svg>);

    const marker = fireMarker(container);
    expect(marker.getAttribute("stroke")).toBe("#fef08a");
    expect(marker.getAttribute("stroke-width")).toBe("0.18");
    fireEvent.pointerDown(marker);
    expect(layerProps.onSelectFire).toHaveBeenCalledWith({ x: 4, y: 5 });
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });

  it("shows the enemy placement preview only while its tool is active", () => {
    const layerProps = { ...props(), enemyHover: { x: 8, y: 7 } };
    const { rerender } = render(<svg><TacticalEditorScenarioMarkersLayer {...layerProps} /></svg>);

    expect(screen.queryByTestId("enemy-placement-preview")).toBeNull();
    rerender(<svg><TacticalEditorScenarioMarkersLayer {...layerProps} enemyPreviewActive /></svg>);
    const preview = screen.getByTestId("enemy-placement-preview");
    expect(preview.querySelector('circle[cx="8.5"][cy="7.5"]')).toBeTruthy();
    expect(preview.textContent).toContain("E");
  });

  it("renders selected enemies with their name and facing indicator", () => {
    render(<svg><TacticalEditorScenarioMarkersLayer {...props()} selectedEnemyId="guard" /></svg>);

    const marker = screen.getByTestId("enemy-marker-guard");
    expect(marker.getAttribute("aria-label")).toBe("Guard · facing East");
    expect(marker.querySelector('circle[fill="#7f1d1d"]')?.getAttribute("stroke")).toBe("#fef08a");
    const direction = marker.querySelector("line")!;
    expect(direction.getAttribute("x2")).toBe("2.9");
    expect(direction.getAttribute("y2")).toBe("2.5");
  });

  it("dispatches placement and enemy drag starts without bubbling", () => {
    const layerProps = props();
    const onParentPointerDown = jest.fn();
    render(<svg onPointerDown={onParentPointerDown}><TacticalEditorScenarioMarkersLayer {...layerProps} /></svg>);

    fireEvent.pointerDown(screen.getByTestId("terrain-placement-control-bridge"));
    fireEvent.pointerDown(screen.getByTestId("enemy-marker-guard"));
    expect(layerProps.onBeginPlacementDrag).toHaveBeenCalledWith(placement, expect.anything());
    expect(layerProps.onBeginEnemyDrag).toHaveBeenCalledWith(enemy, expect.anything());
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });

  it("suppresses every marker interaction while a placement tool is active", () => {
    const layerProps = { ...props(), interactionDisabled: true };
    const { container } = render(<svg><TacticalEditorScenarioMarkersLayer {...layerProps} /></svg>);

    fireEvent.pointerDown(screen.getByTestId("terrain-placement-control-bridge"));
    fireEvent.pointerDown(fireMarker(container));
    fireEvent.pointerDown(screen.getByTestId("enemy-marker-guard"));
    expect(layerProps.onBeginPlacementDrag).not.toHaveBeenCalled();
    expect(layerProps.onSelectFire).not.toHaveBeenCalled();
    expect(layerProps.onBeginEnemyDrag).not.toHaveBeenCalled();
    expect(screen.getByTestId("terrain-placement-control-bridge").getAttribute("class")).toBeNull();
    expect(screen.getByTestId("enemy-marker-guard").getAttribute("class")).toBeNull();
  });
});
