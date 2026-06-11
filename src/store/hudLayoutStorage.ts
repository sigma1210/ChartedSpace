import type { HudLayout } from "./slices/hudSlice";

const hudLayoutStorageKey = "charted-space:hud-layouts:v1";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isHudLayout = (value: unknown): value is HudLayout => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<HudLayout>;
  return (
    typeof candidate.visible === "boolean" &&
    typeof candidate.pinned === "boolean" &&
    typeof candidate.offset === "object" &&
    candidate.offset !== null &&
    isFiniteNumber(candidate.offset.x) &&
    isFiniteNumber(candidate.offset.y)
  );
};

export const parseStoredHudLayouts = (
  rawValue: string | null,
): Record<string, HudLayout> => {
  if (!rawValue) return {};

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};

    const layouts: Record<string, HudLayout> = {};
    for (const [id, layout] of Object.entries(parsed)) {
      if (isHudLayout(layout)) {
        layouts[id] = layout;
      }
    }
    return layouts;
  } catch {
    return {};
  }
};

export const loadStoredHudLayouts = () => {
  if (typeof window === "undefined") return {};
  return parseStoredHudLayouts(window.localStorage.getItem(hudLayoutStorageKey));
};

export const saveStoredHudLayouts = (layouts: Record<string, HudLayout>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(hudLayoutStorageKey, JSON.stringify(layouts));
};
