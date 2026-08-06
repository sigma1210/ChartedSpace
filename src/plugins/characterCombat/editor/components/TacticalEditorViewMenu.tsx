"use client";

type TacticalEditorViewMenuProps = {
  open: boolean;
  toolbarVisible: boolean;
  onToggle: () => void;
  onClose: () => void;
  onToggleToolbar: () => void;
};

const TacticalEditorViewMenu = ({
  open,
  toolbarVisible,
  onToggle,
  onClose,
  onToggleToolbar,
}: TacticalEditorViewMenuProps) => <div className="relative h-full">
  <button type="button" aria-label="View menu" aria-haspopup="menu" aria-expanded={open} onClick={onToggle} className={`h-full border-x px-4 text-[11px] font-bold uppercase tracking-wider ${open ? "border-cyan-500 bg-cyan-950/70 text-cyan-50" : "border-transparent text-slate-300 hover:border-cyan-800 hover:bg-cyan-950/30 hover:text-cyan-100"}`}>View</button>
  {open && <div role="menu" aria-label="View" className="absolute left-0 top-full z-50 min-w-52 border border-cyan-700 bg-slate-950 p-1 shadow-2xl">
    <button type="button" role="menuitemcheckbox" aria-checked={toolbarVisible} onClick={() => {
      onClose();
      onToggleToolbar();
    }} className="flex h-9 w-full items-center gap-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-cyan-100 hover:bg-cyan-950">
      <span aria-hidden="true" className="w-3">{toolbarVisible ? "✓" : ""}</span>
      Toolbar
    </button>
  </div>}
</div>;

export default TacticalEditorViewMenu;
