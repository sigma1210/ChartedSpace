import uiReducer, {
  openModal,
  closeModal,
  goBack,
  openCharacterList,
  openCharacterProfile,
  openCharacterCreate,
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
} from "../slices/uiSlice";
import {
  selectActiveModal,
  selectMapView,
  selectActiveCharacterId,
  selectActiveWorldId,
  selectActiveSectorAbbr,
  selectActiveSubsector,
  selectActiveUserId,
  selectIsOwnProfile,
  selectSearchQuery,
  selectSearchFilter,
  selectPreviousModal,
} from "../selectors/ui.selectors";
import type { UIState } from "../../types";
import type { RootState } from "../index";

const initialState: UIState = {
  activeModal: null,
  mapView: "galaxy",
  activeCharacterId: null,
  activeWorldId: null,
  activeSectorAbbr: null,
  activeSubsector: null,
  activeUserId: null,
  isOwnProfile: false,
  searchFilter: "all",
  searchQuery: "",
  previousModal: null,
  pendingJumpDestination: null,
  showGalaxyMiniMap: true,
  showSectorMiniMap: true,
  showSubsectorMiniMap: true,
};

const makeRoot = (ui: UIState): RootState => {
  return { ui, notifications: { items: [] }, galaxy: { sectors: [], sectorData: {}, loadingStatus: {}, activeSectorAbbr: "Spin", activeSubsectorKey: "A", activeWorldHex: null, activeWorldSectorAbbr: null, targetWorldHex: null, targetWorldSectorAbbr: null }, characters: { items: [], status: "idle", error: null }, ship: { ship: null, status: "idle", error: null, shipColor: "#9ca3af" }, turn: { currentTurn: 1, status: "idle", error: null }, availableCrew: { poolSize: 20, crew: [] } };
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
        { ...initialState, activeModal: "search", previousModal: "characterList" },
        closeModal()
      );
      expect(state.activeModal).toBeNull();
      expect(state.previousModal).toBeNull();
    });
  });

  describe("goBack", () => {
    it("restores previousModal as activeModal", () => {
      const state = uiReducer(
        { ...initialState, activeModal: "characterProfile", previousModal: "characterList" },
        goBack()
      );
      expect(state.activeModal).toBe("characterList");
      expect(state.previousModal).toBeNull();
    });
  });

  describe("openCharacterList", () => {
    it("opens characterList modal and clears activeCharacterId", () => {
      const state = uiReducer(
        { ...initialState, activeCharacterId: "abc123" },
        openCharacterList()
      );
      expect(state.activeModal).toBe("characterList");
      expect(state.activeCharacterId).toBeNull();
    });
  });

  describe("openCharacterProfile", () => {
    it("sets activeModal to characterProfile and stores characterId", () => {
      const state = uiReducer(initialState, openCharacterProfile("char-1"));
      expect(state.activeModal).toBe("characterProfile");
      expect(state.activeCharacterId).toBe("char-1");
    });
  });

  describe("openCharacterCreate", () => {
    it("sets activeModal to characterCreate and clears activeCharacterId", () => {
      const state = uiReducer(
        { ...initialState, activeCharacterId: "old" },
        openCharacterCreate()
      );
      expect(state.activeModal).toBe("characterCreate");
      expect(state.activeCharacterId).toBeNull();
    });
  });

  describe("openMap", () => {
    it("opens map modal and keeps current mapView when no argument", () => {
      const state = uiReducer({ ...initialState, mapView: "sector" }, openMap(undefined));
      expect(state.activeModal).toBe("map");
      expect(state.mapView).toBe("sector");
    });

    it("opens map modal and sets mapView when argument provided", () => {
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
    activeCharacterId: "char-1",
    activeWorldId: "world-1",
    activeSectorAbbr: "Spin",
    activeSubsector: "C",
    activeUserId: "user-1",
    isOwnProfile: true,
    searchFilter: "worlds",
    searchQuery: "Regina",
    previousModal: "characterList",
  });

  it("selectActiveModal", () => expect(selectActiveModal(root)).toBe("search"));
  it("selectMapView", () => expect(selectMapView(root)).toBe("sector"));
  it("selectActiveCharacterId", () => expect(selectActiveCharacterId(root)).toBe("char-1"));
  it("selectActiveWorldId", () => expect(selectActiveWorldId(root)).toBe("world-1"));
  it("selectActiveSectorAbbr", () => expect(selectActiveSectorAbbr(root)).toBe("Spin"));
  it("selectActiveSubsector", () => expect(selectActiveSubsector(root)).toBe("C"));
  it("selectActiveUserId", () => expect(selectActiveUserId(root)).toBe("user-1"));
  it("selectIsOwnProfile", () => expect(selectIsOwnProfile(root)).toBe(true));
  it("selectSearchFilter", () => expect(selectSearchFilter(root)).toBe("worlds"));
  it("selectSearchQuery", () => expect(selectSearchQuery(root)).toBe("Regina"));
  it("selectPreviousModal", () => expect(selectPreviousModal(root)).toBe("characterList"));
});
