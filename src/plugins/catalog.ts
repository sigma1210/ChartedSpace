import { economyPlugin } from "./economy";
import { expenseScenarioPlugin } from "./expenseScenario";
import { stayInLocationPlugin } from "./stayInLocation";

export const registeredPluginManifests = [
  economyPlugin,
  expenseScenarioPlugin,
  stayInLocationPlugin,
] as const;
