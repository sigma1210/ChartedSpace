import { economyPlugin } from "./economy";
import { expenseScenarioPlugin } from "./expenseScenario";
import { mockShipPlugin } from "./mockShip";
import { navigationPlugin } from "./navigation";
import { stayInLocationPlugin } from "./stayInLocation";

export const registeredPluginManifests = [
  economyPlugin,
  expenseScenarioPlugin,
  mockShipPlugin,
  navigationPlugin,
  stayInLocationPlugin,
] as const;
