import { configureStore } from "@reduxjs/toolkit";
import galaxyReducer, { loadSector } from "../slices/galaxySlice";
import {
  selectAllSectors,
  selectSectorData,
  selectSectorLoadStatus,
  selectShipSectorLoadStatus,
  selectIsSectorLoaded,
  selectActiveWorldTechLevel,
  selectTargetWorldTechLevel,
} from "../selectors/galaxy.selectors";
import type { GalaxyState, SectorDetail, World } from "../../types";
import type { RootState } from "../index";
import { initialHudState } from "../slices/hudSlice";
import { initialStayInLocationState } from "../../plugins/stayInLocation/stayInLocationSlice";

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
  ({ galaxy, ui: {} as RootState["ui"], notifications: {} as RootState["notifications"], characters: {} as RootState["characters"], ship: {} as RootState["ship"], turn: {} as RootState["turn"], availableCrew: {} as RootState["availableCrew"], system: {} as RootState["system"], systemScene: {} as RootState["systemScene"], jumpNavigation: {} as RootState["jumpNavigation"], hud: initialHudState, plugins: { stayInLocation: initialStayInLocationState } });

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
      ship: { ship: { sectorAbbr: "Spin" } },
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
});
