import type { RootState } from "../index";
import type { CharacterSummary } from "../slices/characterSlice";
import {
  selectEffectiveCharacterProfile,
  selectEffectiveCharacterProfileLocation,
  selectFallbackCharacter,
  selectOwnerOperatorCharacter,
  selectOwnerOperatorCredits,
} from "../selectors/character.selectors";
import { selectOwnerOperatorCharacterId } from "../../plugins/ship";
import { initialHudState } from "../slices/hudSlice";
import { initialEconomyState } from "../../plugins/economy";
import { initialExpenseScenarioState } from "../../plugins/expenseScenario";
import { initialShipPluginState, type ShipSummary } from "../../plugins/ship";
import { initialNavigationState } from "../../plugins/navigation";
import { initialStayInLocationState } from "../../plugins/stayInLocation/stayInLocationSlice";
import { initialTradeState } from "../../plugins/trade/tradeSlice";

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
    activeCharacterId: null,
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
    showCharacterProfileHud: false,
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
  characters: { items: [], status: "idle", error: null },
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
  plugins: { economy: initialEconomyState, expenseScenario: initialExpenseScenarioState, shipPlugin: initialShipPluginState, navigation: initialNavigationState, stayInLocation: initialStayInLocationState, trade: initialTradeState },
  ...overrides,
});

describe("character profile selectors", () => {
  const active = makeCharacter("active");
  const owner = makeCharacter("owner");
  const fallback = makeCharacter("fallback", {
    worldName: "Regina",
    sectorAbbr: "Spin",
    hex: "1910",
  });

  it("selects the explicit active character first", () => {
    const root = makeRoot({
      ui: { ...makeRoot().ui, activeCharacterId: active.id },
      characters: { items: [owner, active, fallback], status: "loaded", error: null },
      plugins: {
        ...makeRoot().plugins,
        shipPlugin: {
          ...initialShipPluginState,
          ship: { crew: [{ characterId: owner.id, isOwnerOperator: true }] } as unknown as ShipSummary,
          status: "loaded",
        },
      },
    });

    expect(selectEffectiveCharacterProfile(root)).toBe(active);
  });

  it("falls back to the owner operator when there is no active character", () => {
    const root = makeRoot({
      characters: { items: [owner, fallback], status: "loaded", error: null },
      plugins: {
        ...makeRoot().plugins,
        shipPlugin: {
          ...initialShipPluginState,
          ship: { crew: [{ characterId: owner.id, isOwnerOperator: true }] } as unknown as ShipSummary,
          status: "loaded",
        },
      },
    });

    expect(selectOwnerOperatorCharacterId(root)).toBe(owner.id);
    expect(selectOwnerOperatorCharacter(root)).toBe(owner);
    expect(selectOwnerOperatorCredits(root)).toBe(owner.credits);
    expect(selectEffectiveCharacterProfile(root)).toBe(owner);
  });

  it("falls back to the first located character, then the first character", () => {
    const unlocated = makeCharacter("unlocated");
    const rootWithLocated = makeRoot({
      characters: { items: [unlocated, fallback], status: "loaded", error: null },
    });
    const rootWithoutLocated = makeRoot({
      characters: { items: [unlocated, owner], status: "loaded", error: null },
    });

    expect(selectFallbackCharacter(rootWithLocated)).toBe(fallback);
    expect(selectEffectiveCharacterProfile(rootWithLocated)).toBe(fallback);
    expect(selectFallbackCharacter(rootWithoutLocated)).toBe(unlocated);
    expect(selectEffectiveCharacterProfile(rootWithoutLocated)).toBe(unlocated);
  });

  it("prefers ship location over character location", () => {
    const root = makeRoot({
      characters: { items: [fallback], status: "loaded", error: null },
      plugins: {
        ...makeRoot().plugins,
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
      characters: { items: [fallback], status: "loaded", error: null },
    });

    expect(selectEffectiveCharacterProfileLocation(root)).toEqual({
      worldName: "Regina",
      sectorAbbr: "Spin",
      hex: "1910",
    });
  });
});
