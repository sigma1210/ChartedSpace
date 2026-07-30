import type { TacticalTerrainObject } from "./tacticalTerrain";

export type CombatSide = "player" | "enemy";
export interface GridPoint { x: number; y: number }
export interface WallSegment { id: string; from: GridPoint; to: GridPoint }
export interface DoorSegment extends WallSegment { open: boolean; locked?: boolean; portalType?: "sliding-door" | "iris-valve" }
export interface MapObject { id: string; kind: "console" | "cover" | "prisoner" | "extraction" | "control"; position: GridPoint; label: string; completed?: boolean; coverType?: "low-cover" | "console" | "close-machinery" }
export interface FireSpreadEvent { turn: number; source: GridPoint; fire: GridPoint; smoke: GridPoint }
export interface SatchelCharge { id: string; placerId: string; position: GridPoint; placedTurn: number }
export type WoundState = "healthy" | "light" | "serious" | "unconscious" | "dead";
export type LightingLevel = "illuminated" | "emergency" | "dark";
export type TacticalLightingPreset = "exterior-dark" | "exterior-lit";
export interface TacticalLightSource { id: string; position: GridPoint; range: number; on?: boolean }
export interface TacticalBridge { id: string; cells: GridPoint[]; elevationLevel: number }
export interface TacticalLiquidHydrogenArea { id: string; cells: GridPoint[]; filled: boolean; elevationLevel: number }
export type TacticalElevationTransitionKind = "stairs" | "ladder" | "ramp";
export interface TacticalLadderMount {
  position: { x: number; y: number };
  tangent: { x: number; y: number };
  outwardNormal: { x: number; y: number };
}
export interface TacticalElevationTransition {
  id: string;
  kind: TacticalElevationTransitionKind;
  lower: GridPoint;
  upper: GridPoint;
  path: GridPoint[];
  lowerLevel: number;
  upperLevel: number;
  movementCost?: number;
  ladderMount?: TacticalLadderMount;
}
export type TerrainType = "difficult" | "elevated" | "hazardous" | "close-machinery";
export type WeaponRangeBand = "effective" | "long" | "extreme";
export type WeaponVisualCategory = "pistol" | "shotgun" | "smg" | "rifle" | "laser-rifle" | "gauss-rifle";
export type WeaponAmmunitionKind = string;
export interface WeaponAmmunitionProfile { kind: WeaponAmmunitionKind; label: string; effectiveRange: number; longRange: number; extremeRange: number; penetration: number; automatic?: boolean; burstSize?: number; automaticFireBonusByRange?: Partial<Record<WeaponRangeBand, number>>; inherentAutomaticFireBonus?: boolean; attacksEveryoneInSquare?: boolean; accuracy?: number; accuracyByRange?: Partial<Record<WeaponRangeBand, number>>; penetrationByRange?: Partial<Record<WeaponRangeBand, number>>; woundEscalation?: boolean; collateralBlast?: boolean; impactMarker?: boolean; structuralDamage?: number }
export interface WeaponProfile { name: string; effectiveRange: number; longRange: number; extremeRange: number; penetration: number; automatic: boolean; burstSize?: number; automaticFireBonusByRange?: Partial<Record<WeaponRangeBand, number>>; inherentAutomaticFireBonus?: boolean; attacksEveryoneInSquare?: boolean; highEnergy?: boolean; enhancedVision?: boolean; collateralBlast?: boolean; impactMarker?: boolean; woundEscalation?: boolean; structuralDamage?: number; ammunitionKind?: WeaponAmmunitionKind; ammunitionProfiles?: WeaponAmmunitionProfile[]; magazineSize?: number; visualCategory?: WeaponVisualCategory; accuracy?: number; accuracyByRange?: Partial<Record<WeaponRangeBand, number>>; penetrationByRange?: Partial<Record<WeaponRangeBand, number>> }
export interface Combatant { id: string; name: string; side: CombatSide; sourceCrewId?: string; sourceCharacterId?: string | null; avatarPath?: string; modelPath?: string; reinforcementTurn?: number; position: GridPoint; elevationLevel?: number; facing: "north" | "east" | "south" | "west"; posture?: "standing" | "prone"; visionMode?: "normal" | "enhanced"; hasLamp?: boolean; lampOn?: boolean; concealed?: boolean; health: number; defeated: boolean; surrendered: boolean; weapon: WeaponProfile; weaponSkill: number; skills?: { name: string; level: number }[]; meleeWeapon: { name: string; penetration: number }; meleeRating: number; leadershipRating?: number; armor: number; armorName?: string; grenades: number; smokeGrenades?: number; stunGrenades?: number; flareGrenades?: number; stunnedUntilTurn?: number; medkits: number; breachingCharges?: number; vaccSuit?: boolean; woundState: WoundState; seriousWounds?: number }
export interface Combatant { moraleFactor?: number }

export interface CombatScenario {
  id: string; title: string; briefing: string; objective: string; width: number; height: number; backgroundImage?: string;
  walls: WallSegment[]; doors: DoorSegment[]; objects: MapObject[]; combatants: Combatant[]; terrainObjects?: TacticalTerrainObject[]; drawnRaisedAreas?: import("./tacticalScenarioDefinitions").TacticalDrawnRaisedArea[]; drawnRaisedAreaLevels?: Record<string, number>; drawnTerrainRegions?: import("./tacticalScenarioDefinitions").TacticalDrawnTerrainRegion[]; elevationTransitions?: TacticalElevationTransition[]; consoleVictory?: import("./tacticalConsoleVictory").TacticalConsoleVictoryDefinitionFile; bridges?: TacticalBridge[]; liquidHydrogenAreas?: TacticalLiquidHydrogenArea[]; deploymentCells?: GridPoint[]; gravityMode?: "normal" | "zero-g"; defaultLighting?: LightingLevel; lightingByCell?: Record<string, LightingLevel>; exteriorLighting?: LightingLevel; interiorCells?: GridPoint[]; lightSources?: TacticalLightSource[]; terrainByCell?: Record<string, TerrainType>; elevationLevelByCell?: Record<string, number>; closeMachineryCells?: GridPoint[]; elevationAccessCells?: GridPoint[]; flareCells?: GridPoint[]; handholds?: GridPoint[]; vacuumSources?: GridPoint[]; fireCells?: GridPoint[]; smokeCells?: GridPoint[]; criticalFireCells?: GridPoint[]; fireSpreadSchedule?: FireSpreadEvent[]; criticalFireDeadlineTurn?: number; victoryCondition?: "secure-objective" | "rescue-extract" | "hold-zone" | "staged-objectives" | "capture-target"; captiveId?: string; captureTargetId?: string; holdUntilTurn?: number; stageObjectiveIds?: string[]; stageUnlockDoorId?: string; defendedObjectiveByCombatantId?: Record<string, string>; flankBiasByCombatantId?: Record<string, "left" | "right">; contestedObjectiveIds?: string[];
}
export type FireMode = "snap" | "aimed" | "automatic" | "suppressive" | "covering" | "melee";
export interface CharacterCombatHudLayout { visible: boolean; pinned: boolean; position: GridPoint }
export interface CoveringFireLane { attackerId: string; target: GridPoint; cells: GridPoint[] }
export interface GrenadeImpact { kind: "fragmentation" | "smoke" | "stun" | "flare"; intended: GridPoint; landing: GridPoint; scattered: boolean; blastCells: GridPoint[] }
export interface WeaponImpact { weaponName: string; ammunitionKind?: WeaponAmmunitionKind; ammunitionLabel: string; point: GridPoint; blastCells: GridPoint[]; hit: boolean }
export interface CombatantMovementAnimation { sequence: number; path: GridPoint[]; elevationLevels?: number[]; mode: "walk" | "run" }
export interface PlannedMove { combatantId: string; destination: GridPoint; path: GridPoint[]; cost: number; kind?: "move" | "drop" | "climb" | "dive" | "melee-dive" | "enemy-entry" | "crawl"; finalFacing?: Combatant["facing"]; finalElevationLevel?: number; pathElevationLevels?: number[]; costBreakdown?: string[]; meleeTargetId?: string }
export interface TacticalMapState { scenario: CombatScenario; gridSize: number; movementAnimationByCharacterId: Record<string, CombatantMovementAnimation>; characterHudLayout: CharacterCombatHudLayout; actionHudLayout: CharacterCombatHudLayout; characterInformationHudLayout: CharacterCombatHudLayout; eventsHudLayout: CharacterCombatHudLayout; movementMode: "walk" | "trot" | "evade" | "sidestep" | null; plannedDestination: GridPoint | null; plannedEnemyEntryTargetId: string | null; enemySquareEnteredCombatantIds: string[]; plannedAttackTargetId: string | null; plannedAttackMode: "snap" | "aimed" | "automatic" | "suppressive" | null; plannedMeleeTargetId: string | null; aimedTargetId: string | null; grenadeTargeting: boolean; plannedGrenadeTarget: GridPoint | null; lastGrenadeImpact: GrenadeImpact | null; lastWeaponImpact: WeaponImpact | null; coveringFireTargeting: boolean; plannedCoveringFireTarget: GridPoint | null; coveringFireLanes: CoveringFireLane[]; plannedTreatmentTargetId: string | null; draggingCombatantByCarrierId: Record<string, string>; ahlMeleeStunUntilTurnById: Record<string, number>; selectedTerrainObjectId: string | null; doorOpenById: Record<string, boolean>; terminalActiveById: Record<string, boolean>; terrainDamageById: Record<string, number>; destroyedTerrainObjectIds: string[]; ammunitionByCharacterId: Record<string, number>; ammunitionByCombatantAndKind: Record<string, Record<string, number>>; evadingCombatantIds: string[]; bracedCombatantIds: string[]; suppressedCombatantIds: string[]; events: string[]; turn: number; actionPointsByCharacterId: Record<string, number>; actedCharacterIds: string[]; activeCharacterId: string | null }
export interface TacticalMapState { enemyHudLayout: CharacterCombatHudLayout }
export interface TacticalMapState { scenarioStatus?: "setup" | "active" | "victory" | "defeat"; lightingPreset?: TacticalLightingPreset }
export interface TacticalMapState { deploymentCharacterId?: string | null; deployedCharacterIds?: string[] }
export interface TacticalMapState { deploymentHudLayout?: CharacterCombatHudLayout }
export interface TacticalMapState { deploymentLoadoutByCharacterId?: Record<string, { weaponLockerItemId?: string; armorLockerItemId?: string }> }
export interface TacticalMapState { exploredCellKeys?: string[] }
export interface TacticalMapState { lastKnownEnemyPositions?: Record<string, GridPoint> }
export interface TacticalMapState { scenarioHudLayout?: CharacterCombatHudLayout }
export interface TacticalMapState { navigationHudLayout?: CharacterCombatHudLayout }
export interface TacticalMapState { coweringCombatantIds?: string[] }
export interface TacticalMapState { panickedCombatantIds?: string[]; pendingCasualtyMoraleChecks?: { witnessId: string; casualtyId: string; occurrence: number }[]; casualtyMoraleOccurrence?: number }
export interface TacticalMapState { visibleHostileIdsAtPhaseStartByCombatantId?: Record<string, string[]>; pendingUnexpectedFireMoraleChecks?: { combatantId: string; attackerId: string; occurrence: number }[]; unexpectedFireMoraleOccurrence?: number }
export interface TacticalMapState { movedCombatantIds: string[]; processedEnemyPhaseCombatantIds: string[]; pendingAdjacencyReaction: { moverId: string; defenderIds: string[] } | null }
export interface TacticalMapState { movingAdjacentMoraleResultByLeaderId: Record<string, boolean> }
export interface TacticalMapState { actionPhaseStartPositionByCombatantId: Record<string, GridPoint>; pendingDoorCommandsById: Record<string, { open: boolean; resolvesAtTurn: number; characterId: string }> }
export interface TacticalMapState { completedConsoleOperationIds?: string[]; consoleOperationProgressById?: Record<string, { completedCheckIds: string[]; nextCheckModifier: number | null }> }
export interface TacticalMapState { resolvedConsoleOperationIds?: string[] }
export interface TacticalMapState { coveringFireCommittedCombatantIds: string[]; pendingCoveringFireSnapIds: string[] }
export interface TacticalMapState { grenadeKind: "fragmentation" | "smoke" | null; smokeClearsAtTurnByCell: Record<string, number> }
export interface TacticalMapState { plannedExtinguishFire?: GridPoint | null }
export interface TacticalMapState { satchelCharges: SatchelCharge[]; satchelPlacementPending: boolean; lastSatchelImpact: { point: GridPoint; blastCells: GridPoint[] } | null }
export interface CharacterCombatState { tacticalMap?: TacticalMapState }
