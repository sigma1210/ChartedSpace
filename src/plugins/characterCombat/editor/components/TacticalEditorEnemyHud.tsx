import Image from "next/image";
import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import { tacticalEnemyPalette } from "@/plugins/characterCombat/tacticalEnemyDefinitions";
import type { TacticalEnemyPlacement } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalEditorHudLayout } from "@/plugins/characterCombat/editor/lib/hudLayouts";
import { facingName } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type TacticalEditorEnemyHudProps = {
  layout: TacticalEditorHudLayout;
  onLayoutChange: (layout: TacticalEditorHudLayout) => void;
  enemy: TacticalEnemyPlacement;
  locked: boolean;
  onUnlock: () => void;
  onRename: (name: string) => void;
  onRotate: () => void;
  onDelete: () => void;
};

const TacticalEditorEnemyHud = ({
  layout,
  onLayoutChange,
  enemy,
  locked,
  onUnlock,
  onRename,
  onRotate,
  onDelete,
}: TacticalEditorEnemyHudProps) => {
  const enemyDefinition = tacticalEnemyPalette.find((candidate) => candidate.id === enemy.type);

  return (
    <FloatingPluginHud
      title="Enemy Editor"
      layout={layout}
      onLayoutChange={onLayoutChange}
      className="w-64 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
    >
      <div className="py-1">
        <div className="mb-3 flex gap-2">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-red-500/60 bg-black">
            <Image src={enemy.avatarPath} alt="" fill sizes="64px" className="object-cover" />
          </div>
          <div className="min-w-0 normal-case">
            <div className="truncate font-bold text-red-100">{enemyDefinition?.label}</div>
            <div className="mt-1 text-(--hud-text-dim)">{enemyDefinition?.equipment}</div>
            <div className="mt-1 text-(--hud-text-dim)">
              Square {enemy.position.x}, {enemy.position.y}
            </div>
          </div>
        </div>
        {locked && (
          <div className="mb-3 border border-amber-500/70 bg-amber-950/40 p-2 normal-case text-amber-100">
            <div className="mb-2">
              This enemy is locked. It can be selected, but it cannot be moved or edited.
            </div>
            <button
              type="button"
              onClick={onUnlock}
              className="h-7 w-full border border-amber-400 font-bold uppercase"
            >
              Unlock enemy
            </button>
          </div>
        )}
        <label className="mb-3 block font-bold text-red-200">Enemy name
          <input
            aria-label="Enemy name"
            disabled={locked}
            value={enemy.name}
            onChange={(event) => onRename(event.target.value)}
            className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[10px] normal-case text-slate-100 outline-none focus:border-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
        <button
          type="button"
          disabled={locked}
          aria-label="Rotate enemy 90 degrees"
          onClick={onRotate}
          className="mb-3 h-8 w-full border border-amber-400 font-bold text-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Facing {facingName(enemy.facing ?? "north")} · Rotate 90°
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={onDelete}
          className="w-full border border-red-500 py-1.5 font-bold text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Delete enemy
        </button>
        <div className="mt-2 normal-case text-(--hud-text-dim)">
          You can also press Delete while this enemy is selected.
        </div>
      </div>
    </FloatingPluginHud>
  );
};

export default TacticalEditorEnemyHud;
