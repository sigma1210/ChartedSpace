import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { MockShipHudContent, MockShipHudIcon } from "./MockShipHud";
import { mockShipHudId } from "./metadata";

export const mockShipHudRenderer = {
  id: mockShipHudId,
  Icon: MockShipHudIcon,
  Component: MockShipHudContent,
} satisfies PluginHudRendererRegistration;
