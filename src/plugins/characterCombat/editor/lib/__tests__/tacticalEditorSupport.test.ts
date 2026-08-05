import {
  fitTacticalTracingTemplate,
  resizeTacticalTracingTemplate,
  tacticalEditorMarkerInteractionEnabled,
} from "../tacticalEditorSupport";

describe("tacticalEditorSupport", () => {
  it("fits tracing templates inside the grid while preserving their aspect ratio", () => {
    expect(fitTacticalTracingTemplate(
      "/images/tactical/deck.png",
      { width: 1000, height: 500 },
      { width: 40, height: 40 },
    )).toEqual({
      imagePath: "/images/tactical/deck.png",
      x: 0,
      y: 10,
      width: 40,
      height: 20,
      rotation: 0,
      opacity: 0.45,
      visible: true,
      lockAspectRatio: true,
    });
  });

  it("resizes a tracing template from a corner and preserves the opposite corner", () => {
    expect(resizeTacticalTracingTemplate({
      imagePath: "/images/tactical/deck.png",
      x: 0,
      y: 0,
      width: 10,
      height: 5,
      rotation: 0,
      opacity: 0.5,
      visible: true,
      lockAspectRatio: true,
    }, "se", { x: 20, y: 10 })).toMatchObject({
      x: 0,
      y: 0,
      width: 20,
      height: 10,
    });

    const rotatedResize = resizeTacticalTracingTemplate({
      imagePath: "/images/tactical/deck.png",
      x: 0,
      y: 0,
      width: 10,
      height: 5,
      rotation: 90,
      opacity: 0.5,
      visible: true,
      lockAspectRatio: false,
    }, "se", { x: -2.5, y: 17.5 });
    expect(rotatedResize.x).toBeCloseTo(-7.5);
    expect(rotatedResize.y).toBeCloseTo(2.5);
    expect(rotatedResize.width).toBeCloseTo(20);
    expect(rotatedResize.height).toBeCloseTo(10);
  });

  it("lets enemy-tool clicks pass through raised terrain and fire markers", () => {
    expect(tacticalEditorMarkerInteractionEnabled(null, "gang-member")).toBe(false);
    expect(tacticalEditorMarkerInteractionEnabled(null, "gang-leader")).toBe(false);
    expect(tacticalEditorMarkerInteractionEnabled("scenario-raised-area", null)).toBe(false);
    expect(tacticalEditorMarkerInteractionEnabled(null, null)).toBe(true);
  });
});
