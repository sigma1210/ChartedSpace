import { charactersPlugin } from "./characters";
import { characterCombatPlugin } from "./characterCombat";
import { demographicsPlugin } from "./demographics";
import { economyPlugin } from "./economy";
import { equipmentCatalogPlugin } from "./equipmentCatalog";
import { expenseScenarioPlugin } from "./expenseScenario";
import { maydayPlugin } from "./mayday";
import { navigationPlugin } from "./navigation";
import { questPlugin } from "./quest";
import { shipPlugin } from "./ship";
import { stayInLocationPlugin } from "./stayInLocation";
import { tradePlugin } from "./trade";

export const registeredPluginManifests = [
  characterCombatPlugin,
  charactersPlugin,
  demographicsPlugin,
  economyPlugin,
  equipmentCatalogPlugin,
  expenseScenarioPlugin,
  maydayPlugin,
  navigationPlugin,
  questPlugin,
  shipPlugin,
  stayInLocationPlugin,
  tradePlugin,
] as const;
