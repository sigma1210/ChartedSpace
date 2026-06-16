import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { ShipHudContent, ShipHudIcon } from "./ShipHud";
import { shipHudId } from "./metadata";

export const shipHudRenderer = {
  id: shipHudId,
  Icon: ShipHudIcon,
  Component: ShipHudContent,
} satisfies PluginHudRendererRegistration;
