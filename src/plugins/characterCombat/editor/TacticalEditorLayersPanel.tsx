import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, LockKeyhole, LockOpen } from "lucide-react";
import type {
  TacticalEditorLayerGroup,
  TacticalEditorLayerObject,
} from "./tacticalEditorLayers";

export const TacticalEditorLayersPanel = ({
  groups,
  selectedKey,
  lockedKeys,
  hiddenKeys,
  onSelect,
  onToggleLocked,
  onToggleHidden,
  onMove,
}: {
  groups: TacticalEditorLayerGroup[];
  selectedKey: string | null;
  lockedKeys: ReadonlySet<string>;
  hiddenKeys: ReadonlySet<string>;
  onSelect: (object: TacticalEditorLayerObject) => void;
  onToggleLocked: (object: TacticalEditorLayerObject) => void;
  onToggleHidden: (object: TacticalEditorLayerObject) => void;
  onMove: (object: TacticalEditorLayerObject, direction: -1 | 1) => void;
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const objectCount = groups.reduce((count, group) => count + group.objects.length, 0);

  return <div
    aria-label="Editor layers"
    className="flex max-h-[65vh] min-h-0 w-72 flex-col"
  >
    <div className="border-b border-cyan-950 px-1 py-1.5">
      <div className="text-[8px] text-slate-500">{objectCount} map objects · back to front within each group</div>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      {groups.map((group) => {
        const collapsed = collapsedGroups.has(group.id);
        return <section key={group.id} className="mb-2 border border-slate-800 bg-slate-950/45">
          <button
            type="button"
            aria-expanded={!collapsed}
            onClick={() => setCollapsedGroups((current) => {
              const next = new Set(current);
              if (next.has(group.id)) next.delete(group.id);
              else next.add(group.id);
              return next;
            })}
            className="flex h-8 w-full items-center justify-between px-2 text-left text-[9px] font-bold uppercase tracking-wider text-slate-300 hover:bg-cyan-950/30"
          >
            <span>{collapsed ? "▸" : "▾"} {group.label}</span>
            <span className="text-slate-600">{group.objects.length}</span>
          </button>
          {!collapsed && <div className="border-t border-slate-800">
            {group.objects.length === 0 && <div className="px-3 py-2 text-[9px] text-slate-700">No objects</div>}
            {group.objects.map((object, index) => {
              const selected = selectedKey === object.key;
              const hidden = hiddenKeys.has(object.key);
              const locked = lockedKeys.has(object.key);
              return <div
                key={object.key}
                data-testid={`editor-layer-${object.key}`}
                className={`group grid grid-cols-[1fr_auto] border-b border-slate-900 last:border-b-0 ${object.parentKey ? "pl-4" : ""} ${selected ? "bg-cyan-950/70" : "hover:bg-slate-900/80"}`}
              >
                <button
                  type="button"
                  aria-label={object.label}
                  onClick={() => onSelect(object)}
                  className={`min-w-0 px-2 py-2 text-left ${hidden ? "opacity-40" : ""}`}
                >
                  <span className={`block truncate text-[10px] font-bold ${selected ? "text-cyan-100" : "text-slate-200"}`}>{object.label}</span>
                  <span className="mt-0.5 block truncate text-[8px] text-slate-500">{object.detail}</span>
                </button>
                <div className="flex items-center gap-0.5 pr-1">
                  {object.reorderable && <>
                    <button type="button" title={`Move ${object.label} up · send backward`} aria-label={`Send ${object.label} backward`} disabled={index === 0} onClick={() => onMove(object, -1)} className="grid h-8 w-8 place-items-center border border-transparent text-slate-400 hover:border-cyan-700 hover:bg-cyan-950/40 hover:text-cyan-100 disabled:opacity-20"><ArrowUp size={15} aria-hidden="true" /></button>
                    <button type="button" title={`Move ${object.label} down · bring forward`} aria-label={`Bring ${object.label} forward`} disabled={index === group.objects.length - 1} onClick={() => onMove(object, 1)} className="grid h-8 w-8 place-items-center border border-transparent text-slate-400 hover:border-cyan-700 hover:bg-cyan-950/40 hover:text-cyan-100 disabled:opacity-20"><ArrowDown size={15} aria-hidden="true" /></button>
                  </>}
                  <button type="button" title={`${hidden ? "Show" : "Hide"} ${object.label}`} aria-label={`${hidden ? "Show" : "Hide"} ${object.label}`} aria-pressed={hidden} onClick={() => onToggleHidden(object)} className={`grid h-8 w-8 place-items-center border border-transparent hover:border-cyan-700 hover:bg-cyan-950/40 ${hidden ? "text-slate-600" : "text-slate-300 hover:text-cyan-100"}`}>{hidden ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button>
                  <button type="button" title={`${locked ? "Locked — click to unlock" : "Unlocked — click to lock"} ${object.label}`} aria-label={`${locked ? "Unlock" : "Lock"} ${object.label}`} aria-pressed={locked} onClick={() => onToggleLocked(object)} className="grid h-9 w-9 place-items-center border border-slate-700 bg-slate-950/40 text-slate-200 transition-colors hover:border-slate-400 hover:bg-slate-800 hover:text-white">{locked
                    ? <LockKeyhole size={22} strokeWidth={2.5} aria-hidden="true" />
                    : <LockOpen size={22} strokeWidth={2.5} aria-hidden="true" />}
                  </button>
                </div>
              </div>;
            })}
          </div>}
        </section>;
      })}
    </div>
  </div>;
};
