import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import {
  DemographicsHudContent,
  DemographicsHudIcon,
} from "./DemographicsHud";
import { demographicsHudId } from "./hudMetadata";

export const demographicsHudRenderer = {
  id: demographicsHudId,
  Icon: DemographicsHudIcon,
  Component: DemographicsHudContent,
} satisfies PluginHudRendererRegistration;
