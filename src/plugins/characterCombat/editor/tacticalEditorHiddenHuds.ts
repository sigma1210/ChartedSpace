import type { TacticalEditorHudLayouts } from "@/plugins/characterCombat/editor/state/hudLayouts";

export type TacticalEditorHiddenHud = { id: string; title: string };

type TacticalEditorHiddenHudContext = {
  circlePropertiesAvailable: boolean;
  consoleEditorAvailable: boolean;
  consoleEditorTitle: "Console Editor" | "Human Interaction Editor";
  enemyEditorAvailable: boolean;
  areaPropertiesAvailable: boolean;
  objectPropertiesAvailable: boolean;
};

export const tacticalEditorHiddenHuds = (
  layouts: TacticalEditorHudLayouts,
  context: TacticalEditorHiddenHudContext,
): TacticalEditorHiddenHud[] => [
  ...(context.circlePropertiesAvailable && !layouts["circle-properties"].visible
    ? [{ id: "legacy-circle-properties", title: "Legacy Circle Properties" }]
    : []),
  ...(layouts["enemy-palette"].visible
    ? []
    : [{ id: "enemy-palette", title: "Enemy Palette" }]),
  ...(context.consoleEditorAvailable && !layouts["console-editor"].visible
    ? [{ id: "console-editor", title: context.consoleEditorTitle }]
    : []),
  ...(context.enemyEditorAvailable && !layouts["enemy-editor"].visible
    ? [{ id: "enemy-editor", title: "Enemy Editor" }]
    : []),
  ...(layouts.navigation.visible ? [] : [{ id: "navigation", title: "Navigation" }]),
  ...(layouts["tracing-template"].visible
    ? []
    : [{ id: "tracing-template", title: "Tracing Template" }]),
  ...(layouts.tools.visible ? [] : [{ id: "tools", title: "Tools" }]),
  ...(layouts.layers.visible ? [] : [{ id: "layers", title: "Layers" }]),
  ...(context.areaPropertiesAvailable && !layouts["area-properties"].visible
    ? [{ id: "area-properties", title: "Area Properties" }]
    : []),
  ...(context.objectPropertiesAvailable && !layouts["object-properties"].visible
    ? [{ id: "object-properties", title: "Object Properties" }]
    : []),
];
