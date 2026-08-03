import type { FloatingPluginHudLayout, PluginHudPoint } from "@/components/hud/FloatingPluginHud";

export const TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY = "charted-space:tactical-editor-hud-layouts:v1";

export const tacticalEditorHudIds = [
  "tools",
  "layers",
  "enemy-palette",
  "area-properties",
  "object-properties",
  "circle-properties",
  "console-editor",
  "enemy-editor",
  "tracing-template",
  "navigation",
] as const;

export type TacticalEditorHudId = typeof tacticalEditorHudIds[number];

export interface StoredTacticalEditorHudLayout {
  pinned: boolean;
  position: PluginHudPoint;
}

export type StoredTacticalEditorHudLayouts = Partial<Record<TacticalEditorHudId, StoredTacticalEditorHudLayout>>;

const emptyStoredLayouts: StoredTacticalEditorHudLayouts = {};
const layoutChangeEvent = "charted-space:tactical-editor-hud-layout-change";
let cachedRawLayouts: string | null | undefined;
let cachedStoredLayouts = emptyStoredLayouts;

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const storedLayout = (value: unknown): StoredTacticalEditorHudLayout | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { pinned?: unknown; position?: { x?: unknown; y?: unknown } };
  if (typeof candidate.pinned !== "boolean" || !candidate.position || typeof candidate.position !== "object") return null;
  if (!isFiniteNumber(candidate.position.x) || !isFiniteNumber(candidate.position.y)) return null;
  return { pinned: candidate.pinned, position: { x: candidate.position.x, y: candidate.position.y } };
};

export const parseStoredTacticalEditorHudLayouts = (raw: string | null): StoredTacticalEditorHudLayouts => {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(tacticalEditorHudIds.flatMap((id) => {
      const layout = storedLayout((value as Record<string, unknown>)[id]);
      return layout ? [[id, layout]] : [];
    })) as StoredTacticalEditorHudLayouts;
  } catch {
    return {};
  }
};

export const loadStoredTacticalEditorHudLayouts = (): StoredTacticalEditorHudLayouts => {
  if (typeof window === "undefined") return emptyStoredLayouts;
  try {
    const raw = window.localStorage.getItem(TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY);
    if (raw !== cachedRawLayouts) {
      cachedRawLayouts = raw;
      cachedStoredLayouts = parseStoredTacticalEditorHudLayouts(raw);
    }
    return cachedStoredLayouts;
  } catch {
    return emptyStoredLayouts;
  }
};

export const serverTacticalEditorHudLayouts = (): StoredTacticalEditorHudLayouts => emptyStoredLayouts;

export const subscribeToTacticalEditorHudLayouts = (onStoreChange: () => void): (() => void) => {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(layoutChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(layoutChangeEvent, onStoreChange);
  };
};

export const applyStoredTacticalEditorHudLayout = (
  layout: FloatingPluginHudLayout,
  stored: StoredTacticalEditorHudLayout | undefined,
): FloatingPluginHudLayout => stored ? {
  ...layout,
  pinned: stored.pinned,
  position: { ...stored.position },
} : layout;

export const saveTacticalEditorHudLayout = (id: TacticalEditorHudId, layout: FloatingPluginHudLayout): void => {
  if (typeof window === "undefined") return;
  try {
    const layouts = loadStoredTacticalEditorHudLayouts();
    const nextLayouts = {
      ...layouts,
      [id]: { pinned: layout.pinned, position: { ...layout.position } },
    };
    window.localStorage.setItem(TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY, JSON.stringify(nextLayouts));
    window.dispatchEvent(new Event(layoutChangeEvent));
  } catch {
    // The editor remains usable when storage is disabled or full.
  }
};
