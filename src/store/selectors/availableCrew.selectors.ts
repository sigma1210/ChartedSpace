import type { RootState } from "../index";

export const selectAvailableCrew  = (state: RootState) => state.availableCrew.crew;
export const selectCrewPoolSize   = (state: RootState) => state.availableCrew.poolSize;
