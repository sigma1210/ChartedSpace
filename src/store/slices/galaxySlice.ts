import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { GalaxyState, SectorDetail } from "../../types";
import sectorsIndex from "../../../Galaxy/sectors.json";

const initialState: GalaxyState = {
  sectors: sectorsIndex.Sectors,
  sectorData: {},
  loadingStatus: {},
  activeSectorAbbr: "Spin",
  activeSubsectorKey: "A",
  activeWorldHex: null,
  activeWorldSectorAbbr: null,
  targetWorldHex: null,
  targetWorldSectorAbbr: null,
};

export const loadSector = createAsyncThunk<SectorDetail, string, { rejectValue: string }>(
  "galaxy/loadSector",
  async (abbr, { rejectWithValue }) => {
    try {
      const res = await fetch(`/data/galaxy/sectors/${abbr}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as SectorDetail;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : "Failed to load sector");
    }
  },
  {
    condition: (abbr, { getState }) => {
      const { galaxy } = getState() as { galaxy: GalaxyState };
      const status = galaxy.loadingStatus[abbr];
      return status !== "loading" && status !== "loaded";
    },
  }
);

const galaxySlice = createSlice({
  name: "galaxy",
  initialState,
  reducers: {
    setActiveSector: (state, action: { payload: string }) => {
      state.activeSectorAbbr = action.payload;
      state.activeSubsectorKey = "A";
    },
    setActiveSubsector: (state, action: { payload: string }) => {
      state.activeSubsectorKey = action.payload;
    },
    setActiveLocation: (state, action: { payload: { sectorAbbr: string; subsectorKey: string } }) => {
      state.activeSectorAbbr = action.payload.sectorAbbr;
      state.activeSubsectorKey = action.payload.subsectorKey;
    },
    setActiveWorldHex: (state, action: { payload: { sectorAbbr: string; hex: string } }) => {
      state.activeWorldHex = action.payload.hex;
      state.activeWorldSectorAbbr = action.payload.sectorAbbr;
    },
    clearActiveWorldHex: (state) => {
      state.activeWorldHex = null;
      state.activeWorldSectorAbbr = null;
    },
    setTargetWorldHex: (state, action: { payload: { sectorAbbr: string; hex: string } }) => {
      state.targetWorldHex = action.payload.hex;
      state.targetWorldSectorAbbr = action.payload.sectorAbbr;
    },
    clearTargetWorldHex: (state) => {
      state.targetWorldHex = null;
      state.targetWorldSectorAbbr = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSector.pending, (state, action) => {
        state.loadingStatus[action.meta.arg] = "loading";
      })
      .addCase(loadSector.fulfilled, (state, action) => {
        state.loadingStatus[action.meta.arg] = "loaded";
        state.sectorData[action.meta.arg] = action.payload;
      })
      .addCase(loadSector.rejected, (state, action) => {
        state.loadingStatus[action.meta.arg] = "error";
      });
  },
});

export const { setActiveSector, setActiveSubsector, setActiveLocation, setActiveWorldHex, clearActiveWorldHex, setTargetWorldHex, clearTargetWorldHex } = galaxySlice.actions;
export default galaxySlice.reducer;
