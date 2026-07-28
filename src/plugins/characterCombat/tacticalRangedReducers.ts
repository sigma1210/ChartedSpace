import type { PayloadAction } from "@reduxjs/toolkit";
import { automaticFireModifierForRange, resolveSnapShot, snapShotTarget, type DicePair } from "./combatResolution";
import { automaticFireSecondaryTargets, collateralBlastCells, coverProtection, pointKey, tacticalRangedEnemies, tacticalVisibilityAssessment } from "./geometry";
import { applyAmmunitionProfile, reloadTacticalAmmunition, setTacticalAmmunition, spendTacticalAmmunition } from "./tacticalAmmunition";
import { applyTacticalWeaponCollateral, type TacticalCollateralRolls } from "./tacticalCollateral";
import { queueTacticalUnexpectedFireMoraleCheck } from "./tacticalMorale";
import { tacticalHitRollEvent } from "./tacticalFire";
import { advanceTacticalPlayerActivation, tacticalCombatant } from "./tacticalStateHelpers";
import type { CharacterCombatState, WeaponAmmunitionKind } from "./types";
import { applyTacticalWound } from "./tacticalWounds";

export const tacticalRangedReducers = {
  selectTacticalAttackTarget: (state: CharacterCombatState, action: PayloadAction<string>) => {
    const map = state.tacticalMap;
    const attackerId = map?.activeCharacterId;
    if (!map || !attackerId || map.draggingCombatantByCarrierId[attackerId] || (map.actionPointsByCharacterId[attackerId] ?? 0) < 1) return;
    const validTarget = tacticalRangedEnemies(map.scenario, attackerId).find((target) => target.id === action.payload);
    if (!validTarget) return;
    if (map.aimedTargetId && map.aimedTargetId !== validTarget.id) map.aimedTargetId = null;
    map.plannedAttackTargetId = validTarget.id;
    map.plannedAttackMode = null;
    map.plannedDestination = null;
    map.plannedEnemyEntryTargetId = null;
    map.plannedTreatmentTargetId = null;
    map.plannedExtinguishFire = null;
    map.selectedTerrainObjectId = null;
  },
  selectTacticalAttackMode: (state: CharacterCombatState, action: PayloadAction<"snap" | "aimed" | "automatic" | "suppressive">) => {
    const map = state.tacticalMap;
    const attacker = map ? tacticalCombatant(map, map.activeCharacterId) : null;
    const target = map ? tacticalCombatant(map, map.plannedAttackTargetId) : null;
    const profile = attacker && target ? snapShotTarget(attacker, target) : null;
    const cost = action.payload === "snap" ? 3 : 6;
    const ammunitionCost = action.payload === "automatic" || action.payload === "suppressive" ? 3 : 1;
    const automaticModeUnavailable = (action.payload === "automatic" || action.payload === "suppressive") && !attacker?.weapon.automatic;
    if (!map || !attacker || !target || target.side === attacker.side || target.defeated || (attacker.weapon.highEnergy && !map.bracedCombatantIds.includes(attacker.id)) || !profile || automaticModeUnavailable || (action.payload === "automatic" && automaticFireModifierForRange(profile.rangeBand, attacker.weapon.automaticFireBonusByRange) === null) || (action.payload === "suppressive" && map.suppressedCombatantIds.includes(target.id)) || (map.actionPointsByCharacterId[attacker.id] ?? 0) < cost || (map.ammunitionByCharacterId[attacker.id] ?? 0) < ammunitionCost) return;
    map.plannedAttackMode = action.payload;
  },
  cancelTacticalAttack: (state: CharacterCombatState) => {
    if (!state.tacticalMap) return;
    state.tacticalMap.plannedAttackTargetId = null;
    state.tacticalMap.plannedAttackMode = null;
  },
  aimTacticalAttack: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const attacker = map ? tacticalCombatant(map, map.activeCharacterId) : null;
    const target = map ? tacticalCombatant(map, map.plannedAttackTargetId) : null;
    if (!map || !attacker || !target || target.side === attacker.side || target.defeated || map.draggingCombatantByCarrierId[attacker.id] || map.suppressedCombatantIds.includes(attacker.id) || map.aimedTargetId === target.id || (map.actionPointsByCharacterId[attacker.id] ?? 0) < 2 || !tacticalRangedEnemies(map.scenario, attacker.id).some((unit) => unit.id === target.id)) return;
    map.aimedTargetId = target.id;
    map.actionPointsByCharacterId[attacker.id] -= 2;
    map.events.unshift(`${attacker.name} aimed at ${target.name} (2 AP)`);
  },
  selectTacticalWeaponAmmunition: (state: CharacterCombatState, action: PayloadAction<WeaponAmmunitionKind>) => {
    const map = state.tacticalMap;
    const character = map ? tacticalCombatant(map, map.activeCharacterId) : null;
    const profile = character?.weapon.ammunitionProfiles?.find((candidate) => candidate.kind === action.payload);
    if (!map || !character || !profile || character.defeated || map.actedCharacterIds.includes(character.id)) return;
    const currentKind = character.weapon.ammunitionKind;
    if (currentKind) {
      map.ammunitionByCombatantAndKind[character.id] ??= {};
      map.ammunitionByCombatantAndKind[character.id][currentKind] = map.ammunitionByCharacterId[character.id] ?? 0;
    }
    const selectedCount = map.ammunitionByCombatantAndKind[character.id]?.[profile.kind] ?? character.weapon.magazineSize ?? 12;
    if (selectedCount <= 0 && currentKind !== profile.kind) return;
    applyAmmunitionProfile(character.weapon, profile);
    setTacticalAmmunition(map, character, selectedCount);
    map.plannedAttackMode = null;
  },
  reloadTacticalWeapon: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const id = map?.activeCharacterId;
    const character = map ? tacticalCombatant(map, id) : null;
    if (!map || !id || !character) return;
    const magazineSize = character.weapon.magazineSize ?? 12;
    if ((map.actionPointsByCharacterId[id] ?? 0) < 3 || (map.ammunitionByCharacterId[id] ?? 0) >= magazineSize) return;
    reloadTacticalAmmunition(map, character);
    map.actionPointsByCharacterId[id] -= 3;
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    map.events.unshift(`${character.name} reloaded (3 AP)`);
    if (map.actionPointsByCharacterId[id] > 0) return;
    if (!map.actedCharacterIds.includes(id)) map.actedCharacterIds.push(id);
    advanceTacticalPlayerActivation(map);
  },
  confirmTacticalAttack: (state: CharacterCombatState, action: PayloadAction<{ hitDice: DicePair; woundDice: DicePair; secondaryRolls?: Record<string, { hitDice: DicePair; woundDice: DicePair }>; collateralRolls?: TacticalCollateralRolls }>) => {
    const map = state.tacticalMap;
    const attacker = map ? tacticalCombatant(map, map.activeCharacterId) : null;
    const target = map ? tacticalCombatant(map, map.plannedAttackTargetId) : null;
    const mode = map?.plannedAttackMode;
    const cost = mode === "snap" ? 3 : 6;
    const ammunitionCost = mode === "automatic" || mode === "suppressive" ? 3 : 1;
    const profile = attacker && target ? snapShotTarget(attacker, target) : null;
    if (!map || !attacker || !target || !mode || target.side === attacker.side || target.defeated || map.draggingCombatantByCarrierId[attacker.id] || (attacker.weapon.highEnergy && !map.bracedCombatantIds.includes(attacker.id)) || !profile || ((mode === "automatic" || mode === "suppressive") && !attacker.weapon.automatic) || (mode === "automatic" && automaticFireModifierForRange(profile.rangeBand, attacker.weapon.automaticFireBonusByRange) === null) || (mode === "suppressive" && map.suppressedCombatantIds.includes(target.id)) || !tacticalRangedEnemies(map.scenario, attacker.id).some((unit) => unit.id === target.id) || (map.actionPointsByCharacterId[attacker.id] ?? 0) < cost || (map.ammunitionByCharacterId[attacker.id] ?? 0) < ammunitionCost) return;
    const attackerBraced = map.bracedCombatantIds.includes(attacker.id);
    const result = resolveSnapShot(attacker, target, action.payload.hitDice, action.payload.woundDice, coverProtection(map.scenario, attacker.id, target.id), mode, false, map.suppressedCombatantIds.includes(attacker.id), attackerBraced, tacticalVisibilityAssessment(map.scenario, attacker, target).darknessModifier, false, map.aimedTargetId === target.id);
    if (!result) return;
    map.actionPointsByCharacterId[attacker.id] -= cost;
    spendTacticalAmmunition(map, attacker, ammunitionCost);
    if (mode === "suppressive") {
      queueTacticalUnexpectedFireMoraleCheck(map, attacker, target);
      const suppressionTarget = result.targetNumber + result.cover;
      const suppressed = result.hitTotal >= suppressionTarget;
      if (suppressed) {
        map.suppressedCombatantIds.push(target.id);
        if (map.aimedTargetId === target.id) map.aimedTargetId = null;
      }
      map.events.unshift(`${attacker.name} suppressive fired at ${target.name}: ${tacticalHitRollEvent(result, suppressionTarget)}${result.cover ? ` including cover +${result.cover}` : ""} · ${suppressed ? "suppressed" : "held position"}`);
      map.plannedAttackTargetId = null;
      map.plannedAttackMode = null;
      map.aimedTargetId = null;
      if (map.actionPointsByCharacterId[attacker.id] === 0 && !map.actedCharacterIds.includes(attacker.id)) map.actedCharacterIds.push(attacker.id);
      advanceTacticalPlayerActivation(map);
      return;
    }
    const dangerTargets = mode === "automatic" ? [target, ...automaticFireSecondaryTargets(map.scenario, attacker.id, target.id)] : [target];
    let hits = 0;
    for (const [index, dangerTarget] of dangerTargets.entries()) {
      const suppliedRolls = dangerTarget.id === target.id ? action.payload : action.payload.secondaryRolls?.[dangerTarget.id] ?? action.payload;
      const dangerResult = dangerTarget.id === target.id ? result : resolveSnapShot(attacker, dangerTarget, suppliedRolls.hitDice, suppliedRolls.woundDice, coverProtection(map.scenario, attacker.id, dangerTarget.id), mode, false, map.suppressedCombatantIds.includes(attacker.id), attackerBraced, tacticalVisibilityAssessment(map.scenario, attacker, dangerTarget).darknessModifier, false, false);
      if (!dangerResult) continue;
      queueTacticalUnexpectedFireMoraleCheck(map, attacker, dangerTarget);
      if (dangerResult.hit) {
        hits += 1;
        applyTacticalWound(map, dangerTarget, dangerResult.woundState);
        applyTacticalWeaponCollateral(map, attacker, dangerTarget, dangerResult.weaponPenetration, suppliedRolls.woundDice, action.payload.collateralRolls);
        if (attacker.weapon.collateralBlast) {
          const ammunitionLabel = attacker.weapon.ammunitionProfiles?.find((candidate) => candidate.kind === attacker.weapon.ammunitionKind)?.label ?? attacker.weapon.ammunitionKind ?? "Ammunition";
          map.lastWeaponImpact = { weaponName: attacker.weapon.name, ammunitionKind: attacker.weapon.ammunitionKind, ammunitionLabel, point: { ...dangerTarget.position }, blastCells: collateralBlastCells(map.scenario, dangerTarget.position), hit: true };
        }
      }
      map.events.unshift(`${attacker.name} ${mode} fired at ${dangerTarget.name}: ${tacticalHitRollEvent(dangerResult)} · ${dangerResult.hit ? `wound ${dangerResult.woundTotal} (${dangerResult.woundState})` : "miss"}`);
      const nextTarget = dangerTargets[index + 1];
      if (mode === "automatic" && hits >= 2 && (!nextTarget || pointKey(nextTarget.position) !== pointKey(dangerTarget.position))) break;
    }
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    map.plannedMeleeTargetId = null;
    map.aimedTargetId = null;
    if (map.actionPointsByCharacterId[attacker.id] > 0) return;
    if (!map.actedCharacterIds.includes(attacker.id)) map.actedCharacterIds.push(attacker.id);
    advanceTacticalPlayerActivation(map);
  },
  braceTacticalWeapon: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const id = map?.activeCharacterId;
    const character = map ? tacticalCombatant(map, id) : null;
    if (!map || !id || !character || character.defeated || map.draggingCombatantByCarrierId[id] || character.posture !== "prone" || map.bracedCombatantIds.includes(id) || map.suppressedCombatantIds.includes(id) || (map.actionPointsByCharacterId[id] ?? 0) < 2) return;
    map.bracedCombatantIds.push(id);
    map.actionPointsByCharacterId[id] -= 2;
    map.plannedDestination = null;
    map.events.unshift(`${character.name} braced their weapon (2 AP)`);
    if (map.actionPointsByCharacterId[id] > 0) return;
    if (!map.actedCharacterIds.includes(id)) map.actedCharacterIds.push(id);
    advanceTacticalPlayerActivation(map);
  },
};
