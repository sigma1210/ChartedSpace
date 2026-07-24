import type { PluginManifest } from "@/plugin-api/types";
import { equipmentCatalogHudMetadata } from "./hudMetadata";
import {
  equipmentCatalogHudId,
  equipmentCatalogPluginId,
  equipmentCatalogStateKey,
} from "./metadata";
import { equipmentCatalogStateRegistration } from "./stateRegistration";
import type { EquipmentCatalogState } from "./equipmentCatalogSlice";

export const equipmentCatalogPlugin = {
  metadata: { id: equipmentCatalogPluginId },
  state: equipmentCatalogStateRegistration,
  huds: [equipmentCatalogHudMetadata],
  actions: [],
  handlers: [],
  effectResolvers: [],
} satisfies PluginManifest<EquipmentCatalogState>;

export {
  equipmentCatalogHudId,
  equipmentCatalogPluginId,
  equipmentCatalogStateKey,
};
export { equipmentCatalogHudMetadata };
export { initialEquipmentCatalogState } from "./equipmentCatalogSlice";
