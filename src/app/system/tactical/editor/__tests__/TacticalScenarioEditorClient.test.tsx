/** @jest-environment jsdom */

import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TacticalScenarioEditorClient, {
  fitTacticalTracingTemplate,
  removeDrawnRaisedAreaCandidate,
  removeConsolePlacementOperations,
  resizeTacticalTracingTemplate,
  tacticalElevationTransitionPlacementCandidate,
  tacticalEditorMarkerInteractionEnabled,
} from "../TacticalScenarioEditorClient";
import { cloneTacticalConsoleVictoryDefinition, defaultTacticalConsoleVictoryDefinition } from "@/plugins/characterCombat/tacticalConsoleVictory";
import { cloneTacticalScenarioDefinition, defaultTacticalScenarioDefinition, resolveTacticalScenarioTerrain } from "@/plugins/characterCombat/tacticalScenarioDefinitions";

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
    expect(markup).toContain(">Raised Area</button>");
    expect(markup).toContain(">Raised Curve</button>");
    expect(markup).toContain(">Draw Circle</button>");
    expect(markup).toContain('aria-label="Circle type Wall"');
    expect(markup).toContain('aria-label="Circle type Raised"');
    expect(markup).toContain("Drawing precision");
    expect(markup).toContain(">Draw Machinery</button>");
    expect(markup).toContain(">Machinery Curve</button>");
    expect(markup).toContain(">Draw Liquid H₂</button>");
    expect(markup).toContain(">Liquid H₂ Curve</button>");
    expect(markup).toContain(">Stairs</button>");
    expect(markup).toContain(">Ladder</button>");
    expect(markup).toContain(">Ramp</button>");
    expect(markup).toContain(">Door</button>");
    expect(markup).toContain(">Wall Iris Valve</button>");
    expect(markup).toContain(">Control Room</button>");
    expect(markup).not.toContain(">Room 3x3</button>");
    expect(markup).not.toContain(">Room 3x5</button>");
    expect(markup).not.toContain(">Room 3x7</button>");
    expect(markup).not.toContain(">Room 5x5</button>");
    expect(markup).not.toContain(">Raised Area 3x3</button>");
    expect(markup).not.toContain(">Raised Area 3x5</button>");
    expect(markup).not.toContain(">Raised Area 3x7</button>");
    expect(markup).not.toContain(">Raised Area 5x5</button>");
    expect(markup).not.toContain(">Raised Area 7x7</button>");
    expect(markup).not.toContain(">Legacy Iris Valve</button>");
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

  it("zooms the editor map toward the pointer and restores the fitted view", () => {
    render(<TacticalScenarioEditorClient />);
    const preview = screen.getByLabelText("Scenario draft map preview");

    expect(preview.getAttribute("viewBox")).toBe("0 0 72 48");
    fireEvent.wheel(preview, { clientX: 54, clientY: 12, deltaX: 0, deltaY: -350 });
    const zoomedView = preview.getAttribute("viewBox")!.split(" ").map(Number);
    expect(zoomedView[0]).toBeGreaterThan(0);
    expect(zoomedView[1]).toBeGreaterThan(0);
    expect(zoomedView[2]).toBeLessThan(72);
    expect(preview.getAttribute("data-zoom-percent")).not.toBe("100");

    fireEvent.click(screen.getByRole("button", { name: "Fit map" }));
    expect(preview.getAttribute("viewBox")).toBe("0 0 72 48");
    expect(preview.getAttribute("data-zoom-percent")).toBe("100");
  });

  it("uses Space + drag to pan without activating the selected drawing tool", () => {
    render(<TacticalScenarioEditorClient />);
    const preview = screen.getByLabelText("Scenario draft map preview");
    jest.spyOn(preview, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 720, bottom: 480, width: 720, height: 480, toJSON: () => ({}),
    } as DOMRect);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Fire" }));
    const before = preview.getAttribute("viewBox")!.split(" ").map(Number);

    fireEvent.keyDown(window, { code: "Space" });
    fireEvent.pointerDown(preview, { button: 0, clientX: 360, clientY: 240, pointerId: 120 });
    fireEvent.pointerMove(preview, { button: 0, clientX: 260, clientY: 240, pointerId: 120 });
    fireEvent.pointerUp(preview, { button: 0, clientX: 260, clientY: 240, pointerId: 120 });
    fireEvent.keyUp(window, { code: "Space" });

    const after = preview.getAttribute("viewBox")!.split(" ").map(Number);
    expect(after[0]).toBeGreaterThan(before[0]);
    expect(screen.queryByText("Selected fire")).toBeNull();
  });

  it.each(["stairs", "ladder"] as const)("places a %s across the selected edge between adjacent levels", (kind) => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.terrainPlacements = [];
    definition.drawnRaisedAreas = [{
      id: "transition-platform",
      segments: [
        { kind: "line", from: { x: 10, y: 10 }, to: { x: 13, y: 10 } },
        { kind: "line", from: { x: 13, y: 10 }, to: { x: 13, y: 13 } },
        { kind: "line", from: { x: 13, y: 13 }, to: { x: 10, y: 13 } },
        { kind: "line", from: { x: 10, y: 13 }, to: { x: 10, y: 10 } },
      ],
    }];
    definition.elevationTransitions = [];
    const candidate = tacticalElevationTransitionPlacementCandidate(
      definition,
      kind,
      {
        x: 9,
        y: 11,
        edgeRotation: 90,
        mapX: 9.6,
        mapY: 11.5,
      },
    );

    expect(candidate.transition.kind).toBe(kind);
    expect(candidate.definition.elevationTransitions).toContainEqual(candidate.transition);
    expect(resolveTacticalScenarioTerrain(candidate.definition).elevationTransitions).toHaveLength(1);
  });

  it("snaps stairs to a nearby highlighted edge even when the raw cell edge is not valid", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.terrainPlacements = [];
    definition.drawnRaisedAreas = [{
      id: "snap-platform",
      segments: [
        { kind: "line", from: { x: 10, y: 10 }, to: { x: 13, y: 10 } },
        { kind: "line", from: { x: 13, y: 10 }, to: { x: 13, y: 13 } },
        { kind: "line", from: { x: 13, y: 13 }, to: { x: 10, y: 13 } },
        { kind: "line", from: { x: 10, y: 13 }, to: { x: 10, y: 10 } },
      ],
    }];
    definition.elevationTransitions = [];

    const candidate = tacticalElevationTransitionPlacementCandidate(definition, "stairs", {
      x: 9,
      y: 11,
      edgeRotation: 0,
      mapX: 9.62,
      mapY: 11.4,
    });

    expect(candidate.transition).toMatchObject({
      lower: { x: 9, y: 11 },
      upper: { x: 10, y: 11 },
    });
  });

  it("deletes a drawn raised area and any transition that depended on it", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.terrainPlacements = [];
    definition.drawnRaisedAreas = [{
      id: "raised-area-to-delete",
      segments: [
        { kind: "line", from: { x: 10, y: 10 }, to: { x: 13, y: 10 } },
        { kind: "line", from: { x: 13, y: 10 }, to: { x: 13, y: 13 } },
        { kind: "line", from: { x: 13, y: 13 }, to: { x: 10, y: 13 } },
        { kind: "line", from: { x: 10, y: 13 }, to: { x: 10, y: 10 } },
      ],
    }];
    definition.elevationTransitions = [];
    const withLadder = tacticalElevationTransitionPlacementCandidate(
      definition,
      "ladder",
      { x: 9, y: 11, edgeRotation: 90 },
    ).definition;

    const removed = removeDrawnRaisedAreaCandidate(withLadder, "raised-area-to-delete");

    expect(removed.definition.drawnRaisedAreas).toEqual([]);
    expect(removed.definition.elevationTransitions).toEqual([]);
    expect(removed.removedTransitionIds).toEqual(["ladder-1"]);
    expect(() => resolveTacticalScenarioTerrain(removed.definition)).not.toThrow();
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

  it("completes an enclosed wall outline with click-start and click-end", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "Wall" }));
    const preview = screen.getByLabelText("Scenario draft map preview");
    const drawClickedWall = (
      from: { x: number; y: number },
      to: { x: number; y: number },
      pointerId: number,
    ) => {
      fireEvent.pointerDown(preview, { clientX: from.x, clientY: from.y, pointerId });
      fireEvent.pointerUp(preview, { clientX: from.x, clientY: from.y, pointerId });
      expect(screen.getByTestId("wall-draft-preview")).toBeTruthy();
      fireEvent.pointerMove(preview, { clientX: to.x, clientY: to.y, pointerId: pointerId + 1 });
      fireEvent.pointerDown(preview, { clientX: to.x, clientY: to.y, pointerId: pointerId + 1 });
      fireEvent.pointerUp(preview, { clientX: to.x, clientY: to.y, pointerId: pointerId + 1 });
    };

    drawClickedWall({ x: 10, y: 10 }, { x: 15, y: 10 }, 80);
    drawClickedWall({ x: 15, y: 10 }, { x: 15, y: 15 }, 82);
    drawClickedWall({ x: 15, y: 15 }, { x: 10, y: 15 }, 84);
    drawClickedWall({ x: 10, y: 15 }, { x: 10, y: 10 }, 86);

    expect(screen.getByTestId("drawn-wall-drawn-wall-1")).toBeTruthy();
    expect(screen.getByTestId("drawn-wall-drawn-wall-4")).toBeTruthy();
    expect(screen.queryByText("A wall must have different start and end points.")).toBeNull();
    expect(screen.queryByTestId("wall-draft-preview")).toBeNull();
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

  it("uses the selected drawing precision for wall vertices", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.change(screen.getByLabelText("Drawing precision"), { target: { value: "half-grid" } });
    fireEvent.click(screen.getByRole("button", { name: "Wall" }));
    const preview = screen.getByLabelText("Scenario draft map preview");

    fireEvent.pointerDown(preview, { clientX: 5.2, clientY: 6.3, pointerId: 45 });
    fireEvent.pointerMove(preview, { clientX: 10.7, clientY: 9.2, pointerId: 45 });
    fireEvent.pointerUp(preview, { clientX: 10.7, clientY: 9.2, pointerId: 45 });

    const wall = screen.getByTestId("drawn-wall-drawn-wall-1");
    expect(wall.getAttribute("x1")).toBe("5");
    expect(wall.getAttribute("y1")).toBe("6.5");
    expect(wall.getAttribute("x2")).toBe("10.5");
    expect(wall.getAttribute("y2")).toBe("9");
  });

  it("draws, moves, resizes, retypes, and deletes a circle primitive", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.change(screen.getByLabelText("Drawing precision"), {
      target: { value: "quarter-grid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Circle type Raised" }));
    fireEvent.click(screen.getByRole("button", { name: "Draw Circle" }));
    const preview = screen.getByLabelText("Scenario draft map preview");

    fireEvent.pointerDown(preview, {
      clientX: 10.2,
      clientY: 10.3,
      pointerId: 46,
    });
    fireEvent.pointerMove(preview, {
      clientX: 14.4,
      clientY: 10.3,
      pointerId: 46,
    });
    expect(screen.getByTestId("circle-draft-preview")).toBeTruthy();
    fireEvent.pointerUp(preview, {
      clientX: 14.4,
      clientY: 10.3,
      pointerId: 46,
    });

    const circle = screen.getByTestId("terrain-circle-terrain-circle-1")
      .querySelector("circle")!;
    expect(circle.getAttribute("cx")).toBe("10.25");
    expect(circle.getAttribute("cy")).toBe("10.25");
    expect(circle.getAttribute("r")).toBe("4.25");
    expect(screen.getByText("Circle · terrain-circle-1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Circle type Raised" })
      .getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Circle type Wall" }));
    expect(screen.getByRole("button", { name: "Circle type Wall" })
      .getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("terrain-circle-terrain-circle-1")
      .querySelector("circle")?.getAttribute("fill-opacity")).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: "Circle type Machinery" }));
    expect(screen.getByRole("button", { name: "Circle type Machinery" })
      .getAttribute("aria-pressed")).toBe("true");

    fireEvent.pointerDown(
      screen.getByTestId("terrain-circle-terrain-circle-1-center-handle"),
      { clientX: 10.25, clientY: 10.25, pointerId: 47 },
    );
    fireEvent.pointerMove(preview, {
      clientX: 20.2,
      clientY: 10.3,
      pointerId: 47,
    });
    fireEvent.pointerUp(preview, {
      clientX: 20.2,
      clientY: 10.3,
      pointerId: 47,
    });
    expect(screen.getByTestId("terrain-circle-terrain-circle-1")
      .querySelector("circle")?.getAttribute("cx")).toBe("20.25");

    fireEvent.pointerDown(
      screen.getByTestId("terrain-circle-terrain-circle-1-radius-handle"),
      { clientX: 24.5, clientY: 10.25, pointerId: 48 },
    );
    fireEvent.pointerMove(preview, {
      clientX: 25.2,
      clientY: 10.3,
      pointerId: 48,
    });
    fireEvent.pointerUp(preview, {
      clientX: 25.2,
      clientY: 10.3,
      pointerId: 48,
    });
    expect(screen.getByTestId("terrain-circle-terrain-circle-1")
      .querySelector("circle")?.getAttribute("r")).toBe("5");

    fireEvent.click(screen.getByRole("button", { name: "Circle type Liquid H₂" }));
    expect(screen.getByLabelText("Circle liquid hydrogen filled")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Circle liquid hydrogen filled"));
    expect((screen.getByLabelText("Circle liquid hydrogen filled") as HTMLInputElement).checked)
      .toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Delete Circle" }));
    expect(screen.queryByTestId("terrain-circle-terrain-circle-1")).toBeNull();
  });

  it("places, moves, and deletes doors and iris valves on a circle wall", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "Circle type Wall" }));
    fireEvent.click(screen.getByRole("button", { name: "Draw Circle" }));
    const preview = screen.getByLabelText("Scenario draft map preview");

    fireEvent.pointerDown(preview, { clientX: 10, clientY: 10, pointerId: 70 });
    fireEvent.pointerMove(preview, { clientX: 14, clientY: 10, pointerId: 70 });
    fireEvent.pointerUp(preview, { clientX: 14, clientY: 10, pointerId: 70 });

    fireEvent.click(screen.getByRole("button", { name: "Door" }));
    fireEvent.pointerMove(preview, { clientX: 14, clientY: 10, pointerId: 71 });
    expect(screen.getByTestId("wall-portal-preview")).toBeTruthy();
    fireEvent.pointerDown(preview, { clientX: 14, clientY: 10, pointerId: 71 });
    expect(screen.getByTestId("wall-portal-wall-door-1")).toBeTruthy();
    expect(screen.getByText("Door on terrain-circle-1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Wall Iris Valve" }));
    fireEvent.pointerMove(preview, { clientX: 6, clientY: 10, pointerId: 72 });
    fireEvent.pointerDown(preview, { clientX: 6, clientY: 10, pointerId: 72 });
    expect(screen.getByTestId("wall-portal-wall-iris-valve-1")).toBeTruthy();
    expect(screen.getByText("Wall Iris Valve on terrain-circle-1")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Pointer" })[0]);
    const door = screen.getByTestId("wall-portal-wall-door-1");
    const originalCenterY = (
      Number(door.getAttribute("y1")) + Number(door.getAttribute("y2"))
    ) / 2;
    fireEvent.pointerDown(door, { clientX: 14, clientY: 10, pointerId: 73 });
    fireEvent.pointerMove(preview, { clientX: 10, clientY: 6, pointerId: 73 });
    fireEvent.pointerUp(preview, { clientX: 10, clientY: 6, pointerId: 73 });
    const movedDoor = screen.getByTestId("wall-portal-wall-door-1");
    const movedCenterY = (
      Number(movedDoor.getAttribute("y1")) + Number(movedDoor.getAttribute("y2"))
    ) / 2;
    expect(movedCenterY).toBeLessThan(originalCenterY);

    fireEvent.click(screen.getByRole("button", { name: "Delete portal" }));
    expect(screen.queryByTestId("wall-portal-wall-door-1")).toBeNull();
    expect(screen.getByTestId("wall-portal-wall-iris-valve-1")).toBeTruthy();
    expect(screen.getByTestId("terrain-circle-terrain-circle-1")).toBeTruthy();
  });

  it("draws and closes a raised area with a live enclosed-cell preview", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "Raised Area" }));
    const preview = screen.getByLabelText("Scenario draft map preview");

    fireEvent.pointerDown(preview, { clientX: 20, clientY: 20, pointerId: 50 });
    expect(screen.getByTestId("raised-area-draft-preview")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel outline" })).toBeTruthy();
    fireEvent.pointerDown(preview, { clientX: 25, clientY: 20, pointerId: 51 });
    fireEvent.pointerDown(preview, { clientX: 25, clientY: 25, pointerId: 52 });
    fireEvent.pointerMove(preview, { clientX: 20, clientY: 25, pointerId: 53 });
    expect(screen.getByTestId("raised-area-draft-preview").querySelectorAll("rect")).toHaveLength(25);
    fireEvent.pointerDown(preview, { clientX: 20, clientY: 25, pointerId: 54 });
    fireEvent.pointerMove(preview, { clientX: 20, clientY: 20, pointerId: 55 });
    fireEvent.pointerDown(preview, { clientX: 20, clientY: 20, pointerId: 56 });

    expect(screen.queryByTestId("raised-area-draft-preview")).toBeNull();
    expect(screen.getByTestId("drawn-raised-area-drawn-raised-area-1-segment-0")).toBeTruthy();
    expect(screen.getByTestId("drawn-raised-area-drawn-raised-area-1-segment-3")).toBeTruthy();
  });

  it("cancels an unfinished raised-area outline with Escape", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "Raised Curve" }));
    const preview = screen.getByLabelText("Scenario draft map preview");
    fireEvent.pointerDown(preview, { clientX: 30, clientY: 20, pointerId: 60 });
    fireEvent.pointerMove(preview, { clientX: 35, clientY: 20, pointerId: 61 });
    expect(screen.getByTestId("raised-area-draft-preview").querySelector("path")).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("raised-area-draft-preview")).toBeNull();
  });

  it("reshapes a raised-area curve after its second point is placed", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "Raised Curve" }));
    const preview = screen.getByLabelText("Scenario draft map preview");
    fireEvent.pointerDown(preview, { clientX: 10, clientY: 10, pointerId: 62 });
    fireEvent.pointerDown(preview, { clientX: 20, clientY: 10, pointerId: 63 });

    const handle = screen.getByTestId("raised-area-draft-segment-0-control-handle");
    expect(handle.getAttribute("cx")).toBe("15");
    expect(handle.getAttribute("cy")).toBe("12.5");
    fireEvent.pointerDown(handle, { clientX: 15, clientY: 12.5, pointerId: 64 });
    fireEvent.pointerMove(preview, { clientX: 15, clientY: 16, pointerId: 64 });
    fireEvent.pointerUp(preview, { clientX: 15, clientY: 16, pointerId: 64 });

    expect(screen.getByTestId("raised-area-draft-segment-0").getAttribute("d")).toBe("M 10 10 Q 15 16 20 10");
  });

  it("switches between straight and curved segments within one raised-area outline", () => {
    render(<TacticalScenarioEditorClient />);
    const preview = screen.getByLabelText("Scenario draft map preview");
    fireEvent.click(screen.getByRole("button", { name: "Raised Area" }));
    fireEvent.pointerDown(preview, { clientX: 30, clientY: 20, pointerId: 70 });
    fireEvent.pointerDown(preview, { clientX: 35, clientY: 20, pointerId: 71 });
    fireEvent.click(screen.getByRole("button", { name: "Raised Curve" }));
    fireEvent.pointerDown(preview, { clientX: 35, clientY: 25, pointerId: 72 });
    fireEvent.click(screen.getByRole("button", { name: "Raised Area" }));
    fireEvent.pointerDown(preview, { clientX: 30, clientY: 25, pointerId: 73 });
    fireEvent.pointerDown(preview, { clientX: 30, clientY: 20, pointerId: 74 });

    const curvedSegment = screen.getByTestId("drawn-raised-area-drawn-raised-area-1-segment-1");
    expect(curvedSegment.tagName.toLowerCase()).toBe("path");
    expect(curvedSegment.getAttribute("d")).toBe("M 35 20 Q 33.75 22.5 35 25");
    expect(screen.getByRole("button", { name: "Raised Area" }).getAttribute("aria-pressed")).toBe("false");

    const completedHandle = screen.getByTestId("raised-area-drawn-raised-area-1-segment-1-control-handle");
    fireEvent.pointerDown(completedHandle, { clientX: 33.75, clientY: 22.5, pointerId: 75 });
    fireEvent.pointerMove(preview, { clientX: 32, clientY: 22.5, pointerId: 75 });
    fireEvent.pointerUp(preview, { clientX: 32, clientY: 22.5, pointerId: 75 });
    expect(screen.getByTestId("drawn-raised-area-drawn-raised-area-1-segment-1").getAttribute("d")).toBe("M 35 20 Q 32 22.5 35 25");
  });

  it("draws, reshapes, selects, and deletes a closed-machinery region", () => {
    render(<TacticalScenarioEditorClient />);
    const preview = screen.getByLabelText("Scenario draft map preview");
    fireEvent.click(screen.getByRole("button", { name: "Draw Machinery" }));
    fireEvent.pointerDown(preview, { clientX: 40, clientY: 10, pointerId: 80 });
    fireEvent.pointerDown(preview, { clientX: 45, clientY: 10, pointerId: 81 });
    fireEvent.click(screen.getByRole("button", { name: "Machinery Curve" }));
    fireEvent.pointerDown(preview, { clientX: 45, clientY: 15, pointerId: 82 });
    fireEvent.click(screen.getByRole("button", { name: "Draw Machinery" }));
    fireEvent.pointerDown(preview, { clientX: 40, clientY: 15, pointerId: 83 });
    fireEvent.pointerDown(preview, { clientX: 40, clientY: 10, pointerId: 84 });

    const curve = screen.getByTestId("drawn-terrain-region-drawn-close-machinery-1-segment-1");
    expect(curve.tagName.toLowerCase()).toBe("path");
    expect(screen.getByText("Closed machinery · 4 boundary segments")).toBeTruthy();
    const handle = screen.getByTestId("terrain-region-drawn-close-machinery-1-segment-1-control-handle");
    fireEvent.pointerDown(handle, { clientX: 43.75, clientY: 12.5, pointerId: 85 });
    fireEvent.pointerMove(preview, { clientX: 42, clientY: 12.5, pointerId: 85 });
    fireEvent.pointerUp(preview, { clientX: 42, clientY: 12.5, pointerId: 85 });
    expect(screen.getByTestId("drawn-terrain-region-drawn-close-machinery-1-segment-1").getAttribute("d")).toBe("M 45 10 Q 42 12.5 45 15");

    fireEvent.click(screen.getByRole("button", { name: "Delete terrain region" }));
    expect(screen.queryByTestId("drawn-terrain-region-drawn-close-machinery-1")).toBeNull();
  });

  it("draws a liquid-hydrogen region and changes its filled state", () => {
    render(<TacticalScenarioEditorClient />);
    const preview = screen.getByLabelText("Scenario draft map preview");
    fireEvent.click(screen.getByRole("button", { name: "Draw Liquid H₂" }));
    fireEvent.pointerDown(preview, { clientX: 50, clientY: 10, pointerId: 90 });
    fireEvent.pointerDown(preview, { clientX: 55, clientY: 10, pointerId: 91 });
    fireEvent.pointerDown(preview, { clientX: 55, clientY: 15, pointerId: 92 });
    fireEvent.pointerDown(preview, { clientX: 50, clientY: 15, pointerId: 93 });
    fireEvent.pointerDown(preview, { clientX: 50, clientY: 10, pointerId: 94 });

    const filled = screen.getByRole("checkbox", { name: "Liquid hydrogen region filled" }) as HTMLInputElement;
    expect(filled.checked).toBe(true);
    fireEvent.click(filled);
    expect(filled.checked).toBe(false);
    expect(screen.getByText("Liquid hydrogen · empty")).toBeTruthy();
  });

  it("closes a freeform terrain outline when the pointer returns near its starting point", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.change(screen.getByLabelText("Drawing precision"), { target: { value: "freeform" } });
    fireEvent.click(screen.getByRole("button", { name: "Draw Machinery" }));
    const preview = screen.getByLabelText("Scenario draft map preview");
    fireEvent.pointerDown(preview, { clientX: 20.13, clientY: 20.17, pointerId: 100 });
    fireEvent.pointerDown(preview, { clientX: 25.31, clientY: 20.22, pointerId: 101 });
    fireEvent.pointerDown(preview, { clientX: 25.26, clientY: 25.44, pointerId: 102 });
    fireEvent.pointerDown(preview, { clientX: 20.18, clientY: 25.39, pointerId: 103 });
    fireEvent.pointerDown(preview, { clientX: 20.2, clientY: 20.21, pointerId: 104 });

    expect(screen.queryByTestId("raised-area-draft-preview")).toBeNull();
    const firstSegment = screen.getByTestId("drawn-terrain-region-drawn-close-machinery-1-segment-0");
    expect(firstSegment.getAttribute("x1")).toBe("20.13");
    expect(firstSegment.getAttribute("y1")).toBe("20.17");
    expect(firstSegment.getAttribute("x2")).toBe("25.31");
    expect(firstSegment.getAttribute("y2")).toBe("20.22");
  });

  it("lets enemy-tool clicks pass through raised terrain and fire markers", () => {
    expect(tacticalEditorMarkerInteractionEnabled(null, "gang-member")).toBe(false);
    expect(tacticalEditorMarkerInteractionEnabled(null, "gang-leader")).toBe(false);
    expect(tacticalEditorMarkerInteractionEnabled("scenario-raised-area", null)).toBe(false);
    expect(tacticalEditorMarkerInteractionEnabled(null, null)).toBe(true);
  });

  it("offers file loading and non-overwriting Save As controls", () => {
    const markup = renderToStaticMarkup(<TacticalScenarioEditorClient />);

    expect(markup).toContain("Scenario files");
    expect(markup).toContain("Load scenario");
    expect(markup).toContain("Save changes");
    expect(markup).toContain("Save as new scenario");
    expect(markup).toContain("Delete scenario");
    expect(markup).toContain("never overwrites an existing scenario");
    expect(markup).toContain("immutable source");
  });

  it("confirms deletion, removes the saved scenario, and returns to the default", async () => {
    const customDefinition = cloneTacticalScenarioDefinition(
      defaultTacticalScenarioDefinition,
    );
    customDefinition.id = "disposable-scenario";
    customDefinition.consoleVictoryDefinitionId = "disposable-scenario";
    customDefinition.title = "Disposable Scenario";
    const customConsoleVictory = cloneTacticalConsoleVictoryDefinition(
      defaultTacticalConsoleVictoryDefinition,
    );
    customConsoleVictory.id = "disposable-scenario";
    customConsoleVictory.scenarioId = "disposable-scenario";
    const response = (body: unknown, status = 200) => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }) as Response;
    global.fetch = jest.fn(async (input, init) => {
      const url = String(input);
      if (url === "/api/tactical/templates") {
        return response({ templates: [] });
      }
      if (url === "/api/tactical/scenarios"
        && (!init?.method || init.method === "GET")) {
        return response({ scenarios: [
          {
            id: defaultTacticalScenarioDefinition.id,
            title: defaultTacticalScenarioDefinition.title,
            isDefault: true,
          },
          {
            id: customDefinition.id,
            title: customDefinition.title,
            isDefault: false,
          },
        ] });
      }
      if (url.endsWith("/disposable-scenario")
        && (!init?.method || init.method === "GET")) {
        return response({
          definition: customDefinition,
          consoleVictory: customConsoleVictory,
        });
      }
      if (url.endsWith("/disposable-scenario")
        && init?.method === "DELETE") {
        return response({
          deleted: {
            id: customDefinition.id,
            title: customDefinition.title,
          },
        });
      }
      return response({ error: "Unexpected request." }, 500);
    }) as typeof fetch;
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);

    render(<TacticalScenarioEditorClient />);
    await screen.findByRole("option", { name: "Disposable Scenario" });
    fireEvent.change(screen.getByLabelText("Load scenario"), {
      target: { value: "disposable-scenario" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load scenario" }));
    await screen.findByText("Loaded Disposable Scenario.");

    fireEvent.click(screen.getByRole("button", { name: "Delete scenario" }));

    await screen.findByText(
      "Deleted disposable-scenario.json and returned to the default scenario.",
    );
    expect(confirm).toHaveBeenCalledWith(
      'Permanently delete "Disposable Scenario"? This cannot be undone.',
    );
    expect(screen.queryByRole("option", { name: "Disposable Scenario" }))
      .toBeNull();
    expect(screen.getByText(/immutable source/)).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/tactical/scenarios/disposable-scenario",
      { method: "DELETE" },
    );
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
