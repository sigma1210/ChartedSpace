import { demographicsHudRenderer } from "./demographics/hudRenderer";
import { economyLedgerHudRenderer } from "./economy/hudRenderer";
import { expenseScenarioHudRenderer } from "./expenseScenario/hudRenderer";
import { navigationHudRenderer } from "./navigation/hudRenderer";
import { shipHudRenderer } from "./ship/hudRenderer";
import { stayInLocationHudRenderer } from "./stayInLocation/hudRenderer";
import { tradeHudRenderer } from "./trade/hudRenderer";

export const registeredPluginHudRenderers = [
  demographicsHudRenderer,
  economyLedgerHudRenderer,
  expenseScenarioHudRenderer,
  navigationHudRenderer,
  shipHudRenderer,
  stayInLocationHudRenderer,
  tradeHudRenderer,
] as const;
