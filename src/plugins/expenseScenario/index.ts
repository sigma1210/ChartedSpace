import type { PluginManifest } from "@/plugin-api/types";
import {
  expenseScenarioActions,
} from "./actionRegistration";
import { expenseScenarioHudMetadata } from "./hudMetadata";
import { expenseScenarioPluginId } from "./metadata";
import { expenseScenarioStateRegistration } from "./stateRegistration";
import type { ExpenseScenarioState } from "./expenseScenarioSlice";

export const expenseScenarioPlugin = {
  metadata: {
    id: expenseScenarioPluginId,
  },
  state: expenseScenarioStateRegistration,
  huds: [
    expenseScenarioHudMetadata,
  ],
  actions: expenseScenarioActions,
  handlers: [],
  effectResolvers: [],
} satisfies PluginManifest<ExpenseScenarioState>;

export {
  expenseScenarioActions,
  expenseScenarioRunAction,
} from "./actionRegistration";
export {
  expenseScenarioHudId,
  expenseScenarioHudMetadata,
} from "./hudMetadata";
export {
  expenseScenarioPluginId,
  expenseScenarioRunActionId,
  expenseScenarioStateKey,
} from "./metadata";
export {
  initialExpenseScenarioState,
  recordExpenseScenarioRun,
  runExpenseScenario,
  setExpenseScenarioCrewSalaryTotal,
  setExpenseScenarioDebtPolicy,
  setExpenseScenarioExpectedTotal,
  setExpenseScenarioMortgageAmount,
  setExpenseScenarioOwnerCredits,
} from "./expenseScenarioSlice";
