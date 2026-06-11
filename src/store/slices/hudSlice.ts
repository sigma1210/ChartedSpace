import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { registeredPluginHudLayouts } from "../../plugins/hudLayouts";

export type CoreHudId =
  | "mainWorld"
  | "sectorMap"
  | "navigation"
  | "subsectorMap"
  | "galaxyMap"
  | "trade"
  | "characterProfile"
  | "hudControls";

export type HudId = CoreHudId | string;

export interface HudOffset {
  x: number;
  y: number;
}

export interface HudLayout {
  visible: boolean;
  pinned: boolean;
  offset: HudOffset;
}

export interface HudState {
  layouts: Record<HudId, HudLayout>;
}

const pluginHudLayouts = Object.fromEntries(
  registeredPluginHudLayouts.map((hud) => [hud.id, hud.defaultLayout]),
) as Record<string, HudLayout>;

export const initialHudState: HudState = {
  layouts: {
    mainWorld: {
      visible: false,
      pinned: true,
      offset: { x: -0.02, y: 0.08 },
    },
    sectorMap: {
      visible: true,
      pinned: true,
      offset: { x: 0.12, y: 0.26 },
    },
    navigation: {
      visible: false,
      pinned: true,
      offset: { x: -0.48, y: -0.08 },
    },
    subsectorMap: {
      visible: true,
      pinned: true,
      offset: { x: 0.46, y: 0.12 },
    },
    galaxyMap: {
      visible: true,
      pinned: true,
      offset: { x: -0.12, y: -0.06 },
    },
    trade: {
      visible: false,
      pinned: true,
      offset: { x: 0.2, y: -0.1 },
    },
    characterProfile: {
      visible: false,
      pinned: true,
      offset: { x: -0.18, y: 0.1 },
    },
    hudControls: {
      visible: true,
      pinned: true,
      offset: { x: -0.58, y: 0.42 },
    },
    ...pluginHudLayouts,
  },
};

const hudSlice = createSlice({
  name: "hud",
  initialState: initialHudState,
  reducers: {
    hydrateHudLayouts(state, action: PayloadAction<Record<string, HudLayout>>) {
      for (const [id, layout] of Object.entries(action.payload)) {
        if (!state.layouts[id]) continue;
        state.layouts[id] = layout;
      }
    },
    setHudVisible(state, action: PayloadAction<{ id: HudId; visible: boolean }>) {
      state.layouts[action.payload.id].visible = action.payload.visible;
    },
    toggleHudVisible(state, action: PayloadAction<HudId>) {
      const layout = state.layouts[action.payload];
      layout.visible = !layout.visible;
    },
    setHudPinned(state, action: PayloadAction<{ id: HudId; pinned: boolean }>) {
      state.layouts[action.payload.id].pinned = action.payload.pinned;
    },
    setHudOffset(state, action: PayloadAction<{ id: HudId; offset: HudOffset }>) {
      state.layouts[action.payload.id].offset = action.payload.offset;
    },
  },
});

export const {
  hydrateHudLayouts,
  setHudVisible,
  toggleHudVisible,
  setHudPinned,
  setHudOffset,
} = hudSlice.actions;

export default hudSlice.reducer;
