import { economyPlugin } from "./economy";
import { expenseScenarioPlugin } from "./expenseScenario";
import { navigationPlugin } from "./navigation";
import { shipPlugin } from "./ship";
import { stayInLocationPlugin } from "./stayInLocation";

export const registeredPluginManifests = [
  economyPlugin,
  expenseScenarioPlugin,
  navigationPlugin,
  shipPlugin,
  stayInLocationPlugin,
] as const;
