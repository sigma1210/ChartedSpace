import { clampFloatingHudPosition } from "../FloatingPluginHud";

describe("floating plugin HUD positioning", () => {
  const viewport = { width: 800, height: 600 };
  const panel = { width: 240, height: 160 };

  it("preserves a position fully inside the viewport", () => {
    expect(clampFloatingHudPosition({ x: 120, y: 90 }, viewport, panel)).toEqual({ x: 120, y: 90 });
  });

  it("keeps the panel inside the lower and right edges", () => {
    expect(clampFloatingHudPosition({ x: 760, y: 580 }, viewport, panel)).toEqual({ x: 552, y: 432 });
  });

  it("keeps the panel inside the upper and left edges", () => {
    expect(clampFloatingHudPosition({ x: -50, y: -20 }, viewport, panel)).toEqual({ x: 8, y: 8 });
  });

  it("anchors oversized panels at the safe margin", () => {
    expect(clampFloatingHudPosition({ x: 100, y: 100 }, { width: 180, height: 100 }, panel)).toEqual({ x: 8, y: 8 });
  });
});
