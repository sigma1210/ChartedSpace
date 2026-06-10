import type { PluginStateRoot } from "@/plugin-api/types";
import { economyStateKey } from "./metadata";
import type { EconomyState } from "./economySlice";

export type EconomyPluginRoot = PluginStateRoot<
  typeof economyStateKey,
  EconomyState
>;

export const selectEconomyState = (state: EconomyPluginRoot) =>
  state.plugins[economyStateKey];

export const selectEconomyLedgerRequests = (state: EconomyPluginRoot) =>
  selectEconomyState(state).ledgerRequests;

export const selectEconomyLedgerSummary = (state: EconomyPluginRoot) => {
  const requests = selectEconomyLedgerRequests(state);
  return {
    accepted: requests.filter((request) => request.status === "accepted").length,
    rejected: requests.filter((request) => request.status === "rejected").length,
    unresolved: requests.filter((request) => request.status === "unresolved").length,
  };
};
