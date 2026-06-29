import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { registeredPluginHudLayouts } from "../../plugins/hudLayouts";

export type CoreHudId =
  | "mainWorld"
  | "sectorMap"
  | "subsectorMap"
  | "galaxyMap"
  | "systemMap"
  | "worldMap"
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

export const clampHudOffset = (value: HudOffset): HudOffset => ({
  x: Math.max(-0.78, Math.min(0.78, value.x)),
  y: Math.max(-0.58, Math.min(0.58, value.y)),
});

const clampHudLayout = (layout: HudLayout): HudLayout => ({
  ...layout,
  offset: clampHudOffset(layout.offset),
});

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
    systemMap: {
      visible: false,
      pinned: true,
      offset: { x: 0.18, y: -0.18 },
    },
    worldMap: {
      visible: false,
      pinned: true,
      offset: { x: 0.04, y: -0.08 },
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
        state.layouts[id] = clampHudLayout(layout);
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
      state.layouts[action.payload.id].offset = clampHudOffset(action.payload.offset);
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
