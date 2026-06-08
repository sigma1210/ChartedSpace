import type { RootState } from "../index";
import type { CharacterSummary } from "../slices/characterSlice";
import {
  selectEffectiveCharacterProfile,
  selectEffectiveCharacterProfileLocation,
  selectFallbackCharacter,
  selectOwnerOperatorCharacter,
  selectOwnerOperatorCredits,
} from "../selectors/character.selectors";
import { selectOwnerOperatorCharacterId } from "../selectors/ship.selectors";
import { initialHudState } from "../slices/hudSlice";

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
    pendingJumpDestination: null,
    showGalaxyMiniMap: true,
    showSectorMiniMap: true,
    showSubsectorMiniMap: true,
    showNavigationHud: false,
    showMainWorldHud: false,
    showCharacterProfileHud: false,
    showTradeHud: false,
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
  ship: { ship: null, status: "idle", error: null, shipColor: "#9ca3af" },
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
  },
  jumpNavigation: {
    selectedDestinationKey: null,
    plotStatus: "idle",
    actionBusy: false,
    hasStoredJumpDestination: false,
    warpExitInProgress: false,
    jumpResolveInProgress: false,
  },
  hud: initialHudState,
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
      ship: {
        ship: {
          crew: [{ characterId: owner.id, isOwnerOperator: true }],
        },
        status: "loaded",
        error: null,
        shipColor: "#9ca3af",
      } as unknown as RootState["ship"],
    });

    expect(selectEffectiveCharacterProfile(root)).toBe(active);
  });

  it("falls back to the owner operator when there is no active character", () => {
    const root = makeRoot({
      characters: { items: [owner, fallback], status: "loaded", error: null },
      ship: {
        ship: {
          crew: [{ characterId: owner.id, isOwnerOperator: true }],
        },
        status: "loaded",
        error: null,
        shipColor: "#9ca3af",
      } as unknown as RootState["ship"],
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
      ship: {
        ship: {
          worldName: "Ruie",
          sectorAbbr: "Spin",
          hex: "1809",
          crew: [],
        },
        status: "loaded",
        error: null,
        shipColor: "#9ca3af",
      } as unknown as RootState["ship"],
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
