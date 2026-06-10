import type { PluginActionRegistration } from "@/plugin-api/types";
import {
  stayInLocationAdvanceTurnActionId,
  stayInLocationPluginId,
} from "./metadata";
import { advanceStayInLocationTurn } from "./stayInLocationSlice";

export const stayInLocationAdvanceTurnAction = {
  id: stayInLocationAdvanceTurnActionId,
  pluginId: stayInLocationPluginId,
  label: "Advance Turn",
  createAction: () => advanceStayInLocationTurn(),
} satisfies PluginActionRegistration;

export const stayInLocationActions = [
  stayInLocationAdvanceTurnAction,
] as const;
