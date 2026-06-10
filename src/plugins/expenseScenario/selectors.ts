import type { PluginStateRoot } from "@/plugin-api/types";
import { expenseScenarioStateKey } from "./metadata";
import type { ExpenseScenarioState } from "./expenseScenarioSlice";

export type ExpenseScenarioPluginRoot = PluginStateRoot<
  typeof expenseScenarioStateKey,
  ExpenseScenarioState
>;

export const selectExpenseScenarioState = (state: ExpenseScenarioPluginRoot) =>
  state.plugins[expenseScenarioStateKey];
