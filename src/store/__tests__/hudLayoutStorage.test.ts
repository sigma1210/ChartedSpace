import { parseStoredHudLayouts } from "../hudLayoutStorage";

describe("HUD layout storage", () => {
  it("parses valid HUD layouts", () => {
    expect(parseStoredHudLayouts(JSON.stringify({
      navigation: {
        visible: true,
        pinned: false,
        offset: { x: 0.1, y: -0.2 },
      },
    }))).toEqual({
      navigation: {
        visible: true,
        pinned: false,
        offset: { x: 0.1, y: -0.2 },
      },
    });
  });

  it("ignores invalid saved layout data", () => {
    expect(parseStoredHudLayouts("{")).toEqual({});
    expect(parseStoredHudLayouts(JSON.stringify({
      navigation: {
        visible: true,
        pinned: false,
        offset: { x: 0.1, y: Number.NaN },
      },
      mainWorld: {
        visible: false,
        pinned: true,
        offset: { x: -0.1, y: 0.2 },
      },
    }))).toEqual({
      mainWorld: {
        visible: false,
        pinned: true,
        offset: { x: -0.1, y: 0.2 },
      },
    });
  });
});
