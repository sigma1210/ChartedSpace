import type { ReactNode } from "react";
import { aimTacticalAttack, beginTacticalCoveringFire, beginTacticalGrenadeTargeting, beginTacticalSatchelPlacement, beginTacticalSmokeGrenadeTargeting, cancelTacticalAttack, cancelTacticalCoveringFire, cancelTacticalGrenadeTargeting, cancelTacticalMelee, cancelTacticalSatchelPlacement, confirmTacticalAttack, confirmTacticalCoveringFire, confirmTacticalGrenade, confirmTacticalMelee, confirmTacticalSatchelPlacement, defuseTacticalSatchelCharge, detonateTacticalSatchelCharge, previewTacticalMelee, reloadTacticalWeapon, selectTacticalAttackMode, selectTacticalAttackTarget, selectTacticalWeaponAmmunition } from "@/plugins/characterCombat/slice";
import { automaticFireModifierForRange, snapShotTarget, weaponAccuracyForRange, weaponPenetrationForRange } from "@/plugins/characterCombat/combatResolution";
import { automaticFireSecondaryTargets, collateralBlastCells, coverProtection, coveringFireDangerSpaceCells, grenadeBlastCells, pointKey } from "@/plugins/characterCombat/geometry";
import { buildTacticalGrenadeRolls, buildTacticalMeleeExchangeRolls, buildTacticalRangedAttackRolls, buildTacticalSatchelDetonationRolls } from "@/plugins/characterCombat/tacticalRolls";
import type { Combatant, TacticalMapState } from "@/plugins/characterCombat/types";
import { useAppDispatch } from "@/store/hooks";

type TacticalCombatControlsProps = {
  tacticalMap: TacticalMapState;
  activeCombatant: Combatant;
  draggedCombatant: Combatant | null;
  rangedTargets: Combatant[];
  meleeTargets: Combatant[];
  children: ReactNode;
};

export const TacticalCombatControls = ({
  tacticalMap,
  activeCombatant,
  draggedCombatant,
  rangedTargets,
  meleeTargets,
  children,
}: TacticalCombatControlsProps) => {
  const dispatch = useAppDispatch();
  const selectedPosition = activeCombatant.position;
  const selectedActionPoints = tacticalMap.actionPointsByCharacterId[activeCombatant.id] ?? 0;
  const selectedSuppressed = tacticalMap.suppressedCombatantIds.includes(activeCombatant.id);
  const selectedBraced = tacticalMap.bracedCombatantIds.includes(activeCombatant.id);
  const selectedWeapon = activeCombatant.weapon;
  const selectedAmmunition = tacticalMap.ammunitionByCharacterId[activeCombatant.id] ?? 0;
  const coveringFireAmmunition = selectedWeapon.burstSize ?? (selectedWeapon.automatic ? 3 : 1);
  const coveringFireWeaponReady = !selectedWeapon.highEnergy || selectedBraced;
  const plannedCoveringFireCells = tacticalMap.plannedCoveringFireTarget
    ? coveringFireDangerSpaceCells(tacticalMap.scenario, selectedPosition, tacticalMap.plannedCoveringFireTarget, selectedWeapon.extremeRange)
    : [];
  const plannedGrenadeBlastCells = tacticalMap.plannedGrenadeTarget
    ? tacticalMap.grenadeKind === "smoke"
      ? grenadeBlastCells(tacticalMap.scenario, tacticalMap.plannedGrenadeTarget)
      : collateralBlastCells(tacticalMap.scenario, tacticalMap.plannedGrenadeTarget)
    : [];
  const satchelsInActiveSquare = tacticalMap.satchelCharges.filter(
    (charge) => pointKey(charge.position) === pointKey(activeCombatant.position),
  );
  const satchelsPlacedByActiveCharacter = tacticalMap.satchelCharges.filter(
    (charge) => charge.placerId === activeCombatant.id,
  );
  const rangedTargetIds = new Set(rangedTargets.map((unit) => unit.id));
  const plannedDestinationKey = tacticalMap.plannedDestination
    ? pointKey(tacticalMap.plannedDestination)
    : null;
  const plannedMeleeDiveTarget = tacticalMap.movementMode === "trot" && plannedDestinationKey
    ? tacticalMap.scenario.combatants.find(
      (unit) => unit.id === tacticalMap.plannedMeleeTargetId
        && pointKey(unit.position) === plannedDestinationKey,
    ) ?? null
    : null;
  const plannedMeleeTarget = plannedMeleeDiveTarget
    ? null
    : meleeTargets.find((unit) => unit.id === tacticalMap.plannedMeleeTargetId) ?? null;
  const plannedAttackTarget = tacticalMap.scenario.combatants.find(
    (unit) => unit.id === tacticalMap.plannedAttackTargetId,
  ) ?? null;
  const plannedAttackProfile = plannedAttackTarget
    ? snapShotTarget(activeCombatant, plannedAttackTarget)
    : null;
  const plannedAttackCover = plannedAttackTarget
    ? coverProtection(tacticalMap.scenario, activeCombatant.id, plannedAttackTarget.id)
    : 0;
  const plannedAttackAccuracy = plannedAttackProfile
    ? weaponAccuracyForRange(selectedWeapon, plannedAttackProfile.rangeBand)
    : 0;
  const plannedAttackPenetration = plannedAttackProfile
    ? weaponPenetrationForRange(selectedWeapon, plannedAttackProfile.rangeBand)
    : 0;
  const plannedAutomaticModifier = selectedWeapon.automatic && plannedAttackProfile
    ? automaticFireModifierForRange(
      plannedAttackProfile.rangeBand,
      selectedWeapon.automaticFireBonusByRange,
    )
    : null;
  const plannedAutomaticRisks = plannedAttackTarget
    ? automaticFireSecondaryTargets(
      tacticalMap.scenario,
      activeCombatant.id,
      plannedAttackTarget.id,
    )
    : [];

  return <>
            {selectedWeapon?.ammunitionProfiles && selectedWeapon.ammunitionProfiles.length > 1 && <div className="space-y-1 border border-cyan-300/50 p-1">
              <div className="font-bold uppercase tracking-wider text-cyan-100">{selectedWeapon.name} ammunition</div>
              <div className="grid grid-cols-2 gap-1">
                {selectedWeapon.ammunitionProfiles.map((profile) => {
                  const selected = selectedWeapon.ammunitionKind === profile.kind;
                  const count = selected ? selectedAmmunition : activeCombatant ? tacticalMap.ammunitionByCombatantAndKind[activeCombatant.id]?.[profile.kind] ?? selectedWeapon.magazineSize ?? 12 : 0;
                  return <button key={profile.kind} type="button" disabled={count <= 0 && !selected} onClick={() => dispatch(selectTacticalWeaponAmmunition(profile.kind))} className={`h-7 w-full border px-2 text-[8px] font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-30 ${selected ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-(--hud-border) text-(--hud-text-dim)"}`}>{profile.label} · {count}</button>;
                })}
              </div>
            </div>}
            {tacticalMap.coveringFireTargeting ? <div className="flex flex-col gap-2 border border-yellow-300/60 p-2">
              <div className="font-bold uppercase tracking-wider text-yellow-100">Covering Fire</div>
              <div className="text-(--hud-text-dim)">Select a map square to define the danger-space lane.</div>
              {tacticalMap.plannedCoveringFireTarget && <div className="text-yellow-100">Lane to {tacticalMap.plannedCoveringFireTarget.x}, {tacticalMap.plannedCoveringFireTarget.y} · {plannedCoveringFireCells.length} danger spaces</div>}
              <div className="grid grid-cols-2 gap-1">
                <button type="button" disabled={!tacticalMap.plannedCoveringFireTarget} onClick={() => dispatch(confirmTacticalCoveringFire())} className="h-7 w-full border border-yellow-300 px-2 text-[8px] font-bold uppercase tracking-wider text-yellow-100 disabled:cursor-not-allowed disabled:opacity-40">Confirm Lane</button>
                <button type="button" onClick={() => dispatch(cancelTacticalCoveringFire())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel</button>
              </div>
            </div> : <button type="button" disabled={Boolean(draggedCombatant) || tacticalMap.grenadeTargeting || selectedActionPoints < 3 || selectedAmmunition < coveringFireAmmunition || !coveringFireWeaponReady} onClick={() => dispatch(beginTacticalCoveringFire())} className="h-7 w-full border border-yellow-300 px-2 text-[8px] font-bold uppercase tracking-wider text-yellow-100 disabled:cursor-not-allowed disabled:opacity-40">Covering Fire · 3 AP · reserve {coveringFireAmmunition} ammo</button>}
            {tacticalMap.grenadeTargeting ? <div className={`flex flex-col gap-2 border p-2 ${tacticalMap.grenadeKind === "smoke" ? "border-slate-300/60" : "border-pink-300/60"}`}>
              <div className={`font-bold uppercase tracking-wider ${tacticalMap.grenadeKind === "smoke" ? "text-slate-100" : "text-pink-100"}`}>{tacticalMap.grenadeKind === "smoke" ? "Smoke Grenade" : "Fragmentation Grenade"}</div>
              <div className="text-(--hud-text-dim)">Select a map square. {tacticalMap.grenadeKind === "smoke" ? "Grey markers show the smoke area." : "Pink markers show the possible blast area."}</div>
              {tacticalMap.plannedGrenadeTarget && <div className={tacticalMap.grenadeKind === "smoke" ? "text-slate-100" : "text-pink-100"}>Target {tacticalMap.plannedGrenadeTarget.x}, {tacticalMap.plannedGrenadeTarget.y} · {plannedGrenadeBlastCells.length} {tacticalMap.grenadeKind === "smoke" ? "smoke" : "blast"} squares</div>}
              <div className="grid grid-cols-2 gap-1">
                <button type="button" disabled={!tacticalMap.plannedGrenadeTarget} onClick={() => dispatch(confirmTacticalGrenade(buildTacticalGrenadeRolls(tacticalMap)))} className={`h-7 w-full border px-2 text-[8px] font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40 ${tacticalMap.grenadeKind === "smoke" ? "border-slate-300 text-slate-100" : "border-pink-300 text-pink-100"}`}>Confirm Throw</button>
                <button type="button" onClick={() => dispatch(cancelTacticalGrenadeTargeting())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel</button>
              </div>
            </div> : <div className="grid grid-cols-1 gap-1">
              <button type="button" disabled={Boolean(draggedCombatant) || tacticalMap.coveringFireTargeting || selectedActionPoints < 6 || (activeCombatant?.grenades ?? 0) < 1} onClick={() => dispatch(beginTacticalGrenadeTargeting())} className="h-7 w-full border border-pink-300 px-2 text-[8px] font-bold uppercase tracking-wider text-pink-100 disabled:cursor-not-allowed disabled:opacity-40">Throw Fragmentation Grenade · {activeCombatant?.grenades ?? 0} · 6 AP</button>
              <button type="button" disabled={Boolean(draggedCombatant) || tacticalMap.coveringFireTargeting || selectedActionPoints < 6 || (activeCombatant?.smokeGrenades ?? 0) < 1} onClick={() => dispatch(beginTacticalSmokeGrenadeTargeting())} className="h-7 w-full border border-slate-300 px-2 text-[8px] font-bold uppercase tracking-wider text-slate-100 disabled:cursor-not-allowed disabled:opacity-40">Throw Smoke Grenade · {activeCombatant?.smokeGrenades ?? 0} · 6 AP</button>
            </div>}
            {tacticalMap.satchelPlacementPending ? <div className="flex flex-col gap-2 border border-orange-300/60 p-2">
              <div className="font-bold uppercase tracking-wider text-orange-100">Emplace Satchel Charge</div>
              <div className="text-(--hud-text-dim)">The charge remains in {activeCombatant?.position.x}, {activeCombatant?.position.y}. Placement spends the entire activation. Only {activeCombatant?.name} may detonate it later.</div>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => dispatch(confirmTacticalSatchelPlacement())} className="h-7 border border-orange-300 text-orange-100">Confirm Placement</button>
                <button type="button" onClick={() => dispatch(cancelTacticalSatchelPlacement())} className="h-7 border border-(--hud-border) text-(--hud-text-dim)">Cancel</button>
              </div>
            </div> : <div className="flex flex-col gap-1">
              {activeCombatant && (activeCombatant.breachingCharges ?? 0) > 0 && selectedActionPoints === 6 && !tacticalMap.grenadeTargeting && !tacticalMap.coveringFireTargeting && !draggedCombatant && <button type="button" onClick={() => dispatch(beginTacticalSatchelPlacement())} className="h-7 w-full border border-orange-300 px-2 text-[8px] font-bold uppercase tracking-wider text-orange-100">Emplace Satchel Charge · {activeCombatant.breachingCharges} · entire activation</button>}
              {satchelsPlacedByActiveCharacter.map((charge) => <button key={`detonate:${charge.id}`} type="button" disabled={selectedActionPoints < 1} onClick={() => dispatch(detonateTacticalSatchelCharge(buildTacticalSatchelDetonationRolls(tacticalMap, charge.id)))} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100 disabled:opacity-40">Detonate Satchel at {charge.position.x}, {charge.position.y} · 1 AP</button>)}
              {satchelsInActiveSquare.map((charge) => <button key={`defuse:${charge.id}`} type="button" disabled={selectedActionPoints !== 6 || Boolean(draggedCombatant)} onClick={() => dispatch(defuseTacticalSatchelCharge(charge.id))} className="h-7 w-full border border-amber-300 px-2 text-[8px] font-bold uppercase tracking-wider text-amber-100 disabled:opacity-40">Defuse Satchel · entire activation</button>)}
            </div>}
            {children}
            {plannedMeleeTarget ? <div className="flex flex-col gap-2 border border-amber-300/60 p-2">
              <div className="font-bold uppercase tracking-wider text-amber-100">Melee with {plannedMeleeTarget.name}</div>
              <div className="text-(--hud-text-dim)">MF {activeCombatant?.meleeRating ?? 0} − {plannedMeleeTarget.meleeRating} = {(activeCombatant?.meleeRating ?? 0) - plannedMeleeTarget.meleeRating} · armor shifts table column · 1d6 · no AP · activation ends · eligible return attack resolves simultaneously</div>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => dispatch(confirmTacticalMelee(buildTacticalMeleeExchangeRolls()))} className="h-7 w-full border border-amber-300 px-2 text-[8px] font-bold uppercase tracking-wider text-amber-100">Resolve Exchange</button>
                <button type="button" onClick={() => dispatch(cancelTacticalMelee())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel</button>
              </div>
            </div> : meleeTargets.length > 0 ? <div className="flex flex-col gap-1">
              <div className="border-b border-amber-300/40 pb-0.5 font-bold uppercase tracking-wider text-amber-200">Adjacent targets</div>
              {meleeTargets.map((target) => <div key={target.id} className={`grid gap-1 ${rangedTargetIds.has(target.id) ? "grid-cols-2" : "grid-cols-1"}`}>
                {rangedTargetIds.has(target.id) && <button type="button" onClick={() => dispatch(selectTacticalAttackTarget(target.id))} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100">Fire at {target.name}</button>}
                <button type="button" onClick={() => dispatch(previewTacticalMelee(target.id))} className="h-7 w-full border border-amber-300 px-2 text-[8px] font-bold uppercase tracking-wider text-amber-100">Melee {target.name}</button>
              </div>)}
            </div> : null}
            <div className="border-b border-red-300/40 pb-0.5 font-bold uppercase tracking-wider text-red-200">Attack</div>
            {plannedAttackTarget && plannedAttackProfile ? <div className="flex flex-col gap-2">
              <div className="text-red-200">Attack {plannedAttackTarget.name} · {plannedAttackTarget.woundState} · {plannedAttackTarget.armorName ?? "Armor"} {plannedAttackTarget.armor}{tacticalMap.suppressedCombatantIds.includes(plannedAttackTarget.id) ? " · Suppressed" : ""}</div>
              {!tacticalMap.plannedAttackMode ? <div className="grid grid-cols-2 gap-1">
                {tacticalMap.aimedTargetId !== plannedAttackTarget.id && <button type="button" disabled={selectedSuppressed || selectedActionPoints < 2} onClick={() => dispatch(aimTacticalAttack())} className="col-span-2 h-7 w-full border border-cyan-200 px-2 text-[8px] font-bold uppercase tracking-wider text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">Aim · 2 AP · +1 hit</button>}
                {tacticalMap.aimedTargetId === plannedAttackTarget.id && <div className="col-span-2 text-cyan-200">Aimed at {plannedAttackTarget.name} · +1 hit</div>}
                <button type="button" disabled={Boolean(selectedWeapon?.highEnergy && !selectedBraced) || selectedActionPoints < 3 || selectedAmmunition < 1} onClick={() => dispatch(selectTacticalAttackMode("snap"))} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100 disabled:cursor-not-allowed disabled:opacity-40">Snap Shot · 3 AP</button>
                <button type="button" disabled={Boolean(selectedWeapon?.highEnergy && !selectedBraced) || selectedActionPoints < 6 || selectedAmmunition < 1} onClick={() => dispatch(selectTacticalAttackMode("aimed"))} className="h-7 w-full border border-cyan-300 px-2 text-[8px] font-bold uppercase tracking-wider text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">Aimed Fire · 6 AP</button>
                {selectedWeapon?.automatic && <button type="button" disabled={selectedActionPoints < 6 || selectedAmmunition < 3 || plannedAutomaticModifier === null} onClick={() => dispatch(selectTacticalAttackMode("automatic"))} className="col-span-2 h-7 w-full border border-fuchsia-300 px-2 text-[8px] font-bold uppercase tracking-wider text-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-40">{plannedAutomaticModifier === null ? "Automatic unavailable" : `Automatic · +${plannedAutomaticModifier} · 6 AP · 3 ammo`}</button>}
                {selectedWeapon?.automatic && !tacticalMap.suppressedCombatantIds.includes(plannedAttackTarget.id) && <button type="button" disabled={selectedActionPoints < 6 || selectedAmmunition < 3} onClick={() => dispatch(selectTacticalAttackMode("suppressive"))} className="col-span-2 h-7 w-full border border-orange-300 px-2 text-[8px] font-bold uppercase tracking-wider text-orange-100 disabled:cursor-not-allowed disabled:opacity-40">Suppress Target · 6 AP · 3 ammo</button>}
                <button type="button" onClick={() => dispatch(cancelTacticalAttack())} className="col-span-2 h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel Target</button>
              </div> : <>
                {tacticalMap.plannedAttackMode === "suppressive" && <div className="font-bold text-orange-200">Suppressive fire · no wound · 2d6 + skill + weapon −2 vs range target + cover {plannedAttackCover}</div>}
                {tacticalMap.plannedAttackMode === "automatic" && plannedAutomaticRisks.length > 0 && <div className="border border-orange-300/70 bg-orange-300/10 p-1 text-orange-100">Danger space: {plannedAutomaticRisks.map((unit) => `${unit.name} (${unit.side})`).join(" · ")}</div>}
                <div className="grid grid-cols-2 gap-x-2 text-(--hud-text-dim)">
                  <span>Mode</span><span>{tacticalMap.plannedAttackMode} ({tacticalMap.plannedAttackMode === "snap" || tacticalMap.plannedAttackMode === "suppressive" ? "-2" : tacticalMap.plannedAttackMode === "automatic" ? `+${plannedAutomaticModifier}` : "0"})</span>
                  <span>Weapon</span><span>{selectedWeapon?.name} · ammo {selectedAmmunition}/{selectedWeapon?.magazineSize ?? 12}</span>
                  <span>Range</span><span>{plannedAttackProfile.range} ({plannedAttackProfile.rangeBand})</span>
                  <span>Hit</span><span>2d6 + skill {activeCombatant?.weaponSkill ?? 0} + weapon {plannedAttackAccuracy >= 0 ? "+" : ""}{plannedAttackAccuracy} + mode {tacticalMap.plannedAttackMode === "snap" || tacticalMap.plannedAttackMode === "suppressive" ? -2 : tacticalMap.plannedAttackMode === "automatic" ? plannedAutomaticModifier : 0}{selectedBraced ? " + brace 1" : ""}{tacticalMap.aimedTargetId === plannedAttackTarget.id ? " + aim 1" : ""} - cover {plannedAttackCover} vs {plannedAttackProfile.targetNumber}+</span>
                  <span>Wound</span><span>2d6 + penetration {plannedAttackPenetration} - armor {plannedAttackTarget.armor} + cover {plannedAttackCover}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button type="button" onClick={() => dispatch(confirmTacticalAttack(buildTacticalRangedAttackRolls(tacticalMap, plannedAutomaticRisks)))} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100">Confirm Attack</button>
                  <button type="button" onClick={() => dispatch(cancelTacticalAttack())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel</button>
                </div>
              </>}
            </div> : <div className="text-(--hud-text-dim)">{draggedCombatant ? "Attacks unavailable while dragging." : "Select a visible red enemy on the map."}</div>}
            {selectedWeapon && selectedAmmunition < (selectedWeapon.magazineSize ?? 12) && selectedActionPoints >= 3 && <button type="button" onClick={() => dispatch(reloadTacticalWeapon())} className="h-7 w-full border border-sky-300 px-2 text-[8px] font-bold uppercase tracking-wider text-sky-100">Reload · 3 AP</button>}
  </>;
};
