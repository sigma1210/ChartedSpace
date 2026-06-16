import type { RootState } from "../index";
import {
  selectIsShipDocked,
  selectShipCargo,
  selectActiveShip,
  selectIsShipDocked as selectPluginIsShipDocked,
  selectOwnerOperatorCharacterId,
  selectShipCargo as selectPluginShipCargo,
  selectShipColor,
  selectShipLocation,
  selectShipPluginJumpRating,
  selectShipStatus,
  type ShipSummary,
} from "../../plugins/ship";
import { initialHudState } from "../slices/hudSlice";
import { initialEconomyState } from "../../plugins/economy";
import { initialExpenseScenarioState } from "../../plugins/expenseScenario";
import { initialShipPluginState } from "../../plugins/ship";
import { initialNavigationState } from "../../plugins/navigation";
import { initialStayInLocationState } from "../../plugins/stayInLocation/stayInLocationSlice";

const makeRoot = (ship: ShipSummary | null): RootState => ({
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
    showGalaxyMiniMap: true,
    showSectorMiniMap: true,
    showSubsectorMiniMap: true,
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
  hud: initialHudState,
  plugins: {
    economy: initialEconomyState,
    expenseScenario: initialExpenseScenarioState,
    shipPlugin: { ...initialShipPluginState, ship },
    navigation: initialNavigationState,
    stayInLocation: initialStayInLocationState,
  },
});

describe("ship selectors", () => {
  it("selectShipCargo returns cargo or an empty hold", () => {
    const cargo = [{ id: "lot-1", commodity: "Ag", tons: 2 }];

    expect(selectShipCargo(makeRoot({ cargo } as ShipSummary))).toBe(cargo);
    expect(selectShipCargo(makeRoot(null))).toEqual([]);
  });

  it("selectIsShipDocked reflects ship status", () => {
    expect(selectIsShipDocked(makeRoot({ status: "docked" } as ShipSummary))).toBe(true);
    expect(selectIsShipDocked(makeRoot({ status: "in_jump" } as ShipSummary))).toBe(false);
    expect(selectIsShipDocked(makeRoot(null))).toBe(false);
  });

  it("ship plugin selectors read plugin-owned ship state", () => {
    const cargo = [{
      id: "lot-1",
      commodity: "Ag",
      tons: 2,
      purchasePrice: 100,
      originWorldName: "Regina",
      salePricePerTon: null,
      saleProceeds: null,
      profitLoss: null,
    }];
    const crew = [{
      id: "crew-1",
      role: "pilot",
      isOwnerOperator: true,
      monthlySalary: 0,
      characterId: "character-1",
      characterName: "Test Pilot",
      npcName: null,
      keySkillName: "Pilot",
      keySkillLevel: 1,
    }];
    const ship = {
      id: "ship-1",
      name: "Free Trader",
      type: "Free Trader",
      jumpRating: 2,
      status: "docked",
      isMortgaged: true,
      mortgagePaid: 0,
      currentWorldId: "world-1",
      worldName: "Regina",
      sectorAbbr: "Spin",
      hex: "1910",
      cargoCapacity: 82,
      destinationWorldId: null,
      jumpArrivesTurn: null,
      crew,
      cargo,
    };
    const root = makeRoot(ship);

    expect(selectActiveShip(root)).toBe(ship);
    expect(selectShipStatus(root)).toBe("idle");
    expect(selectPluginShipCargo(root)).toBe(cargo);
    expect(selectPluginIsShipDocked(root)).toBe(true);
    expect(selectOwnerOperatorCharacterId(root)).toBe("character-1");
    expect(selectShipColor(root)).toBe("#9ca3af");
    expect(selectShipPluginJumpRating(root)).toBe(2);
    expect(selectShipLocation(root)).toEqual({
      worldName: "Regina",
      hex: "1910",
      sectorAbbr: "Spin",
      status: "docked",
    });
  });
});
