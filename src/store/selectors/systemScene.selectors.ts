import type { RootState } from "../index";
import { selectWorldByCoord } from "./galaxy.selectors";

export const selectSystemSceneMode = (state: RootState) => state.systemScene.sceneMode;
export const selectShowWarpLayer = (state: RootState) => state.systemScene.showWarpLayer;
export const selectWarpLayerOpacity = (state: RootState) => state.systemScene.warpLayerOpacity;
export const selectWarpLayerActive = (state: RootState) => state.systemScene.warpLayerActive;
export const selectWarpExitBlankActive = (state: RootState) => state.systemScene.warpExitBlankActive;
export const selectSystemSceneTransitionPhase = (state: RootState) =>
  state.systemScene.transitionPhase;
export const selectSystemSceneTransitionReason = (state: RootState) =>
  state.systemScene.transitionReason;
export const selectSystemSceneTransitionSceneKey = (state: RootState) =>
  state.systemScene.transitionSceneKey;
export const selectSystemSceneReady = (state: RootState) =>
  state.systemScene.sceneReady;
export const selectSystemSceneRenderableLocation = (state: RootState) => {
  const location = state.systemScene.renderableLocation;
  if (!location) return null;
  const world = selectWorldByCoord(location.sectorAbbr, location.hex)(state);
  return world ? { world, sectorAbbr: location.sectorAbbr } : null;
};
