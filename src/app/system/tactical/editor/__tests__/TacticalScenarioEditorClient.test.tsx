/** @jest-environment jsdom */

import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen } from "@testing-library/react";
import TacticalScenarioEditorClient, {
  removeConsolePlacementOperations,
  tacticalEditorMarkerInteractionEnabled,
} from "../TacticalScenarioEditorClient";
import { cloneTacticalConsoleVictoryDefinition, defaultTacticalConsoleVictoryDefinition } from "@/plugins/characterCombat/tacticalConsoleVictory";

jest.mock("../../TacticalMapPageClient", () => ({ __esModule: true, default: () => null }));

describe("TacticalScenarioEditorClient", () => {
  beforeAll(() => {
    global.PointerEvent = MouseEvent as typeof PointerEvent;
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    SVGSVGElement.prototype.getScreenCTM = () => ({ inverse: () => ({}) }) as DOMMatrix;
    SVGSVGElement.prototype.createSVGPoint = () => ({
      x: 0,
      y: 0,
      matrixTransform() { return { x: this.x, y: this.y }; },
    }) as DOMPoint;
    Element.prototype.setPointerCapture = () => undefined;
  });

  beforeEach(() => {
    global.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(global, "fetch");
  });

  it("offers fire as a placement tool in the floating terrain palette", () => {
    const markup = renderToStaticMarkup(<TacticalScenarioEditorClient />);

    expect(markup).toContain("Terrain Palette");
    expect(markup).toContain("Enemy Palette");
    expect(markup).toContain(">Gang Member</span>");
    expect(markup).toContain(">Gang Leader</span>");
    expect(markup).toContain(">Fire</button>");
    expect(markup).toContain(">Wall</button>");
    expect(markup).toContain(">Door</button>");
    expect(markup).toContain(">Wall Iris Valve</button>");
    expect(markup).toContain(">Legacy Iris Valve</button>");
    expect(markup).toContain(">Hatch 1x1</button>");
    expect(markup).toContain(">Liquid Hydrogen 2x2</button>");
    expect(markup).toContain(">Liquid Hydrogen 3x3</button>");
    expect(markup).toContain(">Liquid Hydrogen 4x4</button>");
    expect(markup).toContain(">Interactive Human</button>");
    expect(markup).toContain(">Deployment Zone 9x9</button>");
    expect(markup).toContain("Crew deployment edges");
    expect(markup).not.toContain("<title>");
    expect(markup).toContain('aria-label="Gang Member 1 · facing North"');
  });

  it("draws a diagonal wall between snapped grid vertices and selects it", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "Wall" }));
    const preview = screen.getByLabelText("Scenario draft map preview");

    fireEvent.pointerDown(preview, { clientX: 10.2, clientY: 11.3, pointerId: 4 });
    expect(screen.getByTestId("wall-draft-preview")).toBeTruthy();
    fireEvent.pointerMove(preview, { clientX: 16.4, clientY: 14.6, pointerId: 4 });
    fireEvent.pointerUp(preview, { clientX: 16.4, clientY: 14.6, pointerId: 4 });

    const wall = screen.getByTestId("drawn-wall-drawn-wall-1");
    expect(wall.getAttribute("x1")).toBe("10");
    expect(wall.getAttribute("y1")).toBe("11");
    expect(wall.getAttribute("x2")).toBe("16");
    expect(wall.getAttribute("y2")).toBe("15");
    expect(wall.getAttribute("stroke")).toBe("#fef08a");
    expect(screen.queryByTestId("wall-draft-preview")).toBeNull();

    fireEvent.pointerDown(screen.getByTestId("wall-drawn-wall-1-to-handle"), { clientX: 16, clientY: 15, pointerId: 5 });
    fireEvent.pointerMove(preview, { clientX: 20.2, clientY: 18.7, pointerId: 5 });
    expect(screen.getByTestId("drawn-wall-drawn-wall-1").getAttribute("x2")).toBe("20");
    expect(screen.getByTestId("drawn-wall-drawn-wall-1").getAttribute("y2")).toBe("19");
    fireEvent.pointerUp(preview, { clientX: 20.2, clientY: 18.7, pointerId: 5 });

    fireEvent.pointerDown(screen.getByTestId("wall-drawn-wall-1-to-handle"), { clientX: 20, clientY: 19, pointerId: 6 });
    fireEvent.pointerMove(preview, { clientX: 10.2, clientY: 11.3, pointerId: 6 });
    fireEvent.pointerUp(preview, { clientX: 10.2, clientY: 11.3, pointerId: 6 });
    expect(screen.getByTestId("drawn-wall-drawn-wall-1").getAttribute("x2")).toBe("20");
    expect(screen.getByTestId("drawn-wall-drawn-wall-1").getAttribute("y2")).toBe("19");

    fireEvent.click(screen.getByRole("button", { name: "Wall Iris Valve" }));
    fireEvent.pointerMove(preview, { clientX: 15, clientY: 15, pointerId: 7 });
    expect(screen.getByTestId("wall-portal-preview")).toBeTruthy();
    fireEvent.pointerDown(preview, { clientX: 15, clientY: 15, pointerId: 7 });
    expect(screen.getByTestId("wall-portal-wall-iris-valve-1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Door" }));
    fireEvent.pointerMove(preview, { clientX: 12, clientY: 12.5, pointerId: 8 });
    fireEvent.pointerDown(preview, { clientX: 12, clientY: 12.5, pointerId: 8 });
    expect(screen.getByTestId("wall-portal-wall-door-1")).toBeTruthy();
    expect(screen.getByText("Selected portal")).toBeTruthy();
    expect(screen.getByText("Door on drawn-wall-1")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Pointer" })[0]);
    const doorBeforeMove = screen.getByTestId("wall-portal-wall-door-1");
    const doorStartBeforeMove = Number(doorBeforeMove.getAttribute("x1"));
    fireEvent.pointerDown(doorBeforeMove, { clientX: 12, clientY: 12.5, pointerId: 9 });
    fireEvent.pointerMove(preview, { clientX: 18, clientY: 18, pointerId: 9 });
    fireEvent.pointerUp(preview, { clientX: 18, clientY: 18, pointerId: 9 });
    const movedDoorStart = Number(screen.getByTestId("wall-portal-wall-door-1").getAttribute("x1"));
    expect(movedDoorStart).toBeGreaterThan(doorStartBeforeMove);

    fireEvent.pointerDown(screen.getByTestId("wall-portal-wall-door-1"), { clientX: 18, clientY: 18, pointerId: 10 });
    fireEvent.pointerMove(preview, { clientX: 18, clientY: 0, pointerId: 10 });
    fireEvent.pointerUp(preview, { clientX: 18, clientY: 0, pointerId: 10 });
    expect(Number(screen.getByTestId("wall-portal-wall-door-1").getAttribute("x1"))).toBeCloseTo(movedDoorStart);
    expect(screen.getByText("Keep the portal on an open one-square position on its wall.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete portal" }));
    expect(screen.queryByTestId("wall-portal-wall-door-1")).toBeNull();
    expect(screen.getByTestId("drawn-wall-drawn-wall-1")).toBeTruthy();
    expect(screen.getByTestId("wall-portal-wall-iris-valve-1")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Pointer" })[0]);
    const irisBeforeMove = Number(screen.getByTestId("wall-portal-wall-iris-valve-1").querySelector("circle")?.getAttribute("cx"));
    fireEvent.pointerDown(screen.getByTestId("drawn-wall-drawn-wall-1"), { clientX: 15, clientY: 15, pointerId: 11 });
    fireEvent.pointerMove(preview, { clientX: 18, clientY: 17, pointerId: 11 });
    expect(screen.getByTestId("drawn-wall-drawn-wall-1").getAttribute("x1")).toBe("13");
    expect(screen.getByTestId("drawn-wall-drawn-wall-1").getAttribute("y1")).toBe("13");
    expect(Number(screen.getByTestId("wall-portal-wall-iris-valve-1").querySelector("circle")?.getAttribute("cx"))).toBeCloseTo(irisBeforeMove + 3);
    fireEvent.pointerUp(preview, { clientX: 18, clientY: 17, pointerId: 11 });

    fireEvent.pointerDown(screen.getByTestId("drawn-wall-drawn-wall-1"), { clientX: 18, clientY: 17, pointerId: 12 });
    fireEvent.pointerMove(preview, { clientX: 0, clientY: 0, pointerId: 12 });
    fireEvent.pointerUp(preview, { clientX: 0, clientY: 0, pointerId: 12 });
    expect(screen.getByTestId("drawn-wall-drawn-wall-1").getAttribute("x1")).toBe("13");
    expect(screen.getByTestId("drawn-wall-drawn-wall-1").getAttribute("y1")).toBe("13");
    expect(screen.getByText("Deleting this wall also removes 1 attached portal.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete wall" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Delete" });
    expect(screen.queryByTestId("drawn-wall-drawn-wall-1")).toBeNull();
    expect(screen.queryByTestId("wall-portal-wall-iris-valve-1")).toBeNull();
  });

  it("lets enemy-tool clicks pass through raised terrain and fire markers", () => {
    expect(tacticalEditorMarkerInteractionEnabled(null, "gang-member")).toBe(false);
    expect(tacticalEditorMarkerInteractionEnabled(null, "gang-leader")).toBe(false);
    expect(tacticalEditorMarkerInteractionEnabled("raised-area", null)).toBe(false);
    expect(tacticalEditorMarkerInteractionEnabled(null, null)).toBe(true);
  });

  it("offers file loading and non-overwriting Save As controls", () => {
    const markup = renderToStaticMarkup(<TacticalScenarioEditorClient />);

    expect(markup).toContain("Scenario files");
    expect(markup).toContain("Load scenario");
    expect(markup).toContain("Save changes");
    expect(markup).toContain("Save as new scenario");
    expect(markup).toContain("never overwrites an existing scenario");
    expect(markup).toContain("immutable source");
  });

  it("removes console operations when their terrain placement is deleted", () => {
    const definition = cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition);

    const updated = removeConsolePlacementOperations(definition, "control-room-alpha");

    expect(updated.operations).toEqual([]);
  });

  it("opens the console editor HUD and gives actionable guidance after its console is deleted", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByText("control-room-alpha"));

    expect(screen.getByText("Console Editor")).toBeTruthy();
    expect(screen.getByText("Tasks at this console")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText("This draft has no victory task. Select a console and add a victory task before saving or playtesting.")).toBeTruthy();
    expect(screen.queryByText(/At least one console operation is required/)).toBeNull();
  });

  it("edits and deletes a selected scenario enemy", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.pointerDown(screen.getByTestId("enemy-marker-enemy-1"), { clientX: 47.5, clientY: 41.5, pointerId: 1 });

    expect(screen.getByText("Enemy Editor")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Enemy name"), { target: { value: "Razor" } });
    expect(screen.getByDisplayValue("Razor")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rotate enemy 90 degrees" }).textContent).toContain("Facing North");
    fireEvent.click(screen.getByRole("button", { name: "Rotate enemy 90 degrees" }));
    expect(screen.getByRole("button", { name: "Rotate enemy 90 degrees" }).textContent).toContain("Facing East");

    fireEvent.keyDown(window, { key: "Delete" });
    expect(screen.queryByTestId("enemy-marker-enemy-1")).toBeNull();
  });
});
