import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type SystemSceneMode = "system" | "jump";
export type SystemSceneTransitionPhase =
  | "idle"
  | "covering"
  | "covered"
  | "revealing";
export type SystemSceneTransitionReason =
  | "jump-enter"
  | "jump-exit"
  | "system-change"
  | null;

export interface SystemSceneLocation {
  sectorAbbr: string;
  hex: string;
}

interface SystemSceneState {
  sceneMode: SystemSceneMode;
  showWarpLayer: boolean;
  warpLayerOpacity: number;
  warpLayerActive: boolean;
  warpExitBlankActive: boolean;
  renderableLocation: SystemSceneLocation | null;
  transitionPhase: SystemSceneTransitionPhase;
  transitionReason: SystemSceneTransitionReason;
  transitionSceneKey: string | null;
  sceneReady: boolean;
}

const initialState: SystemSceneState = {
  sceneMode: "system",
  showWarpLayer: false,
  warpLayerOpacity: 0,
  warpLayerActive: false,
  warpExitBlankActive: false,
  renderableLocation: null,
  transitionPhase: "idle",
  transitionReason: null,
  transitionSceneKey: null,
  sceneReady: true,
};

const systemSceneSlice = createSlice({
  name: "systemScene",
  initialState,
  reducers: {
    setSceneMode(state, action: PayloadAction<SystemSceneMode>) {
      state.sceneMode = action.payload;
    },
    setRenderableLocation(state, action: PayloadAction<SystemSceneLocation | null>) {
      state.renderableLocation = action.payload;
    },
    setWarpLayerState(
      state,
      action: PayloadAction<Partial<Pick<SystemSceneState, "showWarpLayer" | "warpLayerOpacity" | "warpLayerActive">>>,
    ) {
      Object.assign(state, action.payload);
    },
    setWarpExitBlankActive(state, action: PayloadAction<boolean>) {
      state.warpExitBlankActive = action.payload;
    },
    beginSceneTransition(
      state,
      action: PayloadAction<{
        reason: Exclude<SystemSceneTransitionReason, null>;
        sceneKey: string;
      }>,
    ) {
      state.transitionPhase = "covering";
      state.transitionReason = action.payload.reason;
      state.transitionSceneKey = action.payload.sceneKey;
      state.sceneReady = false;
    },
    markSceneTransitionCovered(state, action: PayloadAction<string>) {
      if (state.transitionSceneKey !== action.payload) return;
      state.transitionPhase = "covered";
    },
    markSceneReady(state, action: PayloadAction<string>) {
      if (state.transitionSceneKey !== action.payload) return;
      state.sceneReady = true;
    },
    beginSceneReveal(state, action: PayloadAction<string>) {
      if (state.transitionSceneKey !== action.payload || !state.sceneReady) return;
      state.transitionPhase = "revealing";
    },
    completeSceneTransition(state, action: PayloadAction<string>) {
      if (state.transitionSceneKey !== action.payload) return;
      state.transitionPhase = "idle";
      state.transitionReason = null;
      state.transitionSceneKey = null;
      state.sceneReady = true;
    },
  },
});

export const {
  setSceneMode,
  setRenderableLocation,
  setWarpLayerState,
  setWarpExitBlankActive,
  beginSceneTransition,
  markSceneTransitionCovered,
  markSceneReady,
  beginSceneReveal,
  completeSceneTransition,
} = systemSceneSlice.actions;

export default systemSceneSlice.reducer;
