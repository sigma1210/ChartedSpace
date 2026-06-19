import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../index";
import type { World } from "../../types";

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

const buildDeepSpaceWorld = (hex: string): World => ({
  hex,
  hexX: parseInt(hex.slice(0, 2), 10),
  hexY: parseInt(hex.slice(2, 4), 10),
  name: `Deep Space ${hex}`,
  stellar: null,
  pbg: { raw: "000", populationMultiplier: 0, belts: 0, gasGiants: 0 },
  uwp: { raw: "X100000-0", starport: "X", size: "1", atmosphere: "0", hydrographics: "0", population: "0", government: "0", lawLevel: "0", techLevel: "0" },
  remarks: [],
  importance: "",
  economics: "",
  culture: "",
  nobility: "",
  bases: "",
  travelZone: "",
  worldsInSystem: 0,
  allegiance: "",
});

export const selectSystemSceneRenderableLocation = createSelector(
  [
    (state: RootState) => state.systemScene.renderableLocation,
    (state: RootState) => state.galaxy.sectorData,
  ],
  (location, sectorData) => {
    if (!location) return null;
    const world =
      sectorData[location.sectorAbbr]?.worlds.find((w) => w.hex === location.hex) ??
      buildDeepSpaceWorld(location.hex);
    return { world, sectorAbbr: location.sectorAbbr };
  },
);
