import { defaultTacticalEditorHudLayouts } from "../state/hudLayouts";
import { tacticalEditorHiddenHuds } from "../tacticalEditorHiddenHuds";

const layouts = () => Object.fromEntries(Object.entries(defaultTacticalEditorHudLayouts).map(
  ([id, layout]) => [id, { ...layout, position: { ...layout.position } }],
)) as typeof defaultTacticalEditorHudLayouts;

const context = {
  circlePropertiesAvailable: false,
  consoleEditorAvailable: false,
  consoleEditorTitle: "Console Editor" as const,
  enemyEditorAvailable: false,
  areaPropertiesAvailable: false,
  objectPropertiesAvailable: false,
};

describe("tacticalEditorHiddenHuds", () => {
  it("lists hidden persistent HUDs", () => {
    const hiddenLayouts = layouts();
    hiddenLayouts.tools.visible = false;
    hiddenLayouts.layers.visible = false;
    hiddenLayouts.navigation.visible = false;
    hiddenLayouts["tracing-template"].visible = false;
    hiddenLayouts["enemy-palette"].visible = false;

    expect(tacticalEditorHiddenHuds(hiddenLayouts, context)).toEqual([
      { id: "enemy-palette", title: "Enemy Palette" },
      { id: "navigation", title: "Navigation" },
      { id: "tracing-template", title: "Tracing Template" },
      { id: "tools", title: "Tools" },
      { id: "layers", title: "Layers" },
    ]);
  });

  it("does not list contextual HUDs when their objects are unavailable", () => {
    const hiddenLayouts = layouts();
    hiddenLayouts["circle-properties"].visible = false;
    hiddenLayouts["console-editor"].visible = false;
    hiddenLayouts["enemy-editor"].visible = false;
    hiddenLayouts["area-properties"].visible = false;
    hiddenLayouts["object-properties"].visible = false;

    expect(tacticalEditorHiddenHuds(hiddenLayouts, context)).toEqual([]);
  });

  it("lists available contextual HUDs and uses the legacy circle restoration ID", () => {
    const hiddenLayouts = layouts();
    hiddenLayouts["circle-properties"].visible = false;
    hiddenLayouts["console-editor"].visible = false;
    hiddenLayouts["enemy-editor"].visible = false;
    hiddenLayouts["area-properties"].visible = false;
    hiddenLayouts["object-properties"].visible = false;

    expect(tacticalEditorHiddenHuds(hiddenLayouts, {
      ...context,
      circlePropertiesAvailable: true,
      consoleEditorAvailable: true,
      enemyEditorAvailable: true,
      areaPropertiesAvailable: true,
      objectPropertiesAvailable: true,
    })).toEqual([
      { id: "legacy-circle-properties", title: "Legacy Circle Properties" },
      { id: "console-editor", title: "Console Editor" },
      { id: "enemy-editor", title: "Enemy Editor" },
      { id: "area-properties", title: "Area Properties" },
      { id: "object-properties", title: "Object Properties" },
    ]);
  });

  it("uses the human interaction title for an interactive human", () => {
    const hiddenLayouts = layouts();
    hiddenLayouts["console-editor"].visible = false;

    expect(tacticalEditorHiddenHuds(hiddenLayouts, {
      ...context,
      consoleEditorAvailable: true,
      consoleEditorTitle: "Human Interaction Editor",
    })).toEqual([
      { id: "console-editor", title: "Human Interaction Editor" },
    ]);
  });
});
