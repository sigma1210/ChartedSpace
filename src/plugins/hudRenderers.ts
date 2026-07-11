import { characterHudRenderers } from "./characters/hudRenderer";
import { characterCombatHudRenderer } from "./characterCombat/hudRenderer";
import { demographicsHudRenderer } from "./demographics/hudRenderer";
import { economyLedgerHudRenderer } from "./economy/hudRenderer";
import { expenseScenarioHudRenderer } from "./expenseScenario/hudRenderer";
import { maydayActionsHudRenderer } from "./mayday/hudRenderer";
import { navigationHudRenderer } from "./navigation/hudRenderer";
import { shipHudRenderers } from "./ship/hudRenderer";
import { stayInLocationHudRenderer } from "./stayInLocation/hudRenderer";
import { tradeHudRenderer } from "./trade/hudRenderer";

export const registeredPluginHudRenderers = [
  characterCombatHudRenderer,
  ...characterHudRenderers,
  demographicsHudRenderer,
  economyLedgerHudRenderer,
  expenseScenarioHudRenderer,
  maydayActionsHudRenderer,
  navigationHudRenderer,
  ...shipHudRenderers,
  stayInLocationHudRenderer,
  tradeHudRenderer,
] as const;
