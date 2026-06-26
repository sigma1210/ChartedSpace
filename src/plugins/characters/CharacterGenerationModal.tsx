"use client";

import { X } from "lucide-react";
import { selectActiveModal } from "@/store/selectors/ui.selectors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { closeModal } from "@/store/slices/uiSlice";
import { CharacterCreateHudContent } from "./CharacterCreateHud";

export const CharacterGenerationModal = () => {
  const dispatch = useAppDispatch();
  const activeModal = useAppSelector(selectActiveModal);
  const visible = activeModal === "characterGeneration";

  return (
    <div
      aria-hidden={!visible}
      className={[
        "fixed inset-0 z-50 flex items-center justify-center bg-black/62 p-4 backdrop-blur-sm transition-opacity",
        "[--hud-accent:#d8e2df] [--hud-bg:#050a0f] [--hud-border:#5b6870]",
        "[--hud-surface:rgba(8,13,19,0.68)] [--hud-surface-2:rgba(18,24,31,0.72)]",
        "[--hud-text:#edf2ef] [--hud-text-dim:#9ba8a8] [--hud-border-subtle:#3f4a51]",
        visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
      onClick={() => dispatch(closeModal())}
    >
      <div
        className="hud-panel flex h-[min(88vh,760px)] w-[min(92vw,980px)] flex-col overflow-hidden border-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.20),inset_0_-1px_0_rgba(255,255,255,0.06),0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="hud-panel-header flex shrink-0 items-center justify-between gap-4 border-white/18 px-4 py-2">
          <div className="flex min-w-0 items-baseline gap-3">
            <span className="truncate font-mono text-sm font-bold uppercase tracking-widest text-(--hud-text)">
              Character Generation
            </span>
            <span className="truncate font-mono text-[10px] uppercase tracking-widest text-(--hud-text-dim)">
              Lifepath Workspace
            </span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(closeModal())}
            aria-label="Close character generation"
            className="text-(--hud-text-dim) transition-colors hover:text-(--hud-text)"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
          <CharacterCreateHudContent />
        </div>
      </div>
    </div>
  );
};

export default CharacterGenerationModal;
