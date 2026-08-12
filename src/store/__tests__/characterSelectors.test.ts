import type { RootState } from "../index";
import type { CharacterSummary } from "../../plugins/characters";
import {
  selectCurrentCharacter,
  selectEffectiveCharacterProfile,
  selectEffectiveCharacterProfileLocation,
  selectFallbackCharacter,
  selectOwnerOperatorCharacter,
  selectOwnerOperatorCredits,
  selectSelectedProfileCharacter,
} from "../../plugins/characters";
import { selectOwnerOperatorCharacterId } from "../../plugins/ship";
import { initialHudState } from "../slices/hudSlice";
import { initialCharactersState } from "../../plugins/characters";
import { initialDemographicsState } from "../../plugins/demographics";
import { initialEconomyState } from "../../plugins/economy";
import { initialEquipmentCatalogState } from "../../plugins/equipmentCatalog";
import { initialExpenseScenarioState } from "../../plugins/expenseScenario";
import { initialMaydayState } from "../../plugins/mayday";
import { initialCharacterCombatState } from "../../plugins/characterCombat";
import { initialShipPluginState, type ShipSummary } from "../../plugins/ship";
import { initialNavigationState } from "../../plugins/navigation";
import { initialStayInLocationState } from "../../plugins/stayInLocation/stayInLocationSlice";
import { initialTradeState } from "../../plugins/trade/tradeSlice";
import { initialQuestState } from "../../plugins/quest";

const makeCharacter = (
  id: string,
  overrides: Partial<CharacterSummary> = {},
): CharacterSummary => ({
  id,
  name: id,
  upp: "777777",
  strength: 7,
  dexterity: 7,
  endurance: 7,
  intelligence: 7,
  education: 7,
  socialStanding: 7,
  credits: 0,
  skills: [],
  worldName: null,
  sectorAbbr: null,
  hex: null,
  ...overrides,
});

const makeRoot = (overrides: Partial<RootState> = {}): RootState => ({
  ui: {
    activeModal: null,
    mapView: "galaxy",
    activeWorldId: null,
    activeSectorAbbr: null,
    activeSubsector: null,
    activeUserId: null,
    isOwnProfile: false,
    searchFilter: "all",
    searchQuery: "",
    previousModal: null,
    showGalaxyMiniMap: true,
    showSectorMiniMap: true,
    showSubsectorMiniMap: true,
    showMainWorldHud: false,
  },
  notifications: { items: [] },
  galaxy: {
    sectors: [],
    sectorData: {},
    loadingStatus: {},
    activeSectorAbbr: "Spin",
    activeSubsectorKey: "A",
    activeWorldHex: null,
    activeWorldSectorAbbr: null,
    targetWorldHex: null,
    targetWorldSectorAbbr: null,
  },
  turn: { currentTurn: 1, status: "idle", error: null },
  availableCrew: { poolSize: 20, crew: [] },
  system: { records: {}, statusByKey: {}, errorByKey: {}, generatedTurnByKey: {} },
  systemScene: {
    sceneMode: "system",
    showWarpLayer: false,
    warpLayerOpacity: 0,
    warpLayerActive: false,
    warpExitBlankActive: false,
    renderableLocation: null,
    transitionPhase: "idle",
    transitionReason: null,
    transitionSceneKey: null,
    sceneReady: true,
  },
  hud: initialHudState,
  plugins: { quest: initialQuestState, characterCombat: initialCharacterCombatState, characters: initialCharactersState, demographics: initialDemographicsState, economy: initialEconomyState, equipmentCatalog: initialEquipmentCatalogState, expenseScenario: initialExpenseScenarioState, mayday: initialMaydayState, shipPlugin: initialShipPluginState, navigation: initialNavigationState, stayInLocation: initialStayInLocationState, trade: initialTradeState },
  ...overrides,
});

describe("character profile selectors", () => {
  const owner = makeCharacter("owner");
  const fallback = makeCharacter("fallback", {
    worldName: "Regina",
    sectorAbbr: "Spin",
    hex: "1910",
  });

  it("selects the owner operator as the current character", () => {
    const root = makeRoot({
      plugins: {
        ...makeRoot().plugins,
        characters: { ...initialCharactersState, items: [owner, fallback], status: "loaded", error: null },
        shipPlugin: {
          ...initialShipPluginState,
          ship: { crew: [{ characterId: owner.id, isOwnerOperator: true }] } as unknown as ShipSummary,
          status: "loaded",
        },
      },
    });

    expect(selectCurrentCharacter(root)).toBe(owner);
    expect(selectEffectiveCharacterProfile(root)).toBe(owner);
  });

  it("selects the inspected profile character before the current character", () => {
    const inspected = makeCharacter("inspected");
    const root = makeRoot({
      plugins: {
        ...makeRoot().plugins,
        characters: {
          ...initialCharactersState,
          items: [owner, inspected],
          status: "loaded",
          selectedProfileCharacterId: inspected.id,
        },
        shipPlugin: {
          ...initialShipPluginState,
          ship: { crew: [{ characterId: owner.id, isOwnerOperator: true }] } as unknown as ShipSummary,
          status: "loaded",
        },
      },
    });

    expect(selectSelectedProfileCharacter(root)).toBe(inspected);
    expect(selectCurrentCharacter(root)).toBe(owner);
    expect(selectEffectiveCharacterProfile(root)).toBe(inspected);
  });

  it("uses owner operator credits from the current character source", () => {
    const root = makeRoot({
      plugins: {
        ...makeRoot().plugins,
        characters: { ...initialCharactersState, items: [owner, fallback], status: "loaded", error: null },
        shipPlugin: {
          ...initialShipPluginState,
          ship: { crew: [{ characterId: owner.id, isOwnerOperator: true }] } as unknown as ShipSummary,
          status: "loaded",
        },
      },
    });

    expect(selectOwnerOperatorCharacterId(root)).toBe(owner.id);
    expect(selectOwnerOperatorCharacter(root)).toBe(owner);
    expect(selectCurrentCharacter(root)).toBe(owner);
    expect(selectOwnerOperatorCredits(root)).toBe(owner.credits);
    expect(selectEffectiveCharacterProfile(root)).toBe(owner);
  });

  it("falls back to the first located character, then the first character", () => {
    const unlocated = makeCharacter("unlocated");
    const rootWithLocated = makeRoot({
      plugins: { ...makeRoot().plugins, characters: { ...initialCharactersState, items: [unlocated, fallback], status: "loaded", error: null } },
    });
    const rootWithoutLocated = makeRoot({
      plugins: { ...makeRoot().plugins, characters: { ...initialCharactersState, items: [unlocated, owner], status: "loaded", error: null } },
    });

    expect(selectFallbackCharacter(rootWithLocated)).toBe(fallback);
    expect(selectEffectiveCharacterProfile(rootWithLocated)).toBe(fallback);
    expect(selectFallbackCharacter(rootWithoutLocated)).toBe(unlocated);
    expect(selectEffectiveCharacterProfile(rootWithoutLocated)).toBe(unlocated);
  });

  it("prefers ship location over character location", () => {
    const root = makeRoot({
      plugins: {
        ...makeRoot().plugins,
        characters: { ...initialCharactersState, items: [fallback], status: "loaded", error: null },
        shipPlugin: {
          ...initialShipPluginState,
          ship: {
            worldName: "Ruie",
            sectorAbbr: "Spin",
            hex: "1809",
            crew: [],
          } as unknown as ShipSummary,
          status: "loaded",
        },
      },
    });

    expect(selectEffectiveCharacterProfileLocation(root)).toEqual({
      worldName: "Ruie",
      sectorAbbr: "Spin",
      hex: "1809",
    });
  });

  it("uses character location when ship location is unavailable", () => {
    const root = makeRoot({
      plugins: { ...makeRoot().plugins, characters: { ...initialCharactersState, items: [fallback], status: "loaded", error: null } },
    });

    expect(selectEffectiveCharacterProfileLocation(root)).toEqual({
      worldName: "Regina",
      sectorAbbr: "Spin",
      hex: "1910",
    });
  });
});
