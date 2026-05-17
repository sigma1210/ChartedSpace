import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export interface CharacterSummary {
  id: string;
  name: string;
  upp: string;
  strength: number;
  dexterity: number;
  endurance: number;
  intelligence: number;
  education: number;
  socialStanding: number;
  credits: number;
  skills: { name: string; level: number }[];
  worldName: string | null;
  sectorAbbr: string | null;
  hex: string | null;
}

interface CharacterState {
  items: CharacterSummary[];
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;
}

const initialState: CharacterState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchCharacters = createAsyncThunk(
  "characters/fetchAll",
  async () => {
    const res = await fetch("/api/characters");
    if (!res.ok) throw new Error("Failed to fetch characters");
    const data = await res.json() as { items: CharacterSummary[] };
    return data.items;
  },
  {
    condition: (_, { getState }) => {
      const status = (getState() as RootState).characters.status;
      return status === "idle";
    },
  }
);

const characterSlice = createSlice({
  name: "characters",
  initialState,
  reducers: {
    invalidateCharacters(state) {
      state.status = "idle";
    },
    updateCharacterInList(state, action: PayloadAction<{ id: string; name: string }>) {
      const item = state.items.find(c => c.id === action.payload.id);
      if (item) item.name = action.payload.name;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCharacters.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCharacters.fulfilled, (state, action) => {
        state.status = "loaded";
        state.items = action.payload;
      })
      .addCase(fetchCharacters.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Unknown error";
      });
  },
});

export const { invalidateCharacters, updateCharacterInList } = characterSlice.actions;
export default characterSlice.reducer;
