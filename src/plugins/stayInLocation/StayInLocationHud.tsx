"use client";

import { Clock3, Trash2 } from "lucide-react";
import {
  hudActionButtonClass,
  useCoreCurrentTurn,
  useCoreTurnAdvanceBusy,
  usePluginActionRunner,
  usePluginDispatch,
  usePluginSelector,
} from "@/plugin-api";
import {
  clearStayInLocationDebugRuns,
  setStayInLocationBlockBeforeTurnAdvance,
  setStayInLocationDebugEnabled,
} from "./stayInLocationSlice";
import {
  selectStayInLocationActiveDebugRun,
  selectStayInLocationBlockBeforeTurnAdvance,
  selectStayInLocationDebugEnabled,
  selectStayInLocationLastPressedTurn,
  selectStayInLocationPressedTurnNumbers,
} from "./selectors";
import {
  stayInLocationAdvanceTurnActionId,
  stayInLocationPluginId,
} from "./metadata";

export const StayInLocationHudContent = () => {
  const dispatch = usePluginDispatch();
  const runPluginAction = usePluginActionRunner();
  const currentTurn = useCoreCurrentTurn();
  const pressedTurnNumbers = usePluginSelector(selectStayInLocationPressedTurnNumbers);
  const lastPressedTurn = usePluginSelector(selectStayInLocationLastPressedTurn);
  const debugEnabled = usePluginSelector(selectStayInLocationDebugEnabled);
  const blockBeforeTurnAdvance = usePluginSelector(selectStayInLocationBlockBeforeTurnAdvance);
  const activeDebugRun = usePluginSelector(selectStayInLocationActiveDebugRun);
  const busy = useCoreTurnAdvanceBusy();

  const handleAdvanceTurn = () => {
    if (busy) return;
    runPluginAction(stayInLocationPluginId, stayInLocationAdvanceTurnActionId);
  };

  return (
    <div className="max-h-[42vh] w-52 space-y-2 overflow-hidden py-1">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
        <span className="text-(--hud-text-dim)">Current Turn</span>
        <span className="text-right text-(--hud-text)">{currentTurn}</span>
        <span className="text-(--hud-text-dim)">Plugin Uses</span>
        <span className="text-right text-(--hud-text)">{pressedTurnNumbers.length}</span>
        <span className="text-(--hud-text-dim)">Last Press</span>
        <span className="text-right text-(--hud-text)">
          {lastPressedTurn ?? "None"}
        </span>
      </div>
      <button
        type="button"
        onClick={handleAdvanceTurn}
        disabled={busy}
        className={`${hudActionButtonClass} w-full`}
      >
        <Clock3 size={12} aria-hidden="true" />
        {busy ? "Advancing" : "Advance Turn"}
      </button>
      <div className="border-t border-(--hud-border) pt-2">
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-(--hud-text-dim)">
            <input
              type="checkbox"
              checked={debugEnabled}
              onChange={(event) => dispatch(setStayInLocationDebugEnabled(event.currentTarget.checked))}
              className="h-3 w-3 accent-(--hud-accent)"
            />
            Debug
          </label>
          <button
            type="button"
            onClick={() => dispatch(clearStayInLocationDebugRuns())}
            className="inline-flex h-6 w-6 items-center justify-center border border-(--hud-border) text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text)"
            title="Clear workflow trace"
            aria-label="Clear workflow trace"
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        </div>
        {debugEnabled && (
          <label className="mt-2 flex items-center gap-2 text-[9px] uppercase tracking-widest text-(--hud-text-dim)">
            <input
              type="checkbox"
              checked={blockBeforeTurnAdvance}
              onChange={(event) => dispatch(setStayInLocationBlockBeforeTurnAdvance(event.currentTarget.checked))}
              className="h-3 w-3 accent-(--hud-accent)"
            />
            Block before turn
          </label>
        )}
        {activeDebugRun ? (
          <div className="mt-2 max-h-24 overscroll-contain overflow-y-auto pr-1 font-mono text-[8px] leading-4">
            {activeDebugRun.checkpoints.map((checkpoint) => (
              <div
                key={`${activeDebugRun.id}-${checkpoint.sequence}`}
                className="grid grid-cols-[1.5rem_1fr] gap-1 text-(--hud-text-dim)"
              >
                <span className="text-(--hud-accent)">
                  {String(checkpoint.sequence + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="text-(--hud-text)">{checkpoint.label}</span>
                  {checkpoint.summary ? ` - ${checkpoint.summary}` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 font-mono text-[8px] uppercase tracking-widest text-(--hud-text-dim)">
            No trace
          </div>
        )}
      </div>
    </div>
  );
};
