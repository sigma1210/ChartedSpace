import type { InternalPluginRegistration } from "@/plugin-api/types";
import {
  equipmentCatalogPluginId,
  equipmentCatalogStateKey,
} from "./metadata";
import reducer, {
  initialEquipmentCatalogState,
  type EquipmentCatalogState,
} from "./equipmentCatalogSlice";

export const equipmentCatalogStateRegistration = {
  id: equipmentCatalogPluginId,
  stateKey: equipmentCatalogStateKey,
  reducer,
  initialState: initialEquipmentCatalogState,
} satisfies InternalPluginRegistration<EquipmentCatalogState> & {
  initialState: EquipmentCatalogState;
};
