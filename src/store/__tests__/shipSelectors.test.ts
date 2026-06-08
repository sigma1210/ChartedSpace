import type { RootState } from "../index";
import {
  selectIsShipDocked,
  selectShipCargo,
} from "../selectors/ship.selectors";
import { initialHudState } from "../slices/hudSlice";

const makeRoot = (ship: RootState["ship"]["ship"]): RootState => ({
  ui: {
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
    showNavigationHud: false,
    showMainWorldHud: false,
    showCharacterProfileHud: false,
    showTradeHud: false,
  },
  notifications: { items: [] },
  galaxy: {
    sectors: [],
    sectorData: {},
    loadingStatus: {},
    activeSectorAbbr: "Spin",
    activeSubsectorKey: "A",
    activeWorldHex: null,
    activeWorldSectorAbbr: null,
    targetWorldHex: null,
    targetWorldSectorAbbr: null,
  },
  characters: { items: [], status: "idle", error: null },
  ship: { ship, status: "idle", error: null, shipColor: "#9ca3af" },
  turn: { currentTurn: 1, status: "idle", error: null },
  availableCrew: { poolSize: 20, crew: [] },
  system: { records: {}, statusByKey: {}, errorByKey: {}, generatedTurnByKey: {} },
  systemScene: {
    sceneMode: "system",
    showWarpLayer: false,
    warpLayerOpacity: 0,
    warpLayerActive: false,
    warpExitBlankActive: false,
    renderableLocation: null,
    transitionPhase: "idle",
    transitionReason: null,
    transitionSceneKey: null,
    sceneReady: true,
  },
  jumpNavigation: {
    selectedDestinationKey: null,
    plotStatus: "idle",
    actionBusy: false,
    hasStoredJumpDestination: false,
    warpExitInProgress: false,
    jumpResolveInProgress: false,
  },
  hud: initialHudState,
});

describe("ship selectors", () => {
  it("selectShipCargo returns cargo or an empty hold", () => {
    const cargo = [{ id: "lot-1", commodity: "Ag", tons: 2 }];

    expect(selectShipCargo(makeRoot({ cargo } as RootState["ship"]["ship"]))).toBe(cargo);
    expect(selectShipCargo(makeRoot(null))).toEqual([]);
  });

  it("selectIsShipDocked reflects ship status", () => {
    expect(selectIsShipDocked(makeRoot({ status: "docked" } as RootState["ship"]["ship"]))).toBe(true);
    expect(selectIsShipDocked(makeRoot({ status: "in_jump" } as RootState["ship"]["ship"]))).toBe(false);
    expect(selectIsShipDocked(makeRoot(null))).toBe(false);
  });
});
