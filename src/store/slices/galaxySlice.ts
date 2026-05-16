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
      state.activeWorldHex = null;
    },
    setActiveSubsector: (state, action: { payload: string }) => {
      state.activeSubsectorKey = action.payload;
      state.activeWorldHex = null;
    },
    setActiveLocation: (state, action: { payload: { sectorAbbr: string; subsectorKey: string } }) => {
      state.activeSectorAbbr = action.payload.sectorAbbr;
      state.activeSubsectorKey = action.payload.subsectorKey;
      state.activeWorldHex = null;
    },
    setActiveWorldHex: (state, action: { payload: string }) => {
      state.activeWorldHex = action.payload;
    },
    clearActiveWorldHex: (state) => {
      state.activeWorldHex = null;
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

export const { setActiveSector, setActiveSubsector, setActiveLocation, setActiveWorldHex, clearActiveWorldHex } = galaxySlice.actions;
export default galaxySlice.reducer;
