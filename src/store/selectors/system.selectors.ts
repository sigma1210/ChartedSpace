import type { RootState } from "../index";
import type { SystemData } from "../../lib/systemTypes";
import { systemCacheKey, type SystemCacheStatus } from "../slices/systemSlice";

export const selectSystemDataByKey =
  (sectorAbbr: string, hex: string) =>
  (state: RootState): SystemData | null =>
    state.system.records[systemCacheKey({ sectorAbbr, hex })] ?? null;

export const selectSystemStatusByKey =
  (sectorAbbr: string, hex: string) =>
  (state: RootState): SystemCacheStatus =>
    state.system.statusByKey[systemCacheKey({ sectorAbbr, hex })] ?? "idle";

export const selectSystemErrorByKey =
  (sectorAbbr: string, hex: string) =>
  (state: RootState): string | null =>
    state.system.errorByKey[systemCacheKey({ sectorAbbr, hex })] ?? null;

export const selectSystemGeneratedTurnByKey =
  (sectorAbbr: string, hex: string) =>
  (state: RootState): number | null =>
    state.system.generatedTurnByKey[systemCacheKey({ sectorAbbr, hex })] ?? null;

export const selectActiveWorldSystem = (
  state: RootState,
): SystemData | null => {
  const sectorAbbr = state.galaxy.activeWorldSectorAbbr;
  const hex = state.galaxy.activeWorldHex;
  if (!sectorAbbr || !hex) return null;
  return state.system.records[systemCacheKey({ sectorAbbr, hex })] ?? null;
};
