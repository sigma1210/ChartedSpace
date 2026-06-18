import { registeredPluginHudLayouts } from "../../hudLayouts";
import { registeredPluginHudRenderers } from "../../hudRenderers";
import { registeredPluginManifests } from "../../catalog";
import { pluginReducers } from "../../registry";
import { shipTradeCapabilityId } from "../../shipTradeCapabilities";
import { tradePlugin } from "..";
import {
  buyCargoAndRefresh,
  sellCargoAndRefresh,
} from "../actions";
import {
  tradeHudId,
  tradePluginId,
  tradeStateKey,
} from "../metadata";

describe("trade plugin", () => {
  it("registers plugin state, HUD, and ship trade dependency", () => {
    expect(registeredPluginManifests).toContain(tradePlugin);
    expect(tradePlugin.metadata.id).toBe(tradePluginId);
    expect(tradePlugin.capabilities?.uses).toContain(shipTradeCapabilityId);
    expect(tradePlugin.state.stateKey).toBe(tradeStateKey);
    expect(tradePlugin.huds[0].id).toBe(tradeHudId);
    expect(registeredPluginHudLayouts).toContain(tradePlugin.huds[0]);
    expect(registeredPluginHudRenderers.some((renderer) => renderer.id === tradeHudId)).toBe(true);
    expect(pluginReducers[tradeStateKey]).toBe(tradePlugin.state.reducer);
  });

  it("owns trade cargo command actions", () => {
    expect(buyCargoAndRefresh.typePrefix).toBe("trade/buyCargoAndRefresh");
    expect(sellCargoAndRefresh.typePrefix).toBe("trade/sellCargoAndRefresh");
  });
});
