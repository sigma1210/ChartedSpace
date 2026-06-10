import type { InternalPluginRegistration } from "@/plugin-api/types";
import {
  expenseScenarioPluginId,
  expenseScenarioStateKey,
} from "./metadata";
import expenseScenarioReducer, {
  type ExpenseScenarioState,
} from "./expenseScenarioSlice";

export const expenseScenarioStateRegistration = {
  id: expenseScenarioPluginId,
  stateKey: expenseScenarioStateKey,
  reducer: expenseScenarioReducer,
} satisfies InternalPluginRegistration<ExpenseScenarioState>;
