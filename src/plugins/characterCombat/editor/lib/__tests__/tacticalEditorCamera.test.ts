import {
  clampTacticalEditorCamera,
  fitTacticalEditorCamera,
  panTacticalEditorCamera,
  snapTacticalEditorPoint,
  tacticalEditorViewBox,
  zoomTacticalEditorCameraAt,
} from "../tacticalEditorCamera";

describe("tacticalEditorCamera", () => {
  const map = { width: 160, height: 100 };

  it("fits the complete map at the default zoom", () => {
    expect(tacticalEditorViewBox(fitTacticalEditorCamera(map), map)).toEqual({
      x: 0,
      y: 0,
      width: 160,
      height: 100,
    });
  });

  it("zooms toward the pointer without changing its viewport position", () => {
    const initial = fitTacticalEditorCamera(map);
    const anchor = { x: 120, y: 25 };
    const before = tacticalEditorViewBox(initial, map);
    const zoomed = zoomTacticalEditorCameraAt(initial, anchor, 2, map);
    const after = tacticalEditorViewBox(zoomed, map);

    expect((anchor.x - before.x) / before.width).toBeCloseTo((anchor.x - after.x) / after.width);
    expect((anchor.y - before.y) / before.height).toBeCloseTo((anchor.y - after.y) / after.height);
    expect(after).toMatchObject({ width: 80, height: 50 });
  });

  it("pans in screen space and clamps the view to the map", () => {
    const zoomed = zoomTacticalEditorCameraAt(fitTacticalEditorCamera(map), { x: 80, y: 50 }, 4, map);
    const panned = panTacticalEditorCamera(zoomed, { x: -200, y: -100 }, { width: 800, height: 500 }, map);
    expect(panned.centerX).toBeCloseTo(90);
    expect(panned.centerY).toBeCloseTo(55);

    const clamped = panTacticalEditorCamera(panned, { x: -10000, y: -10000 }, { width: 800, height: 500 }, map);
    expect(tacticalEditorViewBox(clamped, map)).toMatchObject({ x: 120, y: 75, width: 40, height: 25 });
  });

  it("uses equal horizontal and vertical sensitivity when the map is letterboxed", () => {
    const zoomed = zoomTacticalEditorCameraAt(
      fitTacticalEditorCamera(map),
      { x: 80, y: 50 },
      4,
      map,
    );
    const horizontallyPanned = panTacticalEditorCamera(
      zoomed,
      { x: -100, y: 0 },
      { width: 1200, height: 500 },
      map,
    );
    const verticallyPanned = panTacticalEditorCamera(
      zoomed,
      { x: 0, y: -100 },
      { width: 1200, height: 500 },
      map,
    );

    expect(horizontallyPanned.centerX - zoomed.centerX).toBeCloseTo(5);
    expect(verticallyPanned.centerY - zoomed.centerY).toBeCloseTo(5);
  });

  it("limits zoom and keeps the camera inside the map", () => {
    expect(clampTacticalEditorCamera({ centerX: -50, centerY: 500, zoom: 100 }, map)).toEqual({
      centerX: 5,
      centerY: 96.875,
      zoom: 16,
    });
  });

  it.each([
    ["grid", { x: 12, y: 8 }],
    ["half-grid", { x: 12.5, y: 7.5 }],
    ["quarter-grid", { x: 12.25, y: 7.75 }],
    ["freeform", { x: 12.26, y: 7.74 }],
  ] as const)("applies %s drawing precision", (mode, expected) => {
    expect(snapTacticalEditorPoint({ x: 12.26, y: 7.74 }, mode, map)).toEqual(expected);
  });

  it("clamps freeform vertices and normalizes floating-point noise", () => {
    expect(snapTacticalEditorPoint({ x: -0.00001, y: 100.00001 }, "freeform", map)).toEqual({ x: 0, y: 100 });
  });
});
