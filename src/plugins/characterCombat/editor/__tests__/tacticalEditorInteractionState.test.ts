import {
  initialTacticalEditorInteractionState,
  tacticalEditorInteractionReducer,
} from "../tacticalEditorInteractionState";

describe("tacticalEditorInteractionState", () => {
  it("updates and atomically clears transient editor interaction state", () => {
    const initial = initialTacticalEditorInteractionState();
    const drawing = tacticalEditorInteractionReducer(initial, {
      type: "set",
      key: "wallDraft",
      update: {
        from: { x: 2, y: 3 },
        to: { x: 6, y: 7 },
        curved: false,
        awaitingEnd: true,
      },
    });
    const withError = tacticalEditorInteractionReducer(drawing, {
      type: "set",
      key: "placementError",
      update: (current) => current ?? "Invalid placement.",
    });
    const cleared = tacticalEditorInteractionReducer(withError, { type: "clear" });

    expect(drawing.wallDraft).toMatchObject({ from: { x: 2, y: 3 }, awaitingEnd: true });
    expect(withError.placementError).toBe("Invalid placement.");
    expect(cleared).toEqual(initial);
  });

  it("preserves interaction state identity for a no-op field update", () => {
    const initial = initialTacticalEditorInteractionState();
    expect(tacticalEditorInteractionReducer(initial, {
      type: "set",
      key: "placementHover",
      update: null,
    })).toBe(initial);
  });
});
