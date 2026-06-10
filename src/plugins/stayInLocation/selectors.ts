import type { PluginStateRoot } from "@/plugin-api/types";
import { stayInLocationStateKey } from "./metadata";
import type { StayInLocationState } from "./stayInLocationSlice";

export type StayInLocationPluginRoot = PluginStateRoot<
  typeof stayInLocationStateKey,
  StayInLocationState
>;

export const selectStayInLocationState = (state: StayInLocationPluginRoot) =>
  state.plugins[stayInLocationStateKey];

export const selectStayInLocationPressedTurnNumbers = (state: StayInLocationPluginRoot) =>
  selectStayInLocationState(state).pressedTurnNumbers;

export const selectStayInLocationLastPressedTurn = (state: StayInLocationPluginRoot) =>
  selectStayInLocationState(state).lastPressedTurn;

export const selectStayInLocationDebugEnabled = (state: StayInLocationPluginRoot) =>
  selectStayInLocationState(state).debugEnabled;

export const selectStayInLocationBlockBeforeTurnAdvance = (state: StayInLocationPluginRoot) =>
  selectStayInLocationState(state).blockBeforeTurnAdvance;

export const selectStayInLocationDebugRuns = (state: StayInLocationPluginRoot) =>
  selectStayInLocationState(state).debugRuns;

export const selectStayInLocationActiveDebugRun = (state: StayInLocationPluginRoot) => {
  const pluginState = selectStayInLocationState(state);
  return pluginState.debugRuns.find((run) => run.id === pluginState.activeDebugRunId) ?? null;
};
