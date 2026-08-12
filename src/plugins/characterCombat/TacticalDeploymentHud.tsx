import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import {
  equipTacticalDeploymentItem,
  rotateTacticalDeploymentCharacter,
  selectTacticalLightingPreset,
  setTacticalDeploymentPosture,
  setTacticalTerrainLights,
  startTacticalScenario,
  unequipTacticalDeploymentItem,
  updateTacticalDeploymentHud,
} from "@/plugins/characterCombat/slice";
import type {
  CharacterCombatHudLayout,
  Combatant,
  TacticalMapState,
} from "@/plugins/characterCombat/types";
import type { ShipLockerItem } from "@/plugins/ship";
import { useAppDispatch } from "@/store/hooks";
import { questPlaytestItemAssigned, questPlaytestItemRemoved } from "@/plugins/quest/questSlice";
import { inactiveQuestPlaytestRuntime, type QuestPlaytestRuntime } from "@/plugins/quest/playtest/questPlaytest";

const INACTIVE_QUEST_PLAYTEST = inactiveQuestPlaytestRuntime();

export const TacticalDeploymentControls = ({
  tacticalMap,
}: {
  tacticalMap: TacticalMapState;
}) => {
  const dispatch = useAppDispatch();
  const livingPlayerIds = tacticalMap.scenario.combatants
    .filter((unit) => unit.side === "player" && !unit.defeated)
    .map((unit) => unit.id);
  const deployedCharacterIds = tacticalMap.deployedCharacterIds ?? [];
  const crewDeploymentComplete = livingPlayerIds.length > 0
    && livingPlayerIds.every((id) => deployedCharacterIds.includes(id));
  const terrainLightsOn = (tacticalMap.scenario.lightSources ?? [])
    .some((source) => source.on !== false);

  return (
    <div className="flex flex-col gap-2 border-t border-(--hud-border) pt-2">
      <div className="font-bold uppercase tracking-wider text-emerald-100">Crew deployment</div>
      <div className="text-(--hud-text-dim)">Select each crew member, then click a green deployment square.</div>
      <div className={crewDeploymentComplete ? "text-emerald-200" : "text-amber-200"}>
        {deployedCharacterIds.length}/{livingPlayerIds.length} crew deployed
      </div>
      <div className="font-bold uppercase tracking-wider text-amber-100">Starting illumination</div>
      <button
        type="button"
        aria-pressed={(tacticalMap.lightingPreset ?? "exterior-dark") === "exterior-dark"}
        onClick={() => dispatch(selectTacticalLightingPreset("exterior-dark"))}
        className={`border px-2 py-2 text-left ${tacticalMap.lightingPreset !== "exterior-lit" ? "border-cyan-200 bg-cyan-300/15 text-cyan-50" : "border-(--hud-border) text-(--hud-text-dim)"}`}
      >
        <span className="block font-bold uppercase">Exterior dark</span>
        <span className="block">Interiors require light sources</span>
      </button>
      <button
        type="button"
        aria-pressed={tacticalMap.lightingPreset === "exterior-lit"}
        onClick={() => dispatch(selectTacticalLightingPreset("exterior-lit"))}
        className={`border px-2 py-2 text-left ${tacticalMap.lightingPreset === "exterior-lit" ? "border-cyan-200 bg-cyan-300/15 text-cyan-50" : "border-(--hud-border) text-(--hud-text-dim)"}`}
      >
        <span className="block font-bold uppercase">Exterior illuminated</span>
        <span className="block">Interiors still require light sources</span>
      </button>
      <div className="font-bold uppercase tracking-wider text-amber-100">Control-room lights</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={terrainLightsOn}
          onClick={() => dispatch(setTacticalTerrainLights(true))}
          className={`border px-2 py-2 font-bold uppercase ${terrainLightsOn ? "border-amber-200 bg-amber-300/15 text-amber-50" : "border-(--hud-border) text-(--hud-text-dim)"}`}
        >
          On
        </button>
        <button
          type="button"
          aria-pressed={!terrainLightsOn}
          onClick={() => dispatch(setTacticalTerrainLights(false))}
          className={`border px-2 py-2 font-bold uppercase ${!terrainLightsOn ? "border-slate-200 bg-slate-300/15 text-slate-50" : "border-(--hud-border) text-(--hud-text-dim)"}`}
        >
          Off
        </button>
      </div>
      <button
        type="button"
        disabled={!crewDeploymentComplete}
        onClick={() => dispatch(startTacticalScenario())}
        className="h-8 border border-emerald-300 px-2 font-bold uppercase tracking-wider text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Start Scenario
      </button>
    </div>
  );
};

export const TacticalDeploymentHud = ({
  tacticalMap,
  activeCombatant,
  lockerItems,
  layout,
  questPlaytest = INACTIVE_QUEST_PLAYTEST,
}: {
  tacticalMap: TacticalMapState;
  activeCombatant: Combatant | null;
  lockerItems: ShipLockerItem[];
  layout: CharacterCombatHudLayout;
  questPlaytest?: QuestPlaytestRuntime;
}) => {
  const dispatch = useAppDispatch();
  const selectedProne = activeCombatant?.posture === "prone";
  const selectedCrewDeployed = Boolean(
    activeCombatant
    && (tacticalMap.deployedCharacterIds ?? []).includes(activeCombatant.id),
  );
  const deploymentLoadouts = tacticalMap.deploymentLoadoutByCharacterId ?? {};
  const assignedLockerItemIds = new Set(
    Object.values(deploymentLoadouts).flatMap((loadout) => [
      ...(loadout.weaponLockerItemId ? [loadout.weaponLockerItemId] : []),
      ...(loadout.armorLockerItemId ? [loadout.armorLockerItemId] : []),
    ]),
  );
  const selectedDeploymentLoadout = activeCombatant
    ? deploymentLoadouts[activeCombatant.id] ?? {}
    : {};
  const equippedWeaponItem = lockerItems.find(
    (item) => item.id === selectedDeploymentLoadout.weaponLockerItemId,
  ) ?? null;
  const equippedArmorItem = lockerItems.find(
    (item) => item.id === selectedDeploymentLoadout.armorLockerItemId,
  ) ?? null;
  const availableLockerWeapons = lockerItems.filter(
    (item) => item.kind === "weapon" && !assignedLockerItemIds.has(item.id),
  );
  const availableLockerArmor = lockerItems.filter(
    (item) => item.kind === "armor" && !assignedLockerItemIds.has(item.id),
  );

  return (
    <FloatingPluginHud
      title="Crew Deployment"
      layout={layout}
      onLayoutChange={(nextLayout) => dispatch(updateTacticalDeploymentHud(nextLayout))}
      className="w-72 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
    >
      <section className="flex flex-col gap-2 normal-case tracking-normal">
        <div className="font-bold uppercase tracking-wider text-emerald-100">Pregame crew state</div>
        {!activeCombatant ? (
          <div className="text-(--hud-text-dim)">Select a crew member in the Characters HUD.</div>
        ) : (
          <>
            <div className="font-bold text-cyan-100">{activeCombatant.name}</div>
            <div className="grid grid-cols-[4rem_1fr_auto] items-center gap-1 border-t border-(--hud-border) pt-2">
              <span className="uppercase text-(--hud-text-dim)">Weapon</span>
              <span className={equippedWeaponItem ? "font-bold text-cyan-100" : "text-(--hud-text-dim)"}>{equippedWeaponItem?.name ?? "Unarmed"}</span>
              <button type="button" disabled={!equippedWeaponItem} onClick={() => dispatch(unequipTacticalDeploymentItem({ characterId: activeCombatant.id, kind: "weapon" }))} className="border border-(--hud-border) px-1 py-0.5 text-[7px] uppercase text-(--hud-text-dim) disabled:opacity-30">Unequip</button>
              <span className="uppercase text-(--hud-text-dim)">Armor</span>
              <span className={equippedArmorItem ? "font-bold text-cyan-100" : "text-(--hud-text-dim)"}>{equippedArmorItem?.name ?? "No Armor"}</span>
              <button type="button" disabled={!equippedArmorItem} onClick={() => dispatch(unequipTacticalDeploymentItem({ characterId: activeCombatant.id, kind: "armor" }))} className="border border-(--hud-border) px-1 py-0.5 text-[7px] uppercase text-(--hud-text-dim) disabled:opacity-30">Unequip</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <div className="mb-1 font-bold uppercase tracking-wider text-(--hud-text-dim)">Locker weapons</div>
                <div className="flex max-h-24 flex-col gap-1 overflow-y-auto pr-1">
                  {availableLockerWeapons.map((item) => <button key={item.id} type="button" onClick={() => dispatch(equipTacticalDeploymentItem({ characterId: activeCombatant.id, lockerItemId: item.id, catalogItemId: item.catalogItemId }))} className="border border-cyan-500/60 px-1 py-1 text-left text-[7px] text-cyan-100 hover:border-cyan-200">{item.name}</button>)}
                  {availableLockerWeapons.length === 0 && <span className="text-[7px] text-(--hud-text-dim)">No weapons available</span>}
                </div>
              </div>
              <div className="min-w-0">
                <div className="mb-1 font-bold uppercase tracking-wider text-(--hud-text-dim)">Locker armor</div>
                <div className="flex max-h-24 flex-col gap-1 overflow-y-auto pr-1">
                  {availableLockerArmor.map((item) => <button key={item.id} type="button" onClick={() => dispatch(equipTacticalDeploymentItem({ characterId: activeCombatant.id, lockerItemId: item.id, catalogItemId: item.catalogItemId }))} className="border border-cyan-500/60 px-1 py-1 text-left text-[7px] text-cyan-100 hover:border-cyan-200">{item.name}</button>)}
                  {availableLockerArmor.length === 0 && <span className="text-[7px] text-(--hud-text-dim)">No armor available</span>}
                </div>
              </div>
            </div>
            {questPlaytest.status !== "inactive" && <div className="border-t border-amber-700/50 pt-2">
              <div className="mb-1 font-bold uppercase tracking-wider text-amber-100">Quest items</div>
              <div className="mb-2 text-[7px] text-(--hud-text-dim)">Assign any defined quest-item copies for this playtest.</div>
              <div className="flex max-h-28 flex-col gap-1 overflow-y-auto pr-1">
                {(questPlaytest.definition?.itemDefinitions ?? []).map((item) => {
                  const copies = questPlaytest.itemInstances.filter((instance) => instance.characterId === activeCombatant.id && instance.itemDefinitionId === item.id).length;
                  return <div key={item.id} className="grid grid-cols-[1fr_20px_24px_20px] items-center gap-1 border border-amber-900/60 px-2 py-1"><span className="truncate text-amber-100">{item.name}</span><button type="button" aria-label={`Remove ${item.name} from ${activeCombatant.name}`} disabled={copies === 0} onClick={() => dispatch(questPlaytestItemRemoved({ itemDefinitionId: item.id, characterId: activeCombatant.id }))} className="border border-slate-700 text-center disabled:opacity-30">−</button><span className="text-center font-bold text-amber-100">{copies}</span><button type="button" aria-label={`Assign ${item.name} to ${activeCombatant.name}`} onClick={() => dispatch(questPlaytestItemAssigned({ itemDefinitionId: item.id, characterId: activeCombatant.id }))} className="border border-amber-500 text-center text-amber-100">+</button></div>;
                })}
                {(questPlaytest.definition?.itemDefinitions.length ?? 0) === 0 && <span className="text-[7px] text-(--hud-text-dim)">This quest defines no items.</span>}
              </div>
            </div>}
            {!selectedCrewDeployed ? (
              <div className="border border-amber-300/60 p-2 text-amber-100">Place this crew member on a green deployment square before setting facing or stance.</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <span className="text-(--hud-text-dim)">Facing</span><span className="font-bold capitalize text-yellow-100">{activeCombatant.facing}</span>
                  <span className="text-(--hud-text-dim)">Stance</span><span className="font-bold capitalize">{selectedProne ? "Prone" : "Standing"}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button type="button" onClick={() => dispatch(rotateTacticalDeploymentCharacter("left"))} className="h-7 border border-yellow-300 px-2 font-bold uppercase tracking-wider text-yellow-100">Rotate left</button>
                  <button type="button" onClick={() => dispatch(rotateTacticalDeploymentCharacter("right"))} className="h-7 border border-yellow-300 px-2 font-bold uppercase tracking-wider text-yellow-100">Rotate right</button>
                </div>
                <button type="button" onClick={() => dispatch(setTacticalDeploymentPosture(selectedProne ? "standing" : "prone"))} className="h-7 border border-slate-300 px-2 font-bold uppercase tracking-wider text-slate-100">{selectedProne ? "Stand up" : "Set prone"}</button>
              </>
            )}
          </>
        )}
      </section>
    </FloatingPluginHud>
  );
};
