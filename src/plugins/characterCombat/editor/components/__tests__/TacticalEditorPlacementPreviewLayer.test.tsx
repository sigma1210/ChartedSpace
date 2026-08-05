/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import TacticalEditorPlacementPreviewLayer, {
  type TacticalEditorPlacementPreview,
} from "../TacticalEditorPlacementPreviewLayer";

describe("TacticalEditorPlacementPreviewLayer", () => {
  it("renders valid and invalid ordinary-terrain footprints", () => {
    const preview: TacticalEditorPlacementPreview = {
      kind: "terrain",
      origin: { x: 3, y: 4 },
      cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      valid: true,
    };
    const { container, rerender } = render(<svg><TacticalEditorPlacementPreviewLayer preview={preview} /></svg>);

    expect(container.querySelectorAll('rect[fill="#94a3b8"]')).toHaveLength(2);
    expect(container.querySelector('rect[x="4"][y="4"]')?.getAttribute("stroke")).toBe("#e2e8f0");

    rerender(<svg><TacticalEditorPlacementPreviewLayer preview={{ ...preview, valid: false }} /></svg>);
    expect(container.querySelectorAll('rect[fill="#ef4444"]')).toHaveLength(2);
    expect(container.querySelector('rect[x="4"][y="4"]')?.getAttribute("stroke")).toBe("#fecaca");
  });

  it("renders valid and invalid fire previews", () => {
    const preview: TacticalEditorPlacementPreview = {
      kind: "fire",
      origin: { x: 2, y: 3 },
      cells: [{ x: 0, y: 0 }],
      valid: true,
    };
    const { container, rerender } = render(<svg><TacticalEditorPlacementPreviewLayer preview={preview} /></svg>);

    expect(container.querySelector('circle[cx="2.5"][cy="3.5"]')?.getAttribute("fill")).toBe("#f97316");
    rerender(<svg><TacticalEditorPlacementPreviewLayer preview={{ ...preview, valid: false }} /></svg>);
    expect(container.querySelector("circle")?.getAttribute("fill")).toBe("#ef4444");
  });

  it.each([
    ["tree", "#92400e", "#166534"],
    ["bush", "#65a30d", "#4d7c0f"],
    ["rock", "#78716c", "#57534e"],
  ] as const)("renders valid and invalid %s previews", (kind, footprintFill, objectFill) => {
    const preview: TacticalEditorPlacementPreview = {
      kind: "natural",
      placement: { id: `${kind}-preview`, kind, position: { x: 5, y: 5 }, radius: 1 },
      cells: [{ x: 5, y: 5 }],
      valid: true,
    };
    const { rerender } = render(<svg><TacticalEditorPlacementPreviewLayer preview={preview} /></svg>);

    const layer = screen.getByTestId("natural-terrain-placement-preview");
    expect(layer.querySelector("rect")?.getAttribute("fill")).toBe(footprintFill);
    expect(layer.querySelector("circle")?.getAttribute("fill")).toBe(objectFill);

    rerender(<svg><TacticalEditorPlacementPreviewLayer preview={{ ...preview, valid: false }} /></svg>);
    const invalidLayer = screen.getByTestId("natural-terrain-placement-preview");
    expect(invalidLayer.querySelector("rect")?.getAttribute("fill")).toBe("#ef4444");
    expect(invalidLayer.querySelector("circle")?.getAttribute("fill")).toBe("#dc2626");
  });
});
