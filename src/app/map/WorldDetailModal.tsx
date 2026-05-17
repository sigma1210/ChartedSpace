"use client";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectActiveModal } from "../../store/selectors/ui.selectors";
import { selectActiveWorld, selectActiveWorldTradeLabels, selectActiveWorldCost } from "../../store/selectors/galaxy.selectors";
import { closeModal } from "../../store/slices/uiSlice";
import CreditsBadge from "../../components/ui/CreditsBadge";


const travelZoneLabel = (zone: string) => {
  if (zone === "A") return { text: "Amber", color: "var(--hud-warning)" };
  if (zone === "R") return { text: "Red",   color: "var(--hud-error)" };
  return null;
};

const WorldDetailModal = () => {
  const dispatch = useAppDispatch();
  const activeModal = useAppSelector(selectActiveModal);
  const world = useAppSelector(selectActiveWorld);
  const tradeLabels = useAppSelector(selectActiveWorldTradeLabels);
  const cost = useAppSelector(selectActiveWorldCost);

  if (activeModal !== "systemDetail" || !world) return null;

  const zone = travelZoneLabel(world.travelZone);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => dispatch(closeModal())}
    >
      <div
        className="hud-panel w-105 max-h-[80vh] overflow-y-auto flex flex-col gap-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-base font-bold uppercase tracking-widest text-(--hud-text)">
              {world.name}
            </span>
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {tradeLabels.map((label) => (
                <span
                  key={label}
                  className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-(--hud-border) text-(--hud-text-dim) bg-(--hud-surface-2)"
                >
                  {label}
                </span>
              ))}
              {zone && (
                <span
                  className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 font-bold"
                  style={{ color: zone.color, border: `1px solid ${zone.color}` }}
                >
                  {zone.text} Zone
                </span>
              )}
            </div>
            {cost !== null && (
              <div className="flex flex-col gap-0.5 mt-1">
                <span className="font-mono text-[9px] uppercase tracking-wider text-(--hud-text-dim)">Suspected Price</span>
                <CreditsBadge amount={cost} />
              </div>
            )}
          </div>
          <button
            onClick={() => dispatch(closeModal())}
            className="font-mono text-xs text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
          >
            ✕
          </button>
        </div>

        {/* UWP */}
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-(--hud-text-dim)">UWP</span>
          <span className="font-mono text-sm tracking-widest text-(--hud-accent)">{world.uwp.raw}</span>
        </div>



      </div>
    </div>
  );
};
export default WorldDetailModal;
