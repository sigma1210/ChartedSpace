import { charactersPlugin } from "./characters";
import { demographicsPlugin } from "./demographics";
import { economyPlugin } from "./economy";
import { expenseScenarioPlugin } from "./expenseScenario";
import { maydayPlugin } from "./mayday";
import { navigationPlugin } from "./navigation";
import { shipPlugin } from "./ship";
import { stayInLocationPlugin } from "./stayInLocation";
import { tradePlugin } from "./trade";

export const registeredPluginManifests = [
  charactersPlugin,
  demographicsPlugin,
  economyPlugin,
  expenseScenarioPlugin,
  maydayPlugin,
  navigationPlugin,
  shipPlugin,
  stayInLocationPlugin,
  tradePlugin,
] as const;
