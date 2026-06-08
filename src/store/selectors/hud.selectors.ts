import type { RootState } from "../index";
import type { HudId } from "../slices/hudSlice";

export const selectHudLayout = (id: HudId) => (state: RootState) => state.hud.layouts[id];
export const selectHudVisible = (id: HudId) => (state: RootState) => state.hud.layouts[id].visible;
export const selectHudPinned = (id: HudId) => (state: RootState) => state.hud.layouts[id].pinned;
export const selectHudOffset = (id: HudId) => (state: RootState) => state.hud.layouts[id].offset;
