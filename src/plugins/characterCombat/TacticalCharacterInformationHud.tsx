import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import { tacticalLightingLevelAt } from "@/plugins/characterCombat/geometry";
import { updateTacticalCharacterInformationHud } from "@/plugins/characterCombat/slice";
import type { Combatant, TacticalMapState } from "@/plugins/characterCombat/types";
import { useAppDispatch } from "@/store/hooks";

export const TacticalCharacterInformationHud = ({
  tacticalMap,
  activeCombatant,
}: {
  tacticalMap: TacticalMapState;
  activeCombatant: Combatant | null;
}) => {
  const dispatch = useAppDispatch();
  const selectedLighting = activeCombatant
    ? tacticalLightingLevelAt(tacticalMap.scenario, activeCombatant.position)
    : null;
  const selectedActionPoints = activeCombatant
    ? tacticalMap.actionPointsByCharacterId[activeCombatant.id] ?? 0
    : 0;
  const selectedAmmunition = activeCombatant
    ? tacticalMap.ammunitionByCharacterId[activeCombatant.id] ?? 0
    : 0;
  const selectedSuppressed = Boolean(
    activeCombatant
    && tacticalMap.suppressedCombatantIds.includes(activeCombatant.id),
  );

  return (
    <FloatingPluginHud
      title="Selected Character"
      layout={tacticalMap.characterInformationHudLayout}
      onLayoutChange={(layout) => dispatch(updateTacticalCharacterInformationHud(layout))}
      className="w-60 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
    >
      {activeCombatant ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 normal-case tracking-normal">
          <span className="text-(--hud-text-dim)">Name</span><span>{activeCombatant.name}</span>
          <span className="text-(--hud-text-dim)">Position</span><span>{activeCombatant.position.x}, {activeCombatant.position.y}</span>
          <span className="text-(--hud-text-dim)">Lighting</span><span className={selectedLighting === "dark" ? "text-slate-300" : "text-amber-100"}>{selectedLighting === "dark" ? "Dark" : "Illuminated"}</span>
          <span className="text-(--hud-text-dim)">Facing</span><span>{activeCombatant.facing}</span>
          <span className="text-(--hud-text-dim)">AP</span><span>{selectedActionPoints}/6</span>
          <span className="text-(--hud-text-dim)">Weapon</span><span>{activeCombatant.weapon.name} · skill +{activeCombatant.weaponSkill}</span>
          <span className="text-(--hud-text-dim)">Ammo</span><span>{selectedAmmunition}/{activeCombatant.weapon.magazineSize ?? 12}</span>
          <span className="text-(--hud-text-dim)">Ranges</span><span>{activeCombatant.weapon.effectiveRange}/{activeCombatant.weapon.longRange}/{activeCombatant.weapon.extremeRange}</span>
          <span className="text-(--hud-text-dim)">Pen / Auto</span><span>+{activeCombatant.weapon.penetration} / {activeCombatant.weapon.automatic ? "yes" : "no"}</span>
          <span className="text-(--hud-text-dim)">Grenades</span><span>{activeCombatant.grenades}</span>
          <span className="text-(--hud-text-dim)">Smoke grenades</span><span>{activeCombatant.smokeGrenades ?? 0}</span>
          <span className="text-(--hud-text-dim)">Satchel charges</span><span>{activeCombatant.breachingCharges ?? 0}</span>
          <span className="text-(--hud-text-dim)">Medkits</span><span>{activeCombatant.medkits}</span>
          <span className="text-(--hud-text-dim)">Armor</span><span>{activeCombatant.armorName ?? "Armor"} · {activeCombatant.armor}</span>
          <span className="text-(--hud-text-dim)">Wound</span><span>{activeCombatant.woundState}{(activeCombatant.seriousWounds ?? 0) > 0 ? ` · serious ${activeCombatant.seriousWounds}/2` : ""}</span>
          <span className="text-(--hud-text-dim)">Suppression</span><span>{selectedSuppressed ? "Suppressed" : "Clear"}</span>
          <span className="text-(--hud-text-dim)">Action</span><span>{tacticalMap.actedCharacterIds.includes(activeCombatant.id) ? "Complete" : "Available"}</span>
        </div>
      ) : (
        <div className="normal-case tracking-normal text-(--hud-text-dim)">No character selected.</div>
      )}
    </FloatingPluginHud>
  );
};
