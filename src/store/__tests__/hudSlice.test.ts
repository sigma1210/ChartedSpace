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
import { navigationSelectHudId } from "../../plugins/navigation";
import { tradeHudId } from "../../plugins/trade";
import {
  characterActionsHudId,
  characterListHudId,
  characterProfileHudId,
} from "../../plugins/characters";

describe("hudSlice reducers", () => {
  it("returns initial HUD layout state", () => {
    expect(hudReducer(undefined, { type: "@@INIT" })).toEqual(initialHudState);
  });

  it("sets HUD visibility", () => {
    const state = hudReducer(initialHudState, setHudVisible({ id: "mainWorld", visible: true }));

    expect(state.layouts.mainWorld.visible).toBe(true);
  });

  it("includes default layouts for migrated HUDs", () => {
    expect(initialHudState.layouts[navigationSelectHudId]).toEqual({
      visible: false,
      pinned: true,
      offset: { x: 0.08, y: 0.28 },
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
    expect(initialHudState.layouts.worldMap).toEqual({
      visible: false,
      pinned: true,
      offset: { x: 0.04, y: -0.08 },
    });
    expect(initialHudState.layouts[tradeHudId]).toEqual({
      visible: false,
      pinned: true,
      offset: { x: 0.2, y: -0.1 },
    });
    expect(initialHudState.layouts[characterActionsHudId]).toEqual({
      visible: false,
      pinned: true,
      offset: { x: -0.22, y: 0.16 },
    });
    expect(initialHudState.layouts[characterProfileHudId]).toEqual({
      visible: false,
      pinned: true,
      offset: { x: -0.18, y: 0.1 },
    });
    expect(initialHudState.layouts[characterListHudId]).toEqual({
      visible: false,
      pinned: true,
      offset: { x: -0.34, y: 0.04 },
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

  it("clamps HUD offsets when set", () => {
    const state = hudReducer(initialHudState, setHudOffset({
      id: characterListHudId,
      offset: { x: 4, y: 4 },
    }));

    expect(state.layouts[characterListHudId].offset).toEqual({ x: 0.78, y: 0.58 });
  });

  it("hydrates persisted known HUD layouts", () => {
    const state = hudReducer(initialHudState, hydrateHudLayouts({
      [navigationSelectHudId]: {
        visible: true,
        pinned: false,
        offset: { x: 2, y: -2 },
      },
      staleHud: {
        visible: true,
        pinned: false,
        offset: { x: 0.5, y: 0.5 },
      },
    }));

    expect(state.layouts[navigationSelectHudId]).toEqual({
      visible: true,
      pinned: false,
      offset: { x: 0.78, y: -0.58 },
    });
    expect(state.layouts.staleHud).toBeUndefined();
  });
});
