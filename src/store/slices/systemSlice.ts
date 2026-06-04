import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { SystemData } from "../../lib/systemTypes";
import type { RootState } from "../index";

export type SystemCacheStatus = "idle" | "loading" | "loaded" | "error";

export interface SystemState {
  records: Record<string, SystemData>;
  statusByKey: Record<string, SystemCacheStatus>;
  errorByKey: Record<string, string | null>;
  generatedTurnByKey: Record<string, number>;
}

export interface SystemWorldKey {
  sectorAbbr: string;
  hex: string;
}

export const systemCacheKey = ({ sectorAbbr, hex }: SystemWorldKey): string =>
  `${sectorAbbr}:${hex}`;

const initialState: SystemState = {
  records: {},
  statusByKey: {},
  errorByKey: {},
  generatedTurnByKey: {},
};

export const getSystemData = createAsyncThunk<
  { key: string; data: SystemData; generatedTurn: number },
  SystemWorldKey,
  { state: RootState; rejectValue: { key: string; error: string } }
>(
  "system/getSystemData",
  async (worldKey, { getState, rejectWithValue }) => {
    const key = systemCacheKey(worldKey);
    const state = getState();
    const turn = state.turn.currentTurn;
    const response = await fetch(
      `/api/worlds/${encodeURIComponent(worldKey.sectorAbbr)}/${encodeURIComponent(worldKey.hex)}/system?turn=${turn}`,
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string };
      return rejectWithValue({
        key,
        error: body.error ?? `Failed to load system data: ${worldKey.sectorAbbr} ${worldKey.hex}`,
      });
    }

    const body = await response.json() as { data: SystemData };
    return {
      key,
      generatedTurn: turn,
      data: body.data,
    };
  },
  {
    condition: (worldKey, { getState }) => {
      const key = systemCacheKey(worldKey);
      const state = getState() as RootState;
      const status = state.system.statusByKey[key];
      const generatedTurn = state.system.generatedTurnByKey[key];
      return status !== "loading" && (status !== "loaded" || generatedTurn !== state.turn.currentTurn);
    },
  },
);

const systemSlice = createSlice({
  name: "system",
  initialState,
  reducers: {
    clearSystemCache(state) {
      state.records = {};
      state.statusByKey = {};
      state.errorByKey = {};
      state.generatedTurnByKey = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getSystemData.pending, (state, action) => {
        const key = systemCacheKey(action.meta.arg);
        state.statusByKey[key] = "loading";
        state.errorByKey[key] = null;
      })
      .addCase(getSystemData.fulfilled, (state, action) => {
        const { key, data } = action.payload;
        state.records[key] = data;
        state.statusByKey[key] = "loaded";
        state.errorByKey[key] = null;
        state.generatedTurnByKey[key] = action.payload.generatedTurn;
      })
      .addCase(getSystemData.rejected, (state, action) => {
        const key = action.payload?.key ?? systemCacheKey(action.meta.arg);
        state.statusByKey[key] = "error";
        state.errorByKey[key] =
          action.payload?.error ?? action.error.message ?? "Failed to build system data";
      });
  },
});

export const { clearSystemCache } = systemSlice.actions;
export default systemSlice.reducer;
