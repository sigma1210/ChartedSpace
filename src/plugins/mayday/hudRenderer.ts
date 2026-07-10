import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { Radar } from "lucide-react";
import { MaydayPluginBar } from "./MaydayPluginBar";
import { maydayActionsHudId } from "./metadata";

export const maydayActionsHudRenderer = {
  id: maydayActionsHudId,
  Icon: Radar,
  Component: MaydayPluginBar,
} satisfies PluginHudRendererRegistration;
