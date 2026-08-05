/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import TacticalEditorTracingTemplateLayer from "../TacticalEditorTracingTemplateLayer";

const template = {
  imagePath: "/images/tactical/deck.png",
  x: 2,
  y: 3,
  width: 10,
  height: 4,
  rotation: 90,
  opacity: 0.45,
  visible: true,
  lockAspectRatio: true,
};

describe("TacticalEditorTracingTemplateLayer", () => {
  it("renders the visible template with its transform, opacity, and aspect-ratio setting", () => {
    render(<svg><TacticalEditorTracingTemplateLayer
      template={template}
      editing={false}
      interactionDisabled={false}
      onBeginDrag={jest.fn()}
    /></svg>);

    const image = screen.getByTestId("tracing-template-image");
    expect(image.getAttribute("href")).toBe("/images/tactical/deck.png");
    expect(image.getAttribute("opacity")).toBe("0.45");
    expect(image.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
    expect(image.getAttribute("transform")).toBe("rotate(90 7 5)");
  });

  it("renders move, rotate, and four resize controls and reports pointer-down actions", () => {
    const onBeginDrag = jest.fn();
    const onParentPointerDown = jest.fn();
    render(<svg onPointerDown={onParentPointerDown}><TacticalEditorTracingTemplateLayer
      template={template}
      editing
      interactionDisabled={false}
      onBeginDrag={onBeginDrag}
    /></svg>);

    expect(screen.getByTestId("tracing-template-controls")).toBeTruthy();
    expect(screen.getByTestId("tracing-template-rotation-handle").getAttribute("cx")).toBe("10.5");
    (["nw", "ne", "se", "sw"] as const).forEach((corner) => {
      expect(screen.getByTestId(`tracing-template-${corner}-handle`)).toBeTruthy();
    });

    fireEvent.pointerDown(screen.getByTestId("tracing-template-move-area"));
    fireEvent.pointerDown(screen.getByTestId("tracing-template-rotation-handle"));
    fireEvent.pointerDown(screen.getByTestId("tracing-template-nw-handle"));
    expect(onBeginDrag.mock.calls.map(([kind]) => kind)).toEqual(["move", "rotate", "nw"]);
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });

  it("hides controls during another interaction and hides the image when the template is not visible", () => {
    const { rerender } = render(<svg><TacticalEditorTracingTemplateLayer
      template={template}
      editing
      interactionDisabled
      onBeginDrag={jest.fn()}
    /></svg>);

    expect(screen.getByTestId("tracing-template-image")).toBeTruthy();
    expect(screen.queryByTestId("tracing-template-controls")).toBeNull();

    rerender(<svg><TacticalEditorTracingTemplateLayer
      template={{ ...template, visible: false, lockAspectRatio: false }}
      editing
      interactionDisabled={false}
      onBeginDrag={jest.fn()}
    /></svg>);
    expect(screen.queryByTestId("tracing-template-image")).toBeNull();
  });
});
