import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/store";
import { fetchCharacters, invalidateCharacters } from "@/store/slices/characterSlice";

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
  salePricePerTon: number | null;
  saleProceeds: number | null;
  profitLoss: number | null;
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

export interface ShipPluginState {
  ship: ShipSummary | null;
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;
  shipColor: string;
  developmentJumpRatingOverride: number | null;
}

export const initialShipPluginState: ShipPluginState = {
  ship: null,
  status: "idle",
  error: null,
  shipColor: DEFAULT_SHIP_COLOR,
  developmentJumpRatingOverride: null,
};

export const fetchShip = createAsyncThunk(
  "shipPlugin/fetch",
  async () => {
    const res = await fetch("/api/ship");
    if (!res.ok) throw new Error("Failed to fetch ship");
    const data = await res.json() as { ship: ShipSummary | null };
    return data.ship;
  },
  {
    condition: (_, { getState }) => {
      const status = (getState() as RootState).plugins.shipPlugin.status;
      return status === "idle";
    },
  },
);

export const buyCargoAndRefresh = createAsyncThunk(
  "shipPlugin/buyCargoAndRefresh",
  async ({ commodity, tons }: { commodity: string; tons: number }, { dispatch }) => {
    const response = await fetch("/api/ship/cargo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commodity, tons }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(error.error ?? "Purchase failed");
    }

    dispatch(invalidateShip());
    await dispatch(fetchShip());
    dispatch(invalidateCharacters());
    await dispatch(fetchCharacters());
  },
);

export const sellCargoAndRefresh = createAsyncThunk(
  "shipPlugin/sellCargoAndRefresh",
  async ({ lotId }: { lotId: string }, { dispatch }) => {
    const response = await fetch(`/api/ship/cargo/${lotId}/sell`, { method: "POST" });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(error.error ?? "Sale failed");
    }

    dispatch(invalidateShip());
    await dispatch(fetchShip());
    dispatch(invalidateCharacters());
    await dispatch(fetchCharacters());
  },
);

const shipPluginSlice = createSlice({
  name: "shipPlugin",
  initialState: initialShipPluginState,
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
    setShipJumpRating(state, action: PayloadAction<number>) {
      if (!state.ship) return;
      state.ship.jumpRating = Math.min(6, Math.max(1, Math.trunc(action.payload)));
    },
    setDevelopmentJumpRatingOverride(state, action: PayloadAction<number>) {
      state.developmentJumpRatingOverride = action.payload;
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

export const {
  invalidateShip,
  updateShipInStore,
  setShipColor,
  setShipJumpRating,
  setDevelopmentJumpRatingOverride,
} = shipPluginSlice.actions;

export default shipPluginSlice.reducer;
