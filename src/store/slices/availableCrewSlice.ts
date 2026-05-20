import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "../index";
import type { AvailableCrewMember, CrewLibraryEntry } from "../../types";
import crewLibrary from "../../data/crewLibrary.json";

// ─── Name lists ───────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Aela", "Barek", "Calla", "Dorn", "Esen", "Fyn", "Gret", "Hael",
  "Ivar", "Jora", "Kael", "Lena", "Mira", "Nath", "Oryn", "Pell",
  "Quen", "Reva", "Sera", "Talon", "Ulra", "Voss", "Wren", "Xana",
  "Yuki", "Zara", "Aldric", "Bram", "Cali", "Dax", "Eira", "Fen",
  "Gale", "Holt", "Indra", "Jex", "Kira", "Lorn", "Mak", "Nova",
  "Orin", "Penn", "Reth", "Soto", "Tesh", "Ula", "Vale", "Wynne",
  "Xen", "Yael", "Zenn", "Aris", "Bren", "Cruz", "Devi", "Ekko",
  "Flint", "Gara", "Hale", "Imara", "Jolan", "Kess", "Lian", "Mors",
];

const LAST_NAMES = [
  "Vance", "Okafor", "Slater", "Thorn", "Bekker", "Crane", "Dusk",
  "Ferris", "Gorin", "Harlow", "Iskov", "Jareth", "Kelso", "Layne",
  "Maren", "Noor", "Oxley", "Pryce", "Quill", "Rand", "Steele",
  "Trask", "Umbra", "Virk", "Weld", "Xiros", "Yuen", "Zolt",
  "Adara", "Bast", "Cade", "Dayne", "Esker", "Forst", "Grael",
  "Hask", "Idris", "Jarn", "Kovac", "Lusk", "Meld", "Narov",
  "Orsk", "Pelk", "Rast", "Sorn", "Teld", "Ursa", "Veld", "Wask",
  "Xeld", "Yorn", "Zask", "Asel", "Beld", "Carn", "Dusk", "Esk",
];

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomName = (): string =>
  `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`;

const pickEntries = (count: number): AvailableCrewMember[] => {
  const lib    = crewLibrary as CrewLibraryEntry[];
  const chosen = new Set<number>();
  while (chosen.size < Math.min(count, lib.length)) {
    chosen.add(Math.floor(Math.random() * lib.length));
  }
  return Array.from(chosen).map((idx, i) => ({
    ...lib[idx],
    id:   `crew-${Date.now()}-${i}`,
    name: randomName(),
  }));
};

// ─── State ────────────────────────────────────────────────────────────────────

interface AvailableCrewState {
  poolSize: number;
  crew:     AvailableCrewMember[];
}

const initialState: AvailableCrewState = {
  poolSize: 20,
  crew:     [],
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const availableCrewSlice = createSlice({
  name: "availableCrew",
  initialState,
  reducers: {
    setAvailableCrew(state, action: PayloadAction<AvailableCrewMember[]>) {
      state.crew = action.payload;
    },
    removeFromPool(state, action: PayloadAction<string>) {
      state.crew = state.crew.filter(c => c.id !== action.payload);
    },
    setPoolSize(state, action: PayloadAction<number>) {
      state.poolSize = action.payload;
    },
    clearAvailableCrew(state) {
      state.crew = [];
    },
  },
});

export const {
  setAvailableCrew,
  removeFromPool,
  setPoolSize,
  clearAvailableCrew,
} = availableCrewSlice.actions;

// ─── Thunk ────────────────────────────────────────────────────────────────────

// Call this on every world arrival. Picks poolSize random library entries,
// assigns fresh random names, and replaces the current pool.
export const refreshWorldCrew =
  () => (dispatch: AppDispatch, getState: () => RootState) => {
    const poolSize = getState().availableCrew.poolSize;
    dispatch(setAvailableCrew(pickEntries(poolSize)));
  };

export default availableCrewSlice.reducer;
