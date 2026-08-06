/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import {
  useTacticalEditorKeyboard,
  type TacticalEditorKeyboardOptions,
} from "../useTacticalEditorKeyboard";

const keyboardOptions = (
  overrides: Partial<TacticalEditorKeyboardOptions> = {},
): TacticalEditorKeyboardOptions => ({
  onDeleteSelection: jest.fn(() => false),
  areaDraftActive: false,
  onCloseArea: jest.fn(),
  onUndoAreaNode: jest.fn(),
  onCancelArea: jest.fn(),
  rampDraftActive: false,
  onCancelRamp: jest.fn(),
  circleDraftActive: false,
  onCancelCircle: jest.fn(),
  onActivatePrimaryTool: jest.fn(),
  canRotateSelection: false,
  onRotateSelection: jest.fn(),
  ...overrides,
});

const pressKey = (key: string, target: Window | HTMLElement = window) => {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  act(() => target.dispatchEvent(event));
  return event;
};

describe("useTacticalEditorKeyboard", () => {
  it("maps the primary tool and rotation shortcuts", () => {
    const options = keyboardOptions({ canRotateSelection: true });
    renderHook(() => useTacticalEditorKeyboard(options));

    expect(pressKey("v").defaultPrevented).toBe(true);
    expect(pressKey("N").defaultPrevented).toBe(true);
    expect(pressKey("h").defaultPrevented).toBe(true);
    expect(pressKey("r").defaultPrevented).toBe(true);
    expect(options.onActivatePrimaryTool).toHaveBeenNthCalledWith(1, "select");
    expect(options.onActivatePrimaryTool).toHaveBeenNthCalledWith(2, "node");
    expect(options.onActivatePrimaryTool).toHaveBeenNthCalledWith(3, "hand");
    expect(options.onRotateSelection).toHaveBeenCalledTimes(1);
  });

  it("does not consume rotation when no placement can rotate", () => {
    const options = keyboardOptions();
    renderHook(() => useTacticalEditorKeyboard(options));

    expect(pressKey("r").defaultPrevented).toBe(false);
    expect(options.onRotateSelection).not.toHaveBeenCalled();
  });

  it("delegates deletion and only consumes handled deletion keys", () => {
    const onDeleteSelection = jest.fn((key: "Delete" | "Backspace") => key === "Delete");
    const options = keyboardOptions({ onDeleteSelection });
    renderHook(() => useTacticalEditorKeyboard(options));

    expect(pressKey("Delete").defaultPrevented).toBe(true);
    expect(pressKey("Backspace").defaultPrevented).toBe(false);
    expect(onDeleteSelection).toHaveBeenNthCalledWith(1, "Delete");
    expect(onDeleteSelection).toHaveBeenNthCalledWith(2, "Backspace");
  });

  it("preserves deletion then pen-node handling order for Backspace", () => {
    const order: string[] = [];
    const options = keyboardOptions({
      areaDraftActive: true,
      onDeleteSelection: () => {
        order.push("delete");
        return true;
      },
      onUndoAreaNode: () => order.push("undo-area-node"),
    });
    renderHook(() => useTacticalEditorKeyboard(options));

    expect(pressKey("Backspace").defaultPrevented).toBe(true);
    expect(order).toEqual(["delete", "undo-area-node"]);
  });

  it("handles pen completion and all active Escape cancellations", () => {
    const order: string[] = [];
    const options = keyboardOptions({
      areaDraftActive: true,
      onCloseArea: () => order.push("close-area"),
      onCancelArea: () => order.push("cancel-area"),
      rampDraftActive: true,
      onCancelRamp: () => order.push("cancel-ramp"),
      circleDraftActive: true,
      onCancelCircle: () => order.push("cancel-circle"),
    });
    renderHook(() => useTacticalEditorKeyboard(options));

    expect(pressKey("Enter").defaultPrevented).toBe(true);
    expect(pressKey("Escape").defaultPrevented).toBe(true);
    expect(order).toEqual(["close-area", "cancel-area", "cancel-ramp", "cancel-circle"]);
  });

  it("ignores selection and shortcut keys from form controls while preserving pen editing", () => {
    const options = keyboardOptions({ areaDraftActive: true });
    renderHook(() => useTacticalEditorKeyboard(options));
    const input = document.createElement("input");
    document.body.append(input);

    expect(pressKey("Delete", input).defaultPrevented).toBe(false);
    expect(pressKey("v", input).defaultPrevented).toBe(false);
    expect(pressKey("Backspace", input).defaultPrevented).toBe(true);
    expect(options.onDeleteSelection).not.toHaveBeenCalled();
    expect(options.onActivatePrimaryTool).not.toHaveBeenCalled();
    expect(options.onUndoAreaNode).toHaveBeenCalledTimes(1);

    input.remove();
  });
});
