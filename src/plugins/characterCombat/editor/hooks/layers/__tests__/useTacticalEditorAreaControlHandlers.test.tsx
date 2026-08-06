/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useTacticalEditorAreaControlHandlers } from "../useTacticalEditorAreaControlHandlers";

describe("useTacticalEditorAreaControlHandlers", () => {
  it("preserves the drawn-area control owner and segment index", () => {
    const beginRaisedAreaControlDrag = jest.fn();
    const { result } = renderHook(() => useTacticalEditorAreaControlHandlers({ beginRaisedAreaControlDrag }));

    act(() => result.current.handleBeginDrawnAreaControlDrag("area-1", 2));

    expect(beginRaisedAreaControlDrag).toHaveBeenCalledWith({ kind: "area", id: "area-1" }, 2);
  });

  it("preserves the raised-area control owner and segment index", () => {
    const beginRaisedAreaControlDrag = jest.fn();
    const { result } = renderHook(() => useTacticalEditorAreaControlHandlers({ beginRaisedAreaControlDrag }));

    act(() => result.current.handleBeginRaisedAreaControlDrag("raised-1", 3));

    expect(beginRaisedAreaControlDrag).toHaveBeenCalledWith({ kind: "raised", id: "raised-1" }, 3);
  });

  it("preserves the terrain-region control owner and segment index", () => {
    const beginRaisedAreaControlDrag = jest.fn();
    const { result } = renderHook(() => useTacticalEditorAreaControlHandlers({ beginRaisedAreaControlDrag }));

    act(() => result.current.handleBeginTerrainRegionControlDrag("region-1", 4));

    expect(beginRaisedAreaControlDrag).toHaveBeenCalledWith({ kind: "terrain-region", id: "region-1" }, 4);
  });

  it("preserves the active-draft control owner and segment index", () => {
    const beginRaisedAreaControlDrag = jest.fn();
    const { result } = renderHook(() => useTacticalEditorAreaControlHandlers({ beginRaisedAreaControlDrag }));

    act(() => result.current.handleBeginDraftControlDrag(5));

    expect(beginRaisedAreaControlDrag).toHaveBeenCalledWith({ kind: "draft" }, 5);
  });
});
