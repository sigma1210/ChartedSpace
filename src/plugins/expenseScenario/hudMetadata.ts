import { expenseScenarioPluginId } from "./metadata";

export const expenseScenarioHudId = "plugin.core.expenseScenario.harness" as const;

export const expenseScenarioHudMetadata = {
  id: expenseScenarioHudId,
  pluginId: expenseScenarioPluginId,
  title: "Expense Scenario",
  openTitle: "Open expense scenario",
  visibleTitle: "Expense scenario visible",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.5, y: 0.08 },
  },
} as const;
