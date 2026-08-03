/** @jest-environment jsdom */

import {
  TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY,
  applyStoredTacticalEditorHudLayout,
  loadStoredTacticalEditorHudLayouts,
  parseStoredTacticalEditorHudLayouts,
  saveTacticalEditorHudLayout,
} from "../tacticalEditorHudLayoutStorage";

describe("tactical editor HUD layout storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("accepts valid known HUD layouts and rejects malformed or unknown entries", () => {
    expect(parseStoredTacticalEditorHudLayouts(JSON.stringify({
      tools: { pinned: true, position: { x: 140, y: 80 } },
      layers: { pinned: "yes", position: { x: 10, y: 20 } },
      navigation: { pinned: false, position: { x: Number.NaN, y: 30 } },
      unknown: { pinned: true, position: { x: 1, y: 2 } },
    }))).toEqual({ tools: { pinned: true, position: { x: 140, y: 80 } } });
    expect(parseStoredTacticalEditorHudLayouts("not json")).toEqual({});
  });

  it("applies position and pinned state without changing contextual visibility", () => {
    expect(applyStoredTacticalEditorHudLayout(
      { visible: false, pinned: false, position: { x: 1, y: 2 } },
      { pinned: true, position: { x: 30, y: 40 } },
    )).toEqual({ visible: false, pinned: true, position: { x: 30, y: 40 } });
  });

  it("stores only position and pinned state while preserving other HUD entries", () => {
    window.localStorage.setItem(TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY, JSON.stringify({
      layers: { pinned: false, position: { x: 70, y: 90 } },
    }));

    saveTacticalEditorHudLayout("tools", {
      visible: false,
      pinned: true,
      position: { x: 120, y: 45 },
    });

    expect(JSON.parse(window.localStorage.getItem(TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY)!)).toEqual({
      layers: { pinned: false, position: { x: 70, y: 90 } },
      tools: { pinned: true, position: { x: 120, y: 45 } },
    });
    expect(loadStoredTacticalEditorHudLayouts().tools).toEqual({
      pinned: true,
      position: { x: 120, y: 45 },
    });
  });
});
