/** @jest-environment jsdom */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useTacticalEditorCanvasNavigation } from "../useTacticalEditorCanvasNavigation";

type Navigation = ReturnType<typeof useTacticalEditorCanvasNavigation>;

const setup = () => {
  const panByPixels = jest.fn();
  const zoomAt = jest.fn();
  const localMapPoint = jest.fn(() => ({ x: 4, y: 6 }));
  let navigation!: Navigation;
  const Harness = () => {
    navigation = useTacticalEditorCanvasNavigation({ panByPixels, zoomAt, localMapPoint });
    return <>
      <input aria-label="Editor input" />
      <svg ref={navigation.previewRef} data-testid="canvas" />
    </>;
  };
  const rendered = render(<Harness />);
  const canvas = screen.getByTestId("canvas") as unknown as SVGSVGElement;
  canvas.getBoundingClientRect = jest.fn(() => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 400,
    width: 800,
    height: 400,
    toJSON: () => ({}),
  }));
  return {
    ...rendered,
    canvas,
    panByPixels,
    zoomAt,
    localMapPoint,
    navigation: () => navigation,
  };
};

describe("useTacticalEditorCanvasNavigation", () => {
  it("activates Space navigation and prevents the browser default until keyup", () => {
    const view = setup();
    const keyDown = new KeyboardEvent("keydown", { code: "Space", cancelable: true });

    fireEvent(window, keyDown);
    expect(view.navigation().spacePressed).toBe(true);
    expect(keyDown.defaultPrevented).toBe(true);
    fireEvent.keyUp(window, { code: "Space" });
    expect(view.navigation().spacePressed).toBe(false);
  });

  it("ignores Space presses from editable controls and repeated key events", () => {
    const view = setup();

    fireEvent.keyDown(screen.getByLabelText("Editor input"), { code: "Space" });
    expect(view.navigation().spacePressed).toBe(false);
    fireEvent.keyDown(window, { code: "Space", repeat: true });
    expect(view.navigation().spacePressed).toBe(false);
  });

  it("clears Space navigation when the window loses focus", () => {
    const view = setup();

    fireEvent.keyDown(window, { code: "Space" });
    expect(view.navigation().spacePressed).toBe(true);
    fireEvent(window, new Event("blur"));
    expect(view.navigation().spacePressed).toBe(false);
  });

  it("uses Shift-wheel for horizontal panning with viewport dimensions", () => {
    const view = setup();
    const wheel = new WheelEvent("wheel", { deltaY: 30, shiftKey: true, cancelable: true });

    fireEvent(view.canvas, wheel);
    expect(wheel.defaultPrevented).toBe(true);
    expect(view.panByPixels).toHaveBeenCalledWith({ x: -30, y: 0 }, { width: 800, height: 400 });
    expect(view.zoomAt).not.toHaveBeenCalled();
  });

  it("uses horizontal trackpad movement for two-axis panning", () => {
    const view = setup();
    const wheel = new WheelEvent("wheel", { deltaX: 24, deltaY: 8, cancelable: true });

    fireEvent(view.canvas, wheel);
    expect(view.panByPixels).toHaveBeenCalledWith({ x: -24, y: -8 }, { width: 800, height: 400 });
    expect(view.localMapPoint).not.toHaveBeenCalled();
  });

  it("uses vertical wheel movement for cursor-anchored zooming", () => {
    const view = setup();
    const wheel = new WheelEvent("wheel", {
      deltaY: 100,
      clientX: 120,
      clientY: 80,
      cancelable: true,
    });

    fireEvent(view.canvas, wheel);
    expect(view.localMapPoint).toHaveBeenCalledWith({
      currentTarget: view.canvas,
      clientX: 120,
      clientY: 80,
    });
    expect(view.zoomAt).toHaveBeenCalledWith({ x: 4, y: 6 }, Math.exp(-0.2));
    expect(view.panByPixels).not.toHaveBeenCalled();
  });

  it("owns the active pan-drag state exposed to pointer handlers", () => {
    const view = setup();
    const drag = {
      pointerId: 7,
      start: { x: 20, y: 30 },
      camera: { centerX: 10, centerY: 8, zoom: 1 },
      viewport: { width: 800, height: 400 },
    };

    act(() => view.navigation().setPanDrag(drag));
    expect(view.navigation().panDrag).toEqual(drag);
    act(() => view.navigation().setPanDrag(null));
    expect(view.navigation().panDrag).toBeNull();
  });
});
