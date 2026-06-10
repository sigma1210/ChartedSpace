import {
  stayInLocationAdvanceTurnActionId,
  stayInLocationBlockBeforeTurnAdvanceMetadataKey,
  stayInLocationPluginId,
  stayInLocationStateKey,
} from "../metadata";
import type { PluginEventHandler } from "@/plugin-api/types";
import { stayInLocationAdvanceTurnAction } from "../actionRegistration";
import { stayInLocationPlugin } from "..";
import { stayInLocationBlockBeforeTurnAdvanceHandler } from "../handlerRegistration";
import { stayInLocationNextTurnHudId } from "../hudMetadata";
import { registeredPluginActions } from "../../actionRegistry";
import { registeredPluginManifests } from "../../catalog";
import { getPluginHandlersForPhase, registeredPluginHandlers } from "../../handlerRegistry";
import { registeredPluginHudLayouts } from "../../hudLayouts";
import { pluginReducers, registeredPlugins } from "../../registry";

describe("stayInLocation action registration", () => {
  it("registers the advance turn action", () => {
    expect(stayInLocationAdvanceTurnAction.id).toBe(stayInLocationAdvanceTurnActionId);
    expect(stayInLocationAdvanceTurnAction.pluginId).toBe(stayInLocationPluginId);
    expect(typeof stayInLocationAdvanceTurnAction.createAction()).toBe("function");
  });

  it("exposes a single plugin manifest for core registration", () => {
    expect(stayInLocationPlugin.metadata.id).toBe(stayInLocationPluginId);
    expect(stayInLocationPlugin.state.stateKey).toBe(stayInLocationStateKey);
    expect(stayInLocationPlugin.huds).toHaveLength(1);
    expect(stayInLocationPlugin.huds[0].id).toBe(stayInLocationNextTurnHudId);
    expect(stayInLocationPlugin.actions).toContain(stayInLocationAdvanceTurnAction);
    expect(stayInLocationPlugin.handlers).toContain(stayInLocationBlockBeforeTurnAdvanceHandler);
  });

  it("derives plugin registries from the manifest catalog", () => {
    expect(registeredPluginManifests).toContain(stayInLocationPlugin);
    expect(registeredPlugins).toBe(registeredPluginManifests);
    expect(registeredPluginActions).toContain(stayInLocationAdvanceTurnAction);
    expect(registeredPluginHudLayouts).toContain(stayInLocationPlugin.huds[0]);
    expect(pluginReducers[stayInLocationStateKey]).toBe(stayInLocationPlugin.state.reducer);
    expect(registeredPluginHandlers).toContain(stayInLocationBlockBeforeTurnAdvanceHandler);
    expect(getPluginHandlersForPhase("beforeTurnAdvance")).toContain(stayInLocationBlockBeforeTurnAdvanceHandler);
  });

  it("registers a debug handler that can block stay-in-location turn advance", async () => {
    const handler = stayInLocationBlockBeforeTurnAdvanceHandler as PluginEventHandler;

    await expect(Promise.resolve(handler.handle({
      source: "plugin.stayInLocation",
      lifecycle: "world",
      previousTurn: 3,
      currentTurn: 3,
      metadata: {
        [stayInLocationBlockBeforeTurnAdvanceMetadataKey]: true,
      },
    }, {
      source: "plugin.stayInLocation",
      currentTurn: 3,
    }))).resolves.toEqual({
      disposition: "stop",
      reason: "Stay-in-location debug blocker enabled",
    });

    await expect(Promise.resolve(handler.handle({
      source: "plugin.stayInLocation",
      lifecycle: "world",
      previousTurn: 3,
      currentTurn: 3,
    }, {
      source: "plugin.stayInLocation",
      currentTurn: 3,
    }))).resolves.toEqual({ disposition: "continue" });
  });
});
