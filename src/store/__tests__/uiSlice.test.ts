import uiReducer, {
  openModal,
  closeModal,
  goBack,
  openMap,
  setMapView,
  setActiveSector,
  setActiveSubsector,
  openSystemDetail,
  openSearch,
  setSearchQuery,
  setSearchFilter,
  openNotifications,
  openOwnProfile,
  openUserProfile,
  openSelectedWorldSystemDetail,
} from "../slices/uiSlice";
import {
  selectActiveModal,
  selectMapView,
  selectActiveWorldId,
  selectActiveSectorAbbr,
  selectActiveSubsector,
  selectActiveUserId,
  selectIsOwnProfile,
  selectSearchQuery,
  selectSearchFilter,
  selectPreviousModal,
  selectShowGalaxyMiniMap,
  selectShowMainWorldHud,
  selectShowSectorMiniMap,
  selectShowSubsectorMiniMap,
} from "../selectors/ui.selectors";
import type { UIState } from "../../types";
import type { RootState } from "../index";
import { initialHudState } from "../slices/hudSlice";
import { initialCharactersState } from "../../plugins/characters";
import { initialDemographicsState } from "../../plugins/demographics";
import { initialEconomyState } from "../../plugins/economy";
import { initialExpenseScenarioState } from "../../plugins/expenseScenario";
import { initialMaydayState } from "../../plugins/mayday";
import { initialShipPluginState } from "../../plugins/ship";
import { initialNavigationState } from "../../plugins/navigation";
import { initialStayInLocationState } from "../../plugins/stayInLocation/stayInLocationSlice";
import { initialTradeState } from "../../plugins/trade/tradeSlice";

const initialState: UIState = {
  activeModal: null,
  mapView: "galaxy",
  activeWorldId: null,
  activeSectorAbbr: null,
  activeSubsector: null,
  activeUserId: null,
  isOwnProfile: false,
  searchFilter: "all",
  searchQuery: "",
  previousModal: null,
  showGalaxyMiniMap: true,
  showSectorMiniMap: true,
  showSubsectorMiniMap: true,
  showMainWorldHud: false,
};

const makeRoot = (ui: UIState): RootState => {
  return { ui, notifications: { items: [] }, galaxy: { sectors: [], sectorData: {}, loadingStatus: {}, activeSectorAbbr: "Spin", activeSubsectorKey: "A", activeWorldHex: null, activeWorldSectorAbbr: null, targetWorldHex: null, targetWorldSectorAbbr: null }, turn: { currentTurn: 1, status: "idle", error: null }, availableCrew: { poolSize: 20, crew: [] }, system: { records: {}, statusByKey: {}, errorByKey: {}, generatedTurnByKey: {} }, systemScene: { sceneMode: "system", showWarpLayer: false, warpLayerOpacity: 0, warpLayerActive: false, warpExitBlankActive: false, renderableLocation: null, transitionPhase: "idle", transitionReason: null, transitionSceneKey: null, sceneReady: true }, hud: initialHudState, plugins: { characters: initialCharactersState, demographics: initialDemographicsState, economy: initialEconomyState, expenseScenario: initialExpenseScenarioState, mayday: initialMaydayState, shipPlugin: initialShipPluginState, navigation: initialNavigationState, stayInLocation: initialStayInLocationState, trade: initialTradeState } };
}

describe("uiSlice reducers", () => {
  it("returns initial state", () => {
    expect(uiReducer(undefined, { type: "@@INIT" })).toEqual(initialState);
  });

  describe("openModal", () => {
    it("sets activeModal and stores previousModal", () => {
      const state = uiReducer({ ...initialState, activeModal: "search" }, openModal("notifications"));
      expect(state.activeModal).toBe("notifications");
      expect(state.previousModal).toBe("search");
    });
  });

  describe("closeModal", () => {
    it("clears activeModal and previousModal", () => {
      const state = uiReducer(
        { ...initialState, activeModal: "search", previousModal: "notifications" },
        closeModal()
      );
      expect(state.activeModal).toBeNull();
      expect(state.previousModal).toBeNull();
    });
  });

  describe("goBack", () => {
    it("restores previousModal as activeModal", () => {
      const state = uiReducer(
        { ...initialState, activeModal: "systemDetail", previousModal: "map" },
        goBack()
      );
      expect(state.activeModal).toBe("map");
      expect(state.previousModal).toBeNull();
    });
  });

  describe("openMap", () => {
    it("sets activeModal to map and keeps current mapView when no argument", () => {
      const state = uiReducer({ ...initialState, mapView: "sector" }, openMap(undefined));
      expect(state.activeModal).toBe("map");
      expect(state.mapView).toBe("sector");
    });

    it("sets activeModal to map and sets mapView when argument provided", () => {
      const state = uiReducer(initialState, openMap("subsector"));
      expect(state.activeModal).toBe("map");
      expect(state.mapView).toBe("subsector");
    });
  });

  describe("setMapView", () => {
    it("updates mapView", () => {
      const state = uiReducer(initialState, setMapView("sector"));
      expect(state.mapView).toBe("sector");
    });
  });

  describe("setActiveSector", () => {
    it("stores sector abbreviation and sets mapView to sector", () => {
      const state = uiReducer(initialState, setActiveSector("Spin"));
      expect(state.activeSectorAbbr).toBe("Spin");
      expect(state.mapView).toBe("sector");
    });
  });

  describe("setActiveSubsector", () => {
    it("stores subsector letter and sets mapView to subsector", () => {
      const state = uiReducer(initialState, setActiveSubsector("C"));
      expect(state.activeSubsector).toBe("C");
      expect(state.mapView).toBe("subsector");
    });
  });

  describe("openSystemDetail", () => {
    it("sets activeModal to systemDetail and stores worldId", () => {
      const state = uiReducer(initialState, openSystemDetail("world-42"));
      expect(state.activeModal).toBe("systemDetail");
      expect(state.activeWorldId).toBe("world-42");
    });
  });

  describe("openSearch", () => {
    it("sets activeModal to search and clears searchQuery", () => {
      const state = uiReducer({ ...initialState, searchQuery: "Regina" }, openSearch());
      expect(state.activeModal).toBe("search");
      expect(state.searchQuery).toBe("");
    });
  });

  describe("setSearchQuery", () => {
    it("updates searchQuery", () => {
      const state = uiReducer(initialState, setSearchQuery("Regina"));
      expect(state.searchQuery).toBe("Regina");
    });
  });

  describe("setSearchFilter", () => {
    it("updates searchFilter", () => {
      const state = uiReducer(initialState, setSearchFilter("worlds"));
      expect(state.searchFilter).toBe("worlds");
    });
  });

  describe("openNotifications", () => {
    it("sets activeModal to notifications", () => {
      const state = uiReducer(initialState, openNotifications());
      expect(state.activeModal).toBe("notifications");
    });
  });

  describe("openOwnProfile", () => {
    it("sets isOwnProfile true and clears activeUserId", () => {
      const state = uiReducer({ ...initialState, activeUserId: "user-1" }, openOwnProfile());
      expect(state.activeModal).toBe("userProfile");
      expect(state.isOwnProfile).toBe(true);
      expect(state.activeUserId).toBeNull();
    });
  });

  describe("openUserProfile", () => {
    it("sets isOwnProfile false and stores userId", () => {
      const state = uiReducer(initialState, openUserProfile("user-99"));
      expect(state.activeModal).toBe("userProfile");
      expect(state.isOwnProfile).toBe(false);
      expect(state.activeUserId).toBe("user-99");
    });
  });
});

describe("ui selectors", () => {
  const root = makeRoot({
    ...initialState,
    activeModal: "search",
    mapView: "sector",
    activeWorldId: "world-1",
    activeSectorAbbr: "Spin",
    activeSubsector: "C",
    activeUserId: "user-1",
    isOwnProfile: true,
    searchFilter: "worlds",
    searchQuery: "Regina",
    previousModal: "notifications",
    showGalaxyMiniMap: false,
    showSectorMiniMap: true,
    showSubsectorMiniMap: false,
    showMainWorldHud: true,
  });

  it("selectActiveModal", () => expect(selectActiveModal(root)).toBe("search"));
  it("selectMapView", () => expect(selectMapView(root)).toBe("sector"));
  it("selectActiveWorldId", () => expect(selectActiveWorldId(root)).toBe("world-1"));
  it("selectActiveSectorAbbr", () => expect(selectActiveSectorAbbr(root)).toBe("Spin"));
  it("selectActiveSubsector", () => expect(selectActiveSubsector(root)).toBe("C"));
  it("selectActiveUserId", () => expect(selectActiveUserId(root)).toBe("user-1"));
  it("selectIsOwnProfile", () => expect(selectIsOwnProfile(root)).toBe(true));
  it("selectSearchFilter", () => expect(selectSearchFilter(root)).toBe("worlds"));
  it("selectSearchQuery", () => expect(selectSearchQuery(root)).toBe("Regina"));
  it("selectPreviousModal", () => expect(selectPreviousModal(root)).toBe("notifications"));
  it("selectShowGalaxyMiniMap", () => expect(selectShowGalaxyMiniMap(root)).toBe(false));
  it("selectShowSectorMiniMap", () => expect(selectShowSectorMiniMap(root)).toBe(true));
  it("selectShowSubsectorMiniMap", () => expect(selectShowSubsectorMiniMap(root)).toBe(false));
  it("selectShowMainWorldHud", () => expect(selectShowMainWorldHud(root)).toBe(true));
});

describe("ui workflow thunks", () => {
  it("openSelectedWorldSystemDetail opens the active world system detail", async () => {
    const root = makeRoot(initialState);
    root.galaxy.activeWorldSectorAbbr = "Spin";
    root.galaxy.activeWorldHex = "1910";

    const dispatch = jest.fn();
    const getState = jest.fn(() => root);

    await openSelectedWorldSystemDetail()(dispatch, getState, undefined);

    expect(dispatch).toHaveBeenCalledWith(openSystemDetail("1910"));
  });

  it("openSelectedWorldSystemDetail is a no-op without an active world", async () => {
    const root = makeRoot(initialState);
    const dispatch = jest.fn();
    const getState = jest.fn(() => root);

    await openSelectedWorldSystemDetail()(dispatch, getState, undefined);

    expect(dispatch).not.toHaveBeenCalledWith(openSystemDetail(expect.any(String)));
  });
});
