import { configureStore } from "@reduxjs/toolkit";
import systemReducer, {
  getSystemData,
  systemCacheKey,
} from "../slices/systemSlice";
import galaxyReducer from "../slices/galaxySlice";
import turnReducer from "../slices/turnSlice";
import uiReducer from "../slices/uiSlice";
import notificationsReducer from "../slices/notificationsSlice";
import characterReducer from "../slices/characterSlice";
import shipReducer from "../slices/shipSlice";
import availableCrewReducer from "../slices/availableCrewSlice";
import {
  selectActiveWorldSystem,
  selectSystemDataByKey,
  selectSystemGeneratedTurnByKey,
  selectSystemStatusByKey,
} from "../selectors/system.selectors";
import type { SectorDetail } from "../../types";
import spin from "../../../Galaxy/sectors/Spin.json";
import { buildSystemData } from "../../lib/systemGeneration";

const sector = spin as unknown as SectorDetail;
const regina = sector.worlds.find((world) => world.hex === "1910");
const reginaSystem = buildSystemData(regina!, {
  sectorAbbr: "Spin",
  currentTurn: 1,
});

const makeStore = () =>
  configureStore({
    reducer: {
      ui: uiReducer,
      notifications: notificationsReducer,
      galaxy: galaxyReducer,
      characters: characterReducer,
      ship: shipReducer,
      turn: turnReducer,
      availableCrew: availableCrewReducer,
      system: systemReducer,
    },
    preloadedState: {
      galaxy: {
        sectors: [],
        sectorData: { Spin: sector },
        loadingStatus: { Spin: "loaded" as const },
        activeSectorAbbr: "Spin",
        activeSubsectorKey: "C",
        activeWorldHex: "1910",
        activeWorldSectorAbbr: "Spin",
        targetWorldHex: null,
        targetWorldSectorAbbr: null,
      },
    },
  });

describe("systemSlice", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("builds and stores system data by sector/hex key", async () => {
    expect(regina).toBeDefined();
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: reginaSystem }),
    } as Response);

    const store = makeStore();
    await store.dispatch(getSystemData({ sectorAbbr: "Spin", hex: "1910" }));

    const state = store.getState();
    const key = systemCacheKey({ sectorAbbr: "Spin", hex: "1910" });
    expect(state.system.statusByKey[key]).toBe("loaded");
    expect(state.system.generatedTurnByKey[key]).toBe(1);
    expect(state.system.records[key]?.name).toBe("Regina");
    expect(selectSystemStatusByKey("Spin", "1910")(state)).toBe("loaded");
    expect(selectSystemGeneratedTurnByKey("Spin", "1910")(state)).toBe(1);
    expect(selectSystemDataByKey("Spin", "1910")(state)?.hex).toBe("1910");
    expect(selectActiveWorldSystem(state)?.id).toBe("Spin/1910");
    expect(selectActiveWorldSystem(state)).toEqual(reginaSystem);
    expect(global.fetch).toHaveBeenCalledWith("/api/worlds/Spin/1910/system?turn=1");
  });

  it("stores an error when the API cannot load system data", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "World not found" }),
    } as Response);

    const store = makeStore();
    await store.dispatch(getSystemData({ sectorAbbr: "Spin", hex: "9999" }));

    const state = store.getState();
    const key = systemCacheKey({ sectorAbbr: "Spin", hex: "9999" });
    expect(state.system.statusByKey[key]).toBe("error");
    expect(state.system.errorByKey[key]).toBe("World not found");
  });
});
