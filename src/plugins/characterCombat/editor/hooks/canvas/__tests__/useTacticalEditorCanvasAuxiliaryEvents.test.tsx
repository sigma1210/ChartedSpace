/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useTacticalEditorCanvasAuxiliaryEvents } from "../useTacticalEditorCanvasAuxiliaryEvents";
import { PEN_AREA_TOOL_ID, TREE_TOOL_ID } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type Options = Parameters<typeof useTacticalEditorCanvasAuxiliaryEvents>[0];

const raisedAreaDraft: NonNullable<Options["raisedAreaDraft"]> = {
  target: "area",
  start: { x: 2, y: 3 },
  current: { x: 4, y: 5 },
  hover: { x: 4, y: 5 },
  segments: [],
  outgoingControl: null,
};

const makeOptions = (overrides: Partial<Options> = {}): Options => ({
  placementKind: null,
  raisedAreaDraft: null,
  hoverPlacement: jest.fn(),
  hoverEnemy: jest.fn(),
  hoverPortal: jest.fn(),
  closePenArea: jest.fn(),
  cancelPenNode: jest.fn(),
  ...overrides,
});

const makeDoubleClickEvent = () => ({
  preventDefault: jest.fn(),
}) as unknown as ReactMouseEvent<SVGSVGElement>;

describe("useTacticalEditorCanvasAuxiliaryEvents", () => {
  it("clears all existing canvas hover previews on pointer leave", () => {
    const options = makeOptions();
    const { result } = renderHook(() => useTacticalEditorCanvasAuxiliaryEvents(options));

    act(() => result.current.handlePointerLeave());

    expect(options.hoverPlacement).toHaveBeenCalledWith(null);
    expect(options.hoverEnemy).toHaveBeenCalledWith(null);
    expect(options.hoverPortal).toHaveBeenCalledWith(null);
  });

  it.each([
    ["another tool", TREE_TOOL_ID, raisedAreaDraft],
    ["no active Pen draft", PEN_AREA_TOOL_ID, null],
  ])("ignores a double-click with %s", (_label, placementKind, draft) => {
    const options = makeOptions({ placementKind, raisedAreaDraft: draft });
    const event = makeDoubleClickEvent();
    const { result } = renderHook(() => useTacticalEditorCanvasAuxiliaryEvents(options));

    act(() => result.current.handleDoubleClick(event));

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(options.closePenArea).not.toHaveBeenCalled();
    expect(options.cancelPenNode).not.toHaveBeenCalled();
  });

  it("closes the active Pen area before cancelling its node drag", () => {
    const options = makeOptions({ placementKind: PEN_AREA_TOOL_ID, raisedAreaDraft });
    const event = makeDoubleClickEvent();
    const { result } = renderHook(() => useTacticalEditorCanvasAuxiliaryEvents(options));

    act(() => result.current.handleDoubleClick(event));

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(options.closePenArea).toHaveBeenCalledTimes(1);
    expect(options.cancelPenNode).toHaveBeenCalledTimes(1);
    expect((options.closePenArea as jest.Mock).mock.invocationCallOrder[0])
      .toBeLessThan((options.cancelPenNode as jest.Mock).mock.invocationCallOrder[0]);
  });
});
