import type { RootState } from "@/store";
import {
  mockShipStateKey,
} from "./metadata";
import type { MockShipState } from "./mockShipSlice";

export type MockShipPluginRoot = RootState & {
  plugins: RootState["plugins"] & Record<typeof mockShipStateKey, MockShipState>;
};

export const selectMockShipState = (state: MockShipPluginRoot) =>
  state.plugins[mockShipStateKey];

export const selectMockShipJumpRating = (state: RootState) =>
  state.plugins.mockShip.lastMockedJumpRating ?? state.ship.ship?.jumpRating ?? null;
