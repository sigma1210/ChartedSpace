import type { RootState } from "@/store";
import { initialHudState } from "@/store/slices/hudSlice";
import { initialCharactersState } from "@/plugins/characters";
import { initialDemographicsState } from "@/plugins/demographics";
import { initialEconomyState } from "@/plugins/economy";
import { initialEquipmentCatalogState } from "@/plugins/equipmentCatalog";
import { initialExpenseScenarioState } from "@/plugins/expenseScenario";
import { initialMaydayState } from "@/plugins/mayday";
import { initialCharacterCombatState } from "@/plugins/characterCombat";
import { initialNavigationState } from "@/plugins/navigation";
import { initialShipPluginState, type ShipSummary } from "@/plugins/ship";
import { initialStayInLocationState } from "@/plugins/stayInLocation/stayInLocationSlice";
import type { SectorDetail, World } from "@/types";
import { selectCurrentMarketData } from "../selectors";
import { initialTradeState } from "../tradeSlice";

const world = (commodity?: string): World => ({
  hex: "1910",
  hexX: 19,
  hexY: 10,
  name: "Regina",
  commodity,
  uwp: {
    raw: "A788899-C",
    starport: "A",
    size: "7",
    atmosphere: "8",
    hydrographics: "8",
    population: "8",
    government: "9",
    lawLevel: "9",
    techLevel: "C",
  },
  remarks: ["Ri"],
  importance: "",
  economics: "",
  culture: "",
  nobility: "",
  bases: "",
  travelZone: "",
  pbg: {
    raw: "000",
    populationMultiplier: 0,
    belts: 0,
    gasGiants: 0,
  },
  worldsInSystem: 1,
  allegiance: "",
  stellar: null,
});

const sector = (mainWorld: World): SectorDetail => ({
  sector: "Spinward Marches",
  abbreviation: "Spin",
  milieu: "M1105",
  source: "",
  credits: "",
  subsectors: {},
  allegiances: {},
  worlds: [mainWorld],
});

const ship: ShipSummary = {
  id: "ship-1",
  name: "Free Trader",
  type: "Free Trader",
  jumpRating: 2,
  status: "docked",
  isMortgaged: true,
  mortgagePaid: 0,
  currentLocation: "Spin:1910",
  destinationLocation: null,
  worldName: "Regina",
  sectorAbbr: "Spin",
  hex: "1910",
  cargoCapacity: 82,
  jumpArrivesTurn: null,
  crew: [],
  cargo: [{
    id: "lot-1",
    commodity: "Botanical Wonders",
    origin: "Spin:1910",
    tons: 2,
    purchasePrice: 100,
    originWorldName: "Regina",
    salePricePerTon: null,
    saleProceeds: null,
    profitLoss: null,
  }],
};

const makeRoot = (mainWorld: World): RootState => ({
  ui: {} as RootState["ui"],
  notifications: { items: [] },
  galaxy: {
    sectors: [],
    sectorData: { Spin: sector(mainWorld) },
    loadingStatus: { Spin: "loaded" },
    activeSectorAbbr: "Spin",
    activeSubsectorKey: "A",
    activeWorldHex: null,
    activeWorldSectorAbbr: null,
    targetWorldHex: null,
    targetWorldSectorAbbr: null,
  },
  turn: { currentTurn: 1, status: "idle", error: null },
  availableCrew: { poolSize: 20, crew: [] },
  system: { records: {}, statusByKey: {}, errorByKey: {}, generatedTurnByKey: {} },
  systemScene: {} as RootState["systemScene"],
  hud: initialHudState,
  plugins: {
    characterCombat: initialCharacterCombatState,
    characters: initialCharactersState,
    demographics: initialDemographicsState,
    economy: initialEconomyState,
    equipmentCatalog: initialEquipmentCatalogState,
    expenseScenario: initialExpenseScenarioState,
    mayday: initialMaydayState,
    shipPlugin: { ...initialShipPluginState, ship },
    navigation: initialNavigationState,
    stayInLocation: initialStayInLocationState,
    trade: initialTradeState,
  },
});

describe("trade selectors", () => {
  it("uses the world commodity when one is present", () => {
    expect(selectCurrentMarketData(makeRoot(world("Botanical Wonders")))?.commodity)
      .toBe("Botanical Wonders");
  });

  it("falls back to Goods from world name when no commodity is present", () => {
    expect(selectCurrentMarketData(makeRoot(world()))?.commodity)
      .toBe("Goods from Regina");
  });

  it("uses ship trade capabilities to report remaining capacity", () => {
    expect(selectCurrentMarketData(makeRoot(world()))?.remainingCapacity)
      .toBe(80);
  });
});
