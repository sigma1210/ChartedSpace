import type { PluginActionRegistration } from "@/plugin-api/types";
import {
  expenseScenarioPluginId,
  expenseScenarioRunActionId,
} from "./metadata";
import { runExpenseScenario } from "./expenseScenarioSlice";

export const expenseScenarioRunAction = {
  id: expenseScenarioRunActionId,
  pluginId: expenseScenarioPluginId,
  label: "Run expense scenario",
  createAction: () => runExpenseScenario(),
} satisfies PluginActionRegistration;

export const expenseScenarioActions = [
  expenseScenarioRunAction,
] as const;
