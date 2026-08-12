import type { FloatingPluginHudLayout } from "@/components/hud/FloatingPluginHud";

export const QUEST_EDITOR_HUD_LAYOUT_STORAGE_KEY = "charted-space:quest-editor-hud-layouts:v1";

export const questEditorHudIds = [
  "tools",
  "scenario-library",
  "quest-scenarios",
  "quest-items",
  "quest-item-editor",
  "inspector",
  "links",
  "navigation",
] as const;

export type QuestEditorHudId = typeof questEditorHudIds[number];
export type QuestEditorHudLayouts = Record<QuestEditorHudId, FloatingPluginHudLayout>;

export const defaultQuestEditorHudLayouts: QuestEditorHudLayouts = {
  tools: { visible: true, pinned: false, position: { x: 300, y: 12 } },
  "scenario-library": { visible: true, pinned: false, position: { x: 18, y: 70 } },
  "quest-scenarios": { visible: true, pinned: false, position: { x: 18, y: 390 } },
  "quest-items": { visible: true, pinned: false, position: { x: 280, y: 390 } },
  "quest-item-editor": { visible: true, pinned: false, position: { x: 590, y: 390 } },
  inspector: { visible: true, pinned: false, position: { x: 830, y: 70 } },
  links: { visible: true, pinned: false, position: { x: 830, y: 430 } },
  navigation: { visible: true, pinned: false, position: { x: 610, y: 12 } },
};

export const freshDefaultQuestEditorHudLayouts = (): QuestEditorHudLayouts => Object.fromEntries(
  questEditorHudIds.map((id) => [id, {
    ...defaultQuestEditorHudLayouts[id],
    position: { ...defaultQuestEditorHudLayouts[id].position },
  }]),
) as QuestEditorHudLayouts;

const validLayout = (value: unknown): value is FloatingPluginHudLayout => {
  if (!value || typeof value !== "object") return false;
  const layout = value as Partial<FloatingPluginHudLayout>;
  return typeof layout.visible === "boolean"
    && typeof layout.pinned === "boolean"
    && typeof layout.position?.x === "number"
    && Number.isFinite(layout.position.x)
    && typeof layout.position?.y === "number"
    && Number.isFinite(layout.position.y);
};

export const loadStoredQuestEditorHudLayouts = (): Partial<QuestEditorHudLayouts> => {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(QUEST_EDITOR_HUD_LAYOUT_STORAGE_KEY) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(questEditorHudIds.flatMap((id) => validLayout(parsed[id]) ? [[id, parsed[id]]] : [])) as Partial<QuestEditorHudLayouts>;
  } catch {
    return {};
  }
};

export const saveQuestEditorHudLayouts = (layouts: QuestEditorHudLayouts) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEST_EDITOR_HUD_LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
  } catch {
    // HUDs remain usable when browser storage is unavailable.
  }
};
