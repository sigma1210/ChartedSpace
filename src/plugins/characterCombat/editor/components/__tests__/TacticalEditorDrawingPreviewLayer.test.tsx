/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import {
  TacticalEditorBoundaryDraftPreview,
  TacticalEditorCircleDraftPreview,
  TacticalEditorRectangleDraftPreview,
  type TacticalEditorPortalPreview,
} from "../TacticalEditorDrawingPreviewLayer";

const portal = (kind: "sliding-door" | "iris-valve", valid: boolean): TacticalEditorPortalPreview => ({
  wallId: "wall",
  kind,
  position: 0.5,
  center: { x: 4.5, y: 2 },
  edge: { from: { x: 4, y: 2 }, to: { x: 5, y: 2 } },
  available: true,
  distanceFromWall: 0,
  valid,
});

describe("tactical editor drawing previews", () => {
  it("renders rectangle dimensions at the rectangle center", () => {
    render(<svg><TacticalEditorRectangleDraftPreview preview={{ x: 2, y: 3, width: 6, height: 4 }} /></svg>);

    const preview = screen.getByTestId("rectangle-area-draft-preview");
    expect(preview.querySelector("rect")?.getAttribute("width")).toBe("6");
    expect(preview.querySelector("text")?.textContent).toBe("6.0 × 4.0");
    expect(preview.querySelector("text")?.getAttribute("x")).toBe("5");
    expect(preview.querySelector("text")?.getAttribute("y")).toBe("5");
  });

  it("renders only positive-radius circle drafts", () => {
    const { rerender } = render(<svg><TacticalEditorCircleDraftPreview draft={{ center: { x: 5, y: 6 }, radius: 3 }} /></svg>);

    expect(screen.getByTestId("circle-draft-preview").querySelector('circle[r="3"]')).toBeTruthy();
    rerender(<svg><TacticalEditorCircleDraftPreview draft={{ center: { x: 5, y: 6 }, radius: 0 }} /></svg>);
    expect(screen.queryByTestId("circle-draft-preview")).toBeNull();
  });

  it("renders straight and curved wall drafts with endpoint markers", () => {
    const straight = { from: { x: 1, y: 2 }, to: { x: 7, y: 4 }, curved: false, awaitingEnd: false };
    const { rerender } = render(<svg><TacticalEditorBoundaryDraftPreview portal={null} wall={straight} /></svg>);

    const preview = screen.getByTestId("wall-draft-preview");
    expect(preview.querySelector("line")?.getAttribute("x2")).toBe("7");
    expect(preview.querySelectorAll("circle")).toHaveLength(2);

    rerender(<svg><TacticalEditorBoundaryDraftPreview portal={null} wall={{ ...straight, curved: true }} /></svg>);
    expect(screen.getByTestId("wall-draft-preview").querySelector("path")?.getAttribute("d")).toBe("M 1 2 Q 4 3 7 4");
  });

  it("renders valid and invalid sliding-door previews", () => {
    const { rerender } = render(<svg><TacticalEditorBoundaryDraftPreview portal={portal("sliding-door", true)} wall={null} /></svg>);

    expect(screen.getByTestId("wall-portal-preview").querySelector("line")?.getAttribute("stroke")).toBe("#86efac");
    expect(screen.getByTestId("wall-portal-preview").querySelector("circle")).toBeNull();
    rerender(<svg><TacticalEditorBoundaryDraftPreview portal={portal("sliding-door", false)} wall={null} /></svg>);
    expect(screen.getByTestId("wall-portal-preview").querySelector("line")?.getAttribute("stroke")).toBe("#f87171");
  });

  it("renders valid and invalid iris-valve previews", () => {
    const { rerender } = render(<svg><TacticalEditorBoundaryDraftPreview portal={portal("iris-valve", true)} wall={null} /></svg>);

    expect(screen.getByTestId("wall-portal-preview").querySelector("circle")?.getAttribute("stroke")).toBe("#86efac");
    rerender(<svg><TacticalEditorBoundaryDraftPreview portal={portal("iris-valve", false)} wall={null} /></svg>);
    expect(screen.getByTestId("wall-portal-preview").querySelector("circle")?.getAttribute("stroke")).toBe("#f87171");
  });
});
