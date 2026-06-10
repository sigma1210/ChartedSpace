import type { PluginEventHandler } from "@/plugin-api/types";
import type { AdvanceTurnWorkflowPluginEvent } from "@/plugin-api/workflows";
import {
  stayInLocationBlockBeforeTurnAdvanceMetadataKey,
  stayInLocationPluginId,
} from "./metadata";

const isAdvanceTurnWorkflowEvent = (
  event: unknown,
): event is AdvanceTurnWorkflowPluginEvent =>
  typeof event === "object" &&
  event !== null &&
  "source" in event &&
  "currentTurn" in event;

export const stayInLocationBlockBeforeTurnAdvanceHandler = {
  id: "debug.blockBeforeTurnAdvance",
  pluginId: stayInLocationPluginId,
  phase: "beforeTurnAdvance",
  order: 100,
  handle: (event) => {
    if (!isAdvanceTurnWorkflowEvent(event)) {
      return { disposition: "continue" };
    }

    const shouldBlock =
      event.source === "plugin.stayInLocation" &&
      event.metadata?.[stayInLocationBlockBeforeTurnAdvanceMetadataKey] === true;

    return shouldBlock
      ? {
        disposition: "stop",
        reason: "Stay-in-location debug blocker enabled",
      }
      : { disposition: "continue" };
  },
} satisfies PluginEventHandler;

export const stayInLocationHandlers = [
  stayInLocationBlockBeforeTurnAdvanceHandler,
] as const;
