import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CharacterAvatar } from "@/lib/characters/avatar";
import type { RootState } from "@/store";

export const DEFAULT_SHIP_COLOR = "#9ca3af";

export interface CrewMember {
  id: string;
  role: string;
  isOwnerOperator: boolean;
  monthlySalary: number;
  characterId: string | null;
  characterName: string | null;
  characterAvatar?: CharacterAvatar | null;
  npcName: string | null;
  keySkillName: string | null;
  keySkillLevel: number;
}

export type WorldCoordinateToken = `${string}:${string}`;

export interface CargoManifestLot {
  id: string;
  commodity: string;
  origin: WorldCoordinateToken | null;
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
  currentLocation: string | null;
  destinationLocation: string | null;
  worldName: string | null;
  sectorAbbr: string | null;
  hex: string | null;
  cargoCapacity: number;
  stateroomsTotal?: number;
  jumpArrivesTurn: number | null;
  crew: CrewMember[];
  cargo: CargoManifestLot[];
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

export const refreshShip = createAsyncThunk(
  "shipPlugin/refresh",
  async () => {
    const res = await fetch("/api/ship");
    if (!res.ok) throw new Error("Failed to fetch ship");
    const data = await res.json() as { ship: ShipSummary | null };
    return data.ship;
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
      })
      .addCase(refreshShip.fulfilled, (state, action) => {
        state.ship = action.payload;
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
