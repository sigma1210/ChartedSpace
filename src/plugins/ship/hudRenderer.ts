import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { ClipboardList, Ship, UsersRound } from "lucide-react";
import { ShipCrewAssignmentHudContent } from "./ShipCrewAssignmentHud";
import { ShipCrewListHudContent } from "./ShipCrewListHud";
import { ShipHudContent, ShipHudIcon } from "./ShipHud";
import { ShipsPluginBar } from "./ShipsPluginBar";
import { shipActionsHudId, shipCrewAssignmentHudId, shipCrewListHudId, shipHudId } from "./metadata";

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

export const shipCrewListHudRenderer = {
  id: shipCrewListHudId,
  Icon: ClipboardList,
  Component: ShipCrewListHudContent,
} satisfies PluginHudRendererRegistration;

export const shipHudRenderers = [
  shipActionsHudRenderer,
  shipHudRenderer,
  shipCrewAssignmentHudRenderer,
  shipCrewListHudRenderer,
] as const;
