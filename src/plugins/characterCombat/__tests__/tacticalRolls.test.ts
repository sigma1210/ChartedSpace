import { freshTacticalMap } from "../tacticalScenarioReducers";
import { pointKey } from "../geometry";
import {
  buildTacticalAdjacencyReactionRolls,
  buildTacticalConsoleCheckRolls,
  buildTacticalCoveringFireSnapRolls,
  buildTacticalEnemyPhaseRolls,
  buildTacticalGrenadeRolls,
  buildTacticalMeleeExchangeRolls,
  buildTacticalMoveConfirmationRolls,
  buildTacticalRangedAttackRolls,
  buildTacticalSatchelDetonationRolls,
  buildTacticalStructuralFireRolls,
} from "../tacticalRolls";

describe("tactical roll factories", () => {
  it("builds console check rolls with the selected operation", () => {
    const roll = jest.fn(() => ({ first: 2, second: 6 }));

    expect(buildTacticalConsoleCheckRolls("unlock-door", roll)).toEqual({
      operationId: "unlock-door",
      dice: { first: 2, second: 6 },
    });
    expect(roll).toHaveBeenCalledTimes(1);
  });

  it("builds structural fire hit rolls", () => {
    const roll = jest.fn(() => ({ first: 5, second: 4 }));

    expect(buildTacticalStructuralFireRolls(roll)).toEqual({
      hitDice: { first: 5, second: 4 },
    });
    expect(roll).toHaveBeenCalledTimes(1);
  });

  it("builds adjacency reaction hit and wound rolls", () => {
    const roll = jest.fn()
      .mockReturnValueOnce({ first: 1, second: 2 })
      .mockReturnValueOnce({ first: 5, second: 6 });

    expect(buildTacticalAdjacencyReactionRolls(true, roll)).toEqual({
      fire: true,
      hitDice: { first: 1, second: 2 },
      woundDice: { first: 5, second: 6 },
    });
    expect(roll).toHaveBeenCalledTimes(2);
  });

  it("builds covering-fire snap and enemy-phase rolls from one dice source", () => {
    const map = freshTacticalMap(["crew-1"]);
    const roll = jest.fn(() => ({ first: 3, second: 4 }));

    const payload = buildTacticalCoveringFireSnapRolls(
      map,
      true,
      "enemy-1",
      roll,
    );

    expect(payload.fire).toBe(true);
    expect(payload.targetId).toBe("enemy-1");
    expect(payload.hitDice).toEqual({ first: 3, second: 4 });
    expect(payload.woundDice).toEqual({ first: 3, second: 4 });
    expect(Object.keys(payload.phaseRolls.enemyRolls)).toEqual(
      map.scenario.combatants
        .filter((unit) => unit.side === "enemy" && !unit.defeated)
        .map((unit) => unit.id),
    );
    expect(roll).toHaveBeenCalled();
  });

  it("builds simultaneous melee exchange rolls from an injected D6", () => {
    const rollD6 = jest.fn()
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(6);

    expect(buildTacticalMeleeExchangeRolls(rollD6)).toEqual({
      attackRoll: 2,
      responseRoll: 6,
    });
    expect(rollD6).toHaveBeenCalledTimes(2);
  });

  it("builds satchel collateral rolls for every living combatant", () => {
    const map = freshTacticalMap(["crew-1"]);
    const defeated = map.scenario.combatants.at(-1)!;
    defeated.defeated = true;
    const activeIds = map.scenario.combatants
      .filter((unit) => !unit.defeated)
      .map((unit) => unit.id);
    const roll = jest.fn(() => ({ first: 6, second: 2 }));

    const payload = buildTacticalSatchelDetonationRolls(
      map,
      "satchel:test",
      roll,
    );

    expect(payload.chargeId).toBe("satchel:test");
    expect(Object.keys(payload.rollsByCombatantId)).toEqual(activeIds);
    expect(payload.rollsByCombatantId[activeIds[0]!]).toEqual({
      checkDice: { first: 6, second: 2 },
      woundDice: { first: 6, second: 2 },
    });
    expect(payload.rollsByCombatantId).not.toHaveProperty(defeated.id);
    expect(roll).toHaveBeenCalledTimes(activeIds.length * 2);
  });

  it("builds grenade rolls for every living combatant and occupied square", () => {
    const map = freshTacticalMap(["crew-1"]);
    const defeated = map.scenario.combatants.at(-1)!;
    defeated.defeated = true;
    const activeCombatants = map.scenario.combatants.filter((unit) => !unit.defeated);
    const roll = jest.fn(() => ({ first: 4, second: 3 }));
    const rollD6 = jest.fn(() => 5);

    const payload = buildTacticalGrenadeRolls(map, roll, rollD6);
    const activeIds = activeCombatants.map((unit) => unit.id);
    const occupiedSquares = activeCombatants.map((unit) => pointKey(unit.position));

    expect(Object.keys(payload.rollsByCombatantId)).toEqual(activeIds);
    expect(payload.throwDice).toEqual({ first: 4, second: 3 });
    expect(payload.scatterDice).toEqual({ first: 4, second: 3 });
    expect(Object.keys(payload.occupiedSquareRolls)).toEqual(occupiedSquares);
    expect(Object.values(payload.occupiedSquareRolls)).toEqual(
      activeCombatants.map(() => 5),
    );
    expect(Object.keys(payload.collateralRolls)).toEqual(activeIds);
    expect(payload.collateralRolls[activeIds[0]!]).toEqual({
      checkDice: { first: 4, second: 3 },
      woundDice: { first: 4, second: 3 },
    });
    expect(payload.rollsByCombatantId).not.toHaveProperty(defeated.id);
    expect(roll).toHaveBeenCalledTimes((activeCombatants.length * 3) + 2);
    expect(rollD6).toHaveBeenCalledTimes(activeCombatants.length);
  });

  it("builds ranged attack rolls for selected automatic risks and all collateral candidates", () => {
    const map = freshTacticalMap(["crew-1"]);
    const secondaryTargets = map.scenario.combatants.slice(1, 3);
    const roll = jest.fn(() => ({ first: 2, second: 5 }));

    const payload = buildTacticalRangedAttackRolls(map, secondaryTargets, roll);
    const allIds = map.scenario.combatants.map((unit) => unit.id);

    expect(payload.hitDice).toEqual({ first: 2, second: 5 });
    expect(payload.woundDice).toEqual({ first: 2, second: 5 });
    expect(Object.keys(payload.secondaryRolls)).toEqual(
      secondaryTargets.map((unit) => unit.id),
    );
    expect(Object.keys(payload.collateralRolls)).toEqual(allIds);
    expect(payload.secondaryRolls[secondaryTargets[0]!.id]).toEqual({
      hitDice: { first: 2, second: 5 },
      woundDice: { first: 2, second: 5 },
    });
    expect(payload.collateralRolls[allIds[0]!]).toEqual({
      checkDice: { first: 2, second: 5 },
      woundDice: { first: 2, second: 5 },
    });
    expect(roll).toHaveBeenCalledTimes(
      2 + (secondaryTargets.length * 2) + (allIds.length * 2),
    );
  });

  it("builds the complete enemy-phase payload from an injected dice source", () => {
    const map = freshTacticalMap(["crew-1"]);
    const player = map.scenario.combatants.find((unit) => unit.side === "player")!;
    const enemies = map.scenario.combatants.filter((unit) => unit.side === "enemy");
    const activeEnemy = enemies[0]!;
    const defeatedEnemy = enemies[1]!;
    defeatedEnemy.defeated = true;
    map.coveringFireLanes = [{
      attackerId: player.id,
      target: { x: 2, y: 2 },
      cells: [{ x: 2, y: 2 }],
    }];
    map.coweringCombatantIds = [activeEnemy.id];
    const roll = jest.fn(() => ({ first: 2, second: 5 }));

    const payload = buildTacticalEnemyPhaseRolls(map, roll);
    const allIds = map.scenario.combatants.map((unit) => unit.id);

    expect(Object.keys(payload.enemyRolls)).toEqual([activeEnemy.id]);
    expect(Object.keys(payload.coveringFireRolls?.[player.id] ?? {})).toEqual(allIds);
    expect(Object.keys(payload.dangerSpaceRolls ?? {})).toEqual([activeEnemy.id]);
    expect(Object.keys(payload.dangerSpaceRolls?.[activeEnemy.id] ?? {})).toEqual(allIds);
    expect(Object.keys(payload.coweringRecoveryRolls ?? {})).toEqual([activeEnemy.id]);
    expect(Object.keys(payload.casualtyMoraleRolls ?? {})).toEqual(allIds);
    expect(Object.keys(payload.casualtyMoraleRolls?.[player.id] ?? {})).toEqual(allIds);
    expect(Object.keys(payload.unexpectedFireMoraleRolls ?? {})).toEqual(allIds);
    expect(Object.keys(payload.unexpectedFireMoraleRolls?.[player.id] ?? {})).toEqual(allIds);
    expect(Object.keys(payload.coveringFireMoraleRolls ?? {})).toEqual([activeEnemy.id]);
    expect(Object.keys(payload.movingAdjacentMoraleRolls ?? {})).toEqual([activeEnemy.id]);
    expect(Object.keys(payload.movingAdjacentSnapRolls ?? {})).toEqual([activeEnemy.id]);
    expect(payload.enemyRolls[activeEnemy.id].hitDice).toEqual({ first: 2, second: 5 });
    expect(roll).toHaveBeenCalled();
  });

  it("builds movement reactions for living enemies and simultaneous melee dice", () => {
    const map = freshTacticalMap(["crew-1"]);
    const enemies = map.scenario.combatants.filter((unit) => unit.side === "enemy");
    const activeEnemy = enemies[0]!;
    const defeatedEnemy = enemies[1]!;
    defeatedEnemy.defeated = true;
    const roll = jest.fn(() => ({ first: 3, second: 4 }));
    const rollD6 = jest.fn()
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(6);

    const payload = buildTacticalMoveConfirmationRolls(map, roll, rollD6);

    expect(payload.moraleDice).toEqual({ first: 3, second: 4 });
    expect(payload.snapDice).toEqual({
      hitDice: { first: 3, second: 4 },
      woundDice: { first: 3, second: 4 },
    });
    expect(Object.keys(payload.enemyReactionRolls ?? {})).toEqual([activeEnemy.id]);
    expect(payload.enemyReactionRolls?.[activeEnemy.id]).toEqual({
      hitDice: { first: 3, second: 4 },
      woundDice: { first: 3, second: 4 },
    });
    expect(payload.meleeDice).toEqual({ attackRoll: 2, responseRoll: 6 });
    expect(rollD6).toHaveBeenCalledTimes(2);
  });
});
