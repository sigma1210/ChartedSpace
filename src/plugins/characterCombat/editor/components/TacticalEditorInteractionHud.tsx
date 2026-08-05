import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import {
  TRAVELLER_TASK_DIFFICULTIES,
  type TacticalConsoleOperation,
  type TravellerTaskDifficulty,
} from "@/plugins/characterCombat/tacticalConsoleVictory";
import {
  tacticalHumanArmorOptions,
  tacticalHumanWeaponOptions,
  type TacticalHumanArmorId,
  type TacticalHumanWeaponId,
  type TacticalInteractiveHumanCombatProfile,
} from "@/plugins/characterCombat/tacticalInteractiveHuman";
import type { TacticalTerrainPlacement } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalTerminalKind } from "@/plugins/characterCombat/tacticalTerrain";
import type { TacticalEditorHudLayout } from "@/plugins/characterCombat/editor/lib/hudLayouts";
import { INTERACTION_SKILLS, facingName } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type TerminalUpdate = {
  label?: string;
  terminalKind?: TacticalTerminalKind;
  facing?: TacticalTerrainPlacement["rotation"];
  operational?: boolean;
  completesScenario?: boolean;
  combatProfile?: TacticalInteractiveHumanCombatProfile;
};

type TacticalEditorInteractionHudProps = {
  layout: TacticalEditorHudLayout;
  onLayoutChange: (layout: TacticalEditorHudLayout) => void;
  placement: TacticalTerrainPlacement;
  interactiveHuman: boolean;
  humanCombatProfile: TacticalInteractiveHumanCombatProfile;
  operations: TacticalConsoleOperation[];
  allOperations: TacticalConsoleOperation[];
  selectedOperation: TacticalConsoleOperation | null;
  selectedOperationId: string | null;
  victoryTaskRequired: boolean;
  onUpdateTerminal: (update: TerminalUpdate) => void;
  onUpdateHumanCombatProfile: (update: Partial<TacticalInteractiveHumanCombatProfile>) => void;
  onAddOperation: () => void;
  onSelectOperation: (id: string) => void;
  onUpdateOperation: (id: string, update: (operation: TacticalConsoleOperation) => TacticalConsoleOperation) => void;
  onChangeOperationResult: (id: string, resultType: "victory" | "unlock") => void;
  onTogglePrerequisite: (operationId: string, candidateId: string, checked: boolean) => void;
  onToggleUnlockedOperation: (operationId: string, candidateId: string, checked: boolean) => void;
  onDeleteOperation: () => void;
};

const TacticalEditorInteractionHud = ({
  layout,
  onLayoutChange,
  placement,
  interactiveHuman,
  humanCombatProfile,
  operations,
  allOperations,
  selectedOperation,
  selectedOperationId,
  victoryTaskRequired,
  onUpdateTerminal,
  onUpdateHumanCombatProfile,
  onAddOperation,
  onSelectOperation,
  onUpdateOperation,
  onChangeOperationResult,
  onTogglePrerequisite,
  onToggleUnlockedOperation,
  onDeleteOperation,
}: TacticalEditorInteractionHudProps) => {
  const terminal = placement.objectSettings?.terminal;
  const defaultLabel = interactiveHuman
    ? "Interactive Human"
    : placement.terrainDefinitionId === "console-1x1" ? "Console" : "Control Room Console";
  const predecessorCandidates = selectedOperation
    ? allOperations.filter((operation) => operation.id !== selectedOperation.id && operation.result.type === "unlock")
    : [];

  return (
    <FloatingPluginHud
      title={interactiveHuman ? "Human Interaction Editor" : "Console Editor"}
      layout={layout}
      onLayoutChange={onLayoutChange}
      className="w-80 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
    >
      <div className="max-h-[70vh] overflow-y-auto overscroll-contain py-1 pr-1">
        <div className="mb-2 text-[8px] text-(--hud-text-dim)">{placement.id}</div>
        <label className="mb-2 block font-bold text-cyan-200">
          {interactiveHuman ? "Human name" : "Console name"}
          <input
            aria-label={interactiveHuman ? "Human name" : "Console name"}
            value={terminal?.label ?? defaultLabel}
            onChange={(event) => onUpdateTerminal({ label: event.target.value })}
            className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[10px] normal-case text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>
        {interactiveHuman && (
          <button
            type="button"
            aria-label="Rotate interactive human 90 degrees"
            onClick={() => onUpdateTerminal({ facing: (((terminal?.facing ?? 0) + 90) % 360) as TacticalTerrainPlacement["rotation"] })}
            className="mb-3 h-8 w-full border border-purple-400 font-bold text-purple-100"
          >
            Facing {facingName((((terminal?.facing ?? 0) + placement.rotation) % 360) as TacticalTerrainPlacement["rotation"])} · Rotate 90°
          </button>
        )}
        <div className={`mb-3 grid items-end gap-2 ${interactiveHuman ? "grid-cols-1" : "grid-cols-[1fr_auto]"}`}>
          {!interactiveHuman && (
            <label className="block font-bold text-cyan-200">Console type
              <select
                aria-label="Console type"
                value={terminal?.terminalKind ?? "generic"}
                onChange={(event) => onUpdateTerminal({ terminalKind: event.target.value as TacticalTerminalKind })}
                className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[9px] normal-case text-slate-100"
              >
                {(["generic", "navigation", "engineering", "security", "communications"] as const).map((kind) => <option key={kind} value={kind}>{kind}</option>)}
              </select>
            </label>
          )}
          <label className="flex h-8 items-center gap-1 border border-(--hud-border) px-2 font-bold text-cyan-200">
            <input
              aria-label="Operational"
              type="checkbox"
              checked={terminal?.operational ?? true}
              onChange={(event) => onUpdateTerminal({ operational: event.target.checked })}
            /> Operational
          </label>
        </div>

        {interactiveHuman && (
          <details className="mb-3 border border-purple-500/60" open>
            <summary className="cursor-pointer px-2 py-1.5 font-bold text-purple-200">Combat profile after transformation</summary>
            <div className="grid grid-cols-2 gap-2 border-t border-purple-500/40 p-2">
              <label className="font-bold text-purple-200">Weapon
                <select aria-label="Weapon" value={humanCombatProfile.weaponId} onChange={(event) => onUpdateHumanCombatProfile({ weaponId: event.target.value as TacticalHumanWeaponId })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] normal-case text-slate-100">{tacticalHumanWeaponOptions.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.label}</option>)}</select>
              </label>
              <label className="font-bold text-purple-200">Weapon skill
                <input aria-label="Weapon skill" type="number" value={humanCombatProfile.weaponSkill} onChange={(event) => onUpdateHumanCombatProfile({ weaponSkill: Number.parseInt(event.target.value, 10) || 0 })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
              </label>
              <label className="font-bold text-purple-200">Armor
                <select aria-label="Armor" value={humanCombatProfile.armorId} onChange={(event) => onUpdateHumanCombatProfile({ armorId: event.target.value as TacticalHumanArmorId })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] normal-case text-slate-100">{tacticalHumanArmorOptions.map((armor) => <option key={armor.id} value={armor.id}>{armor.label}</option>)}</select>
              </label>
              {([
                ["Melee weapon", "meleeWeaponName", "text"],
                ["Melee penetration", "meleePenetration", "number"],
                ["Melee rating", "meleeRating", "number"],
                ["Morale", "moraleFactor", "number"],
                ["Leadership", "leadershipRating", "number"],
              ] as const).map(([label, field, type]) => <label key={field} className="font-bold text-purple-200">{label}
                <input
                  aria-label={label}
                  type={type}
                  value={humanCombatProfile[field]}
                  onChange={(event) => onUpdateHumanCombatProfile({ [field]: type === "number" ? Number.parseInt(event.target.value, 10) || 0 : event.target.value })}
                  className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] normal-case text-slate-100"
                />
              </label>)}
              <div className="col-span-2 border-t border-purple-500/40 pt-2">
                <div className="mb-1 flex items-center justify-between"><span className="font-bold text-purple-200">Skills</span><button type="button" onClick={() => onUpdateHumanCombatProfile({ skills: [...humanCombatProfile.skills, { name: "Skill", level: 0 }] })} className="border border-emerald-600 px-2 py-1 text-emerald-100">Add skill</button></div>
                {humanCombatProfile.skills.map((skill, index) => <div key={`${index}:${skill.name}`} className="mb-1 grid grid-cols-[1fr_3rem_auto] gap-1">
                  <input aria-label={`Combat skill ${index + 1}`} value={skill.name} onChange={(event) => onUpdateHumanCombatProfile({ skills: humanCombatProfile.skills.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} className="h-7 border border-(--hud-border) bg-slate-950 px-1 text-[9px] normal-case text-slate-100" />
                  <input aria-label={`Combat skill level ${index + 1}`} type="number" value={skill.level} onChange={(event) => onUpdateHumanCombatProfile({ skills: humanCombatProfile.skills.map((item, itemIndex) => itemIndex === index ? { ...item, level: Number.parseInt(event.target.value, 10) || 0 } : item) })} className="h-7 border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
                  <button type="button" onClick={() => onUpdateHumanCombatProfile({ skills: humanCombatProfile.skills.filter((_, itemIndex) => itemIndex !== index) })} className="border border-red-600 px-1 text-red-200">Remove</button>
                </div>)}
              </div>
            </div>
          </details>
        )}

        <div className="border-t border-(--hud-border) pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <div className="font-bold text-cyan-200">{interactiveHuman ? "Tasks involving this person" : "Tasks at this console"}</div>
              <div className="mt-1 normal-case text-(--hud-text-dim)">A task is what a character can perform {interactiveHuman ? "with this person" : "at this console"}.</div>
            </div>
            <button type="button" onClick={onAddOperation} className="shrink-0 border border-emerald-500 px-2 py-1.5 font-bold text-emerald-100">{victoryTaskRequired ? "Add victory task" : "Add operation"}</button>
          </div>
          {operations.length === 0 && <div className="mb-2 border border-amber-500/70 bg-amber-950/50 p-2 normal-case text-amber-100">This {interactiveHuman ? "person" : "console"} has no task. Add a victory task before saving or playtesting.</div>}
          <div className="mb-2 flex flex-wrap gap-1">
            {operations.map((operation) => <button type="button" key={operation.id} onClick={() => onSelectOperation(operation.id)} className={`border px-2 py-1.5 normal-case ${selectedOperationId === operation.id ? "border-amber-300 bg-amber-950/50 text-amber-100" : "border-(--hud-border) text-(--hud-text)"}`}>{operation.label}</button>)}
          </div>

          {selectedOperation?.consolePlacementId === placement.id && (
            <div className="border border-amber-700/70 p-2">
              <label className="mb-2 block font-bold text-amber-200">Task name
                <input aria-label="Task name" value={selectedOperation.label} onChange={(event) => onUpdateOperation(selectedOperation.id, (operation) => ({ ...operation, label: event.target.value }))} className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[10px] normal-case text-slate-100" />
              </label>
              <div className="mb-1 font-bold text-amber-200">Required checks, in order</div>
              {selectedOperation.checks.map((check, index) => <div key={check.id} className="mb-2 border border-(--hud-border) p-1.5">
                <div className="mb-1 text-(--hud-text-dim)">Check {index + 1}</div>
                <label className="mb-1 block font-bold text-amber-200">Skill
                  <input aria-label={`Skill for check ${index + 1}`} list="interaction-skill-options" value={check.skill} onChange={(event) => onUpdateOperation(selectedOperation.id, (operation) => ({ ...operation, checks: operation.checks.map((item) => item.id === check.id ? { ...item, skill: event.target.value } : item) }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] normal-case text-slate-100" />
                </label>
                <div className="grid grid-cols-[1fr_4rem] gap-1">
                  <label className="font-bold text-amber-200">Difficulty
                    <select aria-label={`Difficulty for check ${index + 1}`} value={check.difficulty} onChange={(event) => onUpdateOperation(selectedOperation.id, (operation) => ({ ...operation, checks: operation.checks.map((item) => item.id === check.id ? { ...item, difficulty: event.target.value as TravellerTaskDifficulty } : item) }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100">
                      {TRAVELLER_TASK_DIFFICULTIES.map((difficulty) => <option key={difficulty.id} value={difficulty.id}>{difficulty.label} {difficulty.target}+</option>)}
                    </select>
                  </label>
                  <label className="font-bold text-amber-200">AP cost
                    <input aria-label={`AP cost for check ${index + 1}`} type="number" min="1" max="6" value={check.apCost} onChange={(event) => onUpdateOperation(selectedOperation.id, (operation) => ({ ...operation, checks: operation.checks.map((item) => item.id === check.id ? { ...item, apCost: Number.parseInt(event.target.value, 10) || 1 } : item) }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100" />
                  </label>
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  <button type="button" disabled={index === 0} onClick={() => onUpdateOperation(selectedOperation.id, (operation) => { const checks = [...operation.checks]; [checks[index - 1], checks[index]] = [checks[index], checks[index - 1]]; return { ...operation, checks }; })} className="border border-(--hud-border) disabled:opacity-30">Up</button>
                  <button type="button" disabled={index === selectedOperation.checks.length - 1} onClick={() => onUpdateOperation(selectedOperation.id, (operation) => { const checks = [...operation.checks]; [checks[index], checks[index + 1]] = [checks[index + 1], checks[index]]; return { ...operation, checks }; })} className="border border-(--hud-border) disabled:opacity-30">Down</button>
                  <button type="button" disabled={selectedOperation.checks.length === 1} onClick={() => onUpdateOperation(selectedOperation.id, (operation) => ({ ...operation, checks: operation.checks.filter((item) => item.id !== check.id) }))} className="border border-red-600 text-red-200 disabled:opacity-30">Remove</button>
                </div>
              </div>)}
              <button type="button" onClick={() => onUpdateOperation(selectedOperation.id, (operation) => { const suffix = operation.checks.length + 1; return { ...operation, checks: [...operation.checks, { id: `${operation.id}-check-${suffix}`, skill: interactiveHuman ? "Persuade" : "Security", difficulty: "average", apCost: 6 }] }; })} className="mb-2 w-full border border-emerald-600 py-1.5 text-emerald-100">Add task check</button>
              {interactiveHuman && <div className="mb-2 grid grid-cols-2 gap-2 border border-purple-500/60 p-2">
                <label className="font-bold text-purple-200">Success becomes
                  <select aria-label="Success becomes" value={selectedOperation.successTransformation ?? "none"} onChange={(event) => onUpdateOperation(selectedOperation.id, (operation) => ({ ...operation, successTransformation: event.target.value === "none" ? undefined : event.target.value as "ally" | "enemy" }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100"><option value="none">No transformation</option><option value="ally">Ally</option><option value="enemy">Enemy</option></select>
                </label>
                <label className="font-bold text-purple-200">Failure becomes
                  <select aria-label="Failure becomes" value={selectedOperation.failureTransformation ?? "none"} onChange={(event) => onUpdateOperation(selectedOperation.id, (operation) => ({ ...operation, failureTransformation: event.target.value === "none" ? undefined : event.target.value as "ally" | "enemy" }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100"><option value="none">No transformation</option><option value="ally">Ally</option><option value="enemy">Enemy</option></select>
                </label>
                <div className="col-span-2 normal-case text-(--hud-text-dim)">A transformation resolves this interaction permanently. The new combatant waits for its side’s next phase.</div>
              </div>}
              <label className="mb-2 block font-bold text-amber-200">When all checks succeed
                <select aria-label="When all checks succeed" value={selectedOperation.result.type} onChange={(event) => onChangeOperationResult(selectedOperation.id, event.target.value as "victory" | "unlock")} className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[9px] text-slate-100"><option value="victory">Win the scenario</option><option value="unlock">Unlock other tasks</option></select>
              </label>

              <details className="mb-2 border border-(--hud-border)">
                <summary className="cursor-pointer px-2 py-1.5 font-bold text-(--hud-text-dim)">Advanced chaining and critical effects</summary>
                <div className="border-t border-(--hud-border) p-2">
                  <label className="mb-2 block font-bold text-amber-200">Available after
                    <select aria-label="Available after" value={selectedOperation.prerequisites.mode} onChange={(event) => onUpdateOperation(selectedOperation.id, (operation) => ({ ...operation, prerequisites: { ...operation.prerequisites, mode: event.target.value as "any" | "all" } }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100"><option value="any">Any selected task</option><option value="all">All selected tasks</option></select>
                  </label>
                  <div className="mb-2 max-h-24 overflow-y-auto border border-(--hud-border) p-1">
                    {predecessorCandidates.map((candidate) => <label key={candidate.id} className="mb-1 flex items-center gap-1 normal-case text-(--hud-text)"><input aria-label={`Prerequisite ${candidate.label}`} type="checkbox" checked={selectedOperation.prerequisites.operationIds.includes(candidate.id)} onChange={(event) => onTogglePrerequisite(selectedOperation.id, candidate.id, event.target.checked)} /> {candidate.label}</label>)}
                    {predecessorCandidates.length === 0 && <div className="normal-case text-(--hud-text-dim)">No predecessor tasks are available.</div>}
                  </div>
                  {selectedOperation.result.type === "unlock" && <div className="mb-2">
                    <div className="mb-1 font-bold text-amber-200">Tasks unlocked</div>
                    <div className="max-h-24 overflow-y-auto border border-(--hud-border) p-1">{allOperations.filter((operation) => operation.id !== selectedOperation.id).map((candidate) => <label key={candidate.id} className="mb-1 flex items-center gap-1 normal-case text-(--hud-text)"><input aria-label={`Unlock ${candidate.label}`} type="checkbox" checked={selectedOperation.result.type === "unlock" && selectedOperation.result.operationIds.includes(candidate.id)} onChange={(event) => onToggleUnlockedOperation(selectedOperation.id, candidate.id, event.target.checked)} /> {candidate.label}</label>)}</div>
                  </div>}
                  <div className="grid grid-cols-2 gap-1">
                    <label className="font-bold text-amber-200">Critical success next DM<input aria-label="Critical success next DM" type="number" value={selectedOperation.criticalSuccessNextCheckModifier ?? 0} onChange={(event) => onUpdateOperation(selectedOperation.id, (operation) => ({ ...operation, criticalSuccessNextCheckModifier: Number.parseInt(event.target.value, 10) || 0 }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" /></label>
                    <label className="font-bold text-amber-200">Critical failure next DM<input aria-label="Critical failure next DM" type="number" value={selectedOperation.criticalFailureNextCheckModifier ?? 0} onChange={(event) => onUpdateOperation(selectedOperation.id, (operation) => ({ ...operation, criticalFailureNextCheckModifier: Number.parseInt(event.target.value, 10) || 0 }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" /></label>
                  </div>
                </div>
              </details>
              <button type="button" onClick={onDeleteOperation} className="w-full border border-red-500 py-1.5 font-bold text-red-100">Delete task</button>
            </div>
          )}
        </div>
        <datalist id="interaction-skill-options">{INTERACTION_SKILLS.map((skill) => <option key={skill} value={skill} />)}</datalist>
      </div>
    </FloatingPluginHud>
  );
};

export default TacticalEditorInteractionHud;
