import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../index";
import { invalidateShip } from "./shipSlice";

interface TurnState {
  currentTurn: number;
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;
}

const initialState: TurnState = {
  currentTurn: 1,
  status: "idle",
  error: null,
};

export interface AdvanceTurnPayload {
  shipUpdate?: {
    status?: "docked" | "in_jump";
    currentWorldId?: string | null;
    destinationWorldHex?: string;
    destinationWorldSectorAbbr?: string;
    jumpArrivesTurn?: number | null;
  };
}

export const fetchTurn = createAsyncThunk(
  "turn/fetch",
  async () => {
    const res = await fetch("/api/turn");
    if (!res.ok) throw new Error("Failed to fetch turn");
    const data = await res.json() as { currentTurn: number };
    return data.currentTurn;
  },
  {
    condition: (_, { getState }) => {
      const status = (getState() as RootState).turn.status;
      return status === "idle";
    },
  }
);

export const advanceTurn = createAsyncThunk(
  "turn/advance",
  async (payload: AdvanceTurnPayload, { dispatch }) => {
    const res = await fetch("/api/turn/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to advance turn");
    const data = await res.json() as { currentTurn: number };
    dispatch(invalidateShip());
    return data.currentTurn;
  }
);

const turnSlice = createSlice({
  name: "turn",
  initialState,
  reducers: {
    invalidateTurn(state) {
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTurn.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTurn.fulfilled, (state, action) => {
        state.status = "loaded";
        state.currentTurn = action.payload;
      })
      .addCase(fetchTurn.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Unknown error";
      })
      .addCase(advanceTurn.fulfilled, (state, action) => {
        state.currentTurn = action.payload;
      });
  },
});

export const { invalidateTurn } = turnSlice.actions;
export default turnSlice.reducer;
