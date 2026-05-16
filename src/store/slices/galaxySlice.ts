import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { GalaxyState, SectorDetail } from "../../types";
import sectorsIndex from "../../../Galaxy/sectors.json";

const initialState: GalaxyState = {
  sectors: sectorsIndex.Sectors,
  sectorData: {},
  loadingStatus: {},
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
  reducers: {},
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

export default galaxySlice.reducer;
