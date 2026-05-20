import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export const DEFAULT_SHIP_COLOR = "#9ca3af";

export interface CrewMember {
  id: string;
  role: string;
  isOwnerOperator: boolean;
  monthlySalary: number;
  characterId: string | null;
  characterName: string | null;
  npcName: string | null;
  keySkillName: string | null;
  keySkillLevel: number;
}

export interface CargoLotSummary {
  id: string;
  commodity: string;
  tons: number;
  purchasePrice: number;
  originWorldName: string | null;
}

export interface ShipSummary {
  id: string;
  name: string;
  type: string;
  jumpRating: number;
  status: string;
  isMortgaged: boolean;
  mortgagePaid: number;
  currentWorldId: string | null;
  worldName: string | null;
  sectorAbbr: string | null;
  hex: string | null;
  cargoCapacity: number;
  destinationWorldId: string | null;
  jumpArrivesTurn: number | null;
  crew: CrewMember[];
  cargo: CargoLotSummary[];
}

interface ShipState {
  ship: ShipSummary | null;
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;
  shipColor: string;
}

const initialState: ShipState = {
  ship: null,
  status: "idle",
  error: null,
  shipColor: DEFAULT_SHIP_COLOR,
};

export const fetchShip = createAsyncThunk(
  "ship/fetch",
  async () => {
    const res = await fetch("/api/ship");
    if (!res.ok) throw new Error("Failed to fetch ship");
    const data = await res.json() as { ship: ShipSummary | null };
    return data.ship;
  },
  {
    condition: (_, { getState }) => {
      const status = (getState() as RootState).ship.status;
      return status === "idle";
    },
  }
);

const shipSlice = createSlice({
  name: "ship",
  initialState,
  reducers: {
    invalidateShip(state) {
      state.status = "idle";
    },
    updateShipInStore(state, action: PayloadAction<{ id: string; name: string }>) {
      if (state.ship?.id === action.payload.id) {
        state.ship.name = action.payload.name;
      }
    },
    setShipColor(state, action: PayloadAction<string>) {
      state.shipColor = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchShip.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchShip.fulfilled, (state, action) => {
        state.status = "loaded";
        state.ship = action.payload;
      })
      .addCase(fetchShip.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Unknown error";
      });
  },
});

export const { invalidateShip, updateShipInStore, setShipColor } = shipSlice.actions;
export default shipSlice.reducer;
