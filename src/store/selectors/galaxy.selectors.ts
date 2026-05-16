import type { RootState } from "../index";

export const selectAllSectors = (state: RootState) => state.galaxy.sectors;
export const selectSectorData = (abbr: string) => (state: RootState) => state.galaxy.sectorData[abbr];
export const selectSectorLoadStatus = (abbr: string) => (state: RootState) =>
  state.galaxy.loadingStatus[abbr] ?? "idle";
export const selectIsSectorLoaded = (abbr: string) => (state: RootState) =>
  state.galaxy.loadingStatus[abbr] === "loaded";
