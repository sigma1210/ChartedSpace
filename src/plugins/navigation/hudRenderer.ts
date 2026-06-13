import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { NavigationHudContent, NavigationHudIcon } from "./NavigationHud";
import { navigationSelectHudId } from "./metadata";

export const navigationHudRenderer = {
  id: navigationSelectHudId,
  Icon: NavigationHudIcon,
  Component: NavigationHudContent,
} satisfies PluginHudRendererRegistration;
