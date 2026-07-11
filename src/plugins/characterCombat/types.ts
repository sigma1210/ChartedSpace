export type CombatSide = "player" | "enemy";
export interface GridPoint { x: number; y: number }
export interface WallSegment { id: string; from: GridPoint; to: GridPoint }
export interface DoorSegment extends WallSegment { open: boolean }
export interface MapObject { id: string; kind: "console" | "cover"; position: GridPoint; label: string }
export type WoundState = "healthy" | "light" | "serious" | "unconscious" | "dead";
export interface WeaponProfile { name: string; effectiveRange: number; longRange: number; extremeRange: number; penetration: number; automatic: boolean }
export interface Combatant { id: string; name: string; side: CombatSide; sourceCrewId?: string; sourceCharacterId?: string | null; position: GridPoint; facing: "north" | "east" | "south" | "west"; health: number; defeated: boolean; surrendered: boolean; weapon: WeaponProfile; weaponSkill: number; meleeWeapon: { name: string; penetration: number }; meleeRating: number; armor: number; grenades: number; medkits: number; woundState: WoundState }
export interface CombatScenario {
  id: string; title: string; briefing: string; objective: string; width: number; height: number;
  walls: WallSegment[]; doors: DoorSegment[]; objects: MapObject[]; combatants: Combatant[];
}
export type CharacterCombatHudId = "action" | "scenario" | "character" | "events" | "legend" | "outcome";
export type CharacterCombatViewMode = "2d" | "3d";
export interface CharacterCombatCamera { quarterTurn: 0 | 1 | 2 | 3; zoom: number; focus: GridPoint | null }
export interface CombatantStart { id: string; name: string; sourceCrewId?: string; sourceCharacterId?: string | null; woundState: WoundState; grenades: number; medkits: number }
export interface CombatOutcomeMember { id: string; name: string; sourceCrewId?: string; sourceCharacterId?: string | null; condition: "survived" | "wounded" | "incapacitated" | "dead"; woundState: WoundState; grenadesUsed: number; medkitsUsed: number }
export interface CombatOutcome { result: "victory" | "defeat"; scenarioTitle: string; turn: number; members: CombatOutcomeMember[]; enemiesNeutralized: number; enemiesSurrendered: number; campaignChangesApplied: false }
export type FireMode = "snap" | "aimed" | "automatic" | "covering" | "melee";
export interface CharacterCombatHudLayout { visible: boolean; pinned: boolean; position: GridPoint }
export interface CharacterCombatState { scenario: CombatScenario | null; selectedBoardingTeamIds: string[]; combatantStarts: Record<string, CombatantStart>; outcome: CombatOutcome | null; viewMode: CharacterCombatViewMode; camera: CharacterCombatCamera; status: "active" | "victory" | "defeat"; turn: number; selectedCombatantId: string | null; plannedMove: PlannedMove | null; plannedAttackTargetId: string | null; plannedAttackMode: FireMode | null; grenadeTargeting: boolean; plannedGrenadeTarget: GridPoint | null; plannedTreatmentTargetId: string | null; recoveringCombatantIds: string[]; maintainedTargetByCombatantId: Record<string, string>; coveringFireByTargetId: Record<string, string>; plannedObjectiveId: string | null; hoveredDestination: GridPoint | null; actionPointsById: Record<string, number>; actedCombatantIds: string[]; events: string[]; hudLayouts: Record<CharacterCombatHudId, CharacterCombatHudLayout> }
export interface PlannedMove { combatantId: string; destination: GridPoint; path: GridPoint[]; cost: number }
