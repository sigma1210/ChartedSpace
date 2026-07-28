import { escalateWoundState, woundStateForTotal, type DicePair } from "./combatResolution";
import { collateralBlastCells, hasLineOfSight } from "./geometry";
import { tacticalTerrainObjectsForScenario, type TacticalTerrainObject } from "./tacticalTerrain";
import { tacticalCellsAlongWall } from "./tacticalSegmentGeometry";
import type { CombatScenario, GridPoint, TacticalMapState } from "./types";
import { applyTacticalWound } from "./tacticalWounds";

export type TacticalCollateralRolls = Record<string, { checkDice: DicePair; woundDice: DicePair }>;

export const collateralCheckPasses = (distance: number, rollTotal: number) => distance === 0
  || (distance === 1 && rollTotal <= 10)
  || (distance === 2 && rollTotal <= 8);

export const tacticalStructureBreachThreshold = (object: TacticalTerrainObject) => object.kind === "door" ? object.portalType === "iris-valve" ? 10 : 5 : 25;

export const tacticalStructurePenetrationModifier = (object: TacticalTerrainObject) => object.kind === "door" && object.portalType === "iris-valve" ? -5 : -4;

const tacticalSquareDistance = (first: GridPoint, second: GridPoint) => Math.max(Math.abs(first.x - second.x), Math.abs(first.y - second.y));

const satchelCollateralCheckPasses = (distance: number, rollTotal: number) => distance === 0
  || (distance === 1 && rollTotal >= 10)
  || (distance === 2 && rollTotal >= 12);

export const resolveTacticalSatchelCharge = (map: TacticalMapState, chargeId: string, rolls: TacticalCollateralRolls = {}) => {
  const charge = map.satchelCharges.find((candidate) => candidate.id === chargeId);
  if (!charge) return;
  map.satchelCharges = map.satchelCharges.filter((candidate) => candidate.id !== chargeId);
  const blastCells = collateralBlastCells(map.scenario, charge.position);
  map.lastSatchelImpact = { point: { ...charge.position }, blastCells };

  tacticalTerrainObjectsForScenario(map.scenario).forEach((object) => {
    if ((object.kind !== "wall" && object.kind !== "door") || map.destroyedTerrainObjectIds.includes(object.id)) return;
    const adjacentCells = object.kind === "door"
      ? [object.separates.first, object.separates.second]
      : tacticalCellsAlongWall(object.edge);
    const distance = Math.min(...adjacentCells.map((point) => tacticalSquareDistance(charge.position, point)));
    if (distance > 2 || (distance > 0 && !adjacentCells.some((point) => hasLineOfSight(map.scenario, charge.position, point)))) return;
    const damage = Math.max(0, Math.floor(30 / (2 ** distance)) + tacticalStructurePenetrationModifier(object));
    if (damage === 0) return;
    map.terrainDamageById[object.id] = (map.terrainDamageById[object.id] ?? 0) + damage;
    const threshold = tacticalStructureBreachThreshold(object);
    if (map.terrainDamageById[object.id] < threshold) return;
    if (!map.destroyedTerrainObjectIds.includes(object.id)) map.destroyedTerrainObjectIds.push(object.id);
    if (object.kind === "door") {
      map.doorOpenById[object.id] = true;
      const door = map.scenario.doors.find((candidate) => candidate.id === object.id);
      if (door) door.open = true;
    } else map.scenario.walls = map.scenario.walls.filter((wall) => wall.id !== object.id);
  });

  map.scenario.combatants.filter((unit) => !unit.defeated).forEach((unit) => {
    const distance = tacticalSquareDistance(charge.position, unit.position);
    if (distance > 2 || (distance > 0 && !hasLineOfSight(map.scenario, charge.position, unit.position))) return;
    const supplied = rolls[unit.id];
    if (!supplied) return;
    const checkTotal = supplied.checkDice.first + supplied.checkDice.second;
    if (!satchelCollateralCheckPasses(distance, checkTotal)) {
      map.events.unshift(`${unit.name} avoided satchel collateral at ${distance} square${distance === 1 ? "" : "s"} (${checkTotal})`);
      return;
    }
    const penetration = Math.floor(30 / (2 ** distance));
    const woundRoll = supplied.woundDice.first + supplied.woundDice.second;
    const total = woundRoll + penetration - unit.armor;
    applyTacticalWound(map, unit, woundStateForTotal(total));
    map.events.unshift(`${unit.name} caught in satchel blast at ${distance} square${distance === 1 ? "" : "s"}: ${woundRoll} +${penetration} penetration -${unit.armor} armor = ${total} (${unit.woundState})`);
  });

  map.events.unshift(`Satchel charge detonated at ${charge.position.x},${charge.position.y} with penetration 30`);
  const chainCharges = map.satchelCharges.filter((candidate) => {
    const distance = tacticalSquareDistance(charge.position, candidate.position);
    return distance <= 2 && Math.floor(30 / (2 ** distance)) >= 2 && (distance === 0 || hasLineOfSight(map.scenario, charge.position, candidate.position));
  });
  chainCharges.forEach((candidate) => resolveTacticalSatchelCharge(map, candidate.id, rolls));
};

export const detonateTacticalSatchelsReceivingCollateral = (map: TacticalMapState, center: GridPoint, penetration: number, rolls: TacticalCollateralRolls = {}) => {
  const affected = map.satchelCharges.filter((charge) => {
    const distance = tacticalSquareDistance(center, charge.position);
    return distance <= 2 && Math.floor(penetration / (2 ** distance)) >= 2 && (distance === 0 || hasLineOfSight(map.scenario, center, charge.position));
  });
  affected.forEach((charge) => resolveTacticalSatchelCharge(map, charge.id, rolls));
};

export const applyTacticalWeaponCollateral = (map: TacticalMapState, attacker: CombatScenario["combatants"][number], impactTarget: CombatScenario["combatants"][number], penetration: number, fallbackDice: DicePair, rolls: TacticalCollateralRolls = {}) => {
  if (!attacker.weapon.collateralBlast) return;
  const ammunitionLabel = attacker.weapon.ammunitionProfiles?.find((profile) => profile.kind === attacker.weapon.ammunitionKind)?.label ?? attacker.weapon.ammunitionKind ?? "ammunition";
  map.scenario.combatants.filter((unit) => unit.id !== impactTarget.id && !unit.defeated).forEach((unit) => {
    const distance = tacticalSquareDistance(unit.position, impactTarget.position);
    if (distance > 2) return;
    const collateralRolls = rolls[unit.id] ?? { checkDice: fallbackDice, woundDice: fallbackDice };
    const checkTotal = collateralRolls.checkDice.first + collateralRolls.checkDice.second;
    if (!collateralCheckPasses(distance, checkTotal)) {
      map.events.unshift(`${unit.name} avoided ${attacker.weapon.name} ${ammunitionLabel} collateral at ${distance} square${distance === 1 ? "" : "s"}`);
      return;
    }
    const collateralPenetration = Math.floor(penetration / (2 ** (distance + 1)));
    if (collateralPenetration <= 0) return;
    const woundTotal = collateralRolls.woundDice.first + collateralRolls.woundDice.second + collateralPenetration - unit.armor;
    const woundState = attacker.weapon.woundEscalation ? escalateWoundState(woundStateForTotal(woundTotal)) : woundStateForTotal(woundTotal);
    applyTacticalWound(map, unit, woundState);
    map.events.unshift(`${unit.name} suffered ${attacker.weapon.name} ${ammunitionLabel} collateral at ${distance} square${distance === 1 ? "" : "s"}: wound ${woundTotal} (${unit.woundState})`);
  });
  detonateTacticalSatchelsReceivingCollateral(map, impactTarget.position, penetration, rolls);
};
