import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { ShoppingBag } from "lucide-react";
import { EquipmentCatalogLauncher } from "./EquipmentCatalogLauncher";
import { equipmentCatalogHudId } from "./metadata";

export const equipmentCatalogHudRenderer = {
  id: equipmentCatalogHudId,
  Icon: ShoppingBag,
  Component: EquipmentCatalogLauncher,
} satisfies PluginHudRendererRegistration;
