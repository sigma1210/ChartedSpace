import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { Ship, UsersRound } from "lucide-react";
import { ShipCrewAssignmentHudContent } from "./ShipCrewAssignmentHud";
import { ShipHudContent, ShipHudIcon } from "./ShipHud";
import { ShipsPluginBar } from "./ShipsPluginBar";
import { shipActionsHudId, shipCrewAssignmentHudId, shipHudId } from "./metadata";

export const shipActionsHudRenderer = {
  id: shipActionsHudId,
  Icon: Ship,
  Component: ShipsPluginBar,
} satisfies PluginHudRendererRegistration;

export const shipHudRenderer = {
  id: shipHudId,
  Icon: ShipHudIcon,
  Component: ShipHudContent,
} satisfies PluginHudRendererRegistration;

export const shipCrewAssignmentHudRenderer = {
  id: shipCrewAssignmentHudId,
  Icon: UsersRound,
  Component: ShipCrewAssignmentHudContent,
} satisfies PluginHudRendererRegistration;

export const shipHudRenderers = [
  shipActionsHudRenderer,
  shipHudRenderer,
  shipCrewAssignmentHudRenderer,
] as const;
