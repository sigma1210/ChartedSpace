import type { InternalPluginRegistration } from "@/plugin-api/types";
import {
  mockShipPluginId,
  mockShipStateKey,
} from "./metadata";
import mockShipReducer, {
  initialMockShipState,
  type MockShipState,
} from "./mockShipSlice";

export const mockShipStateRegistration = {
  id: mockShipPluginId,
  stateKey: mockShipStateKey,
  reducer: mockShipReducer,
  initialState: initialMockShipState,
} satisfies InternalPluginRegistration<MockShipState> & {
  initialState: MockShipState;
};
