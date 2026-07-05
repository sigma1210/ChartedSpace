import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/store";
import type { CharacterGender } from "@/lib/characters/types";
import type { CharacterAvatar } from "@/lib/characters/avatar";

export interface CharacterSummary {
  id: string;
  kind?: "player" | "npc" | string;
  name: string;
  gender?: CharacterGender | null;
  avatar?: CharacterAvatar | null;
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
  educationHistory?: CharacterEducationSummary | null;
  careers?: CharacterCareerSummary[];
  history?: CharacterHistoryEntry[];
  relationships?: CharacterRelationshipSummary[];
}

export interface CharacterEducationSummary {
  label: string;
  admission: "admitted" | "not-admitted" | "unknown";
  graduation: "graduated" | "honors" | "not-graduated" | "unknown";
  skills: string[];
}

export interface CharacterCareerSummary {
  careerId: string;
  careerLabel: string;
  assignmentLabel: string | null;
  terms: number;
  finalRank: number;
  finalRankTitle: string | null;
  commissioned: boolean;
}

export interface CharacterHistoryEntry {
  type: string;
  stage?: "background" | "preCareer" | "careerTerm" | "musterOut";
  label: string;
  detail: string | null;
  term: number | null;
  roll?: number | null;
}

export interface CharacterRelationshipSummary {
  id: string;
  type: string;
  attitude: number;
  notes?: string | null;
  source?: string | null;
  toCharacterId: string;
  toCharacterName: string;
  toCharacterAvatar?: CharacterAvatar | null;
}

export interface CharacterState {
  items: CharacterSummary[];
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;
  selectedProfileCharacterId: string | null;
}

export const initialCharactersState: CharacterState = {
  items: [],
  status: "idle",
  error: null,
  selectedProfileCharacterId: null,
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
      const status = (getState() as RootState).plugins.characters.status;
      return status === "idle";
    },
  }
);

const characterSlice = createSlice({
  name: "characters",
  initialState: initialCharactersState,
  reducers: {
    invalidateCharacters(state) {
      state.status = "idle";
    },
    updateCharacterInList(state, action: PayloadAction<{ id: string; name: string }>) {
      const item = state.items.find(c => c.id === action.payload.id);
      if (item) item.name = action.payload.name;
    },
    setSelectedProfileCharacter(state, action: PayloadAction<string | null>) {
      state.selectedProfileCharacterId = action.payload;
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
        if (
          state.selectedProfileCharacterId &&
          !action.payload.some((character) => character.id === state.selectedProfileCharacterId)
        ) {
          state.selectedProfileCharacterId = null;
        }
      })
      .addCase(fetchCharacters.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Unknown error";
      });
  },
});

export const {
  invalidateCharacters,
  setSelectedProfileCharacter,
  updateCharacterInList,
} = characterSlice.actions;
export default characterSlice.reducer;
