import { Clock3 } from "lucide-react";
import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { StayInLocationHudContent } from "./StayInLocationHud";
import { stayInLocationNextTurnHudId } from "./hudMetadata";

export const stayInLocationHudRenderer = {
  id: stayInLocationNextTurnHudId,
  Icon: Clock3,
  Component: StayInLocationHudContent,
} satisfies PluginHudRendererRegistration;
