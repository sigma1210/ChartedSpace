import { characterCombatArmor, characterCombatWeapons } from "./equipment";
import { assertValidCombatScenario } from "./scenarioValidator";
import { FIRST_TACTICAL_CONTROL_ROOM } from "./tacticalTerrain";
import type { CombatScenario, MapObject } from "./types";

const buildScenarioTerrain = () => {
  const walls: CombatScenario["walls"] = [];
  const doors: CombatScenario["doors"] = [];
  const objects: MapObject[] = [];

  FIRST_TACTICAL_CONTROL_ROOM.objects.forEach((object) => {
    if (object.kind === "wall") {
      walls.push({ id: object.id, from: { ...object.edge.from }, to: { ...object.edge.to } });
      return;
    }
    if (object.kind === "door") {
      doors.push({ id: object.id, from: { ...object.edge.from }, to: { ...object.edge.to }, open: object.open });
      return;
    }
    objects.push({ id: object.id, kind: "console", position: { ...object.position }, label: object.label });
  });

  return { walls, doors, objects };
};

export const buildDefaultTacticalScenario = (): CombatScenario => {
  const terrain = buildScenarioTerrain();

  return assertValidCombatScenario({
    id: "default-tactical-control-room",
    title: "Control Room Assault",
    briefing: "The boarding crew has reached a hostile vessel's security control room.",
    objective: "Secure the Security Terminal.",
    width: 100,
    height: 100,
    walls: terrain.walls,
    doors: terrain.doors,
    objects: terrain.objects,
    combatants: [
      {
        id: "player-1", name: "Boarding Lead", side: "player", position: { x: 48, y: 50 }, facing: "south", posture: "standing",
        health: 1, defeated: false, surrendered: false, weapon: { ...characterCombatWeapons.laserRifle }, weaponSkill: 1,
        meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, moraleFactor: 7, leadershipRating: 1,
        armor: characterCombatArmor.flakVest.value, armorName: characterCombatArmor.flakVest.name,
        grenades: 1, smokeGrenades: 1, medkits: 1, woundState: "healthy",
      },
      {
        id: "player-2", name: "Boarding Support", side: "player", position: { x: 51, y: 50 }, facing: "south", posture: "standing",
        health: 1, defeated: false, surrendered: false, weapon: { ...characterCombatWeapons.shotgun }, weaponSkill: 0,
        meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, moraleFactor: 7, leadershipRating: 0,
        armor: characterCombatArmor.combatArmor.value, armorName: characterCombatArmor.combatArmor.name,
        grenades: 1, smokeGrenades: 1, medkits: 1, woundState: "healthy",
      },
      {
        id: "enemy-1", name: "Security Guard", side: "enemy", position: { x: 47, y: 57 }, facing: "north", posture: "standing",
        health: 1, defeated: false, surrendered: false, weapon: { ...characterCombatWeapons.smg }, weaponSkill: 1,
        meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, moraleFactor: 7, leadershipRating: 0,
        armor: characterCombatArmor.flakVest.value, armorName: characterCombatArmor.flakVest.name,
        grenades: 0, medkits: 0, woundState: "healthy",
      },
      {
        id: "enemy-2", name: "Control Room Officer", side: "enemy", position: { x: 50, y: 59 }, facing: "north", posture: "standing",
        health: 1, defeated: false, surrendered: false, weapon: { ...characterCombatWeapons.autopistol }, weaponSkill: 0,
        meleeWeapon: { name: "Knife", penetration: 1 }, meleeRating: 0, moraleFactor: 7, leadershipRating: 1,
        armor: characterCombatArmor.clothing.value, armorName: characterCombatArmor.clothing.name,
        grenades: 0, medkits: 0, woundState: "healthy",
      },
    ],
  });
};
