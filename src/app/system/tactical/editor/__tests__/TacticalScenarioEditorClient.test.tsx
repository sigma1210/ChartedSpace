/** @jest-environment jsdom */

import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TacticalScenarioEditorClient, {
  fitTacticalTracingTemplate,
  removeConsolePlacementOperations,
  resizeTacticalTracingTemplate,
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
    expect(markup).toContain("Tracing Template");
    expect(markup).toContain(">Gang Member</span>");
    expect(markup).toContain(">Gang Leader</span>");
    expect(markup).toContain(">Fire</button>");
    expect(markup).toContain(">Wall</button>");
    expect(markup).toContain(">Curved Wall</button>");
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

  it("fits tracing templates inside the grid while preserving their aspect ratio", () => {
    expect(fitTacticalTracingTemplate(
      "/images/tactical/deck.png",
      { width: 1000, height: 500 },
      { width: 40, height: 40 },
    )).toEqual({
      imagePath: "/images/tactical/deck.png",
      x: 0,
      y: 10,
      width: 40,
      height: 20,
      rotation: 0,
      opacity: 0.45,
      visible: true,
      lockAspectRatio: true,
    });
  });

  it("resizes a tracing template from a corner and preserves the opposite corner", () => {
    expect(resizeTacticalTracingTemplate({
      imagePath: "/images/tactical/deck.png",
      x: 0,
      y: 0,
      width: 10,
      height: 5,
      rotation: 0,
      opacity: 0.5,
      visible: true,
      lockAspectRatio: true,
    }, "se", { x: 20, y: 10 })).toMatchObject({
      x: 0,
      y: 0,
      width: 20,
      height: 10,
    });

    const rotatedResize = resizeTacticalTracingTemplate({
      imagePath: "/images/tactical/deck.png",
      x: 0,
      y: 0,
      width: 10,
      height: 5,
      rotation: 90,
      opacity: 0.5,
      visible: true,
      lockAspectRatio: false,
    }, "se", { x: -2.5, y: 17.5 });
    expect(rotatedResize.x).toBeCloseTo(-7.5);
    expect(rotatedResize.y).toBeCloseTo(2.5);
    expect(rotatedResize.width).toBeCloseTo(20);
    expect(rotatedResize.height).toBeCloseTo(10);
  });

  it("selects, fits, hides, and removes a tracing template", async () => {
    const OriginalImage = window.Image;
    class MockImage {
      naturalWidth = 1200;
      naturalHeight = 800;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    Object.defineProperty(window, "Image", { configurable: true, writable: true, value: MockImage });
    global.fetch = jest.fn((input) => {
      const url = String(input);
      if (url === "/api/tactical/templates") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ templates: [{ id: "built-in:landing-pad", label: "Landing Pad", imagePath: "/images/tactical/landing-pad/map.jpg", source: "built-in" }] }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({ scenarios: [] }) } as Response);
    }) as typeof fetch;

    try {
      render(<TacticalScenarioEditorClient />);
      const templateSelect = await screen.findByLabelText("Template image");
      await screen.findByRole("option", { name: "Landing Pad" });
      fireEvent.change(templateSelect, { target: { value: "/images/tactical/landing-pad/map.jpg" } });

      await waitFor(() => expect(screen.getByTestId("tracing-template-image")).toBeTruthy());
      const templateImage = screen.getByTestId("tracing-template-image");
      expect(templateImage.getAttribute("x")).toBe("0");
      expect(templateImage.getAttribute("y")).toBe("0");
      expect(templateImage.getAttribute("width")).toBe("72");
      expect(templateImage.getAttribute("height")).toBe("48");
      expect(templateImage.getAttribute("opacity")).toBe("0.45");

      fireEvent.click(screen.getByRole("button", { name: "Adjust on map" }));
      expect(screen.getByTestId("tracing-template-controls")).toBeTruthy();
      expect(screen.getByTestId("tracing-template-rotation-handle")).toBeTruthy();

      fireEvent.change(screen.getByLabelText("Template rotation"), { target: { value: "15" } });
      expect(screen.getByTestId("tracing-template-image").getAttribute("transform")).toContain("rotate(15 ");
      fireEvent.change(screen.getByLabelText("Template width"), { target: { value: "36" } });
      expect(screen.getByTestId("tracing-template-image").getAttribute("width")).toBe("36");
      expect(screen.getByTestId("tracing-template-image").getAttribute("height")).toBe("24");
      fireEvent.click(screen.getByLabelText("Lock ratio"));
      fireEvent.change(screen.getByLabelText("Template height"), { target: { value: "12" } });
      expect(screen.getByTestId("tracing-template-image").getAttribute("width")).toBe("36");
      expect(screen.getByTestId("tracing-template-image").getAttribute("height")).toBe("12");

      const moveArea = screen.getByTestId("tracing-template-move-area");
      fireEvent.pointerDown(moveArea, { clientX: 10, clientY: 10, pointerId: 30 });
      fireEvent.pointerMove(screen.getByLabelText("Scenario draft map preview"), { clientX: 12, clientY: 13, pointerId: 30 });
      fireEvent.pointerUp(screen.getByLabelText("Scenario draft map preview"), { clientX: 12, clientY: 13, pointerId: 30 });
      expect(screen.getByTestId("tracing-template-image").getAttribute("x")).toBe("2");
      expect(screen.getByTestId("tracing-template-image").getAttribute("y")).toBe("3");

      const rotationHandle = screen.getByTestId("tracing-template-rotation-handle");
      fireEvent.pointerDown(rotationHandle, {
        clientX: Number(rotationHandle.getAttribute("cx")),
        clientY: Number(rotationHandle.getAttribute("cy")),
        pointerId: 31,
      });
      fireEvent.pointerMove(screen.getByLabelText("Scenario draft map preview"), { clientX: 30, clientY: 9, pointerId: 31 });
      fireEvent.pointerUp(screen.getByLabelText("Scenario draft map preview"), { clientX: 30, clientY: 9, pointerId: 31 });
      expect(screen.getByTestId("tracing-template-image").getAttribute("transform")).toContain("rotate(90 ");

      fireEvent.click(screen.getByLabelText("Visible"));
      expect(screen.queryByTestId("tracing-template-image")).toBeNull();
      fireEvent.click(screen.getByLabelText("Visible"));
      expect(screen.getByTestId("tracing-template-image")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Remove" }));
      expect(screen.queryByTestId("tracing-template-image")).toBeNull();
    } finally {
      Object.defineProperty(window, "Image", { configurable: true, writable: true, value: OriginalImage });
    }
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

  it("draws, reshapes, moves, resizes, and deletes a curved wall", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "Curved Wall" }));
    const preview = screen.getByLabelText("Scenario draft map preview");

    fireEvent.pointerDown(preview, { clientX: 5.2, clientY: 6.1, pointerId: 40 });
    fireEvent.pointerMove(preview, { clientX: 15.3, clientY: 6.2, pointerId: 40 });
    fireEvent.pointerUp(preview, { clientX: 15.3, clientY: 6.2, pointerId: 40 });

    const curve = screen.getByTestId("drawn-wall-drawn-wall-1");
    expect(curve.tagName.toLowerCase()).toBe("path");
    expect(curve.getAttribute("d")).toBe("M 5 6 Q 10 6 15 6");
    const control = screen.getByTestId("wall-drawn-wall-1-control-handle");
    expect(control.getAttribute("cx")).toBe("10");
    expect(control.getAttribute("cy")).toBe("6");

    fireEvent.pointerDown(control, { clientX: 10, clientY: 6, pointerId: 41 });
    fireEvent.pointerMove(preview, { clientX: 10.5, clientY: 12.25, pointerId: 41 });
    fireEvent.pointerUp(preview, { clientX: 10.5, clientY: 12.25, pointerId: 41 });
    expect(screen.getByTestId("drawn-wall-drawn-wall-1").getAttribute("d")).toBe("M 5 6 Q 10.5 12.25 15 6");

    fireEvent.click(screen.getAllByRole("button", { name: "Pointer" })[0]);
    fireEvent.pointerDown(screen.getByTestId("drawn-wall-drawn-wall-1"), { clientX: 10, clientY: 9, pointerId: 42 });
    fireEvent.pointerMove(preview, { clientX: 12, clientY: 10, pointerId: 42 });
    fireEvent.pointerUp(preview, { clientX: 12, clientY: 10, pointerId: 42 });
    expect(screen.getByTestId("drawn-wall-drawn-wall-1").getAttribute("d")).toBe("M 7 7 Q 12.5 13.25 17 7");

    fireEvent.pointerDown(screen.getByTestId("wall-drawn-wall-1-to-handle"), { clientX: 17, clientY: 7, pointerId: 43 });
    fireEvent.pointerMove(preview, { clientX: 20.2, clientY: 8.7, pointerId: 43 });
    fireEvent.pointerUp(preview, { clientX: 20.2, clientY: 8.7, pointerId: 43 });
    expect(screen.getByTestId("drawn-wall-drawn-wall-1").getAttribute("d")).toBe("M 7 7 Q 12.5 13.25 20 9");

    fireEvent.keyDown(window, { key: "Delete" });
    expect(screen.queryByTestId("drawn-wall-drawn-wall-1")).toBeNull();
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
