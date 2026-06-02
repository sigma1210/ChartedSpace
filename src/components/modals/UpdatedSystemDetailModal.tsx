"use client";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { closeModal } from "../../store/slices/uiSlice";
import { selectActiveModal } from "../../store/selectors/ui.selectors";
import { selectActiveWorld } from "../../store/selectors/galaxy.selectors";
import StarSystemView from "../world/StarSystemView";

const UpdatedSystemDetailModal = () => {
  const dispatch    = useAppDispatch();
  const activeModal = useAppSelector(selectActiveModal);
  const world       = useAppSelector(selectActiveWorld);

  if (activeModal !== "updatedSystemDetail" || !world) return null;

  const stars = Array.isArray(world.stellar) ? world.stellar : [];
  const systemType =
    stars.length === 1 ? "Single Star"
    : stars.length === 2 ? "Binary System"
    : stars.length >= 3 ? "Trinary System"
    : "Unknown";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => dispatch(closeModal())}
    >
      <div
        className="hud-panel flex flex-col w-225 max-w-[92vw] h-165 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hud-panel-header flex items-center justify-between px-4 py-2 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold uppercase tracking-widest text-(--hud-text)">
              {world.name}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-(--hud-text-dim)">
              {systemType}
            </span>
            {stars.length > 0 && (
              <span className="font-mono text-[10px] text-(--hud-text-dim)">
                {stars.join("  ·  ")}
              </span>
            )}
            <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-(--hud-accent) text-(--hud-accent)">
              Updated
            </span>
          </div>
          <button
            onClick={() => dispatch(closeModal())}
            className="font-mono text-xs text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <StarSystemView world={world} />
        </div>
      </div>
    </div>
  );
};

export default UpdatedSystemDetailModal;
