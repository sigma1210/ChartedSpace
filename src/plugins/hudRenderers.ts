import { economyLedgerHudRenderer } from "./economy/hudRenderer";
import { expenseScenarioHudRenderer } from "./expenseScenario/hudRenderer";
import { stayInLocationHudRenderer } from "./stayInLocation/hudRenderer";

export const registeredPluginHudRenderers = [
  economyLedgerHudRenderer,
  expenseScenarioHudRenderer,
  stayInLocationHudRenderer,
] as const;
