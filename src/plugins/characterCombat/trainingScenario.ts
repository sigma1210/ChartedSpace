import type { CombatScenario, WallSegment } from "./types";

const wall = (id: string, x1: number, y1: number, x2: number, y2: number): WallSegment => ({ id, from: { x: x1, y: y1 }, to: { x: x2, y: y2 } });

export const buildTrainingScenario = (): CombatScenario => ({
  id: "boarding-action",
  title: "Boarding Action",
  briefing: "Your boarding team has entered a hostile vessel through the port airlock. Secure the command console beyond the central corridor.",
  objective: "Reach and secure the command console.",
  width: 12,
  height: 8,
  walls: [
    wall("hull-top", 0, 0, 12, 0), wall("hull-right", 12, 0, 12, 8), wall("hull-bottom", 12, 8, 0, 8), wall("hull-left", 0, 8, 0, 0),
    wall("left-room-top", 0, 3, 4, 3), wall("left-room-bottom", 0, 6, 4, 6), wall("left-room-side-a", 4, 3, 4, 4), wall("left-room-side-b", 4, 5, 4, 6),
    wall("right-room-top", 8, 2, 12, 2), wall("right-room-bottom", 8, 6, 12, 6), wall("right-room-side-a", 8, 2, 8, 3), wall("right-room-side-b", 8, 4, 8, 6),
  ],
  doors: [{ id: "security-door", from: { x: 8, y: 3 }, to: { x: 8, y: 4 }, open: false }],
  objects: [
    { id: "command-console", kind: "console", position: { x: 10, y: 4 }, label: "Command Console" },
    { id: "cargo-1", kind: "cover", position: { x: 5, y: 4 }, label: "Cargo Crates" },
    { id: "cargo-2", kind: "cover", position: { x: 6, y: 5 }, label: "Cargo Crates" },
  ],
  combatants: [
    { id: "player-1", name: "Boarding Lead", side: "player", position: { x: 2, y: 4 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 1, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, armor: 2, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "player-2", name: "Boarding Support", side: "player", position: { x: 2, y: 5 }, facing: "east", health: 1, defeated: false, surrendered: false, weapon: { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true }, weaponSkill: 0, meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, armor: 2, grenades: 1, medkits: 1, woundState: "healthy" },
    { id: "enemy-1", name: "Security Guard", side: "enemy", position: { x: 9, y: 3 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 0, meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, armor: 1, grenades: 0, medkits: 0, woundState: "healthy" },
    { id: "enemy-2", name: "Ship Crew", side: "enemy", position: { x: 10, y: 5 }, facing: "west", health: 1, defeated: false, surrendered: false, weapon: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false }, weaponSkill: 0, meleeWeapon: { name: "Knife", penetration: 1 }, meleeRating: 0, armor: 1, grenades: 0, medkits: 0, woundState: "healthy" },
  ],
});
