import type { RootState } from "../store";
import { initialEconomyState } from "../plugins/economy";
import { initialExpenseScenarioState } from "../plugins/expenseScenario";
import { initialMockShipState } from "../plugins/mockShip";
import { initialNavigationState } from "../plugins/navigation";
import { initialStayInLocationState } from "../plugins/stayInLocation/stayInLocationSlice";

export interface PluginTestRootStateOptions {
  currentTurn?: number;
  pluginState?: Partial<RootState["plugins"]>;
}

export const createPluginTestRootState = ({
  currentTurn = 3,
  pluginState = {},
}: PluginTestRootStateOptions = {}): RootState => ({
  ui: {} as RootState["ui"],
  notifications: { items: [] },
  galaxy: {} as RootState["galaxy"],
  characters: {
    items: [{
      id: "owner-1",
      name: "Owner",
      upp: "777777",
      strength: 7,
      dexterity: 7,
      endurance: 7,
      intelligence: 7,
      education: 7,
      socialStanding: 7,
      credits: 100000,
      skills: [],
      worldName: null,
      sectorAbbr: null,
      hex: null,
    }],
    status: "loaded",
    error: null,
  },
  ship: {
    ship: {
      id: "ship-1",
      name: "Test Ship",
      type: "Free Trader",
      jumpRating: 1,
      status: "docked",
      isMortgaged: false,
      mortgagePaid: 0,
      currentWorldId: "world-1",
      worldName: "Regina",
      sectorAbbr: "Spin",
      hex: "1910",
      cargoCapacity: 82,
      destinationWorldId: null,
      jumpArrivesTurn: null,
      cargo: [],
      crew: [{
        id: "crew-1",
        characterId: "owner-1",
        characterName: "Owner",
        npcName: null,
        role: "owner",
        isOwnerOperator: true,
        monthlySalary: 0,
        keySkillName: null,
        keySkillLevel: 0,
      }],
    },
    status: "loaded",
    error: null,
    shipColor: "#9ca3af",
  },
  turn: { currentTurn, status: "loaded", error: null },
  availableCrew: {} as RootState["availableCrew"],
  system: {} as RootState["system"],
  systemScene: {} as RootState["systemScene"],
  hud: {} as RootState["hud"],
  plugins: {
    economy: initialEconomyState,
    expenseScenario: initialExpenseScenarioState,
    mockShip: initialMockShipState,
    navigation: initialNavigationState,
    stayInLocation: initialStayInLocationState,
    ...pluginState,
  },
});
