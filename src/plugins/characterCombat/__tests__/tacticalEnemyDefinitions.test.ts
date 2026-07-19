import { buildDefaultTacticalScenario } from "../defaultTacticalScenario";
import { cloneTacticalScenarioDefinition, defaultTacticalScenarioDefinition } from "../tacticalScenarioDefinitions";
import { randomTacticalEnemyAvatarPath, tacticalEnemyAvatarPaths } from "../tacticalEnemyDefinitions";

describe("tactical scenario enemies", () => {
  it("builds the two editable enemy types with their specified equipment", () => {
    const enemies = buildDefaultTacticalScenario().combatants.filter((combatant) => combatant.side === "enemy");

    expect(enemies).toHaveLength(2);
    expect(enemies[0]).toMatchObject({ name: "Gang Member 1", weapon: { name: "No Ranged Weapon", magazineSize: 0 }, meleeWeapon: { name: "Knife" } });
    expect(enemies[1]).toMatchObject({ name: "Gang Leader 1", weapon: { name: "Body Pistol" }, meleeWeapon: { name: "Knife" }, leadershipRating: 1 });
    expect(enemies.every((enemy) => enemy.avatarPath?.startsWith("/generated/avatars/pool/"))).toBe(true);
  });

  it("does not inject hidden default enemies when the scenario has none", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.enemyPlacements = [];

    expect(buildDefaultTacticalScenario(undefined, definition).combatants.filter((combatant) => combatant.side === "enemy")).toEqual([]);
  });

  it("selects and persists an avatar path from the enemy pool", () => {
    expect(randomTacticalEnemyAvatarPath(() => 0)).toBe(tacticalEnemyAvatarPaths[0]);
    expect(randomTacticalEnemyAvatarPath(() => 0.999)).toBe(tacticalEnemyAvatarPaths[tacticalEnemyAvatarPaths.length - 1]);
  });
});
