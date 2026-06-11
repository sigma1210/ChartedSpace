import hudReducer, {
  hydrateHudLayouts,
  initialHudState,
  setHudOffset,
  setHudPinned,
  setHudVisible,
  toggleHudVisible,
} from "../slices/hudSlice";
import { stayInLocationNextTurnHudId } from "../../plugins/stayInLocation/hudMetadata";
import { expenseScenarioHudId } from "../../plugins/expenseScenario/hudMetadata";

describe("hudSlice reducers", () => {
  it("returns initial HUD layout state", () => {
    expect(hudReducer(undefined, { type: "@@INIT" })).toEqual(initialHudState);
  });

  it("sets HUD visibility", () => {
    const state = hudReducer(initialHudState, setHudVisible({ id: "mainWorld", visible: true }));

    expect(state.layouts.mainWorld.visible).toBe(true);
  });

  it("includes default layouts for migrated HUDs", () => {
    expect(initialHudState.layouts.navigation).toEqual({
      visible: false,
      pinned: true,
      offset: { x: -0.48, y: -0.08 },
    });
    expect(initialHudState.layouts.subsectorMap).toEqual({
      visible: true,
      pinned: true,
      offset: { x: 0.46, y: 0.12 },
    });
    expect(initialHudState.layouts.galaxyMap).toEqual({
      visible: true,
      pinned: true,
      offset: { x: -0.12, y: -0.06 },
    });
    expect(initialHudState.layouts.trade).toEqual({
      visible: false,
      pinned: true,
      offset: { x: 0.2, y: -0.1 },
    });
    expect(initialHudState.layouts.characterProfile).toEqual({
      visible: false,
      pinned: true,
      offset: { x: -0.18, y: 0.1 },
    });
    expect(initialHudState.layouts[stayInLocationNextTurnHudId]).toEqual({
      visible: false,
      pinned: true,
      offset: { x: 0.34, y: 0.34 },
    });
    expect(initialHudState.layouts[expenseScenarioHudId]).toEqual({
      visible: false,
      pinned: true,
      offset: { x: 0.5, y: 0.08 },
    });
    expect(initialHudState.layouts.hudControls).toEqual({
      visible: true,
      pinned: true,
      offset: { x: -0.58, y: 0.42 },
    });
  });

  it("toggles HUD visibility", () => {
    const state = hudReducer(initialHudState, toggleHudVisible("sectorMap"));

    expect(state.layouts.sectorMap.visible).toBe(false);
  });

  it("sets HUD pin state", () => {
    const state = hudReducer(initialHudState, setHudPinned({ id: "mainWorld", pinned: false }));

    expect(state.layouts.mainWorld.pinned).toBe(false);
  });

  it("sets HUD offset", () => {
    const state = hudReducer(initialHudState, setHudOffset({
      id: "sectorMap",
      offset: { x: -0.25, y: 0.15 },
    }));

    expect(state.layouts.sectorMap.offset).toEqual({ x: -0.25, y: 0.15 });
  });

  it("hydrates persisted known HUD layouts", () => {
    const state = hudReducer(initialHudState, hydrateHudLayouts({
      navigation: {
        visible: true,
        pinned: false,
        offset: { x: 0.12, y: -0.2 },
      },
      staleHud: {
        visible: true,
        pinned: false,
        offset: { x: 0.5, y: 0.5 },
      },
    }));

    expect(state.layouts.navigation).toEqual({
      visible: true,
      pinned: false,
      offset: { x: 0.12, y: -0.2 },
    });
    expect(state.layouts.staleHud).toBeUndefined();
  });
});
