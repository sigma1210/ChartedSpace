import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import {
  ExpenseScenarioHudContent,
  ExpenseScenarioHudIcon,
} from "./ExpenseScenarioHud";
import { expenseScenarioHudId } from "./hudMetadata";

export const expenseScenarioHudRenderer = {
  id: expenseScenarioHudId,
  Icon: ExpenseScenarioHudIcon,
  Component: ExpenseScenarioHudContent,
} satisfies PluginHudRendererRegistration;
