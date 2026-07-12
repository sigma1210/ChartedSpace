import type { CombatScenario, WallSegment } from "./types";
import { buildTrainingScenario } from "./trainingScenario";
import { assertValidCombatScenario } from "./scenarioValidator";
import { characterCombatArmor as armor, characterCombatWeapons as weapons } from "./equipment";

const wall = (id: string, x1: number, y1: number, x2: number, y2: number): WallSegment => ({ id, from: { x: x1, y: y1 }, to: { x: x2, y: y2 } });
const registered = (build: () => CombatScenario) => () => assertValidCombatScenario(build());

export const buildEngineRoomScenario = (): CombatScenario => ({
  id: "engine-room-sabotage",
  title: "Engine Room Sabotage",
  briefing: "Hostile crew are preparing the drive for escape. Enter through engineering access and disable the drive-control console.",
  objective: "Reach and disable the drive-control console.",
  width: 14,
  height: 9,
  fireCells: [{ x: 5, y: 4 }, { x: 8, y: 6 }, { x: 11, y: 5 }],
  smokeCells: [{ x: 6, y: 4 }, { x: 8, y: 7 }, { x: 11, y: 4 }],
  walls: [
    wall("hull-top", 0, 0, 14, 0), wall("hull-right", 14, 0, 14, 9), wall("hull-bottom", 14, 9, 0, 9), wall("hull-left", 0, 9, 0, 0),
    wall("access-wall-a", 4, 0, 4, 3), wall("access-wall-b", 4, 4, 4, 9),
    wall("drive-wall-a", 10, 0, 10, 4), wall("drive-wall-b", 10, 5, 10, 9),
    wall("service-bay-top", 4, 3, 7, 3), wall("service-bay-side-a", 7, 3, 7, 4), wall("service-bay-side-b", 7, 5, 7, 6), wall("service-bay-bottom", 4, 6, 7, 6),
  ],
  doors: [
    { id: "engineering-access", from: { x: 4, y: 3 }, to: { x: 4, y: 4 }, open: false },
    { id: "drive-control-door", from: { x: 10, y: 4 }, to: { x: 10, y: 5 }, open: false },
  ],
  objects: [
    { id: "drive-console", kind: "console", position: { x: 12, y: 4 }, label: "Drive-Control Console" },
    { id: "machinery-1", kind: "cover", position: { x: 6, y: 2 }, label: "Drive Machinery" },
    { id: "machinery-2", kind: "cover", position: { x: 8, y: 5 }, label: "Drive Machinery" },
    { id: "machinery-3", kind: "cover", position: { x: 11, y: 6 }, label: "Coolant Manifold" },
  ],
  combatants: [
    { id: "player-1", name: "Boarding Lead", side: "player", position: { x: 1, y: 4 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: 2, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "player-2", name: "Boarding Support", side: "player", position: { x: 1, y: 5 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 0, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: 2, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "enemy-1", name: "Chief Engineer", side: "enemy", position: { x: 12, y: 3 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 1, meleeWeapon: { name: "Wrench", penetration: 0 }, meleeRating: 1, armor: 1, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-2", name: "Engineering Guard", side: "enemy", position: { x: 9, y: 4 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 0, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: 2, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-3", name: "Drive Technician", side: "enemy", position: { x: 11, y: 7 }, facing: "north", health: 1, defeated: false, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 0, meleeWeapon: { name: "Knife", penetration: 1 }, meleeRating: 0, armor: 1, grenades: 0, medkits: 0, woundState: "healthy" },
  ],
});

export const buildCargoDeckScenario = (): CombatScenario => ({
  id: "cargo-deck-interdiction",
  title: "Cargo Deck Interdiction",
  briefing: "A hostile freighter is moving restricted cargo. Enter through the port airlock, cross the loading deck, and seize the secured cargo-manifest console.",
  objective: "Reach and secure the cargo-manifest console.",
  width: 20,
  height: 14,
  walls: [
    wall("hull-top", 0, 0, 20, 0), wall("hull-right", 20, 0, 20, 14), wall("hull-bottom", 20, 14, 0, 14), wall("hull-left", 0, 14, 0, 0),
    wall("airlock-wall-a", 4, 0, 4, 3), wall("airlock-wall-b", 4, 4, 4, 10), wall("airlock-wall-c", 4, 11, 4, 14),
    wall("secure-wall-a", 15, 0, 15, 4), wall("secure-wall-b", 15, 5, 15, 9), wall("secure-wall-c", 15, 10, 15, 14),
    wall("customs-left", 8, 0, 8, 4), wall("customs-right", 12, 0, 12, 4), wall("customs-bottom-a", 8, 4, 10, 4), wall("customs-bottom-b", 11, 4, 12, 4),
  ],
  doors: [
    { id: "airlock-upper", from: { x: 4, y: 3 }, to: { x: 4, y: 4 }, open: false },
    { id: "airlock-lower", from: { x: 4, y: 10 }, to: { x: 4, y: 11 }, open: false },
    { id: "data-room-upper", from: { x: 15, y: 4 }, to: { x: 15, y: 5 }, open: false },
    { id: "data-room-lower", from: { x: 15, y: 9 }, to: { x: 15, y: 10 }, open: false },
  ],
  objects: [
    { id: "cargo-manifest-console", kind: "console", position: { x: 18, y: 7 }, label: "Cargo-Manifest Console" },
    { id: "cargo-1", kind: "cover", position: { x: 6, y: 5 }, label: "Cargo Stack" },
    { id: "cargo-2", kind: "cover", position: { x: 7, y: 9 }, label: "Cargo Stack" },
    { id: "cargo-3", kind: "cover", position: { x: 9, y: 6 }, label: "Cargo Stack" },
    { id: "cargo-4", kind: "cover", position: { x: 10, y: 9 }, label: "Cargo Stack" },
    { id: "cargo-5", kind: "cover", position: { x: 12, y: 5 }, label: "Cargo Stack" },
    { id: "cargo-6", kind: "cover", position: { x: 13, y: 9 }, label: "Cargo Stack" },
    { id: "cargo-7", kind: "cover", position: { x: 16, y: 7 }, label: "Sealed Freight" },
    { id: "cargo-8", kind: "cover", position: { x: 18, y: 10 }, label: "Sealed Freight" },
  ],
  combatants: [
    { id: "player-1", name: "Boarding Lead", side: "player", position: { x: 1, y: 6 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: 2, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "player-2", name: "Boarding Support", side: "player", position: { x: 1, y: 7 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 0, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: 2, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "enemy-1", name: "Cargo Guard", side: "enemy", position: { x: 6, y: 3 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: 2, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-2", name: "Loadmaster", side: "enemy", position: { x: 9, y: 7 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 0, meleeWeapon: { name: "Wrench", penetration: 0 }, meleeRating: 1, armor: 1, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-3", name: "Freight Security", side: "enemy", position: { x: 13, y: 10 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: 2, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-4", name: "Customs Officer", side: "enemy", position: { x: 16, y: 4 }, facing: "south", health: 1, defeated: false, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 0, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: 1, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-5", name: "Manifest Clerk", side: "enemy", position: { x: 17, y: 9 }, facing: "north", health: 1, defeated: false, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 0, meleeWeapon: { name: "Knife", penetration: 1 }, meleeRating: 0, armor: 1, grenades: 0, medkits: 0, woundState: "healthy" },
  ],
});

export const buildCarrierDeckScenario = (): CombatScenario => ({
  id: "carrier-deck-assault",
  title: "Carrier Deck Assault",
  briefing: "A hostile escort carrier is preparing to launch. Cross the hangar, operations, and flight-control sections before the launch sequence completes.",
  objective: "Reach and secure the flight-control console.",
  width: 30,
  height: 20,
  walls: [
    wall("hull-top", 0, 0, 30, 0), wall("hull-right", 30, 0, 30, 20), wall("hull-bottom", 30, 20, 0, 20), wall("hull-left", 0, 20, 0, 0),
    wall("entry-bulkhead-a", 5, 0, 5, 4), wall("entry-bulkhead-b", 5, 5, 5, 15), wall("entry-bulkhead-c", 5, 16, 5, 20),
    wall("operations-bulkhead-a", 13, 0, 13, 5), wall("operations-bulkhead-b", 13, 6, 13, 14), wall("operations-bulkhead-c", 13, 15, 13, 20),
    wall("flight-bulkhead-a", 22, 0, 22, 6), wall("flight-bulkhead-b", 22, 7, 22, 15), wall("flight-bulkhead-c", 22, 16, 22, 20),
    wall("upper-ready-left", 7, 0, 7, 4), wall("upper-ready-bottom-a", 7, 4, 9, 4), wall("upper-ready-bottom-b", 10, 4, 13, 4),
    wall("lower-ready-left", 16, 16, 16, 20), wall("lower-ready-top-a", 16, 16, 18, 16), wall("lower-ready-top-b", 19, 16, 22, 16),
  ],
  doors: [
    { id: "entry-upper", from: { x: 5, y: 4 }, to: { x: 5, y: 5 }, open: false },
    { id: "entry-lower", from: { x: 5, y: 15 }, to: { x: 5, y: 16 }, open: false },
    { id: "operations-upper", from: { x: 13, y: 5 }, to: { x: 13, y: 6 }, open: false },
    { id: "operations-lower", from: { x: 13, y: 14 }, to: { x: 13, y: 15 }, open: false },
    { id: "flight-upper", from: { x: 22, y: 6 }, to: { x: 22, y: 7 }, open: false },
    { id: "flight-lower", from: { x: 22, y: 15 }, to: { x: 22, y: 16 }, open: false },
  ],
  objects: [
    { id: "flight-control-console", kind: "console", position: { x: 28, y: 10 }, label: "Flight-Control Console" },
    { id: "fighter-1", kind: "cover", position: { x: 8, y: 8 }, label: "Strike Fighter" },
    { id: "fighter-2", kind: "cover", position: { x: 8, y: 13 }, label: "Strike Fighter" },
    { id: "ordnance-1", kind: "cover", position: { x: 11, y: 10 }, label: "Ordnance Cart" },
    { id: "operations-1", kind: "cover", position: { x: 15, y: 7 }, label: "Operations Station" },
    { id: "operations-2", kind: "cover", position: { x: 17, y: 12 }, label: "Operations Station" },
    { id: "operations-3", kind: "cover", position: { x: 20, y: 9 }, label: "Damage-Control Locker" },
    { id: "flight-1", kind: "cover", position: { x: 24, y: 8 }, label: "Avionics Cabinet" },
    { id: "flight-2", kind: "cover", position: { x: 25, y: 13 }, label: "Avionics Cabinet" },
    { id: "flight-3", kind: "cover", position: { x: 27, y: 6 }, label: "Sensor Console" },
    { id: "flight-4", kind: "cover", position: { x: 27, y: 15 }, label: "Sensor Console" },
  ],
  combatants: [
    { id: "player-1", name: "Boarding Lead", side: "player", position: { x: 2, y: 9 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: 2, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "player-2", name: "Boarding Support", side: "player", position: { x: 2, y: 10 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 0, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: 2, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "enemy-1", name: "Hangar Guard", side: "enemy", position: { x: 7, y: 6 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: 2, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-2", name: "Ordnance Handler", side: "enemy", position: { x: 10, y: 14 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 0, meleeWeapon: { name: "Wrench", penetration: 0 }, meleeRating: 1, armor: 1, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-3", name: "Operations Marine", side: "enemy", position: { x: 15, y: 10 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: 2, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-4", name: "Damage-Control Crew", side: "enemy", position: { x: 19, y: 14 }, facing: "north", health: 1, defeated: false, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 0, meleeWeapon: { name: "Wrench", penetration: 0 }, meleeRating: 1, armor: 1, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-5", name: "Flight Security", side: "enemy", position: { x: 23, y: 10 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: 2, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-6", name: "Sensor Officer", side: "enemy", position: { x: 26, y: 5 }, facing: "south", health: 1, defeated: false, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 0, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: 1, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-7", name: "Flight Commander", side: "enemy", position: { x: 27, y: 11 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 2, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: 2, grenades: 0, medkits: 0, woundState: "healthy" },
  ],
});

export const buildRescueScenario = (): CombatScenario => ({
  id: "detention-deck-rescue",
  title: "Detention Deck Rescue",
  briefing: "A captured scout is held behind the detention block. Release the prisoner and escort them back to the boarding airlock.",
  objective: "Release Scout Vale, then move Vale to the extraction zone.",
  victoryCondition: "rescue-extract",
  captiveId: "captive-1",
  width: 18,
  height: 14,
  walls: [
    wall("hull-top", 0, 0, 18, 0), wall("hull-right", 18, 0, 18, 14), wall("hull-bottom", 18, 14, 0, 14), wall("hull-left", 0, 14, 0, 0),
    wall("security-a", 6, 0, 6, 4), wall("security-b", 6, 5, 6, 10), wall("security-c", 6, 11, 6, 14),
    wall("detention-a", 13, 0, 13, 6), wall("detention-b", 13, 7, 13, 14),
    wall("watch-room-top", 8, 3, 11, 3), wall("watch-room-side", 11, 3, 11, 6), wall("watch-room-bottom-a", 8, 6, 9, 6), wall("watch-room-bottom-b", 10, 6, 11, 6),
  ],
  doors: [
    { id: "security-upper", from: { x: 6, y: 4 }, to: { x: 6, y: 5 }, open: false },
    { id: "security-lower", from: { x: 6, y: 10 }, to: { x: 6, y: 11 }, open: false },
    { id: "detention-door", from: { x: 13, y: 6 }, to: { x: 13, y: 7 }, open: false },
  ],
  objects: [
    { id: "extraction-zone", kind: "extraction", position: { x: 1, y: 7 }, label: "Boarding Airlock" },
    { id: "prisoner-lock", kind: "prisoner", position: { x: 14, y: 6 }, label: "Detention Lock" },
    { id: "locker-1", kind: "cover", position: { x: 4, y: 5 }, label: "Security Locker" },
    { id: "desk-1", kind: "cover", position: { x: 8, y: 8 }, label: "Guard Desk" },
    { id: "desk-2", kind: "cover", position: { x: 10, y: 10 }, label: "Guard Desk" },
    { id: "cell-bank-1", kind: "cover", position: { x: 15, y: 4 }, label: "Cell Bank" },
    { id: "cell-bank-2", kind: "cover", position: { x: 16, y: 10 }, label: "Cell Bank" },
  ],
  combatants: [
    { id: "player-1", name: "Boarding Lead", side: "player", position: { x: 2, y: 6 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: 2, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "player-2", name: "Boarding Support", side: "player", position: { x: 2, y: 8 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 0, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: 2, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "captive-1", name: "Scout Vale", side: "player", position: { x: 15, y: 7 }, facing: "west", health: 0, defeated: true, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 1, meleeWeapon: { name: "Knife", penetration: 1 }, meleeRating: 1, armor: 1, grenades: 0, medkits: 0, woundState: "unconscious" },
    { id: "enemy-1", name: "Security Marine", side: "enemy", position: { x: 7, y: 6 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: 2, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-2", name: "Watch Officer", side: "enemy", position: { x: 9, y: 5 }, facing: "south", health: 1, defeated: false, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: 1, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-3", name: "Detention Guard", side: "enemy", position: { x: 12, y: 8 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: 2, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-4", name: "Cell Warden", side: "enemy", position: { x: 15, y: 9 }, facing: "north", health: 1, defeated: false, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 1, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 2, armor: 2, grenades: 0, medkits: 0, woundState: "healthy" },
  ],
});

export const buildHoldAirlockScenario = (): CombatScenario => ({
  id: "hold-the-airlock",
  title: "Hold the Airlock",
  briefing: "Hostile security teams are converging on the captured boarding airlock. Hold the control zone until relief arrives.",
  objective: "Prevent hostile troops from occupying the airlock control zone through turn 5.",
  victoryCondition: "hold-zone",
  holdUntilTurn: 5,
  width: 16,
  height: 12,
  walls: [
    wall("hull-top", 0, 0, 16, 0), wall("hull-right", 16, 0, 16, 12), wall("hull-bottom", 16, 12, 0, 12), wall("hull-left", 0, 12, 0, 0),
    wall("upper-bay-left", 4, 0, 4, 3), wall("upper-bay-bottom-a", 4, 3, 7, 3), wall("upper-bay-bottom-b", 8, 3, 11, 3), wall("upper-bay-right", 11, 0, 11, 3),
    wall("lower-bay-left", 4, 9, 4, 12), wall("lower-bay-top-a", 4, 9, 7, 9), wall("lower-bay-top-b", 8, 9, 11, 9), wall("lower-bay-right", 11, 9, 11, 12),
  ],
  doors: [
    { id: "upper-bay-security-door", from: { x: 7, y: 3 }, to: { x: 8, y: 3 }, open: false },
  ],
  objects: [
    { id: "airlock-control-zone", kind: "control", position: { x: 8, y: 6 }, label: "Airlock Control Zone" },
    { id: "barricade-1", kind: "cover", position: { x: 6, y: 5 }, label: "Barricade" },
    { id: "barricade-2", kind: "cover", position: { x: 6, y: 7 }, label: "Barricade" },
    { id: "barricade-3", kind: "cover", position: { x: 9, y: 4 }, label: "Barricade" },
    { id: "barricade-4", kind: "cover", position: { x: 9, y: 8 }, label: "Barricade" },
  ],
  combatants: [
    { id: "player-1", name: "Boarding Lead", side: "player", position: { x: 7, y: 6 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: 2, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "player-2", name: "Boarding Support", side: "player", position: { x: 8, y: 7 }, facing: "north", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 0, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: 2, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "enemy-1", name: "Security Vanguard", side: "enemy", position: { x: 1, y: 5 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: 2, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-2", name: "Security Vanguard", side: "enemy", position: { x: 14, y: 7 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: 2, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "wave-2-a", name: "Upper-Deck Marine", side: "enemy", reinforcementTurn: 2, position: { x: 7, y: 1 }, facing: "south", health: 0, defeated: true, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: 2, grenades: 0, medkits: 0, woundState: "unconscious" },
    { id: "wave-2-b", name: "Lower-Deck Marine", side: "enemy", reinforcementTurn: 2, position: { x: 7, y: 10 }, facing: "north", health: 0, defeated: true, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: 2, grenades: 0, medkits: 0, woundState: "unconscious" },
    { id: "wave-3-a", name: "Port Reinforcement", side: "enemy", reinforcementTurn: 3, position: { x: 1, y: 2 }, facing: "east", health: 0, defeated: true, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 0, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: 1, grenades: 0, medkits: 0, woundState: "unconscious" },
    { id: "wave-3-b", name: "Starboard Reinforcement", side: "enemy", reinforcementTurn: 3, position: { x: 14, y: 9 }, facing: "west", health: 0, defeated: true, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 0, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: 1, grenades: 0, medkits: 0, woundState: "unconscious" },
    { id: "wave-4-a", name: "Security Commander", side: "enemy", reinforcementTurn: 4, position: { x: 1, y: 10 }, facing: "east", health: 0, defeated: true, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 2, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: 2, grenades: 0, medkits: 0, woundState: "unconscious" },
  ],
});

export const buildArmorySweepScenario = (): CombatScenario => ({
  id: "armory-sweep",
  title: "Armory Sweep",
  briefing: "A shipboard armory has been seized by troops with mixed weapons and protection. Clear the compartments and secure the inventory console.",
  objective: "Defeat the varied armory defense and secure the inventory console.",
  width: 14,
  height: 10,
  walls: [
    wall("hull-top", 0, 0, 14, 0), wall("hull-right", 14, 0, 14, 10), wall("hull-bottom", 14, 10, 0, 10), wall("hull-left", 0, 10, 0, 0),
    wall("armory-wall-a", 6, 0, 6, 4), wall("armory-wall-b", 6, 5, 6, 10),
    wall("vault-wall-a", 11, 0, 11, 6), wall("vault-wall-b", 11, 7, 11, 10),
  ],
  doors: [
    { id: "armory-door", from: { x: 6, y: 4 }, to: { x: 6, y: 5 }, open: false },
    { id: "vault-door", from: { x: 11, y: 6 }, to: { x: 11, y: 7 }, open: false },
  ],
  objects: [
    { id: "inventory-console", kind: "console", position: { x: 12, y: 7 }, label: "Inventory Console" },
    { id: "rack-1", kind: "cover", position: { x: 4, y: 3 }, label: "Weapon Rack" },
    { id: "rack-2", kind: "cover", position: { x: 7, y: 6 }, label: "Weapon Rack" },
    { id: "rack-3", kind: "cover", position: { x: 9, y: 3 }, label: "Armor Rack" },
    { id: "rack-4", kind: "cover", position: { x: 12, y: 4 }, label: "Armor Rack" },
  ],
  combatants: [
    { id: "player-1", name: "Laser Specialist", side: "player", position: { x: 2, y: 4 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { ...weapons.laserRifle }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: armor.combatArmor.value, armorName: armor.combatArmor.name, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "player-2", name: "Breach Specialist", side: "player", position: { x: 2, y: 5 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { ...weapons.shotgun }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: armor.flakVest.value, armorName: armor.flakVest.name, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "enemy-1", name: "Concealed Sentry", side: "enemy", position: { x: 5, y: 5 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { ...weapons.holdoutPistol }, weaponSkill: 0, meleeWeapon: { name: "Knife", penetration: 1 }, meleeRating: 1, armor: armor.clothing.value, armorName: armor.clothing.name, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-2", name: "Armory Raider", side: "enemy", position: { x: 8, y: 4 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { ...weapons.smg }, weaponSkill: 1, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: armor.flakVest.value, armorName: armor.flakVest.name, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-3", name: "Vault Guard", side: "enemy", position: { x: 10, y: 7 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { ...weapons.autopistol }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: armor.combatArmor.value, armorName: armor.combatArmor.name, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-4", name: "Armory Commander", side: "enemy", position: { x: 12, y: 5 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { ...weapons.gaussRifle }, weaponSkill: 2, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: armor.battleDress.value, armorName: armor.battleDress.name, grenades: 0, medkits: 0, woundState: "healthy" },
  ],
});

export const buildCaptureBridgeScenario = (): CombatScenario => ({
  id: "capture-the-bridge",
  title: "Capture the Bridge",
  briefing: "The bridge is sealed behind an independent security lock. Disable security access, breach the bridge, and seize command control.",
  objective: "Disable the security console, then secure the bridge command console.",
  victoryCondition: "staged-objectives",
  stageObjectiveIds: ["bridge-security-console", "bridge-command-console"],
  stageUnlockDoorId: "locked-bridge-door",
  width: 18,
  height: 12,
  walls: [
    wall("hull-top", 0, 0, 18, 0), wall("hull-right", 18, 0, 18, 12), wall("hull-bottom", 18, 12, 0, 12), wall("hull-left", 0, 12, 0, 0),
    wall("security-a", 5, 0, 5, 5), wall("security-b", 5, 6, 5, 12),
    wall("bridge-a", 13, 0, 13, 5), wall("bridge-b", 13, 6, 13, 12),
    wall("security-room-top", 7, 2, 11, 2), wall("security-room-left", 7, 2, 7, 5), wall("security-room-bottom-a", 7, 5, 8, 5), wall("security-room-bottom-b", 9, 5, 11, 5), wall("security-room-right", 11, 2, 11, 5),
  ],
  doors: [
    { id: "boarding-security-door", from: { x: 5, y: 5 }, to: { x: 5, y: 6 }, open: false },
    { id: "security-console-door", from: { x: 8, y: 5 }, to: { x: 9, y: 5 }, open: false },
    { id: "locked-bridge-door", from: { x: 13, y: 5 }, to: { x: 13, y: 6 }, open: false, locked: true },
  ],
  objects: [
    { id: "bridge-security-console", kind: "console", position: { x: 9, y: 3 }, label: "Bridge Security Console" },
    { id: "bridge-command-console", kind: "console", position: { x: 16, y: 6 }, label: "Bridge Command Console" },
    { id: "cover-1", kind: "cover", position: { x: 6, y: 7 }, label: "Security Station" },
    { id: "cover-2", kind: "cover", position: { x: 10, y: 8 }, label: "Security Station" },
    { id: "cover-3", kind: "cover", position: { x: 14, y: 4 }, label: "Bridge Station" },
    { id: "cover-4", kind: "cover", position: { x: 15, y: 8 }, label: "Bridge Station" },
  ],
  combatants: [
    { id: "player-1", name: "Boarding Lead", side: "player", position: { x: 2, y: 5 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { ...weapons.laserRifle }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: armor.flakVest.value, armorName: armor.flakVest.name, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "player-2", name: "Boarding Support", side: "player", position: { x: 2, y: 6 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { ...weapons.shotgun }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: armor.combatArmor.value, armorName: armor.combatArmor.name, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "enemy-1", name: "Security Trooper", side: "enemy", position: { x: 6, y: 5 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { ...weapons.smg }, weaponSkill: 1, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: armor.flakVest.value, armorName: armor.flakVest.name, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-2", name: "Security Chief", side: "enemy", position: { x: 10, y: 3 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { ...weapons.autopistol }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: armor.combatArmor.value, armorName: armor.combatArmor.name, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-3", name: "Bridge Marine", side: "enemy", position: { x: 14, y: 6 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { ...weapons.gaussRifle }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: armor.battleDress.value, armorName: armor.battleDress.name, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-4", name: "Ship Captain", side: "enemy", position: { x: 16, y: 5 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { ...weapons.laserRifle }, weaponSkill: 2, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: armor.combatArmor.value, armorName: armor.combatArmor.name, grenades: 0, medkits: 0, woundState: "healthy" },
  ],
});

export const buildZeroGravityScenario = (): CombatScenario => {
  const scenario = buildTrainingScenario();
  return {
    ...scenario,
    id: "zero-g-drift",
    title: "Zero-G Drift",
    briefing: "Artificial gravity has failed. Push off in a cardinal direction and drift until stopped by structure, a handhold, or another character.",
    objective: "Cross the zero-G compartment and secure the command console.",
    gravityMode: "zero-g",
    handholds: [
      { x: 3, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 6 },
      { x: 5, y: 5 }, { x: 7, y: 3 }, { x: 7, y: 6 },
      { x: 9, y: 3 }, { x: 9, y: 4 }, { x: 10, y: 5 },
    ],
  };
};

export const buildHullBreachScenario = (): CombatScenario => {
  const scenario = buildZeroGravityScenario();
  return {
    ...scenario,
    id: "hull-breach",
    title: "Hull Breach",
    briefing: "The command compartment is open to vacuum. The security door contains decompression until opened; suited and unprotected crew must secure damage control.",
    objective: "Reach the damage-control console and seal the hull breach.",
    vacuumSources: [{ x: 11, y: 3 }],
    objects: scenario.objects.map((object) => object.id === "command-console" ? { ...object, label: "Damage-Control Console" } : object),
    combatants: scenario.combatants.map((unit) => ({ ...unit, vaccSuit: unit.id === "player-1" || unit.side === "enemy" })),
  };
};

export const buildDamageControlScenario = (): CombatScenario => {
  const scenario = buildCargoDeckScenario();
  const fireCells = [{ x: 5, y: 6 }, { x: 8, y: 7 }, { x: 11, y: 8 }, { x: 14, y: 6 }];
  return {
    ...scenario,
    id: "damage-control",
    title: "Damage Control",
    briefing: "Multiple engineering compartments are burning. Cross the damaged deck, suppress the critical fires, and restore the damage-control console.",
    objective: "Critical fires: 0/3 extinguished. Remaining: 5,6 · 8,7 · 11,8. Extinguish all critical fires, then restore the damage-control console.",
    fireCells,
    criticalFireCells: fireCells.slice(0, 3),
    smokeCells: [{ x: 6, y: 6 }, { x: 9, y: 7 }, { x: 12, y: 8 }, { x: 14, y: 7 }],
    objects: scenario.objects.map((object) => object.id === "cargo-manifest-console"
      ? { ...object, id: "damage-control-console", label: "Damage-Control Console" }
      : { ...object, label: object.label === "Cargo Stack" || object.label === "Sealed Freight" ? "Engineering Machinery" : object.label }),
  };
};

export const characterCombatScenarios = [
  { id: "boarding-action", title: "Boarding Action", summary: "Training encounter: breach the command room and secure its console.", build: registered(buildTrainingScenario) },
  { id: "engine-room-sabotage", title: "Engine Room Sabotage", summary: "Larger engineering deck with two security doors and three defenders.", build: registered(buildEngineRoomScenario) },
  { id: "cargo-deck-interdiction", title: "Cargo Deck Interdiction", summary: "Large cargo deck with alternate routes, four security doors, and five defenders.", build: registered(buildCargoDeckScenario) },
  { id: "carrier-deck-assault", title: "Carrier Deck Assault", summary: "Very large carrier deck with two cross-deck routes, six security doors, and seven defenders.", build: registered(buildCarrierDeckScenario) },
  { id: "detention-deck-rescue", title: "Detention Deck Rescue", summary: "Release a captured scout and escort them back across a guarded detention deck.", build: registered(buildRescueScenario) },
  { id: "hold-the-airlock", title: "Hold the Airlock", summary: "Defend a central control zone against reinforcement waves through turn five.", build: registered(buildHoldAirlockScenario) },
  { id: "armory-sweep", title: "Armory Sweep", summary: "Test short- and long-range weapons against clothing, flak, combat armor, and battle dress.", build: registered(buildArmorySweepScenario) },
  { id: "capture-the-bridge", title: "Capture the Bridge", summary: "Disable bridge security, unlock access, and seize command control in a two-stage assault.", build: registered(buildCaptureBridgeScenario) },
  { id: "zero-g-drift", title: "Zero-G Drift", summary: "Push off and drift through a compartment with handholds, walls, doors, and collision hazards.", build: registered(buildZeroGravityScenario) },
  { id: "hull-breach", title: "Hull Breach", summary: "Contain decompression, cross a zero-G deck, and survive vacuum exposure.", build: registered(buildHullBreachScenario) },
  { id: "damage-control", title: "Damage Control", summary: "Cross a large damaged engineering deck and suppress multiple critical fires.", build: registered(buildDamageControlScenario) },
];
