"use client";

import { useState } from "react";
import { useJumpTurnController } from "../../hooks/useJumpTurnController";

const TurnCard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    currentTurn,
    driveRoll,
    handleProceed,
    handleRemainOnWorld,
    isInJump,
    jumpReadiness,
    openJumpSelector,
    plotRolls,
    resultMessages,
    ship,
    step,
  } = useJumpTurnController();

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (!ship) return null;

  return (
    <div className="hud-panel flex flex-col gap-2 p-3 w-52">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="hud-panel-header flex items-center justify-between w-full"
      >
        <span>◈ Turn {currentTurn}</span>
        <span className="text-(--hud-text-dim)">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed && (
        <>
          {/* Status badge */}
          <div className="font-mono text-xs uppercase tracking-widest">
            <span className={isInJump ? "text-(--hud-text-dim)" : "text-(--hud-accent)"}>
              {isInJump ? "In Jump" : "Docked"}
            </span>
            {isInJump && ship.destinationWorldId && (
              <span className="ml-2 text-(--hud-text-dim)">→ …</span>
            )}
          </div>

          {/* Working spinner */}
          {step === "working" && (
            <p className="animate-pulse font-mono text-xs uppercase tracking-widest text-(--hud-text-dim)">
              Processing…
            </p>
          )}

          {/* Course plotting display */}
          {(step === "plottingCourse" || (step === "firingDrive" && plotRolls.length > 0)) && (
            <div className="flex flex-col gap-1">
              <p className="font-mono text-xs uppercase tracking-widest text-(--hud-text-dim)">
                Navigation Check
              </p>
              {plotRolls.map((r, i) => (
                <p key={i} className={`font-mono text-xs ${r.success ? "text-(--hud-accent)" : "text-(--hud-error)"}`}>
                  Attempt {r.attempt}: {r.roll}{r.dm !== 0 ? (r.dm > 0 ? `+${r.dm}` : `${r.dm}`) : ""}={r.total} vs {r.target}+
                  {r.success ? " ✓" : " ✗"}
                </p>
              ))}
            </div>
          )}

          {/* Jump drive display */}
          {driveRoll && (
            <div className="flex flex-col gap-1">
              <p className="font-mono text-xs uppercase tracking-widest text-(--hud-text-dim)">
                Jump Drive Check
              </p>
              <p className={`font-mono text-xs ${driveRoll.success ? "text-(--hud-accent)" : "text-(--hud-error)"}`}>
                {driveRoll.roll}{driveRoll.dm !== 0 ? (driveRoll.dm > 0 ? `+${driveRoll.dm}` : `${driveRoll.dm}`) : ""}={driveRoll.total} vs {driveRoll.target}+
                {driveRoll.success ? " ✓" : " ✗"}
              </p>
            </div>
          )}

          {/* Result messages */}
          {step === "result" && resultMessages.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-(--hud-border) pt-2">
              {resultMessages.map((msg, i) => (
                <p key={i} className="font-mono text-xs text-(--hud-text-dim) leading-relaxed">
                  {msg}
                </p>
              ))}
            </div>
          )}

          {/* Actions */}
          {step === "idle" && !isInJump && (
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => handleRemainOnWorld()}
                className="w-full font-mono text-xs uppercase tracking-widest border border-(--hud-border) text-(--hud-text-dim) hover:text-(--hud-text) hover:border-(--hud-accent) px-2 py-1.5 transition-colors"
              >
                Remain on World
              </button>
              <button
                onClick={openJumpSelector}
                disabled={!jumpReadiness.canJump}
                className="w-full font-mono text-xs uppercase tracking-widest border border-(--hud-accent) text-(--hud-accent) hover:bg-(--hud-accent) hover:text-(--hud-bg) px-2 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-(--hud-accent)"
              >
                Jump
              </button>
              {!jumpReadiness.canJump && jumpReadiness.reasons.map((r, i) => (
                <p key={i} className="font-mono text-[10px] text-(--hud-error) leading-snug">
                  ✗ {r}
                </p>
              ))}
            </div>
          )}

          {step === "idle" && isInJump && (
            <button
              onClick={handleProceed}
              className="w-full font-mono text-xs uppercase tracking-widest border border-(--hud-accent) text-(--hud-accent) hover:bg-(--hud-accent) hover:text-(--hud-bg) px-2 py-1.5 transition-colors"
            >
              Proceed
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default TurnCard;
