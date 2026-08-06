/** @jest-environment jsdom */

import { renderToStaticMarkup } from "react-dom/server";
import { act, fireEvent, render as renderUi, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { Provider } from "react-redux";
import TacticalScenarioEditorClientBase, {
  type TacticalEditorPlaytestProps,
} from "../TacticalScenarioEditorClient";
import { emptyTacticalScenarioDraft } from "../../lib/tacticalEditorDocument";
import { cloneTacticalConsoleVictoryDefinition, defaultTacticalConsoleVictoryDefinition } from "@/plugins/characterCombat/tacticalConsoleVictory";
import { cloneTacticalScenarioDefinition, defaultTacticalScenarioDefinition } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY } from "@/plugins/characterCombat/editor/lib/hudLayouts";
import { store } from "@/store";
import { editorDraftChanged, editorHudLayoutChanged, editorHudLayoutsReset, editorSelectionChanged, editorSessionReset } from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";
import { selectTacticalEditorDocumentDirty } from "@/plugins/characterCombat/editor/redux/selectors";

const TestTacticalPlaytest = ({ draftPlaytest }: TacticalEditorPlaytestProps) => draftPlaytest
  ? <button type="button" onClick={draftPlaytest.onExit}>Exit draft playtest</button>
  : null;

const TacticalScenarioEditorClient = () => (
  <TacticalScenarioEditorClientBase PlaytestComponent={TestTacticalPlaytest} />
);

const render = (ui: ReactElement) => renderUi(<Provider store={store}>{ui}</Provider>);

const penClick = (preview: HTMLElement, x: number, y: number, pointerId: number) => {
  fireEvent.pointerDown(preview, { clientX: x, clientY: y, pointerId });
  fireEvent.pointerUp(preview, { clientX: x, clientY: y, pointerId });
};

const penDrag = (preview: HTMLElement, x: number, y: number, handleX: number, handleY: number, pointerId: number) => {
  fireEvent.pointerDown(preview, { clientX: x, clientY: y, pointerId });
  fireEvent.pointerMove(preview, { clientX: handleX, clientY: handleY, pointerId });
  fireEvent.pointerUp(preview, { clientX: handleX, clientY: handleY, pointerId });
};

const chooseHudTool = (group: string, tool: string) => {
  const groupButton = screen.getByRole("button", { name: `Open ${group} tools` });
  if (groupButton.getAttribute("aria-expanded") !== "true") fireEvent.click(groupButton);
  fireEvent.click(screen.getByRole("button", { name: `Choose ${tool} tool` }));
};

const openDrawingSettings = () => {
  const button = screen.getByRole("button", { name: "Open Drawing Settings" });
  if (button.getAttribute("aria-expanded") !== "true") fireEvent.click(button);
};

const openScenarioProperties = () => {
  const menu = screen.getByRole("button", { name: "Scenario menu" });
  if (menu.getAttribute("aria-expanded") !== "true") fireEvent.click(menu);
  fireEvent.click(screen.getByRole("menuitem", { name: "Scenario Properties…" }));
  return screen.getByRole("dialog", { name: "Scenario Properties" });
};

const applyScenarioTitle = (title: string) => {
  const dialog = openScenarioProperties();
  fireEvent.change(within(dialog).getByLabelText("Scenario title"), { target: { value: title } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
};

const openEditorIssues = () => {
  fireEvent.click(screen.getByRole("button", { name: "Open editor issues" }));
  return screen.getByRole("dialog", { name: "Editor issues" });
};

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
    store.dispatch(editorHudLayoutsReset());
    store.dispatch(editorSessionReset());
    window.localStorage.clear();
    global.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(global, "fetch");
  });

  it("keeps editor tools in the HUD without an object catalog", () => {
    const markup = renderToStaticMarkup(<Provider store={store}><TacticalScenarioEditorClient /></Provider>);

    expect(markup).not.toContain("Object Catalog");
    expect(markup).not.toContain("Open object catalog and tool options");
    expect(markup).toContain("contents invisible");
    expect(markup).toContain("Enemy Palette");
    expect(markup).toContain("Tracing Template");
    expect(markup).toContain("Open tracing template");
    expect(markup).toContain(">Gang Member</span>");
    expect(markup).toContain(">Gang Leader</span>");
    expect(markup).not.toContain(">Fire</button>");
    expect(markup).not.toContain(">Wall</button>");
    expect(markup).not.toContain(">Curved Wall</button>");
    expect(markup).not.toContain(">Pen</button>");
    expect(markup).not.toContain(">Draw Legacy Circle</button>");
    expect(markup).not.toContain(">Circle</button>");
    expect(markup).not.toContain('aria-label="Circle type Wall"');
    expect(markup).not.toContain('aria-label="Circle type Raised"');
    expect(markup).toContain("Open Drawing Settings");
    expect(markup).not.toContain("Drawing precision");
    expect(markup).not.toContain(">Draw Machinery</button>");
    expect(markup).not.toContain(">Draw Liquid H₂</button>");
    expect(markup).not.toContain(">Draw Grass</button>");
    expect(markup).not.toContain(">Draw Sand</button>");
    expect(markup).not.toContain(">Draw Water</button>");
    expect(markup).not.toContain(">Tree</button>");
    expect(markup).not.toContain(">Bush</button>");
    expect(markup).not.toContain(">Rock</button>");
    expect(markup).not.toContain("Wheel zoom · Space drag pan");
    expect(markup).not.toContain(">Stairs</button>");
    expect(markup).not.toContain(">Ladder</button>");
    expect(markup).not.toContain(">Ramp</button>");
    expect(markup).not.toContain(">Door</button>");
    expect(markup).not.toContain(">Wall Iris Valve</button>");
    expect(markup).not.toContain(">Control Room</button>");
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
    expect(markup).not.toContain(">Hatch 1x1</button>");
    expect(markup).not.toContain(">Liquid Hydrogen 2x2</button>");
    expect(markup).not.toContain(">Liquid Hydrogen 3x3</button>");
    expect(markup).not.toContain(">Liquid Hydrogen 4x4</button>");
    expect(markup).not.toContain(">Interactive Human</button>");
    expect(markup).not.toContain(">Deployment Zone 9x9</button>");
    expect(markup).not.toContain("Crew deployment edges");
    expect(markup).not.toContain("<title>");
    expect(markup).toContain('aria-label="Gang Member 1 · facing North"');
  });

  it("constrains the expanded editor canvas to the available height", () => {
    render(<TacticalScenarioEditorClient />);

    const canvas = screen.getByLabelText("Editor canvas");
    expect(canvas.className).toContain("h-full");
    expect(canvas.className).toContain("min-h-0");
    expect(canvas.className).toContain("min-w-0");
    expect(canvas.className).toContain("flex-1");
    expect(canvas.parentElement?.className).toContain("flex");
    expect(canvas.parentElement?.className).toContain("min-h-0");
  });

  it("restores and updates the editor HUD position and pinned state", async () => {
    window.localStorage.setItem(TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY, JSON.stringify({
      tools: { pinned: true, position: { x: 123, y: 87 } },
    }));

    render(<TacticalScenarioEditorClient />);

    const toolsHud = screen.getByText("Tools").closest(".absolute") as HTMLElement;
    await waitFor(() => {
      expect(toolsHud.style.left).toBe("123px");
      expect(toolsHud.style.top).toBe("87px");
      expect(within(toolsHud).getByRole("button", { name: "Unpin HUD" })).toBeTruthy();
      expect(store.getState().tacticalEditor.hudLayouts.tools).toEqual({
        visible: true,
        pinned: true,
        position: { x: 123, y: 87 },
      });
    });

    fireEvent.click(within(toolsHud).getByRole("button", { name: "Unpin HUD" }));
    expect(store.getState().tacticalEditor.hudLayouts.tools.pinned).toBe(false);
    expect(JSON.parse(window.localStorage.getItem(TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY)!)).toEqual({
      tools: { pinned: false, position: { x: 123, y: 87 } },
    });
  });

  it("zooms the editor map toward the pointer and restores the fitted view", () => {
    render(<TacticalScenarioEditorClient />);
    const preview = screen.getByLabelText("Scenario draft map preview");

    expect(preview.getAttribute("viewBox")).toBe("0 0 72 48");
    const wheelEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 54,
      clientY: 12,
      deltaX: 0,
      deltaY: -350,
    });
    fireEvent(preview, wheelEvent);
    expect(wheelEvent.defaultPrevented).toBe(true);
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
    chooseHudTool("Nature & effects", "Fire");
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

  it("switches between CAD select and hand tools with conventional shortcuts", () => {
    render(<TacticalScenarioEditorClient />);
    const selectTool = screen.getByRole("button", { name: "Select tool" });
    const handTool = screen.getByRole("button", { name: "Hand tool" });

    expect(selectTool.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(window, { key: "h" });
    expect(handTool.getAttribute("aria-pressed")).toBe("true");
    expect(store.getState().tacticalEditor.tools.mode).toEqual({ kind: "primary", tool: "hand" });
    fireEvent.keyDown(window, { key: "v" });
    expect(selectTool.getAttribute("aria-pressed")).toBe("true");
    expect(store.getState().tacticalEditor.tools.mode).toEqual({ kind: "primary", tool: "select" });
  });

  it("exposes the core drawing tools as labeled symbols in the horizontal HUD", () => {
    render(<TacticalScenarioEditorClient />);
    expect(screen.queryByRole("group", { name: "Drawing settings" })).toBeNull();
    openDrawingSettings();
    expect(store.getState().tacticalEditor.tools.openGroup).toBe("drawing-settings");
    const drawingSettings = screen.getByRole("group", { name: "Drawing settings" });
    expect(within(drawingSettings).getByLabelText("Drawing precision")).toBeTruthy();
    expect(within(drawingSettings).getByLabelText("Map width")).toBeTruthy();
    expect(within(drawingSettings).getByLabelText("Map height")).toBeTruthy();
    expect(screen.queryByLabelText("Editor properties")).toBeNull();
    expect(screen.queryByLabelText("Object catalog and options")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open Areas tools" }));
    expect(store.getState().tacticalEditor.tools.openGroup).toBe("areas");
    expect(screen.queryByRole("group", { name: "Drawing settings" })).toBeNull();
    const areaTool = screen.getByRole("button", { name: "Choose Pen tool" });

    expect(areaTool.getAttribute("title")).toBe("Pen");
    fireEvent.click(areaTool);
    expect(areaTool.getAttribute("aria-pressed")).toBe("true");
    expect(store.getState().tacticalEditor.tools.mode).toEqual({ kind: "drawing", toolId: "scenario-pen-area" });
    fireEvent.click(screen.getByRole("button", { name: "Open Boundaries tools" }));
    const wallTool = screen.getByRole("button", { name: "Choose Wall tool" });
    expect(wallTool.getAttribute("title")).toBe("Wall");
    fireEvent.click(wallTool);
    expect(wallTool.getAttribute("aria-pressed")).toBe("true");
    expect(store.getState().tacticalEditor.tools.mode).toEqual({ kind: "drawing", toolId: "scenario-wall" });
    expect(screen.queryByRole("button", { name: "Choose Pen tool" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open Interactions tools" }));
    expect(screen.getByRole("button", { name: "Choose Control Room tool" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose Console 1x1 tool" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose Interactive Human tool" })).toBeTruthy();
  });

  it("activates enemy placement as an exclusive Redux tool mode", () => {
    render(<TacticalScenarioEditorClient />);
    act(() => store.dispatch(editorSelectionChanged({ kind: "wall", id: "wall-1" })));

    const enemyOptions = screen.getByLabelText("Enemy options");
    fireEvent.click(within(enemyOptions).getByText("Gang Member").closest("button")!);

    expect(store.getState().tacticalEditor.selection).toEqual({ object: null, areaAnchor: null, operationId: null });
    expect(store.getState().tacticalEditor.tools.mode).toEqual({ kind: "enemy", enemyType: "gang-member" });
    fireEvent.click(screen.getByRole("button", { name: "Node edit tool" }));
    expect(store.getState().tacticalEditor.tools.mode).toEqual({ kind: "primary", tool: "node" });
  });

  it("resizes the map from Drawing Settings", () => {
    render(<TacticalScenarioEditorClient />);
    openDrawingSettings();
    const drawingSettings = screen.getByRole("group", { name: "Drawing settings" });

    fireEvent.change(within(drawingSettings).getByLabelText("Map width"), { target: { value: "80" } });
    fireEvent.change(within(screen.getByRole("group", { name: "Drawing settings" })).getByLabelText("Map height"), { target: { value: "60" } });

    expect(screen.getByText("Draft preview · 80×60")).toBeTruthy();
  });

  it.each([
    ["Control Room", "control-room-1", "Console Editor", 2, 2],
    ["Console 1x1", "console-1x1-1", "Console Editor", 12, 2],
    ["Interactive Human", "interactive-human-1", "Human Interaction Editor", 14, 2],
  ] as const)("places %s from the horizontal HUD and opens its editor", (tool, placementId, editorTitle, x, y) => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "Open Interactions tools" }));
    fireEvent.click(screen.getByRole("button", { name: `Choose ${tool} tool` }));

    fireEvent.pointerDown(screen.getByLabelText("Scenario draft map preview"), {
      clientX: x,
      clientY: y,
      pointerId: 150,
    });

    expect(screen.getByTestId(`editor-layer-terrain-placement:${placementId}`)).toBeTruthy();
    expect(screen.getByText(editorTitle)).toBeTruthy();
  });

  it("configures an interactive human placed from the horizontal HUD", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "Open Interactions tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Interactive Human tool" }));
    fireEvent.pointerDown(screen.getByLabelText("Scenario draft map preview"), {
      clientX: 14,
      clientY: 2,
      pointerId: 151,
    });

    expect(screen.getByText("Human Interaction Editor")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Human name"), { target: { value: "Mara Venn" } });
    fireEvent.click(screen.getByRole("button", { name: "Rotate interactive human 90 degrees" }));
    fireEvent.click(screen.getByRole("button", { name: "Add operation" }));
    fireEvent.change(screen.getByLabelText("Success becomes"), { target: { value: "ally" } });
    fireEvent.change(screen.getByLabelText("Failure becomes"), { target: { value: "enemy" } });

    expect(screen.getByDisplayValue("Mara Venn")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rotate interactive human 90 degrees" }).textContent).toContain("Facing East");
    expect(screen.getByDisplayValue("Interact with Mara Venn")).toBeTruthy();
    expect((screen.getByLabelText("Success becomes") as HTMLSelectElement).value).toBe("ally");
    expect((screen.getByLabelText("Failure becomes") as HTMLSelectElement).value).toBe("enemy");
  });

  it("drags a rectangle area, previews its dimensions, and opens its properties", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "Open Areas tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Rectangle area tool" }));
    const preview = screen.getByLabelText("Scenario draft map preview");

    fireEvent.pointerDown(preview, { clientX: 10, clientY: 10, pointerId: 140 });
    fireEvent.pointerMove(preview, { clientX: 16, clientY: 14, pointerId: 140 });

    const draftRectangle = screen.getByTestId("rectangle-area-draft-preview").querySelector("rect")!;
    expect(draftRectangle.getAttribute("x")).toBe("10");
    expect(draftRectangle.getAttribute("y")).toBe("10");
    expect(draftRectangle.getAttribute("width")).toBe("6");
    expect(draftRectangle.getAttribute("height")).toBe("4");

    fireEvent.pointerUp(preview, { clientX: 16, clientY: 14, pointerId: 140 });

    expect(screen.queryByTestId("rectangle-area-draft-preview")).toBeNull();
    expect(screen.getByTestId("drawn-area-rectangle-area-1-segment-0")).toBeTruthy();
    expect(screen.queryByTestId("drawn-area-rectangle-area-1-anchor-0")).toBeNull();
    expect(screen.getByTestId("drawn-area-rectangle-area-1-rectangle-center-handle")).toBeTruthy();
    expect(screen.getByTestId("drawn-area-rectangle-area-1-rectangle-bottom-right-handle")).toBeTruthy();
    expect(screen.getByLabelText("Area surface fill")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Area surface fill"), { target: { value: "sand" } });
    fireEvent.click(screen.getByRole("button", { name: "Raise area by half level" }));
    fireEvent.change(screen.getByLabelText("Area boundary"), { target: { value: "wall" } });
    fireEvent.change(screen.getByLabelText("Area use"), { target: { value: "crew-deployment" } });
    expect(screen.getByTestId("drawn-area-rectangle-area-1").getAttribute("data-elevation-level")).toBe("0.5");
    expect(screen.getByTestId("drawn-area-rectangle-area-1").getAttribute("data-boundary")).toBe("wall");
    expect(screen.getByTestId("drawn-area-rectangle-area-1").getAttribute("data-deployment")).toBe("crew");
    expect(screen.getByTestId("editor-layer-area:rectangle-area-1").textContent).toContain("Crew deployment");

    fireEvent.pointerDown(screen.getByTestId("drawn-area-rectangle-area-1-rectangle-bottom-right-handle"), { clientX: 16, clientY: 14, pointerId: 141 });
    fireEvent.pointerMove(preview, { clientX: 18, clientY: 15, pointerId: 141 });
    fireEvent.pointerUp(preview, { clientX: 18, clientY: 15, pointerId: 141 });
    const resizedRight = screen.getByTestId("drawn-area-rectangle-area-1-segment-1");
    expect(resizedRight.getAttribute("x1")).toBe("18");
    expect(resizedRight.getAttribute("x2")).toBe("18");
  });

  it("adds doors and iris valves from the HUD to Rectangle, Circle, and curved Pen boundary walls", () => {
    render(<TacticalScenarioEditorClient />);
    const preview = screen.getByLabelText("Scenario draft map preview") as HTMLElement;

    fireEvent.click(screen.getByRole("button", { name: "Open Areas tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Rectangle area tool" }));
    fireEvent.pointerDown(preview, { clientX: 10, clientY: 10, pointerId: 160 });
    fireEvent.pointerMove(preview, { clientX: 16, clientY: 14, pointerId: 160 });
    fireEvent.pointerUp(preview, { clientX: 16, clientY: 14, pointerId: 160 });
    fireEvent.change(screen.getByLabelText("Area boundary"), { target: { value: "wall" } });

    fireEvent.click(screen.getByRole("button", { name: "Open Boundaries tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Door tool" }));
    fireEvent.pointerMove(preview, { clientX: 13, clientY: 10, pointerId: 161 });
    expect(screen.getByTestId("wall-portal-preview")).toBeTruthy();
    fireEvent.pointerDown(preview, { clientX: 13, clientY: 10, pointerId: 161 });
    expect(screen.getByTestId("wall-portal-wall-door-1")).toBeTruthy();
    expect(screen.getByTestId("editor-layer-portal:wall-door-1")).toBeTruthy();
    fireEvent.click(within(screen.getByTestId("editor-layer-area:rectangle-area-1")).getByRole("button", { name: "rectangle-area-1" }));
    expect(store.getState().tacticalEditor.selection.object).toEqual({ kind: "area", id: "rectangle-area-1" });
    fireEvent.click(within(screen.getByTestId("editor-layer-portal:wall-door-1")).getByRole("button", { name: "wall-door-1" }));
    expect(store.getState().tacticalEditor.selection).toEqual({
      object: { kind: "portal", id: "wall-door-1" },
      areaAnchor: null,
      operationId: null,
    });

    fireEvent.click(screen.getByRole("button", { name: "Open Areas tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Circle area tool" }));
    fireEvent.pointerDown(preview, { clientX: 30, clientY: 10, pointerId: 162 });
    fireEvent.pointerMove(preview, { clientX: 34, clientY: 10, pointerId: 162 });
    fireEvent.pointerUp(preview, { clientX: 34, clientY: 10, pointerId: 162 });
    fireEvent.change(screen.getByLabelText("Area boundary"), { target: { value: "wall" } });

    fireEvent.click(screen.getByRole("button", { name: "Open Boundaries tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Wall iris valve tool" }));
    fireEvent.pointerMove(preview, { clientX: 34, clientY: 10, pointerId: 163 });
    fireEvent.pointerDown(preview, { clientX: 34, clientY: 10, pointerId: 163 });
    expect(screen.getByTestId("wall-portal-wall-iris-valve-1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Open Areas tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Pen tool" }));
    penClick(preview, 40, 20, 164);
    penDrag(preview, 46, 20, 46, 24, 165);
    penClick(preview, 46, 26, 166);
    penClick(preview, 40, 26, 167);
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.change(screen.getByLabelText("Area boundary"), { target: { value: "wall" } });

    fireEvent.click(screen.getByRole("button", { name: "Open Boundaries tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Door tool" }));
    fireEvent.pointerMove(preview, { clientX: 43, clientY: 19, pointerId: 168 });
    fireEvent.pointerDown(preview, { clientX: 43, clientY: 19, pointerId: 168 });
    expect(screen.getByTestId("wall-portal-wall-door-2")).toBeTruthy();
  });

  it("synchronizes layer selection, visibility, and locking with editor state", () => {
    render(<TacticalScenarioEditorClient />);
    expect(screen.queryByLabelText("Editor properties")).toBeNull();
    expect((screen.getByRole("button", { name: "Rotate selected item 90 degrees" }) as HTMLButtonElement).disabled).toBe(true);
    const layer = screen.getByTestId("editor-layer-terrain-placement:control-room-alpha");

    fireEvent.click(within(layer).getByRole("button", { name: "control-room-alpha" }));
    expect(layer.className).toContain("bg-cyan-950/70");
    const placementControl = screen.getByTestId("terrain-placement-control-control-room-alpha");
    expect(placementControl.getAttribute("data-rotation")).toBe("0");
    fireEvent.click(screen.getByRole("button", { name: "Rotate selected item 90 degrees" }));
    expect(placementControl.getAttribute("data-rotation")).toBe("90");
    fireEvent.keyDown(window, { key: "r" });
    expect(placementControl.getAttribute("data-rotation")).toBe("180");

    fireEvent.click(within(layer).getByRole("button", { name: "Hide control-room-alpha" }));
    expect(screen.getByRole("button", { name: "Show control-room-alpha" })).toBeTruthy();
    expect(layer.className).not.toContain("bg-cyan-950/70");
    expect(store.getState().tacticalEditor.layers.hiddenByKey).toEqual({
      "terrain-placement:control-room-alpha": true,
    });
    expect(store.getState().tacticalEditor.selection.object).toBeNull();

    fireEvent.click(within(layer).getByRole("button", { name: "Lock control-room-alpha" }));
    expect(screen.getByRole("button", { name: "Unlock control-room-alpha" })).toBeTruthy();
    expect(store.getState().tacticalEditor.layers.lockedByKey).toEqual({
      "terrain-placement:control-room-alpha": true,
    });
  });

  it("controls Layers from Tools without rendering the separate HUDs launcher", () => {
    render(<TacticalScenarioEditorClient />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse Layers" }));
    expect(screen.queryByLabelText("Editor layers")).toBeNull();
    expect(screen.queryByText("HUDs")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open layers" }));
    expect(screen.getByLabelText("Editor layers")).toBeTruthy();
  });

  it("dismisses header menus on outside pointer-down and Escape", () => {
    render(<TacticalScenarioEditorClient />);
    const fileMenu = screen.getByRole("button", { name: "File menu" });
    fireEvent.click(fileMenu);
    expect(fileMenu.getAttribute("aria-expanded")).toBe("true");
    fireEvent.pointerDown(screen.getByLabelText("Scenario draft map preview"));
    expect(fileMenu.getAttribute("aria-expanded")).toBe("false");

    const scenarioMenu = screen.getByRole("button", { name: "Scenario menu" });
    fireEvent.click(scenarioMenu);
    expect(scenarioMenu.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(scenarioMenu.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps raised areas and placed objects above constrained-area interior hit targets", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.drawnAreas = [{
      id: "selection-circle",
      geometry: { kind: "circle", center: { x: 24.5, y: 34.5 }, radius: 3 },
      segments: [{ kind: "line", from: { x: 27.5, y: 34.5 }, to: { x: 24.5, y: 37.5 } }],
      surface: "none",
      elevation: 0,
      boundary: "none",
    }];
    definition.drawnRaisedAreas = [{
      id: "selection-platform",
      segments: [
        { kind: "line", from: { x: 22, y: 32 }, to: { x: 27, y: 32 } },
        { kind: "line", from: { x: 27, y: 32 }, to: { x: 27, y: 37 } },
        { kind: "line", from: { x: 27, y: 37 }, to: { x: 22, y: 37 } },
        { kind: "line", from: { x: 22, y: 37 }, to: { x: 22, y: 32 } },
      ],
    }];
    definition.drawnRaisedAreaLevels = { "selection-platform": 1 };
    render(<TacticalScenarioEditorClient />);
    act(() => store.dispatch(editorDraftChanged(definition)));

    const hitTarget = screen.getByTestId("drawn-area-selection-circle-interior-hit-target");
    const raisedBoundary = screen.getByTestId("drawn-raised-area-selection-platform-segment-0");
    const placedObject = screen.getByTestId("terrain-placement-control-control-room-alpha");
    expect(hitTarget.compareDocumentPosition(raisedBoundary) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(hitTarget.compareDocumentPosition(placedObject) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

    fireEvent.pointerDown(hitTarget);
    expect(store.getState().tacticalEditor.selection.object).toEqual({ kind: "area", id: "selection-circle" });
    fireEvent.pointerDown(raisedBoundary);
    expect(store.getState().tacticalEditor.selection.object).toEqual({ kind: "legacy-raised-area", id: "selection-platform" });
    fireEvent.pointerDown(placedObject);
    expect(store.getState().tacticalEditor.selection.object).toEqual({ kind: "terrain-placement", id: "control-room-alpha" });
  });

  it("reopens the Enemy Palette from the Interactions submenu", () => {
    render(<TacticalScenarioEditorClient />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse Enemy Palette" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Interactions tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Enemy Palette" }));

    expect(screen.getByRole("button", { name: "Collapse Enemy Palette" })).toBeTruthy();
  });

  it("controls the Tools HUD through View → Toolbar without changing its layout", () => {
    store.dispatch(editorHudLayoutChanged({
      id: "tools",
      layout: { visible: true, pinned: true, position: { x: 280, y: 24 } },
    }));
    render(<TacticalScenarioEditorClient />);

    fireEvent.click(screen.getByRole("button", { name: "View menu" }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Toolbar" }));
    expect(screen.queryByRole("button", { name: "Collapse Tools" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "View menu" }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Toolbar" }));
    expect(screen.getByRole("button", { name: "Collapse Tools" })).toBeTruthy();
    expect(store.getState().tacticalEditor.hudLayouts.tools).toEqual({
      visible: true,
      pinned: true,
      position: { x: 280, y: 24 },
    });
  });

  it("reopens the tracing HUD from Tools without resetting its position or lock state", () => {
    store.dispatch(editorHudLayoutChanged({
      id: "tracing-template",
      layout: { visible: true, pinned: true, position: { x: 321, y: 222 } },
    }));
    render(<TacticalScenarioEditorClient />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse Tracing Template" }));
    fireEvent.click(screen.getByRole("button", { name: "Open tracing template" }));

    expect(store.getState().tacticalEditor.hudLayouts["tracing-template"]).toEqual({
      visible: true,
      pinned: true,
      position: { x: 321, y: 222 },
    });
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
      expect(store.getState().tacticalEditor.templates).toMatchObject({
        indexStatus: "idle",
        operation: "idle",
        assets: [{ id: "built-in:landing-pad", label: "Landing Pad" }],
      });
      fireEvent.change(templateSelect, { target: { value: "/images/tactical/landing-pad/map.jpg" } });

      await waitFor(() => expect(screen.getByTestId("tracing-template-image")).toBeTruthy());
      expect(store.getState().tacticalEditor.templates).toMatchObject({
        operation: "idle",
        message: { kind: "success", text: "Tracing template fitted to the map." },
      });
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

  it("uploads a tracing template into the Redux library and fits it", async () => {
    const OriginalImage = window.Image;
    class MockImage {
      naturalWidth = 800;
      naturalHeight = 400;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    Object.defineProperty(window, "Image", { configurable: true, writable: true, value: MockImage });
    const uploadedTemplate = {
      id: "uploaded:deck-plan",
      label: "Deck Plan",
      imagePath: "/uploads/tactical/deck-plan.jpg",
      source: "uploaded" as const,
    };
    global.fetch = jest.fn((input, init) => {
      const url = String(input);
      if (url === "/api/tactical/templates" && init?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ template: uploadedTemplate }) } as Response);
      }
      if (url === "/api/tactical/templates") {
        return Promise.resolve({ ok: true, json: async () => ({ templates: [] }) } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({ scenarios: [] }) } as Response);
    }) as typeof fetch;

    try {
      render(<TacticalScenarioEditorClient />);
      await screen.findByLabelText("Template image");
      const file = new File(["image"], "deck-plan.jpg", { type: "image/jpeg" });
      fireEvent.change(screen.getByLabelText("Upload tracing template"), { target: { files: [file] } });

      await screen.findByRole("option", { name: "Deck Plan (uploaded)" });
      expect(store.getState().tacticalEditor.templates).toMatchObject({
        assets: [uploadedTemplate],
        operation: "idle",
        message: { kind: "success", text: "Deck Plan uploaded and fitted to the map." },
      });
      expect(store.getState().tacticalEditor.document.draft.tracingTemplate?.imagePath)
        .toBe(uploadedTemplate.imagePath);
    } finally {
      Object.defineProperty(window, "Image", { configurable: true, writable: true, value: OriginalImage });
    }
  });

  it("draws a diagonal wall between snapped grid vertices and selects it", () => {
    render(<TacticalScenarioEditorClient />);
    chooseHudTool("Boundaries", "Wall");
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

    chooseHudTool("Boundaries", "Wall iris valve");
    fireEvent.pointerMove(preview, { clientX: 15, clientY: 15, pointerId: 7 });
    expect(screen.getByTestId("wall-portal-preview")).toBeTruthy();
    fireEvent.pointerDown(preview, { clientX: 15, clientY: 15, pointerId: 7 });
    expect(screen.getByTestId("wall-portal-wall-iris-valve-1")).toBeTruthy();

    chooseHudTool("Boundaries", "Door");
    fireEvent.pointerMove(preview, { clientX: 12, clientY: 12.5, pointerId: 8 });
    fireEvent.pointerDown(preview, { clientX: 12, clientY: 12.5, pointerId: 8 });
    expect(screen.getByTestId("wall-portal-wall-door-1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Select tool" }));
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
    expect(within(openEditorIssues()).getByText("Keep the portal on an open one-square position on its wall.")).toBeTruthy();

    fireEvent.keyDown(window, { key: "Delete" });
    expect(screen.queryByTestId("wall-portal-wall-door-1")).toBeNull();
    expect(screen.getByTestId("drawn-wall-drawn-wall-1")).toBeTruthy();
    expect(screen.getByTestId("wall-portal-wall-iris-valve-1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Select tool" }));
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
    fireEvent.keyDown(window, { key: "Delete" });
    expect(screen.queryByTestId("drawn-wall-drawn-wall-1")).toBeNull();
    expect(screen.queryByTestId("wall-portal-wall-iris-valve-1")).toBeNull();
  });

  it("completes an enclosed wall outline with click-start and click-end", () => {
    render(<TacticalScenarioEditorClient />);
    chooseHudTool("Boundaries", "Wall");
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
    chooseHudTool("Boundaries", "Curved wall");
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

    fireEvent.click(screen.getByRole("button", { name: "Select tool" }));
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
    openDrawingSettings();
    fireEvent.change(screen.getByLabelText("Drawing precision"), { target: { value: "half-grid" } });
    chooseHudTool("Boundaries", "Wall");
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

  it("draws and edits a circle with the unified closed-area controls", () => {
    render(<TacticalScenarioEditorClient />);
    openDrawingSettings();
    fireEvent.change(screen.getByLabelText("Drawing precision"), {
      target: { value: "quarter-grid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open Areas tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Circle area tool" }));
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

    const circle = screen.getByTestId("drawn-area-circle-area-1");
    expect(circle.getAttribute("data-elevation-level")).toBe("0");
    expect(screen.getByRole("button", { name: "Collapse Area Properties" })).toBeTruthy();
    expect(screen.queryByTestId("drawn-area-circle-area-1-anchor-0")).toBeNull();
    expect(screen.queryByTestId("drawn-area-circle-area-1-segment-0-control-handle")).toBeNull();
    expect(screen.getByTestId("drawn-area-circle-area-1-circle-center-handle")).toBeTruthy();
    expect(screen.getByTestId("drawn-area-circle-area-1-circle-radius-handle")).toBeTruthy();
    expect(screen.getByTestId("drawn-area-circle-area-1-segment-0").getAttribute("d"))
      .toContain("M 14.5 10.25 Q 14.5");

    fireEvent.pointerDown(
      screen.getByTestId("drawn-area-circle-area-1-circle-center-handle"),
      { clientX: 10.25, clientY: 10.25, pointerId: 47 },
    );
    fireEvent.pointerMove(preview, {
      clientX: 11.25,
      clientY: 11.25,
      pointerId: 47,
    });
    fireEvent.pointerUp(preview, {
      clientX: 11.25,
      clientY: 11.25,
      pointerId: 47,
    });
    expect(screen.getByTestId("drawn-area-circle-area-1-circle-center-handle").getAttribute("cx")).toBe("11.25");
    expect(screen.getByTestId("drawn-area-circle-area-1-circle-radius-handle").getAttribute("cx")).toBe("15.5");

    fireEvent.pointerDown(
      screen.getByTestId("drawn-area-circle-area-1-circle-radius-handle"),
      { clientX: 15.5, clientY: 11.25, pointerId: 48 },
    );
    fireEvent.pointerMove(preview, {
      clientX: 15.25,
      clientY: 11.25,
      pointerId: 48,
    });
    fireEvent.pointerUp(preview, {
      clientX: 15.25,
      clientY: 11.25,
      pointerId: 48,
    });
    expect(screen.getByTestId("drawn-area-circle-area-1-circle-radius-handle").getAttribute("cx")).toBe("15.25");
    expect(screen.getByTestId("drawn-area-circle-area-1-segment-0").getAttribute("d")).toContain("M 15.25 11.25 Q 15.25");

    fireEvent.change(screen.getByLabelText("Area surface fill"), { target: { value: "close-machinery" } });
    fireEvent.click(screen.getByRole("button", { name: "Raise area by half level" }));
    fireEvent.change(screen.getByLabelText("Area boundary"), { target: { value: "wall" } });
    expect(circle.getAttribute("data-elevation-level")).toBe("0.5");
    expect(circle.getAttribute("data-boundary")).toBe("wall");

    fireEvent.click(screen.getByRole("button", { name: "Node edit tool" }));
    fireEvent.doubleClick(screen.getByTestId("drawn-area-circle-area-1-segment-0"), { clientX: 15.25, clientY: 11.25 });
    expect(screen.queryByTestId("drawn-area-circle-area-1-anchor-0")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Delete area" }));
    expect(screen.queryByTestId("drawn-area-circle-area-1")).toBeNull();
  });

  it("draws a circle on top of a selected circle", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "Open Areas tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Circle area tool" }));
    const preview = screen.getByLabelText("Scenario draft map preview");

    fireEvent.pointerDown(preview, { clientX: 10, clientY: 10, pointerId: 49 });
    fireEvent.pointerMove(preview, { clientX: 14, clientY: 10, pointerId: 49 });
    fireEvent.pointerUp(preview, { clientX: 14, clientY: 10, pointerId: 49 });

    fireEvent.click(screen.getByRole("button", { name: "Choose Circle area tool" }));
    fireEvent.pointerDown(preview, { clientX: 10, clientY: 10, pointerId: 50 });
    fireEvent.pointerMove(preview, { clientX: 12, clientY: 10, pointerId: 50 });
    fireEvent.pointerUp(preview, { clientX: 12, clientY: 10, pointerId: 50 });

    expect(screen.getByTestId("drawn-area-circle-area-1")).toBeTruthy();
    expect(screen.getByTestId("drawn-area-circle-area-2")).toBeTruthy();
    expect(screen.getByTestId("drawn-area-circle-area-1-segment-0").getAttribute("d"))
      .toContain("M 14 10 Q 14");
  });

  it("places, moves, and deletes doors and iris valves on a circle wall", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "Open Boundaries tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Legacy circle wall tool" }));
    expect(screen.getByRole("button", { name: "Collapse Legacy Circle Properties" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Circle type Wall" }));
    const preview = screen.getByLabelText("Scenario draft map preview");

    fireEvent.pointerDown(preview, { clientX: 10, clientY: 10, pointerId: 70 });
    fireEvent.pointerMove(preview, { clientX: 14, clientY: 10, pointerId: 70 });
    fireEvent.pointerUp(preview, { clientX: 14, clientY: 10, pointerId: 70 });

    chooseHudTool("Boundaries", "Door");
    fireEvent.pointerMove(preview, { clientX: 14, clientY: 10, pointerId: 71 });
    expect(screen.getByTestId("wall-portal-preview")).toBeTruthy();
    fireEvent.pointerDown(preview, { clientX: 14, clientY: 10, pointerId: 71 });
    expect(screen.getByTestId("wall-portal-wall-door-1")).toBeTruthy();

    chooseHudTool("Boundaries", "Wall iris valve");
    fireEvent.pointerMove(preview, { clientX: 6, clientY: 10, pointerId: 72 });
    fireEvent.pointerDown(preview, { clientX: 6, clientY: 10, pointerId: 72 });
    expect(screen.getByTestId("wall-portal-wall-iris-valve-1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Select tool" }));
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

    fireEvent.keyDown(window, { key: "Delete" });
    expect(screen.queryByTestId("wall-portal-wall-door-1")).toBeNull();
    expect(screen.getByTestId("wall-portal-wall-iris-valve-1")).toBeTruthy();
    expect(screen.getByTestId("terrain-circle-terrain-circle-1")).toBeTruthy();
  });

  it("draws and closes an area with a live enclosed-cell preview", () => {
    render(<TacticalScenarioEditorClient />);
    chooseHudTool("Areas", "Pen");
    const preview = screen.getByLabelText("Scenario draft map preview") as HTMLElement;

    penClick(preview, 20, 20, 50);
    expect(screen.getByTestId("raised-area-draft-preview")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel outline" })).toBeTruthy();
    penClick(preview, 25, 20, 51);
    penClick(preview, 25, 25, 52);
    fireEvent.pointerMove(preview, { clientX: 20, clientY: 25, pointerId: 53 });
    expect(screen.getByTestId("raised-area-draft-preview").querySelectorAll("rect")).toHaveLength(25);
    penClick(preview, 20, 25, 54);
    fireEvent.click(screen.getByRole("button", { name: "Finish area" }));

    expect(screen.queryByTestId("raised-area-draft-preview")).toBeNull();
    expect(screen.getByTestId("drawn-area-drawn-area-1-segment-0")).toBeTruthy();
    expect(screen.getByTestId("drawn-area-drawn-area-1-segment-3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Collapse Area Properties" })).toBeTruthy();
    expect((screen.getByLabelText("Area elevation level") as HTMLInputElement).value).toBe("0");
  });

  it("sets surface, half-level elevation, and boundary independently on one area", () => {
    render(<TacticalScenarioEditorClient />);
    chooseHudTool("Areas", "Pen");
    const preview = screen.getByLabelText("Scenario draft map preview") as HTMLElement;
    penClick(preview, 20, 20, 57);
    penClick(preview, 25, 20, 58);
    penClick(preview, 25, 25, 59);
    penClick(preview, 20, 25, 60);
    penClick(preview, 20, 20, 61);

    fireEvent.change(screen.getByLabelText("Area surface fill"), { target: { value: "sand" } });
    fireEvent.click(screen.getByRole("button", { name: "Raise area by half level" }));
    fireEvent.change(screen.getByLabelText("Area boundary"), { target: { value: "wall" } });

    expect((screen.getByLabelText("Area surface fill") as HTMLSelectElement).value).toBe("sand");
    expect((screen.getByLabelText("Area elevation level") as HTMLInputElement).value).toBe("0.5");
    expect((screen.getByLabelText("Area boundary") as HTMLSelectElement).value).toBe("wall");
    expect(screen.getByTestId("drawn-area-drawn-area-1").getAttribute("data-elevation-level")).toBe("0.5");
    expect(screen.getByTestId("drawn-area-drawn-area-1").getAttribute("data-boundary")).toBe("wall");

    fireEvent.click(screen.getByRole("button", { name: "Collapse Area Properties" }));
    expect(screen.queryByLabelText("Area surface fill")).toBeNull();
    const areaLayer = screen.getByTestId("editor-layer-area:drawn-area-1");
    fireEvent.click(within(areaLayer).getByRole("button", { name: "drawn-area-1" }));
    expect((screen.getByLabelText("Area surface fill") as HTMLSelectElement).value).toBe("sand");
  });

  it("cancels an unfinished closed-area outline with Escape", () => {
    render(<TacticalScenarioEditorClient />);
    chooseHudTool("Areas", "Pen");
    const preview = screen.getByLabelText("Scenario draft map preview") as HTMLElement;
    penClick(preview, 30, 20, 60);
    fireEvent.pointerMove(preview, { clientX: 35, clientY: 20, pointerId: 61 });
    expect(screen.getByTestId("raised-area-draft-preview").querySelector("line, path")).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("raised-area-draft-preview")).toBeNull();
  });

  it("creates a curved Pen segment by dragging its second point", () => {
    render(<TacticalScenarioEditorClient />);
    chooseHudTool("Areas", "Pen");
    const preview = screen.getByLabelText("Scenario draft map preview") as HTMLElement;
    penClick(preview, 10, 10, 62);
    penDrag(preview, 20, 10, 20, 14, 63);

    expect(screen.getByTestId("raised-area-draft-segment-0").getAttribute("d")).toBe("M 10 10 C 10 10 20 6 20 10");
  });

  it("mixes straight and curved Pen segments and closes with Enter", () => {
    render(<TacticalScenarioEditorClient />);
    const preview = screen.getByLabelText("Scenario draft map preview") as HTMLElement;
    chooseHudTool("Areas", "Pen");
    penClick(preview, 30, 20, 70);
    penClick(preview, 35, 20, 71);
    penDrag(preview, 35, 25, 33, 25, 72);
    penClick(preview, 30, 25, 73);
    fireEvent.keyDown(window, { key: "Enter" });

    const curvedSegment = screen.getByTestId("drawn-area-drawn-area-1-segment-1");
    expect(curvedSegment.tagName.toLowerCase()).toBe("path");
    expect(curvedSegment.getAttribute("d")).toBe("M 35 20 C 35 20 37 25 35 25");
    expect(screen.getByRole("button", { name: "Choose Pen tool" }).getAttribute("aria-pressed")).toBe("false");

    const firstAnchor = screen.getByTestId("drawn-area-drawn-area-1-anchor-0");
    fireEvent.pointerDown(firstAnchor, { clientX: 30, clientY: 20, pointerId: 74 });
    fireEvent.pointerMove(preview, { clientX: 29, clientY: 19, pointerId: 74 });
    fireEvent.pointerUp(preview, { clientX: 29, clientY: 19, pointerId: 74 });
    expect(screen.getByTestId("drawn-area-drawn-area-1-segment-0").getAttribute("x1")).toBe("29");
    expect(screen.getByTestId("drawn-area-drawn-area-1-segment-3").getAttribute("x2")).toBe("29");

    const incomingHandle = screen.getByTestId("drawn-area-drawn-area-1-segment-1-control2-handle");
    fireEvent.pointerDown(incomingHandle, { clientX: 37, clientY: 25, pointerId: 75 });
    fireEvent.pointerMove(preview, { clientX: 36, clientY: 24, pointerId: 75 });
    fireEvent.pointerUp(preview, { clientX: 36, clientY: 24, pointerId: 75 });
    expect(screen.getByTestId("drawn-area-drawn-area-1-segment-1").getAttribute("d")).toBe("M 35 20 C 35 20 36 24 35 25");

    const movedAnchor = screen.getByTestId("drawn-area-drawn-area-1-anchor-0");
    fireEvent.pointerDown(movedAnchor, { clientX: 29, clientY: 19, pointerId: 76 });
    fireEvent.pointerMove(preview, { clientX: 28, clientY: 18, pointerId: 76 });
    fireEvent.pointerCancel(preview, { pointerId: 76 });
    expect(screen.getByTestId("drawn-area-drawn-area-1-segment-0").getAttribute("x1")).toBe("29");

    fireEvent.click(screen.getByRole("button", { name: "Node edit tool" }));
    fireEvent.doubleClick(screen.getByTestId("drawn-area-drawn-area-1-segment-0"), { clientX: 32, clientY: 20 });
    expect(screen.getAllByTestId(/drawn-area-drawn-area-1-anchor-/)).toHaveLength(5);
    expect(store.getState().tacticalEditor.selection).toEqual({
      object: { kind: "area", id: "drawn-area-1" },
      areaAnchor: { areaId: "drawn-area-1", anchorIndex: 1 },
      operationId: null,
    });
    fireEvent.keyDown(window, { key: "Delete" });
    expect(screen.getAllByTestId(/drawn-area-drawn-area-1-anchor-/)).toHaveLength(4);

    fireEvent.doubleClick(screen.getByTestId("drawn-area-drawn-area-1-segment-1"), { clientX: 36, clientY: 23 });
    expect(screen.getAllByTestId(/drawn-area-drawn-area-1-anchor-/)).toHaveLength(5);
    expect(screen.getByTestId("drawn-area-drawn-area-1-segment-1").tagName.toLowerCase()).toBe("path");
    expect(screen.getByTestId("drawn-area-drawn-area-1-segment-2").tagName.toLowerCase()).toBe("path");
    fireEvent.keyDown(window, { key: "Backspace" });
    expect(screen.getAllByTestId(/drawn-area-drawn-area-1-anchor-/)).toHaveLength(4);
  });

  it("persists a reshaped closed area through Save As and reload", async () => {
    let savedDefinition: ReturnType<typeof cloneTacticalScenarioDefinition> | null = null;
    let savedConsoleVictory: ReturnType<typeof cloneTacticalConsoleVictoryDefinition> | null = null;
    const response = (body: unknown, status = 200) => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }) as Response;
    global.fetch = jest.fn(async (input, init) => {
      const url = String(input);
      if (url === "/api/tactical/templates") return response({ templates: [] });
      if (url === "/api/tactical/scenarios" && init?.method === "POST") {
        const request = JSON.parse(String(init.body)) as {
          definition: ReturnType<typeof cloneTacticalScenarioDefinition>;
          consoleVictory: ReturnType<typeof cloneTacticalConsoleVictoryDefinition>;
        };
        savedDefinition = cloneTacticalScenarioDefinition(request.definition);
        savedDefinition.id = "closed-area-edit";
        savedDefinition.title = "Closed Area Edit";
        savedDefinition.consoleVictoryDefinitionId = "closed-area-edit";
        savedConsoleVictory = cloneTacticalConsoleVictoryDefinition(request.consoleVictory);
        savedConsoleVictory.id = "closed-area-edit";
        savedConsoleVictory.scenarioId = "closed-area-edit";
        return response({
          scenario: { id: "closed-area-edit", title: "Closed Area Edit", isDefault: false },
          definition: savedDefinition,
          consoleVictory: savedConsoleVictory,
        });
      }
      if (url === "/api/tactical/scenarios" && (!init?.method || init.method === "GET")) {
        return response({ scenarios: [
          { id: defaultTacticalScenarioDefinition.id, title: defaultTacticalScenarioDefinition.title, isDefault: true },
          ...(savedDefinition ? [{ id: "closed-area-edit", title: "Closed Area Edit", isDefault: false }] : []),
        ] });
      }
      if (url.endsWith("/closed-area-edit") && (!init?.method || init.method === "GET") && savedDefinition && savedConsoleVictory) {
        return response({ definition: savedDefinition, consoleVictory: savedConsoleVictory });
      }
      return response({ error: `Unexpected request: ${url} (${init?.method ?? "GET"}).` }, 500);
    }) as typeof fetch;

    render(<TacticalScenarioEditorClient />);
    const preview = screen.getByLabelText("Scenario draft map preview") as HTMLElement;
    chooseHudTool("Areas", "Pen");
    penClick(preview, 20, 20, 200);
    penClick(preview, 25, 20, 201);
    penClick(preview, 25, 25, 202);
    penClick(preview, 20, 25, 203);
    fireEvent.keyDown(window, { key: "Enter" });

    fireEvent.pointerDown(screen.getByTestId("drawn-area-drawn-area-1-anchor-0"), { clientX: 20, clientY: 20, pointerId: 204 });
    fireEvent.pointerMove(preview, { clientX: 19, clientY: 19, pointerId: 204 });
    fireEvent.pointerUp(preview, { clientX: 19, clientY: 19, pointerId: 204 });
    fireEvent.click(screen.getByRole("button", { name: "File menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Save As…" }));
    const saveAsDialog = screen.getByRole("dialog", { name: "Save Scenario As" });
    fireEvent.change(within(saveAsDialog).getByLabelText("New scenario name"), { target: { value: "Closed Area Edit" } });
    fireEvent.click(within(saveAsDialog).getByRole("button", { name: "Save As" }));

    await screen.findByText("Saved closed-area-edit.json.");
    const persistedDefinition = savedDefinition as ReturnType<typeof cloneTacticalScenarioDefinition> | null;
    expect(persistedDefinition?.drawnAreas?.find((area) => area.id === "drawn-area-1")?.segments[0].from).toEqual({ x: 19, y: 19 });

    fireEvent.pointerDown(screen.getByTestId("drawn-area-drawn-area-1-anchor-0"), { clientX: 19, clientY: 19, pointerId: 205 });
    fireEvent.pointerMove(preview, { clientX: 18, clientY: 18, pointerId: 205 });
    fireEvent.pointerUp(preview, { clientX: 18, clientY: 18, pointerId: 205 });
    expect(screen.getByTestId("drawn-area-drawn-area-1-segment-0").getAttribute("x1")).toBe("18");

    const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "File menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open Scenario…" }));
    const openDialog = screen.getByRole("dialog", { name: "Open Scenario" });
    fireEvent.click(within(openDialog).getByRole("option", { name: "Closed Area Edit · closed-area-edit" }));
    fireEvent.click(within(openDialog).getByRole("button", { name: "Open" }));
    await screen.findByText("Loaded Closed Area Edit.");
    expect(confirm).toHaveBeenCalled();
    const areaLayer = screen.getByTestId("editor-layer-area:drawn-area-1");
    fireEvent.click(within(areaLayer).getByRole("button", { name: "drawn-area-1" }));
    expect(screen.getByTestId("drawn-area-drawn-area-1-segment-0").getAttribute("x1")).toBe("19");
    expect(screen.getByTestId("drawn-area-drawn-area-1-anchor-0")).toBeTruthy();
  });

  it("removes the last Pen point with Backspace and closes on double-click", () => {
    render(<TacticalScenarioEditorClient />);
    chooseHudTool("Areas", "Pen");
    const preview = screen.getByLabelText("Scenario draft map preview") as HTMLElement;
    penClick(preview, 10, 40, 76);
    penClick(preview, 15, 40, 77);
    penClick(preview, 15, 45, 78);
    penClick(preview, 12, 47, 79);

    fireEvent.keyDown(window, { key: "Backspace" });
    fireEvent.doubleClick(preview);

    expect(screen.queryByTestId("raised-area-draft-preview")).toBeNull();
    const closingSegment = screen.getByTestId("drawn-area-drawn-area-1-segment-2");
    expect(closingSegment.getAttribute("x1")).toBe("15");
    expect(closingSegment.getAttribute("y1")).toBe("45");
    expect(closingSegment.getAttribute("x2")).toBe("10");
    expect(closingSegment.getAttribute("y2")).toBe("40");
    expect(screen.queryByTestId("drawn-area-drawn-area-1-segment-3")).toBeNull();
  });

  it("draws, selects, and deletes a curved closed-machinery region", () => {
    render(<TacticalScenarioEditorClient />);
    const preview = screen.getByLabelText("Scenario draft map preview") as HTMLElement;
    chooseHudTool("Areas", "Pen");
    penClick(preview, 40, 10, 80);
    penClick(preview, 45, 10, 81);
    penDrag(preview, 45, 15, 43, 15, 82);
    penClick(preview, 40, 15, 83);
    penClick(preview, 40, 10, 84);

    const curve = screen.getByTestId("drawn-area-drawn-area-1-segment-1");
    expect(curve.tagName.toLowerCase()).toBe("path");
    fireEvent.change(screen.getByLabelText("Area surface fill"), { target: { value: "close-machinery" } });
    expect((screen.getByLabelText("Area surface fill") as HTMLSelectElement).value).toBe("close-machinery");
    expect(curve.getAttribute("d")).toBe("M 45 10 C 45 10 47 15 45 15");

    fireEvent.click(screen.getByRole("button", { name: "Delete area" }));
    expect(screen.queryByTestId("drawn-area-drawn-area-1")).toBeNull();
  });

  it("draws a liquid-hydrogen region and changes its filled state", () => {
    render(<TacticalScenarioEditorClient />);
    const preview = screen.getByLabelText("Scenario draft map preview") as HTMLElement;
    chooseHudTool("Areas", "Pen");
    penClick(preview, 50, 10, 90);
    penClick(preview, 55, 10, 91);
    penClick(preview, 55, 15, 92);
    penClick(preview, 50, 15, 93);
    penClick(preview, 50, 10, 94);

    fireEvent.change(screen.getByLabelText("Area surface fill"), { target: { value: "liquid-hydrogen" } });
    const filled = screen.getByRole("checkbox", { name: "Area liquid hydrogen filled" }) as HTMLInputElement;
    expect(filled.checked).toBe(true);
    fireEvent.click(filled);
    expect(filled.checked).toBe(false);
    expect(filled.checked).toBe(false);
  });

  it("draws flat grass, sand, and water regions with straight and curved boundaries", () => {
    render(<TacticalScenarioEditorClient />);
    const preview = screen.getByLabelText("Scenario draft map preview") as HTMLElement;
    chooseHudTool("Areas", "Pen");
    penClick(preview, 10, 30, 95);
    penClick(preview, 15, 30, 96);
    penDrag(preview, 15, 35, 13, 35, 97);
    penClick(preview, 10, 35, 98);
    penClick(preview, 10, 30, 99);

    const grass = screen.getByTestId("drawn-area-drawn-area-1");
    fireEvent.change(screen.getByLabelText("Area surface fill"), { target: { value: "grass" } });
    expect((screen.getByLabelText("Area surface fill") as HTMLSelectElement).value).toBe("grass");
    expect(screen.getByTestId("drawn-area-drawn-area-1-segment-1").tagName.toLowerCase()).toBe("path");
    expect(grass.querySelector("rect")?.getAttribute("stroke-width")).toBeNull();

    chooseHudTool("Areas", "Pen");
    penClick(preview, 12, 32, 105);
    penClick(preview, 17, 32, 106);
    penClick(preview, 17, 37, 107);
    penClick(preview, 12, 37, 108);
    penClick(preview, 12, 32, 109);

    fireEvent.change(screen.getByLabelText("Area surface fill"), { target: { value: "water" } });
    expect(screen.getByTestId("drawn-area-drawn-area-2")).toBeTruthy();

    chooseHudTool("Areas", "Pen");
    penClick(preview, 20, 30, 115);
    penClick(preview, 25, 30, 116);
    penDrag(preview, 25, 35, 23, 35, 117);
    penClick(preview, 20, 35, 118);
    penClick(preview, 20, 30, 119);

    fireEvent.change(screen.getByLabelText("Area surface fill"), { target: { value: "sand" } });
    expect(screen.getByTestId("drawn-area-drawn-area-3")).toBeTruthy();
    expect(screen.getByTestId("drawn-area-drawn-area-3-segment-1").tagName.toLowerCase()).toBe("path");
  });

  it("places, moves, resizes, previews, and deletes trees, bushes, and rocks", () => {
    render(<TacticalScenarioEditorClient />);
    const preview = screen.getByLabelText("Scenario draft map preview");

    chooseHudTool("Nature & effects", "Tree");
    fireEvent.pointerMove(preview, { clientX: 20, clientY: 20, pointerId: 110 });
    expect(screen.getByTestId("natural-terrain-placement-preview")).toBeTruthy();
    fireEvent.pointerDown(preview, { clientX: 20, clientY: 20, pointerId: 110 });
    fireEvent.click(screen.getByRole("button", { name: "Select tool" }));

    const tree = screen.getByTestId("natural-terrain-tree-1");
    expect(screen.getAllByTestId(/natural-terrain-tree-1-footprint-/)).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Tree radius"), { target: { value: "2" } });
    expect(screen.getAllByTestId(/natural-terrain-tree-1-footprint-/)).toHaveLength(1);
    const treeCanopy = tree.querySelector("circle")!;
    fireEvent.pointerDown(treeCanopy, { clientX: 20.5, clientY: 20.5, pointerId: 111 });
    fireEvent.pointerMove(preview, { clientX: 25.5, clientY: 20.5, pointerId: 111 });
    fireEvent.pointerUp(preview, { clientX: 25.5, clientY: 20.5, pointerId: 111 });
    expect(screen.getByTestId("natural-terrain-tree-1").querySelector("circle")?.getAttribute("cx")).toBe("25.5");

    chooseHudTool("Nature & effects", "Bush");
    fireEvent.pointerMove(preview, { clientX: 30, clientY: 20, pointerId: 112 });
    fireEvent.pointerDown(preview, { clientX: 30, clientY: 20, pointerId: 112 });
    fireEvent.click(screen.getByRole("button", { name: "Select tool" }));
    fireEvent.change(screen.getByLabelText("Bush radius"), { target: { value: "1.5" } });
    expect(screen.getAllByTestId(/natural-terrain-bush-1-footprint-/)).toHaveLength(9);

    chooseHudTool("Nature & effects", "Rock");
    fireEvent.pointerMove(preview, { clientX: 36, clientY: 20, pointerId: 113 });
    expect(screen.getByTestId("natural-terrain-placement-preview")).toBeTruthy();
    fireEvent.pointerDown(preview, { clientX: 36, clientY: 20, pointerId: 113 });
    fireEvent.click(screen.getByRole("button", { name: "Select tool" }));
    fireEvent.change(screen.getByLabelText("Rock radius"), { target: { value: "1.5" } });
    expect(screen.getAllByTestId(/natural-terrain-rock-1-footprint-/)).toHaveLength(9);
    expect(screen.getByText("Center 36,20 · 9 cover squares · 3 AP")).toBeTruthy();
    const rock = screen.getByTestId("natural-terrain-rock-1").querySelector("circle")!;
    fireEvent.pointerDown(rock, { clientX: 36.5, clientY: 20.5, pointerId: 114 });
    fireEvent.pointerMove(preview, { clientX: 38.5, clientY: 20.5, pointerId: 114 });
    fireEvent.pointerUp(preview, { clientX: 38.5, clientY: 20.5, pointerId: 114 });
    expect(screen.getByText("Center 38,20 · 9 cover squares · 3 AP")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete rock" }));
    expect(screen.queryByTestId("natural-terrain-rock-1")).toBeNull();

    fireEvent.click(within(screen.getByTestId("editor-layer-natural-terrain:bush-1")).getByRole("button", { name: "bush-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete bush" }));
    expect(screen.queryByTestId("natural-terrain-bush-1")).toBeNull();
    fireEvent.click(within(screen.getByTestId("editor-layer-natural-terrain:tree-1")).getByRole("button", { name: "tree-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete tree" }));
    expect(screen.queryByTestId("natural-terrain-tree-1")).toBeNull();
  });

  it("closes a freeform terrain outline when the pointer returns near its starting point", () => {
    render(<TacticalScenarioEditorClient />);
    openDrawingSettings();
    fireEvent.change(screen.getByLabelText("Drawing precision"), { target: { value: "freeform" } });
    chooseHudTool("Areas", "Pen");
    const preview = screen.getByLabelText("Scenario draft map preview") as HTMLElement;
    penClick(preview, 20.13, 20.17, 100);
    penClick(preview, 25.31, 20.22, 101);
    penClick(preview, 25.26, 25.44, 102);
    penClick(preview, 20.18, 25.39, 103);
    penClick(preview, 20.2, 20.21, 104);

    expect(screen.queryByTestId("raised-area-draft-preview")).toBeNull();
    const firstSegment = screen.getByTestId("drawn-area-drawn-area-1-segment-0");
    expect(firstSegment.getAttribute("x1")).toBe("20.13");
    expect(firstSegment.getAttribute("y1")).toBe("20.17");
    expect(firstSegment.getAttribute("x2")).toBe("25.31");
    expect(firstSegment.getAttribute("y2")).toBe("20.22");
  });

  it("owns all scenario-file actions in the File menu", () => {
    render(<TacticalScenarioEditorClient />);

    expect(screen.queryByText("Scenario files")).toBeNull();
    expect(screen.queryByLabelText("Load scenario")).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete scenario" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    expect(screen.queryByLabelText("New scenario name")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "File menu" }));
    expect(screen.getByRole("menuitem", { name: "New Scenario…" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Open Scenario…" })).toBeTruthy();
    expect((screen.getByRole("menuitem", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("menuitem", { name: "Save As…" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("menuitem", { name: "Delete Scenario…" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("owns Playtest and confirmed draft discard in the Scenario menu", () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true);
    render(<TacticalScenarioEditorClient />);

    expect(screen.queryByRole("button", { name: "Playtest draft" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Discard draft" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Scenario menu" }));
    expect((screen.getByRole("menuitem", { name: "Playtest Draft" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("menuitem", { name: "Discard Draft Changes…" }) as HTMLButtonElement).disabled).toBe(true);

    applyScenarioTitle("Unsaved scenario title");
    fireEvent.click(screen.getByRole("button", { name: "Scenario menu" }));
    const firstDiscard = screen.getByRole("menuitem", { name: "Discard Draft Changes…" }) as HTMLButtonElement;
    expect(firstDiscard.disabled).toBe(false);
    fireEvent.click(firstDiscard);
    let propertiesDialog = openScenarioProperties();
    expect((within(propertiesDialog).getByLabelText("Scenario title") as HTMLInputElement).value).toBe("Unsaved scenario title");
    fireEvent.click(within(propertiesDialog).getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Scenario menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Discard Draft Changes…" }));
    expect(confirm).toHaveBeenLastCalledWith("Discard all unsaved changes and return to the last loaded or saved version?");
    expect(screen.getByText("Discarded unsaved draft changes.")).toBeTruthy();
    propertiesDialog = openScenarioProperties();
    expect((within(propertiesDialog).getByLabelText("Scenario title") as HTMLInputElement).value).toBe(defaultTacticalScenarioDefinition.title);
    fireEvent.click(within(propertiesDialog).getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Scenario menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Playtest Draft" }));
    expect(screen.getByRole("button", { name: "Exit draft playtest" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "File menu" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Exit draft playtest" }));
    expect(screen.getByRole("button", { name: "File menu" })).toBeTruthy();
  });

  it("stages Scenario Properties until Apply and validates deployment edges", () => {
    render(<TacticalScenarioEditorClient />);

    expect(screen.queryByLabelText("Scenario title")).toBeNull();
    expect(screen.queryByText("Crew deployment edges")).toBeNull();
    let dialog = openScenarioProperties();
    expect(store.getState().tacticalEditor.file.dialog.kind).toBe("properties");
    fireEvent.change(within(dialog).getByLabelText("Scenario title"), { target: { value: "Cancelled title" } });
    fireEvent.change(within(dialog).getByLabelText("Scenario briefing"), { target: { value: "Cancelled briefing" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    dialog = openScenarioProperties();
    expect((within(dialog).getByLabelText("Scenario title") as HTMLInputElement).value).toBe(defaultTacticalScenarioDefinition.title);
    expect((within(dialog).getByLabelText("Scenario briefing") as HTMLTextAreaElement).value).toBe(defaultTacticalScenarioDefinition.briefing);
    fireEvent.click(within(dialog).getByRole("button", { name: "Allow south deployment" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(within(dialog).getByRole("alert").textContent).toContain("Define a crew deployment edge");

    fireEvent.click(within(dialog).getByRole("button", { name: "Allow south deployment" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Allow north deployment" }));
    fireEvent.change(within(dialog).getByLabelText("Scenario title"), { target: { value: "Applied title" } });
    fireEvent.change(within(dialog).getByLabelText("Scenario objective"), { target: { value: "Applied objective" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(screen.getByText("Unsaved draft")).toBeTruthy();

    dialog = openScenarioProperties();
    expect((within(dialog).getByLabelText("Scenario title") as HTMLInputElement).value).toBe("Applied title");
    expect((within(dialog).getByLabelText("Scenario objective") as HTMLTextAreaElement).value).toBe("Applied objective");
    expect(within(dialog).getByRole("button", { name: "Allow north deployment" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("creates an empty scenario from File while retaining map settings and drawing precision", async () => {
    const response = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
    let createdDefinition: ReturnType<typeof emptyTacticalScenarioDraft> | null = null;
    let createdConsoleVictory: ReturnType<typeof cloneTacticalConsoleVictoryDefinition> | null = null;
    global.fetch = jest.fn(async (input, init) => {
      const url = String(input);
      if (url === "/api/tactical/templates") return response({ templates: [] });
      if (url === "/api/tactical/scenarios" && init?.method === "POST") {
        const request = JSON.parse(String(init.body)) as {
          definition: ReturnType<typeof emptyTacticalScenarioDraft>;
          consoleVictory: ReturnType<typeof cloneTacticalConsoleVictoryDefinition>;
        };
        createdDefinition = cloneTacticalScenarioDefinition(request.definition);
        createdDefinition.id = "empty-boarding";
        createdDefinition.consoleVictoryDefinitionId = "empty-boarding";
        createdConsoleVictory = cloneTacticalConsoleVictoryDefinition(request.consoleVictory);
        createdConsoleVictory.id = "empty-boarding";
        createdConsoleVictory.scenarioId = "empty-boarding";
        return response({
          scenario: { id: "empty-boarding", title: "Empty Boarding", isDefault: false },
          definition: createdDefinition,
          consoleVictory: createdConsoleVictory,
        });
      }
      if (url === "/api/tactical/scenarios") return response({ scenarios: [
        { id: defaultTacticalScenarioDefinition.id, title: defaultTacticalScenarioDefinition.title, isDefault: true },
        ...(createdDefinition ? [{ id: "empty-boarding", title: "Empty Boarding", isDefault: false }] : []),
      ] });
      return response({ error: `Unexpected request: ${url}` });
    }) as typeof fetch;
    const confirm = jest.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true);

    render(<TacticalScenarioEditorClient />);
    openDrawingSettings();
    fireEvent.change(screen.getByLabelText("Map width"), { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("Map height"), { target: { value: "55" } });
    fireEvent.change(screen.getByLabelText("Drawing precision"), { target: { value: "quarter-grid" } });

    fireEvent.click(screen.getByRole("button", { name: "File menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "New Scenario…" }));
    expect(confirm).toHaveBeenLastCalledWith("Create a new scenario and discard the unsaved changes in this draft?");
    expect(screen.queryByRole("dialog", { name: "New Scenario" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "File menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "New Scenario…" }));
    const dialog = screen.getByRole("dialog", { name: "New Scenario" });
    fireEvent.change(within(dialog).getByLabelText("New scenario name"), { target: { value: "Empty Boarding" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await screen.findByText("Created empty-boarding.json.");
    expect(store.getState().tacticalEditor.file).toMatchObject({
      currentScenario: { id: "empty-boarding", title: "Empty Boarding", isDefault: false },
      operation: "idle",
      dialog: { kind: "closed" },
    });
    expect(store.getState().tacticalEditor.document.draft.title).toBe("Empty Boarding");
    expect(store.getState().tacticalEditor.document.draft)
      .toEqual(store.getState().tacticalEditor.document.baseline);
    expect(selectTacticalEditorDocumentDirty(store.getState())).toBe(false);
    expect(store.getState().tacticalEditor.tools).toMatchObject({
      mode: { kind: "primary", tool: "select" },
      openGroup: "drawing-settings",
    });
    expect(createdDefinition).toMatchObject({
      title: "Empty Boarding",
      map: { width: 80, height: 55 },
      deploymentEdges: ["south"],
      terrainPlacements: [],
      drawnWalls: [],
      drawnAreas: [],
      naturalTerrainPlacements: [],
      elevationTransitions: [],
      enemyPlacements: [],
      fireCells: [],
      smokeCells: [],
    });
    expect(createdConsoleVictory?.operations).toEqual([]);
    expect((screen.getByLabelText("Drawing precision") as HTMLSelectElement).value).toBe("quarter-grid");
    fireEvent.click(screen.getByRole("button", { name: "Scenario menu" }));
    expect((screen.getByRole("menuitem", { name: "Playtest Draft" }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(openEditorIssues()).getByText("This scenario has no victory task. It can be saved, but add a console or interactive human and a victory task before playtesting.")).toBeTruthy();
  });

  it("opens and loads an available scenario from the header File menu", async () => {
    const customDefinition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    customDefinition.id = "header-open-scenario";
    customDefinition.title = "Header Open Scenario";
    const customConsoleVictory = cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition);
    customConsoleVictory.id = "header-open-scenario";
    customConsoleVictory.scenarioId = "header-open-scenario";
    const response = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
    global.fetch = jest.fn(async (input) => {
      const url = String(input);
      if (url === "/api/tactical/scenarios") return response({ scenarios: [
        { id: defaultTacticalScenarioDefinition.id, title: defaultTacticalScenarioDefinition.title, isDefault: true },
        { id: customDefinition.id, title: customDefinition.title, isDefault: false },
      ] });
      if (url.endsWith("/header-open-scenario")) return response({ definition: customDefinition, consoleVictory: customConsoleVictory });
      if (url === "/api/tactical/templates") return response({ templates: [] });
      return response({ error: `Unexpected request: ${url}` });
    }) as typeof fetch;
    const confirm = jest.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true);

    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse Tracing Template" }));
    expect(screen.queryByRole("button", { name: "Collapse Tracing Template" })).toBeNull();
    const defaultPlacementLayer = screen.getByTestId("editor-layer-terrain-placement:control-room-alpha");
    fireEvent.click(within(defaultPlacementLayer).getByRole("button", { name: "Lock control-room-alpha" }));
    expect(store.getState().tacticalEditor.layers.lockedByKey).toEqual({
      "terrain-placement:control-room-alpha": true,
    });
    applyScenarioTitle("Unsaved title");
    fireEvent.click(screen.getByRole("button", { name: "File menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open Scenario…" }));

    const dialog = screen.getByRole("dialog", { name: "Open Scenario" });
    expect(store.getState().tacticalEditor.file.dialog.kind).toBe("open");
    const search = within(dialog).getByLabelText("Search scenarios");
    expect(document.activeElement).toBe(search);
    await within(dialog).findByRole("option", { name: "Header Open Scenario · header-open-scenario" });
    expect(within(dialog).getByText("Default")).toBeTruthy();
    expect(within(dialog).getByText("Current")).toBeTruthy();
    fireEvent.change(search, { target: { value: "HEADER OPEN" } });
    expect(store.getState().tacticalEditor.file.dialog).toEqual({
      kind: "open",
      searchQuery: "HEADER OPEN",
      selectedScenarioId: "header-open-scenario",
    });
    expect(within(dialog).getByRole("option", { name: "Header Open Scenario · header-open-scenario" })).toBeTruthy();
    expect(within(dialog).queryByRole("option", { name: /default-tactical-control-room/ })).toBeNull();
    fireEvent.change(search, { target: { value: "header-open-scenario" } });
    expect(within(dialog).getByRole("option", { name: "Header Open Scenario · header-open-scenario" })).toBeTruthy();
    fireEvent.change(search, { target: { value: "missing scenario" } });
    expect(within(dialog).getByText("No matching scenarios.")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear scenario search" }));
    expect((search as HTMLInputElement).value).toBe("");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(within(dialog).getByRole("option", { name: "Header Open Scenario · header-open-scenario" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(search, { key: "Enter" });
    expect(confirm).toHaveBeenCalledWith("Load another scenario and discard the unsaved changes in this draft?");
    expect(screen.getByRole("dialog", { name: "Open Scenario" })).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Open" }));
    await screen.findByText("Loaded Header Open Scenario.");
    expect(screen.queryByRole("dialog", { name: "Open Scenario" })).toBeNull();
    expect(store.getState().tacticalEditor.file).toMatchObject({
      currentScenario: { id: "header-open-scenario", title: "Header Open Scenario", isDefault: false },
      operation: "idle",
      dialog: { kind: "closed" },
    });
    expect(store.getState().tacticalEditor.document.draft.title).toBe("Header Open Scenario");
    expect(store.getState().tacticalEditor.document.consoleVictory)
      .toEqual(store.getState().tacticalEditor.document.consoleVictoryBaseline);
    expect(selectTacticalEditorDocumentDirty(store.getState())).toBe(false);
    expect(store.getState().tacticalEditor.layers).toEqual({ hiddenByKey: {}, lockedByKey: {} });
    fireEvent.click(screen.getByRole("button", { name: "Open tracing template" }));
    expect(screen.getByRole("button", { name: "Collapse Tracing Template" })).toBeTruthy();
    expect(store.getState().tacticalEditor.tools.mode).toEqual({ kind: "primary", tool: "select" });
    expect(store.getState().tacticalEditor.hudLayouts["tracing-template"]).toMatchObject({
      visible: true,
      position: { x: 720, y: 180 },
    });
  });

  it("saves changes to the current saved scenario from the File menu", async () => {
    const customDefinition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    customDefinition.id = "header-save-scenario";
    customDefinition.title = "Header Save Scenario";
    customDefinition.consoleVictoryDefinitionId = "header-save-scenario";
    const customConsoleVictory = cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition);
    customConsoleVictory.id = "header-save-scenario";
    customConsoleVictory.scenarioId = "header-save-scenario";
    const response = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
    let savedTitle: string | null = null;
    global.fetch = jest.fn(async (input, init) => {
      const url = String(input);
      if (url === "/api/tactical/templates") return response({ templates: [] });
      if (url === "/api/tactical/scenarios") return response({ scenarios: [
        { id: defaultTacticalScenarioDefinition.id, title: defaultTacticalScenarioDefinition.title, isDefault: true },
        { id: customDefinition.id, title: customDefinition.title, isDefault: false },
      ] });
      if (url.endsWith("/header-save-scenario") && init?.method === "PUT") {
        const request = JSON.parse(String(init.body)) as {
          definition: ReturnType<typeof cloneTacticalScenarioDefinition>;
          consoleVictory: ReturnType<typeof cloneTacticalConsoleVictoryDefinition>;
        };
        savedTitle = request.definition.title;
        return response({
          scenario: { id: customDefinition.id, title: request.definition.title, isDefault: false },
          definition: request.definition,
          consoleVictory: request.consoleVictory,
        });
      }
      if (url.endsWith("/header-save-scenario")) return response({ definition: customDefinition, consoleVictory: customConsoleVictory });
      return response({ error: `Unexpected request: ${url}` });
    }) as typeof fetch;

    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "File menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open Scenario…" }));
    const openDialog = screen.getByRole("dialog", { name: "Open Scenario" });
    fireEvent.click(await within(openDialog).findByRole("option", { name: "Header Save Scenario · header-save-scenario" }));
    fireEvent.click(within(openDialog).getByRole("button", { name: "Open" }));
    await screen.findByText("Loaded Header Save Scenario.");

    applyScenarioTitle("Header Save Updated");
    fireEvent.click(screen.getByRole("button", { name: "File menu" }));
    const save = screen.getByRole("menuitem", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    fireEvent.click(save);

    await screen.findByText("Saved changes to header-save-scenario.json.");
    expect(savedTitle).toBe("Header Save Updated");
  });

  it("keeps cached scenarios visible while the Open dialog refreshes", async () => {
    const response = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
    const scenarios = [
      {
        id: defaultTacticalScenarioDefinition.id,
        title: defaultTacticalScenarioDefinition.title,
        isDefault: true,
      },
    ];
    let scenarioListRequests = 0;
    global.fetch = jest.fn(async (input) => {
      const url = String(input);
      if (url === "/api/tactical/scenarios") {
        scenarioListRequests += 1;
        if (scenarioListRequests === 1) return response({ scenarios });
        return new Promise<Response>(() => {
          // Keep the background refresh pending so the cached-list state can be asserted.
        });
      }
      if (url === "/api/tactical/templates") return response({ templates: [] });
      return response({ error: `Unexpected request: ${url}` });
    }) as typeof fetch;

    render(<TacticalScenarioEditorClient />);
    await waitFor(() => expect(scenarioListRequests).toBe(1));
    fireEvent.click(screen.getByRole("button", { name: "File menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open Scenario…" }));

    const dialog = screen.getByRole("dialog", { name: "Open Scenario" });
    expect(within(dialog).getByRole("option", {
      name: `${defaultTacticalScenarioDefinition.title} · ${defaultTacticalScenarioDefinition.id}`,
    })).toBeTruthy();
    expect(within(dialog).queryByText("Loading scenarios…")).toBeNull();
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
    let deleted = false;
    let scenarioListGets = 0;
    global.fetch = jest.fn(async (input, init) => {
      const url = String(input);
      if (url === "/api/tactical/templates") {
        return response({ templates: [] });
      }
      if (url === "/api/tactical/scenarios"
        && (!init?.method || init.method === "GET")) {
        scenarioListGets += 1;
        return response({ scenarios: [
          {
            id: defaultTacticalScenarioDefinition.id,
            title: defaultTacticalScenarioDefinition.title,
            isDefault: true,
          },
          ...(!deleted ? [{
            id: customDefinition.id,
            title: customDefinition.title,
            isDefault: false,
          }] : []),
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
        deleted = true;
        return response({
          deleted: {
            id: customDefinition.id,
            title: customDefinition.title,
          },
        });
      }
      return response({ error: "Unexpected request." }, 500);
    }) as typeof fetch;
    const confirm = jest.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true);

    render(<TacticalScenarioEditorClient />);
    fireEvent.click(screen.getByRole("button", { name: "File menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open Scenario…" }));
    const openDialog = screen.getByRole("dialog", { name: "Open Scenario" });
    fireEvent.click(await within(openDialog).findByRole("option", { name: "Disposable Scenario · disposable-scenario" }));
    fireEvent.click(within(openDialog).getByRole("button", { name: "Open" }));
    await screen.findByText("Loaded Disposable Scenario.");

    fireEvent.click(screen.getByRole("button", { name: "File menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete Scenario…" }));
    expect(deleted).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "File menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete Scenario…" }));

    await screen.findByText(
      "Deleted disposable-scenario.json and returned to the default scenario.",
    );
    expect(confirm).toHaveBeenLastCalledWith(
      'Permanently delete "Disposable Scenario"? This cannot be undone.',
    );
    expect(screen.getByText(/immutable source/)).toBeTruthy();
    expect(deleted).toBe(true);
    expect(scenarioListGets).toBeGreaterThanOrEqual(3);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/tactical/scenarios/disposable-scenario",
      { method: "DELETE" },
    );
  });

  it("opens the console editor HUD and gives actionable guidance after its console is deleted", () => {
    render(<TacticalScenarioEditorClient />);
    const layer = screen.getByTestId("editor-layer-terrain-placement:control-room-alpha");
    fireEvent.click(within(layer).getByRole("button", { name: "control-room-alpha" }));

    expect(screen.getByText("Console Editor")).toBeTruthy();
    expect(screen.getByText("Tasks at this console")).toBeTruthy();

    fireEvent.keyDown(window, { key: "Delete" });

    expect(within(openEditorIssues()).getByText("This scenario has no victory task. It can be saved, but add a console or interactive human and a victory task before playtesting.")).toBeTruthy();
    expect(screen.queryByText(/At least one console operation is required/)).toBeNull();
  });

  it("edits and deletes a selected scenario enemy", () => {
    render(<TacticalScenarioEditorClient />);
    fireEvent.pointerDown(screen.getByTestId("enemy-marker-enemy-1"), { clientX: 47.5, clientY: 41.5, pointerId: 1 });

    expect(screen.getByRole("button", { name: "Collapse Enemy Editor" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Enemy name"), { target: { value: "Razor" } });
    expect(screen.getByDisplayValue("Razor")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rotate enemy 90 degrees" }).textContent).toContain("Facing North");
    const toolsRotate = screen.getByRole("button", { name: "Rotate selected item 90 degrees" }) as HTMLButtonElement;
    expect(toolsRotate.disabled).toBe(false);
    fireEvent.click(toolsRotate);
    expect(screen.getByRole("button", { name: "Rotate enemy 90 degrees" }).textContent).toContain("Facing East");

    fireEvent.keyDown(window, { key: "Delete" });
    expect(screen.queryByTestId("enemy-marker-enemy-1")).toBeNull();
  });

  it("selects an existing locked enemy and explains how to unlock it", () => {
    render(<TacticalScenarioEditorClient />);
    const layer = screen.getByTestId("editor-layer-enemy:enemy-1");
    fireEvent.click(within(layer).getByRole("button", { name: "Lock Gang Member 1" }));
    expect(store.getState().tacticalEditor.layers.lockedByKey).toEqual({ "enemy:enemy-1": true });

    fireEvent.pointerDown(screen.getByTestId("enemy-marker-enemy-1"), { clientX: 47.5, clientY: 41.5, pointerId: 2 });

    expect(screen.getByText("This enemy is locked. It can be selected, but it cannot be moved or edited.")).toBeTruthy();
    expect((screen.getByLabelText("Enemy name") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Rotate selected item 90 degrees" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Unlock enemy" }));
    expect((screen.getByLabelText("Enemy name") as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Rotate selected item 90 degrees" }) as HTMLButtonElement).disabled).toBe(false);
    expect(store.getState().tacticalEditor.layers.lockedByKey).toEqual({});
    expect(store.getState().tacticalEditor.selection.object).toEqual({ kind: "enemy", id: "enemy-1" });
  });
});
