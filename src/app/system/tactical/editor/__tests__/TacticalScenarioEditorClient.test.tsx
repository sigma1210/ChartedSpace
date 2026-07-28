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
    expect(markup).toContain(">Iris Valve</button>");
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
