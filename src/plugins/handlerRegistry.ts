import type { PluginEventHandler, PluginWorkflowEffect, PluginWorkflowPhase } from "./types";
import { registeredPluginManifests } from "./catalog";

const pluginHandlers = registeredPluginManifests.flatMap(
  (plugin) => [...plugin.handlers] as PluginEventHandler[],
);

export const registeredPluginHandlers: PluginEventHandler[] = pluginHandlers
  .toSorted((left, right) => {
    if (left.phase !== right.phase) return left.phase.localeCompare(right.phase);
    if (left.order !== right.order) return left.order - right.order;
    return left.id.localeCompare(right.id);
  });

export const getPluginHandlersForPhase = <Event = unknown>(
  phase: PluginWorkflowPhase,
): Array<PluginEventHandler<Event>> =>
  registeredPluginHandlers.filter((handler) => handler.phase === phase) as Array<
    PluginEventHandler<Event>
  >;

export const runRegisteredPluginHandlersForPhase = async <Event = unknown>({
  phase,
  event,
  context,
  onHandlersDiscovered,
  onHandlerStart,
  onHandlerComplete,
}: {
  phase: PluginWorkflowPhase;
  event: Event;
  context: Parameters<PluginEventHandler<Event>["handle"]>[1];
  onHandlersDiscovered?: (handlerCount: number) => void;
  onHandlerStart?: (handler: PluginEventHandler<Event>) => void;
  onHandlerComplete?: (
    handler: PluginEventHandler<Event>,
    result: Awaited<ReturnType<PluginEventHandler<Event>["handle"]>>,
  ) => void;
}) => {
  const handlers = getPluginHandlersForPhase<Event>(phase);
  const effects: PluginWorkflowEffect[] = [];
  onHandlersDiscovered?.(handlers.length);

  for (const handler of handlers) {
    onHandlerStart?.(handler);
    const result = await handler.handle(event, context);
    effects.push(...(result.effects ?? []));
    onHandlerComplete?.(handler, result);

    if (result.disposition === "stop") {
      return {
        disposition: "stop" as const,
        handlerCount: handlers.length,
        stoppedByHandlerId: handler.id,
        reason: result.reason,
        effects,
      };
    }
  }

  return {
    disposition: "continue" as const,
    handlerCount: handlers.length,
    effects,
  };
};
