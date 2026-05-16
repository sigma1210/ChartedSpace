import type { RootState } from "../index";

export const selectAllSectors = (state: RootState) => state.galaxy.sectors;
export const selectSectorData = (abbr: string) => (state: RootState) => state.galaxy.sectorData[abbr];
export const selectSectorLoadStatus = (abbr: string) => (state: RootState) =>
  state.galaxy.loadingStatus[abbr] ?? "idle";
export const selectIsSectorLoaded = (abbr: string) => (state: RootState) =>
  state.galaxy.loadingStatus[abbr] === "loaded";

export const selectActiveSectorAbbr = (state: RootState) => state.galaxy.activeSectorAbbr;
export const selectActiveSubsectorKey = (state: RootState) => state.galaxy.activeSubsectorKey;
export const selectActiveWorldHex = (state: RootState) => state.galaxy.activeWorldHex;

export const selectActiveWorld = (state: RootState) => {
  const abbr = state.galaxy.activeSectorAbbr;
  const hex = state.galaxy.activeWorldHex;
  if (!hex) return null;
  return state.galaxy.sectorData[abbr]?.worlds.find((w) => w.hex === hex) ?? null;
};

export const selectActiveWorldName = (state: RootState) =>
  selectActiveWorld(state)?.name ?? null;
