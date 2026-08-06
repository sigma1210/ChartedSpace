/** @jest-environment jsdom */

import { renderHook } from "@testing-library/react";
import type { RaisedAreaDraft } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import { useTacticalEditorAreaDraftPreview } from "../useTacticalEditorAreaDraftPreview";

const map = { width: 20, height: 15 };

const draft = (overrides: Partial<RaisedAreaDraft> = {}): RaisedAreaDraft => ({
  target: "area",
  start: { x: 1, y: 1 },
  current: { x: 1, y: 1 },
  hover: { x: 5, y: 1 },
  segments: [],
  outgoingControl: null,
  ...overrides,
});

describe("useTacticalEditorAreaDraftPreview", () => {
  it("returns an empty preview without an active draft", () => {
    const { result } = renderHook(() => useTacticalEditorAreaDraftPreview({
      draft: null,
      penNodeDrag: null,
      map,
    }));

    expect(result.current).toEqual({ segment: null, cells: [] });
  });

  it("returns an empty preview when the current point and anchor match", () => {
    const { result } = renderHook(() => useTacticalEditorAreaDraftPreview({
      draft: draft({ hover: { x: 1, y: 1 } }),
      penNodeDrag: null,
      map,
    }));

    expect(result.current).toEqual({ segment: null, cells: [] });
  });

  it("derives a straight live segment when there are no curve controls", () => {
    const { result } = renderHook(() => useTacticalEditorAreaDraftPreview({
      draft: draft(),
      penNodeDrag: null,
      map,
    }));

    expect(result.current.segment).toEqual({
      kind: "line",
      from: { x: 1, y: 1 },
      to: { x: 5, y: 1 },
    });
    expect(result.current.cells).toEqual([]);
  });

  it("uses the draft outgoing control for a cubic live segment", () => {
    const { result } = renderHook(() => useTacticalEditorAreaDraftPreview({
      draft: draft({ outgoingControl: { x: 2, y: 4 } }),
      penNodeDrag: null,
      map,
    }));

    expect(result.current.segment).toEqual({
      kind: "cubic",
      from: { x: 1, y: 1 },
      control1: { x: 2, y: 4 },
      control2: { x: 5, y: 1 },
      to: { x: 5, y: 1 },
    });
  });

  it("reflects a dragged node handle into the incoming cubic control", () => {
    const { result } = renderHook(() => useTacticalEditorAreaDraftPreview({
      draft: draft(),
      penNodeDrag: {
        anchor: { x: 5, y: 1 },
        handle: { x: 6, y: 3 },
      },
      map,
    }));

    expect(result.current.segment).toEqual({
      kind: "cubic",
      from: { x: 1, y: 1 },
      control1: { x: 1, y: 1 },
      control2: { x: 4, y: -1 },
      to: { x: 5, y: 1 },
    });
  });

  it("ignores node-handle movement below the curve threshold", () => {
    const { result } = renderHook(() => useTacticalEditorAreaDraftPreview({
      draft: draft(),
      penNodeDrag: {
        anchor: { x: 5, y: 1 },
        handle: { x: 5.05, y: 1 },
      },
      map,
    }));

    expect(result.current.segment?.kind).toBe("line");
  });

  it("derives enclosed cells from committed, live, and closing segments", () => {
    const { result } = renderHook(() => useTacticalEditorAreaDraftPreview({
      draft: draft({
        current: { x: 5, y: 5 },
        hover: { x: 1, y: 5 },
        segments: [
          { kind: "line", from: { x: 1, y: 1 }, to: { x: 5, y: 1 } },
          { kind: "line", from: { x: 5, y: 1 }, to: { x: 5, y: 5 } },
        ],
      }),
      penNodeDrag: null,
      map,
    }));

    expect(result.current.segment).toEqual({ kind: "line", from: { x: 5, y: 5 }, to: { x: 1, y: 5 } });
    expect(result.current.cells).toContainEqual({ x: 2, y: 2 });
    expect(result.current.cells.length).toBeGreaterThan(0);
  });

  it("keeps the live segment but clears cells when the outline is invalid", () => {
    const { result } = renderHook(() => useTacticalEditorAreaDraftPreview({
      draft: draft({
        current: { x: 1, y: 5 },
        hover: { x: 5, y: 1 },
        segments: [
          { kind: "line", from: { x: 1, y: 1 }, to: { x: 5, y: 5 } },
          { kind: "line", from: { x: 5, y: 5 }, to: { x: 1, y: 5 } },
        ],
      }),
      penNodeDrag: null,
      map,
    }));

    expect(result.current.segment).toEqual({ kind: "line", from: { x: 1, y: 5 }, to: { x: 5, y: 1 } });
    expect(result.current.cells).toEqual([]);
  });
});
