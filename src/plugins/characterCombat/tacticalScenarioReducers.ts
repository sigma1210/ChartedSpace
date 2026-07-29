import type { Draft, PayloadAction } from "@reduxjs/toolkit";
import { buildDefaultTacticalScenario, defaultTacticalLighting } from "./defaultTacticalScenario";
import { characterCombatWeapons } from "./equipment";
import { pointKey } from "./geometry";
import { prepareTacticalAmmunition } from "./tacticalAmmunition";
import type { TacticalConsoleVictoryDefinitionFile } from "./tacticalConsoleVictory";
import { tacticalVisibilitySnapshot } from "./tacticalObservation";
import { DEFAULT_TACTICAL_NAVIGATION_HUD_LAYOUT } from "./tacticalHudDefaults";
import type { TacticalScenarioDefinitionFile } from "./tacticalScenarioDefinitions";
import { tacticalCombatant, tacticalPlayerIds } from "./tacticalStateHelpers";
import type {
  CharacterCombatState,
  GridPoint,
  TacticalLightingPreset,
  TacticalMapState,
} from "./types";

export type TacticalCrewInput = string | {
  id: string;
  name?: string;
  weaponSkill: number;
  meleeRating?: number;
  skills?: { name: string; level: number }[];
};

type TacticalHudLayouts = Pick<
  TacticalMapState,
  | "characterHudLayout"
  | "enemyHudLayout"
  | "actionHudLayout"
  | "characterInformationHudLayout"
  | "eventsHudLayout"
  | "scenarioHudLayout"
  | "deploymentHudLayout"
  | "navigationHudLayout"
>;

type FreshTacticalMapOptions = {
  setup?: boolean;
  lightingPreset?: TacticalLightingPreset;
  definition?: TacticalScenarioDefinitionFile;
  consoleVictory?: TacticalConsoleVictoryDefinitionFile;
};

const tacticalCrew = (entries: readonly TacticalCrewInput[]) => entries.slice(0, 2).map((entry) => (
  typeof entry === "string"
    ? { id: entry, name: entry, weaponSkill: 0, meleeRating: 0, skills: [] }
    : {
      ...entry,
      name: entry.name ?? entry.id,
      meleeRating: entry.meleeRating ?? 0,
      skills: entry.skills ?? [],
    }
));

const buildHydratedDefaultTacticalScenario = (
  entries: readonly TacticalCrewInput[],
  lightingPreset?: TacticalLightingPreset,
  definition?: TacticalScenarioDefinitionFile,
  consoleVictory?: TacticalConsoleVictoryDefinitionFile,
) => {
  const scenario = buildDefaultTacticalScenario(lightingPreset, definition, consoleVictory);
  const crew = tacticalCrew(entries);
  const players = scenario.combatants.filter((unit) => unit.side === "player");
  players.slice(0, crew.length).forEach((unit, index) => {
    const member = crew[index];
    unit.id = member.id;
    unit.sourceCharacterId = member.id;
    unit.name = member.name;
    unit.weaponSkill = member.weaponSkill;
    unit.skills = member.skills.map((skill) => ({ ...skill }));
    unit.meleeRating = member.meleeRating;
    unit.weapon = { ...characterCombatWeapons.noRangedWeapon };
    unit.meleeWeapon = { name: "Unarmed", penetration: 0 };
    unit.armor = 0;
    unit.armorName = "No Armor";
  });
  scenario.combatants = [
    ...players.slice(0, crew.length),
    ...scenario.combatants.filter((unit) => unit.side === "enemy"),
  ];
  return scenario;
};

export const freshTacticalMap = (
  entries: readonly TacticalCrewInput[],
  layouts?: TacticalHudLayouts,
  options: FreshTacticalMapOptions = {},
): TacticalMapState => {
  const lightingPreset = options.lightingPreset ?? "exterior-dark";
  const scenario = buildHydratedDefaultTacticalScenario(
    entries,
    lightingPreset,
    options.definition,
    options.consoleVictory,
  );
  const ammunitionByCombatantAndKind = prepareTacticalAmmunition(scenario);
  const playerIds = scenario.combatants.filter((unit) => unit.side === "player").map((unit) => unit.id);
  return {
    scenario,
    scenarioStatus: options.setup ? "setup" : "active",
    deploymentCharacterId: options.setup ? playerIds[0] ?? null : null,
    deployedCharacterIds: options.setup ? [] : [...playerIds],
    deploymentLoadoutByCharacterId: {},
    lightingPreset,
    exploredCellKeys: [],
    lastKnownEnemyPositions: {},
    gridSize: 1,
    movementAnimationByCharacterId: {},
    characterHudLayout: layouts?.characterHudLayout ?? {
      visible: true,
      pinned: false,
      position: { x: 16, y: 86 },
    },
    enemyHudLayout: layouts?.enemyHudLayout ?? {
      visible: true,
      pinned: false,
      position: { x: 840, y: 86 },
    },
    actionHudLayout: layouts?.actionHudLayout ?? {
      visible: true,
      pinned: false,
      position: { x: 16, y: 190 },
    },
    deploymentHudLayout: layouts?.deploymentHudLayout ?? {
      visible: true,
      pinned: false,
      position: { x: 16, y: 190 },
    },
    characterInformationHudLayout: layouts?.characterInformationHudLayout ?? {
      visible: true,
      pinned: false,
      position: { x: 320, y: 86 },
    },
    eventsHudLayout: layouts?.eventsHudLayout ?? {
      visible: true,
      pinned: false,
      position: { x: 580, y: 86 },
    },
    scenarioHudLayout: layouts?.scenarioHudLayout ?? {
      visible: true,
      pinned: false,
      position: { x: 320, y: 190 },
    },
    navigationHudLayout: layouts?.navigationHudLayout ?? DEFAULT_TACTICAL_NAVIGATION_HUD_LAYOUT,
    movementMode: "walk",
    plannedDestination: null,
    plannedEnemyEntryTargetId: null,
    enemySquareEnteredCombatantIds: [],
    plannedAttackTargetId: null,
    plannedAttackMode: null,
    plannedMeleeTargetId: null,
    aimedTargetId: null,
    grenadeTargeting: false,
    grenadeKind: null,
    plannedGrenadeTarget: null,
    smokeClearsAtTurnByCell: {},
    plannedExtinguishFire: null,
    lastGrenadeImpact: null,
    lastWeaponImpact: null,
    satchelCharges: [],
    satchelPlacementPending: false,
    lastSatchelImpact: null,
    coveringFireTargeting: false,
    plannedCoveringFireTarget: null,
    coveringFireLanes: [],
    plannedTreatmentTargetId: null,
    draggingCombatantByCarrierId: {},
    ahlMeleeStunUntilTurnById: {},
    selectedTerrainObjectId: null,
    doorOpenById: {},
    actionPhaseStartPositionByCombatantId: Object.fromEntries(
      scenario.combatants.map((unit) => [unit.id, { ...unit.position }]),
    ),
    pendingDoorCommandsById: {},
    coveringFireCommittedCombatantIds: [],
    pendingCoveringFireSnapIds: [],
    terminalActiveById: {},
    completedConsoleOperationIds: [],
    resolvedConsoleOperationIds: [],
    consoleOperationProgressById: {},
    terrainDamageById: {},
    destroyedTerrainObjectIds: [],
    ammunitionByCharacterId: Object.fromEntries(
      scenario.combatants.map((unit) => [unit.id, unit.weapon.magazineSize ?? 12]),
    ),
    ammunitionByCombatantAndKind,
    evadingCombatantIds: [],
    bracedCombatantIds: [],
    suppressedCombatantIds: [],
    coweringCombatantIds: [],
    panickedCombatantIds: [],
    pendingCasualtyMoraleChecks: [],
    casualtyMoraleOccurrence: 0,
    visibleHostileIdsAtPhaseStartByCombatantId: tacticalVisibilitySnapshot(scenario),
    pendingUnexpectedFireMoraleChecks: [],
    unexpectedFireMoraleOccurrence: 0,
    movedCombatantIds: [],
    processedEnemyPhaseCombatantIds: [],
    movingAdjacentMoraleResultByLeaderId: {},
    pendingAdjacencyReaction: null,
    events: [],
    turn: 1,
    actionPointsByCharacterId: Object.fromEntries(
      scenario.combatants.map((unit) => [unit.id, options.setup || unit.defeated ? 0 : 6]),
    ),
    actedCharacterIds: [],
    activeCharacterId: options.setup ? null : playerIds[0] ?? null,
  };
};

const tacticalHudLayouts = (map: TacticalMapState): TacticalHudLayouts => ({
  characterHudLayout: map.characterHudLayout,
  enemyHudLayout: map.enemyHudLayout,
  actionHudLayout: map.actionHudLayout,
  deploymentHudLayout: map.deploymentHudLayout,
  characterInformationHudLayout: map.characterInformationHudLayout,
  eventsHudLayout: map.eventsHudLayout,
  scenarioHudLayout: map.scenarioHudLayout,
  navigationHudLayout: map.navigationHudLayout ?? DEFAULT_TACTICAL_NAVIGATION_HUD_LAYOUT,
});

const tacticalCrewFromMap = (map: TacticalMapState): TacticalCrewInput[] => (
  map.scenario.combatants.filter((unit) => unit.side === "player").map((unit) => ({
    id: unit.sourceCharacterId ?? unit.id,
    name: unit.name,
    weaponSkill: unit.weaponSkill,
    meleeRating: unit.meleeRating,
    skills: unit.skills,
  }))
);

export const tacticalScenarioReducers = {
  initializeTacticalMapSetup: (
    state: Draft<CharacterCombatState>,
    action: PayloadAction<TacticalCrewInput[]>,
  ) => {
    const layouts = state.tacticalMap ? tacticalHudLayouts(state.tacticalMap) : undefined;
    const lightingPreset = state.tacticalMap?.lightingPreset ?? "exterior-lit";
    state.tacticalMap = freshTacticalMap(action.payload, layouts, {
      setup: true,
      lightingPreset,
    });
  },
  initializeTacticalDraftPlaytest: (
    state: Draft<CharacterCombatState>,
    action: PayloadAction<{
      crew: TacticalCrewInput[];
      definition: TacticalScenarioDefinitionFile;
      consoleVictory?: TacticalConsoleVictoryDefinitionFile;
    }>,
  ) => {
    const lightingPreset: TacticalLightingPreset = "exterior-lit";
    state.tacticalMap = freshTacticalMap(action.payload.crew, undefined, {
      setup: true,
      lightingPreset,
      definition: action.payload.definition,
      consoleVictory: action.payload.consoleVictory,
    });
  },
  selectTacticalLightingPreset: (
    state: Draft<CharacterCombatState>,
    action: PayloadAction<TacticalLightingPreset>,
  ) => {
    const map = state.tacticalMap;
    if (!map || map.scenarioStatus !== "setup") return;
    map.lightingPreset = action.payload;
    Object.assign(map.scenario, defaultTacticalLighting(action.payload));
    map.visibleHostileIdsAtPhaseStartByCombatantId = tacticalVisibilitySnapshot(map.scenario);
  },
  setTacticalTerrainLights: (
    state: Draft<CharacterCombatState>,
    action: PayloadAction<boolean>,
  ) => {
    const map = state.tacticalMap;
    if (!map || map.scenarioStatus !== "setup") return;
    (map.scenario.lightSources ?? []).forEach((source) => {
      source.on = action.payload;
    });
    map.visibleHostileIdsAtPhaseStartByCombatantId = tacticalVisibilitySnapshot(map.scenario);
  },
  recordTacticalExploration: (
    state: Draft<CharacterCombatState>,
    action: PayloadAction<string[]>,
  ) => {
    const map = state.tacticalMap;
    if (!map) return;
    map.exploredCellKeys = [...new Set([...(map.exploredCellKeys ?? []), ...action.payload])];
  },
  recordTacticalEnemySightings: (
    state: Draft<CharacterCombatState>,
    action: PayloadAction<{
      visibleCellKeys: string[];
      enemies: { id: string; position: GridPoint }[];
    }>,
  ) => {
    const map = state.tacticalMap;
    if (!map) return;
    const visibleCells = new Set(action.payload.visibleCellKeys);
    const sightings = new Map(action.payload.enemies.map((enemy) => [enemy.id, enemy.position]));
    const lastKnown = { ...(map.lastKnownEnemyPositions ?? {}) };
    Object.entries(lastKnown).forEach(([id, position]) => {
      const sighting = sightings.get(id);
      if (sighting) lastKnown[id] = { ...sighting };
      else if (visibleCells.has(pointKey(position))) delete lastKnown[id];
    });
    sightings.forEach((position, id) => {
      lastKnown[id] = { ...position };
    });
    const previousEntries = Object.entries(map.lastKnownEnemyPositions ?? {});
    const nextEntries = Object.entries(lastKnown);
    const unchanged = previousEntries.length === nextEntries.length
      && nextEntries.every(([id, position]) => {
        const previous = map.lastKnownEnemyPositions?.[id];
        return previous?.x === position.x && previous.y === position.y;
      });
    if (unchanged) return;
    map.lastKnownEnemyPositions = lastKnown;
  },
  startTacticalScenario: (state: Draft<CharacterCombatState>) => {
    const map = state.tacticalMap;
    if (!map || map.scenarioStatus !== "setup") return;
    const livingPlayerIds = tacticalPlayerIds(map).filter((id) => !tacticalCombatant(map, id)?.defeated);
    if (livingPlayerIds.length === 0
      || livingPlayerIds.some((id) => !(map.deployedCharacterIds ?? []).includes(id))) return;
    map.scenarioStatus = "active";
    map.actionPointsByCharacterId = Object.fromEntries(
      map.scenario.combatants.map((unit) => [unit.id, unit.defeated ? 0 : 6]),
    );
    map.actionPhaseStartPositionByCombatantId = Object.fromEntries(
      map.scenario.combatants.map((unit) => [unit.id, { ...unit.position }]),
    );
    map.visibleHostileIdsAtPhaseStartByCombatantId = tacticalVisibilitySnapshot(map.scenario);
    map.activeCharacterId = livingPlayerIds[0];
    map.deploymentCharacterId = null;
    map.events.unshift(
      `Scenario started · exterior ${map.lightingPreset === "exterior-lit" ? "illuminated" : "dark"}`,
    );
  },
  resetTacticalScenario: (state: Draft<CharacterCombatState>) => {
    const map = state.tacticalMap;
    if (!map) return;
    state.tacticalMap = freshTacticalMap(tacticalCrewFromMap(map), tacticalHudLayouts(map), {
      setup: true,
      lightingPreset: map.lightingPreset ?? "exterior-dark",
    });
  },
  resetTacticalDraftPlaytest: (
    state: Draft<CharacterCombatState>,
    action: PayloadAction<
      TacticalScenarioDefinitionFile
      | {
        definition: TacticalScenarioDefinitionFile;
        consoleVictory: TacticalConsoleVictoryDefinitionFile;
      }
    >,
  ) => {
    const map = state.tacticalMap;
    if (!map) return;
    const definition = "definition" in action.payload ? action.payload.definition : action.payload;
    const consoleVictory = "definition" in action.payload ? action.payload.consoleVictory : undefined;
    state.tacticalMap = freshTacticalMap(tacticalCrewFromMap(map), tacticalHudLayouts(map), {
      setup: true,
      lightingPreset: map.lightingPreset ?? "exterior-dark",
      definition,
      consoleVictory,
    });
  },
};
