import { configureStore } from "@reduxjs/toolkit";
import galaxyReducer, { loadSector } from "../slices/galaxySlice";
import {
  selectAllSectors,
  selectSectorData,
  selectSectorLoadStatus,
  selectShipSectorLoadStatus,
  selectIsSectorLoaded,
  selectActiveWorldTradeCodes,
  selectActiveWorldTechLevel,
  selectTargetWorldTradeCodes,
  selectTargetWorldTechLevel,
  selectWorldDotStyle,
} from "../selectors/galaxy.selectors";
import type { GalaxyState, SectorDetail, World } from "../../types";
import type { RootState } from "../index";
import { initialHudState } from "../slices/hudSlice";
import { initialCharactersState } from "../../plugins/characters";
import { initialDemographicsState } from "../../plugins/demographics";
import {
  getAllegianceColor,
  getPrimaryStellarColor,
} from "../../plugins/demographics/palettes";
import { initialEconomyState } from "../../plugins/economy";
import { initialExpenseScenarioState } from "../../plugins/expenseScenario";
import { initialMaydayState } from "../../plugins/mayday";
import { initialShipPluginState } from "../../plugins/ship";
import { initialNavigationState } from "../../plugins/navigation";
import { initialStayInLocationState } from "../../plugins/stayInLocation/stayInLocationSlice";
import { initialTradeState } from "../../plugins/trade/tradeSlice";

jest.mock("../../../Galaxy/sectors.json", () => ({
  Sectors: [
    { X: 0, Y: 0, Milieu: "M1105", Abbreviation: "Core", Tags: "OTU", Names: [{ Text: "Core", Lang: "en" }] },
    { X: -1, Y: 0, Milieu: "M1105", Abbreviation: "Spin", Tags: "OTU", Names: [{ Text: "Spinward Marches", Lang: "en" }] },
  ],
}));

const mockCoreData: SectorDetail = {
  sector: "Core",
  abbreviation: "Core",
  milieu: "M1105",
  source: "T5SS",
  credits: "",
  subsectors: { A: "Apge" },
  allegiances: { ImDc: "Third Imperium" },
  worlds: [],
};

const mockWorld = (hex: string, techLevel: string): World => ({
  hex,
  hexX: Number(hex.slice(0, 2)),
  hexY: Number(hex.slice(2, 4)),
  name: `World ${hex}`,
  uwp: {
    starport: "A",
    size: "7",
    atmosphere: "7",
    hydrographics: "7",
    population: "7",
    government: "7",
    lawLevel: "7",
    techLevel,
  },
  stellar: [],
} as unknown as World);

const makeStore = (preloaded?: Partial<GalaxyState>) =>
  configureStore({
    reducer: { galaxy: galaxyReducer },
    preloadedState: preloaded
      ? { galaxy: { sectors: [], sectorData: {}, loadingStatus: {}, activeSectorAbbr: "Spin", activeSubsectorKey: "A", activeWorldHex: null, activeWorldSectorAbbr: null, targetWorldHex: null, targetWorldSectorAbbr: null, ...preloaded } }
      : undefined,
  });

const makeRoot = (galaxy: GalaxyState): RootState =>
  ({ galaxy, ui: {} as RootState["ui"], notifications: {} as RootState["notifications"], turn: {} as RootState["turn"], availableCrew: {} as RootState["availableCrew"], system: {} as RootState["system"], systemScene: {} as RootState["systemScene"], hud: initialHudState, plugins: { characters: initialCharactersState, demographics: initialDemographicsState, economy: initialEconomyState, expenseScenario: initialExpenseScenarioState, mayday: initialMaydayState, shipPlugin: initialShipPluginState, navigation: initialNavigationState, stayInLocation: initialStayInLocationState, trade: initialTradeState } });

describe("galaxySlice reducers", () => {
  it("populates sectors from the index on initialization", () => {
    const state = galaxyReducer(undefined, { type: "@@INIT" });
    expect(state.sectors).toHaveLength(2);
    expect(state.sectors[0].Abbreviation).toBe("Core");
    expect(state.sectorData).toEqual({});
    expect(state.loadingStatus).toEqual({});
  });

  it("sets loadingStatus to loading on pending", () => {
    const state = galaxyReducer(undefined, loadSector.pending("req-1", "Core"));
    expect(state.loadingStatus["Core"]).toBe("loading");
  });

  it("stores sector data and sets status to loaded on fulfilled", () => {
    const state = galaxyReducer(undefined, loadSector.fulfilled(mockCoreData, "req-1", "Core"));
    expect(state.loadingStatus["Core"]).toBe("loaded");
    expect(state.sectorData["Core"]).toEqual(mockCoreData);
  });

  it("sets loadingStatus to error on rejected", () => {
    const state = galaxyReducer(undefined, loadSector.rejected(null, "req-1", "Core", "HTTP 404"));
    expect(state.loadingStatus["Core"]).toBe("error");
  });
});

describe("loadSector thunk — condition guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("skips fetch when sector is already loaded", async () => {
    global.fetch = jest.fn();
    const store = makeStore({ sectorData: { Core: mockCoreData }, loadingStatus: { Core: "loaded" } });
    await store.dispatch(loadSector("Core"));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("skips fetch when sector is currently loading", async () => {
    global.fetch = jest.fn();
    const store = makeStore({ loadingStatus: { Core: "loading" } });
    await store.dispatch(loadSector("Core"));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("loadSector thunk — network behaviour", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches the correct URL and stores the result on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockCoreData });
    const store = makeStore();
    await store.dispatch(loadSector("Core"));
    const state = store.getState().galaxy;
    expect(global.fetch).toHaveBeenCalledWith("/data/galaxy/sectors/Core.json");
    expect(state.loadingStatus["Core"]).toBe("loaded");
    expect(state.sectorData["Core"]).toEqual(mockCoreData);
  });

  it("sets error status on non-OK response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    const store = makeStore();
    await store.dispatch(loadSector("Spin"));
    expect(store.getState().galaxy.loadingStatus["Spin"]).toBe("error");
  });

  it("sets error status on network error", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));
    const store = makeStore();
    await store.dispatch(loadSector("Spin"));
    expect(store.getState().galaxy.loadingStatus["Spin"]).toBe("error");
  });

  it("does not duplicate requests for parallel dispatches", async () => {
    let resolve!: (v: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });
    global.fetch = jest.fn().mockReturnValue(pending.then(() => ({ ok: true, json: async () => mockCoreData })));

    const store = makeStore();
    const first = store.dispatch(loadSector("Core"));
    const second = store.dispatch(loadSector("Core"));
    resolve(undefined);
    await Promise.all([first, second]);
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(1);
  });
});

describe("galaxy selectors", () => {
  const mockSectors = [
    { X: 0, Y: 0, Milieu: "M1105", Abbreviation: "Core", Tags: "OTU", Names: [] },
    { X: -1, Y: 0, Milieu: "M1105", Abbreviation: "Spin", Tags: "OTU", Names: [] },
  ];

  const galaxyState: GalaxyState = {
    sectors: mockSectors,
    sectorData: { Core: mockCoreData },
    loadingStatus: { Core: "loaded", Spin: "loading" },
    activeSectorAbbr: "Core",
    activeSubsectorKey: "A",
    activeWorldHex: null,
    activeWorldSectorAbbr: null,
    targetWorldHex: null,
    targetWorldSectorAbbr: null,
  };

  const root = makeRoot(galaxyState);

  it("selectAllSectors returns the full sectors index", () => {
    expect(selectAllSectors(root)).toEqual(mockSectors);
  });

  it("selectSectorData returns detail for a loaded sector", () => {
    expect(selectSectorData("Core")(root)).toEqual(mockCoreData);
  });

  it("selectSectorData returns undefined for an unloaded sector", () => {
    expect(selectSectorData("Spin")(root)).toBeUndefined();
  });

  it("selectSectorLoadStatus returns the correct status for known sectors", () => {
    expect(selectSectorLoadStatus("Core")(root)).toBe("loaded");
    expect(selectSectorLoadStatus("Spin")(root)).toBe("loading");
  });

  it("selectSectorLoadStatus returns idle for an unknown sector", () => {
    expect(selectSectorLoadStatus("Unkn")(root)).toBe("idle");
  });

  it("selectShipSectorLoadStatus returns the current ship sector status", () => {
    const rootWithShip = {
      ...root,
      plugins: {
        ...root.plugins,
        shipPlugin: {
          ...root.plugins.shipPlugin,
          ship: { sectorAbbr: "Spin" },
        },
      },
    } as RootState;
    expect(selectShipSectorLoadStatus(rootWithShip)).toBe("loading");
  });

  it("selectShipSectorLoadStatus returns idle without a ship sector", () => {
    expect(selectShipSectorLoadStatus(root)).toBe("idle");
  });

  it("selectIsSectorLoaded is true only when status is loaded", () => {
    expect(selectIsSectorLoaded("Core")(root)).toBe(true);
    expect(selectIsSectorLoaded("Spin")(root)).toBe(false);
    expect(selectIsSectorLoaded("Unkn")(root)).toBe(false);
  });

  it("selects active and target world tech levels", () => {
    const rootWithWorlds = makeRoot({
      ...galaxyState,
      sectorData: {
        Core: {
          ...mockCoreData,
          worlds: [mockWorld("0101", "A"), mockWorld("0102", "C")],
        },
      },
      activeWorldSectorAbbr: "Core",
      activeWorldHex: "0101",
      targetWorldSectorAbbr: "Core",
      targetWorldHex: "0102",
    });

    expect(selectActiveWorldTechLevel(rootWithWorlds)).toBe(10);
    expect(selectTargetWorldTechLevel(rootWithWorlds)).toBe(12);
  });

  it("returns stable trade code arrays for unchanged world selections", () => {
    const rootWithWorlds = makeRoot({
      ...galaxyState,
      sectorData: {
        Core: {
          ...mockCoreData,
          worlds: [mockWorld("0101", "A"), mockWorld("0102", "C")],
        },
      },
      activeWorldSectorAbbr: "Core",
      activeWorldHex: "0101",
      targetWorldSectorAbbr: "Core",
      targetWorldHex: "0102",
    });

    expect(selectActiveWorldTradeCodes(rootWithWorlds)).toBe(
      selectActiveWorldTradeCodes(rootWithWorlds),
    );
    expect(selectTargetWorldTradeCodes(rootWithWorlds)).toBe(
      selectTargetWorldTradeCodes(rootWithWorlds),
    );
  });

  it("returns a stable world dot style function for unchanged map state", () => {
    const rootWithWorlds = makeRoot({
      ...galaxyState,
      activeWorldSectorAbbr: "Core",
      activeWorldHex: "0101",
      targetWorldSectorAbbr: "Core",
      targetWorldHex: "0102",
    });
    const rootWithShip = {
      ...rootWithWorlds,
      plugins: {
        ...rootWithWorlds.plugins,
        shipPlugin: {
          ...initialShipPluginState,
          ship: {
            id: "ship-1",
            name: "Test Ship",
            type: "Free Trader",
            jumpRating: 1,
            status: "docked",
            isMortgaged: false,
            mortgagePaid: 0,
            currentLocation: "Spin:1910",
            destinationLocation: null,
            worldName: "Regina",
            sectorAbbr: "Spin",
            hex: "1910",
            cargoCapacity: 82,
            jumpArrivesTurn: null,
            crew: [],
            cargo: [],
          },
        },
      },
    } as RootState;

    const getStyle = selectWorldDotStyle(rootWithShip);

    expect(getStyle).toBe(selectWorldDotStyle(rootWithShip));
    expect(getStyle({ sectorAbbr: "Spin", hex: "1910" }, "subsectorMiniMap")).toEqual({
      fill: "var(--hud-ship)",
      r: 20,
    });
    expect(getStyle({ sectorAbbr: "Core", hex: "0101" }, "subsectorMiniMap")).toEqual({
      fill: "var(--hud-error)",
      r: 10,
    });
    expect(getStyle({ sectorAbbr: "Core", hex: "0102" }, "subsectorMiniMap")).toEqual({
      fill: "var(--hud-success)",
      r: 10,
    });
    expect(getStyle({ sectorAbbr: "Core", hex: "0103" }, "subsectorMiniMap")).toEqual({
      fill: "white",
      r: 5,
    });
  });

  it("uses demographics plugin mode for unselected world dot colors", () => {
    const stellarWorld = {
      ...mockWorld("0103", "A"),
      allegiance: "ImDc",
      stellar: ["K9 V"],
    } as unknown as World;
    const root = makeRoot({
      ...galaxyState,
      sectorData: {
        Core: {
          ...mockCoreData,
          worlds: [stellarWorld],
        },
      },
    });

    const stellarRoot = {
      ...root,
      plugins: {
        ...root.plugins,
        demographics: { selectedDotMode: "stellar" },
      },
    } as RootState;
    const allegianceRoot = {
      ...root,
      plugins: {
        ...root.plugins,
        demographics: { selectedDotMode: "allegiance" },
      },
    } as RootState;

    expect(selectWorldDotStyle(stellarRoot)({ sectorAbbr: "Core", hex: "0103" }, "subsectorMiniMap")).toEqual({
      fill: getPrimaryStellarColor(stellarWorld),
      r: 5,
    });
    expect(selectWorldDotStyle(allegianceRoot)({ sectorAbbr: "Core", hex: "0103" }, "subsectorMiniMap")).toEqual({
      fill: getAllegianceColor("ImDc"),
      r: 5,
    });
  });
});
