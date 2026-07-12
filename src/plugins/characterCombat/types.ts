export type CombatSide = "player" | "enemy";
export interface GridPoint { x: number; y: number }
export interface WallSegment { id: string; from: GridPoint; to: GridPoint }
export interface DoorSegment extends WallSegment { open: boolean; locked?: boolean }
export interface MapObject { id: string; kind: "console" | "cover" | "prisoner" | "extraction" | "control"; position: GridPoint; label: string; completed?: boolean }
export interface FireSpreadEvent { turn: number; source: GridPoint; fire: GridPoint; smoke: GridPoint }
export type WoundState = "healthy" | "light" | "serious" | "unconscious" | "dead";
export type WeaponRangeBand = "effective" | "long" | "extreme";
export type WeaponVisualCategory = "pistol" | "shotgun" | "smg" | "rifle" | "laser-rifle" | "gauss-rifle";
export interface WeaponProfile { name: string; effectiveRange: number; longRange: number; extremeRange: number; penetration: number; automatic: boolean; magazineSize?: number; visualCategory?: WeaponVisualCategory; accuracy?: number; accuracyByRange?: Partial<Record<WeaponRangeBand, number>>; penetrationByRange?: Partial<Record<WeaponRangeBand, number>> }
export interface Combatant { id: string; name: string; side: CombatSide; sourceCrewId?: string; sourceCharacterId?: string | null; reinforcementTurn?: number; position: GridPoint; facing: "north" | "east" | "south" | "west"; posture?: "standing" | "prone"; health: number; defeated: boolean; surrendered: boolean; weapon: WeaponProfile; weaponSkill: number; meleeWeapon: { name: string; penetration: number }; meleeRating: number; armor: number; armorName?: string; grenades: number; medkits: number; breachingCharges?: number; vaccSuit?: boolean; woundState: WoundState }
export interface CombatScenario {
  id: string; title: string; briefing: string; objective: string; width: number; height: number;
  walls: WallSegment[]; doors: DoorSegment[]; objects: MapObject[]; combatants: Combatant[]; gravityMode?: "normal" | "zero-g"; handholds?: GridPoint[]; vacuumSources?: GridPoint[]; fireCells?: GridPoint[]; smokeCells?: GridPoint[]; criticalFireCells?: GridPoint[]; fireSpreadSchedule?: FireSpreadEvent[]; criticalFireDeadlineTurn?: number; victoryCondition?: "secure-objective" | "rescue-extract" | "hold-zone" | "staged-objectives"; captiveId?: string; holdUntilTurn?: number; stageObjectiveIds?: string[]; stageUnlockDoorId?: string;
}
export type CharacterCombatHudId = "action" | "scenario" | "character" | "events" | "legend" | "outcome";
export type CharacterCombatViewMode = "2d" | "3d";
export type ArmoryLoadoutId = "scout" | "breacher" | "assault" | "heavy";
export interface CharacterCombatCamera { quarterTurn: 0 | 1 | 2 | 3; azimuth: number; elevation: number; zoom: number; focus: GridPoint | null; pan: GridPoint }
export interface CombatantStart { id: string; name: string; sourceCrewId?: string; sourceCharacterId?: string | null; woundState: WoundState; grenades: number; medkits: number }
export interface CombatOutcomeMember { id: string; name: string; sourceCrewId?: string; sourceCharacterId?: string | null; condition: "survived" | "wounded" | "incapacitated" | "dead"; woundState: WoundState; grenadesUsed: number; medkitsUsed: number }
export interface CombatOutcome { result: "victory" | "defeat"; scenarioTitle: string; turn: number; members: CombatOutcomeMember[]; enemiesNeutralized: number; enemiesSurrendered: number; campaignChangesApplied: false }
export type FireMode = "snap" | "aimed" | "automatic" | "covering" | "melee";
export interface CharacterCombatHudLayout { visible: boolean; pinned: boolean; position: GridPoint }
export interface CoveringFireLane { attackerId: string; target: GridPoint; cells: GridPoint[] }
export interface CharacterCombatState { scenario: CombatScenario | null; selectedBoardingTeamIds: string[]; armoryLoadoutIds: [ArmoryLoadoutId, ArmoryLoadoutId]; combatantStarts: Record<string, CombatantStart>; outcome: CombatOutcome | null; viewMode: CharacterCombatViewMode; camera: CharacterCombatCamera; status: "active" | "victory" | "defeat"; turn: number; selectedCombatantId: string | null; plannedMove: PlannedMove | null; plannedAttackTargetId: string | null; plannedAttackMode: FireMode | null; grenadeTargeting: boolean; plannedGrenadeTarget: GridPoint | null; plannedOpenDoorId: string | null; plannedBreachDoorId: string | null; plannedExtinguishFire: GridPoint | null; smokeClearsAtTurnByCell: Record<string, number>; placedBreachingChargeByDoorId: Record<string, string>; vacuumExposureByCombatantId: Record<string, number>; coveringFireTargeting: boolean; plannedCoveringFireTarget: GridPoint | null; coveringFireLanes: CoveringFireLane[]; plannedTreatmentTargetId: string | null; recoveringCombatantIds: string[]; evadingCombatantIds: string[]; trottingCombatantIds: string[]; bracedCombatantIds: string[]; suppressedCombatantIds: string[]; draggingCombatantByCarrierId: Record<string, string>; maintainedTargetByCombatantId: Record<string, string>; plannedObjectiveId: string | null; hoveredDestination: GridPoint | null; actionPointsById: Record<string, number>; ammunitionById: Record<string, number>; actedCombatantIds: string[]; events: string[]; hudLayouts: Record<CharacterCombatHudId, CharacterCombatHudLayout> }
export interface PlannedMove { combatantId: string; destination: GridPoint; path: GridPoint[]; cost: number }
