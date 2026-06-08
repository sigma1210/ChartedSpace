import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type SystemSceneMode = "system" | "jump";

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
}

const initialState: SystemSceneState = {
  sceneMode: "system",
  showWarpLayer: false,
  warpLayerOpacity: 0,
  warpLayerActive: false,
  warpExitBlankActive: false,
  renderableLocation: null,
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
  },
});

export const {
  setSceneMode,
  setRenderableLocation,
  setWarpLayerState,
  setWarpExitBlankActive,
} = systemSceneSlice.actions;

export default systemSceneSlice.reducer;
