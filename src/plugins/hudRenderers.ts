import { economyLedgerHudRenderer } from "./economy/hudRenderer";
import { expenseScenarioHudRenderer } from "./expenseScenario/hudRenderer";
import { mockShipHudRenderer } from "./mockShip/hudRenderer";
import { navigationHudRenderer } from "./navigation/hudRenderer";
import { stayInLocationHudRenderer } from "./stayInLocation/hudRenderer";

export const registeredPluginHudRenderers = [
  economyLedgerHudRenderer,
  expenseScenarioHudRenderer,
  mockShipHudRenderer,
  navigationHudRenderer,
  stayInLocationHudRenderer,
] as const;
