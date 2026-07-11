import type { CombatScenario, WallSegment } from "./types";
import { buildTrainingScenario } from "./trainingScenario";

const wall = (id: string, x1: number, y1: number, x2: number, y2: number): WallSegment => ({ id, from: { x: x1, y: y1 }, to: { x: x2, y: y2 } });

export const buildEngineRoomScenario = (): CombatScenario => ({
  id: "engine-room-sabotage",
  title: "Engine Room Sabotage",
  briefing: "Hostile crew are preparing the drive for escape. Enter through engineering access and disable the drive-control console.",
  objective: "Reach and disable the drive-control console.",
  width: 14,
  height: 9,
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

export const characterCombatScenarios = [
  { id: "boarding-action", title: "Boarding Action", summary: "Training encounter: breach the command room and secure its console.", build: buildTrainingScenario },
  { id: "engine-room-sabotage", title: "Engine Room Sabotage", summary: "Larger engineering deck with two security doors and three defenders.", build: buildEngineRoomScenario },
];
