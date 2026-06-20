import { demographicsPlugin } from "./demographics";
import { economyPlugin } from "./economy";
import { expenseScenarioPlugin } from "./expenseScenario";
import { navigationPlugin } from "./navigation";
import { shipPlugin } from "./ship";
import { stayInLocationPlugin } from "./stayInLocation";
import { tradePlugin } from "./trade";

export const registeredPluginManifests = [
  demographicsPlugin,
  economyPlugin,
  expenseScenarioPlugin,
  navigationPlugin,
  shipPlugin,
  stayInLocationPlugin,
  tradePlugin,
] as const;
