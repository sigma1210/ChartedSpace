"use client";

import "@/lib/turns/index";
import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectShip } from "../../store/selectors/ship.selectors";
import { selectCurrentTurn } from "../../store/selectors/turn.selectors";
import { selectCharacters } from "../../store/selectors/character.selectors";
import { advanceTurn, fetchTurn } from "../../store/slices/turnSlice";
import { fetchShip } from "../../store/slices/shipSlice";
import { fetchCharacters, invalidateCharacters } from "../../store/slices/characterSlice";
import { openJumpRangeSelector, clearJumpDestination } from "../../store/slices/uiSlice";
import { refreshWorldCrew } from "../../store/slices/availableCrewSlice";
import { selectJumpReadiness } from "../../store/selectors/jumpReadiness.selectors";
import { roll2d6, statDM } from "../../lib/dice";
import {
  fireEndTurn,
  fireStartTurn,
  fireStartJumpTurn,
  type TurnEventContext,
} from "../../lib/turns/handlers";
import type { RootState } from "../../store/index";

const selectPendingJumpDestination = (state: RootState) => state.ui.pendingJumpDestination;

type TurnStep =
  | "idle"
  | "plottingCourse"
  | "firingDrive"
  | "working"
  | "result";

interface RollRecord {
  attempt?: number;
  roll:     number;
  dm:       number;
  total:    number;
  target:   number;
  success:  boolean;
}

const PLOT_TARGETS = [4, 6, 8] as const;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const TurnCard = () => {
  const dispatch      = useAppDispatch();
  const ship          = useAppSelector(selectShip);
  const currentTurn   = useAppSelector(selectCurrentTurn);
  const characters    = useAppSelector(selectCharacters);
  const pending       = useAppSelector(selectPendingJumpDestination);
  const jumpReadiness = useAppSelector(selectJumpReadiness);

  const [collapsed,      setCollapsed]      = useState(false);
  const [step,           setStep]           = useState<TurnStep>("idle");
  const [jumpAttempt,    setJumpAttempt]    = useState(0);
  const [plotRolls,      setPlotRolls]      = useState<RollRecord[]>([]);
  const [driveRoll,      setDriveRoll]      = useState<RollRecord | null>(null);
  const [resultMessages, setResultMessages] = useState<string[]>([]);
  const [destHex,        setDestHex]        = useState<string | null>(null);
  const [destSector,     setDestSector]     = useState<string | null>(null);
  const [destName,       setDestName]       = useState<string | null>(null);

  // ─── Crew DMs ────────────────────────────────────────────────────────────────

  const navChar = (() => {
    const id = ship?.crew.find(c => c.role === "navigator")?.characterId;
    return id ? characters.find(c => c.id === id) ?? null : null;
  })();

  const engChar = (() => {
    const id = ship?.crew.find(c => c.role === "engineer")?.characterId;
    return id ? characters.find(c => c.id === id) ?? null : null;
  })();

  const navSkill = navChar?.skills.find(s => s.name === "Navigation")?.level ?? 0;
  const navDM    = navSkill + statDM(navChar?.intelligence ?? 7);

  const engSkill = engChar?.skills.find(s => s.name === "Engineer")?.level ?? 0;
  const engDM    = engSkill + statDM(engChar?.education ?? 7);

  // ─── Owner character ─────────────────────────────────────────────────────────

  const ownerCharacter = (() => {
    const id = ship?.crew.find(c => c.isOwnerOperator)?.characterId;
    return id ? characters.find(c => c.id === id) ?? null : null;
  })();

  // ─── Turn event context ───────────────────────────────────────────────────────

  const buildCtx = (previousStatus: "docked" | "in_jump"): TurnEventContext | null => {
    if (!ship) return null;
    return { currentTurn, previousStatus, ship, ownerCharacter };
  };

  // ─── Watch for jump destination selected via modal ───────────────────────────

  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  useEffect(() => {
    if (!pending || step !== "idle") return;
    setDestHex(pending.hex);
    setDestSector(pending.sectorAbbr);
    setDestName(pending.name);
    dispatch(clearJumpDestination());
    setStep("plottingCourse");
    setJumpAttempt(0);
    setPlotRolls([]);
  }, [pending, step, dispatch]);

  // ─── Course plotting ──────────────────────────────────────────────────────────

  const isPlotting = useRef(false);

  useEffect(() => {
    if (step !== "plottingCourse" || isPlotting.current) return;
    isPlotting.current = true;

    const runPlot = async () => {
      for (let i = 0; i < 3; i++) {
        const target  = PLOT_TARGETS[i];
        const raw     = roll2d6();
        const total   = raw + navDM;
        const success = total >= target;

        const record: RollRecord = { attempt: i + 1, roll: raw, dm: navDM, total, target, success };
        setPlotRolls(prev => [...prev, record]);
        setJumpAttempt(i + 1);

        await delay(1000);

        if (success) {
          setStep("firingDrive");
          isPlotting.current = false;
          return;
        }
      }

      // All 3 attempts failed — remain on world
      isPlotting.current = false;
      await handleRemainOnWorld("Navigation failed after 3 attempts. Remaining on world.");
    };

    runPlot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── Jump drive firing ────────────────────────────────────────────────────────

  const isFiring = useRef(false);

  useEffect(() => {
    if (step !== "firingDrive" || isFiring.current) return;
    isFiring.current = true;

    const runDrive = async () => {
      await delay(600);
      const raw     = roll2d6();
      const total   = raw + engDM;
      const success = total >= 4;

      const record: RollRecord = { roll: raw, dm: engDM, total, target: 4, success };
      setDriveRoll(record);

      await delay(1000);

      if (success) {
        isFiring.current = false;
        await handleEnterJump();
      } else {
        isFiring.current = false;
        await handleRemainOnWorld("Misjump! Jump drive failure. Remaining on world.");
      }
    };

    runDrive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── Remain on world ─────────────────────────────────────────────────────────

  const handleRemainOnWorld = async (reason?: string) => {
    if (!ship) return;
    setStep("working");

    await dispatch(advanceTurn({
      shipUpdate: { status: "docked", currentWorldId: ship.currentWorldId },
    }));

    const ctx = buildCtx("docked");
    const messages: string[] = [];
    if (reason) messages.push(reason);

    if (ctx) {
      const endResults   = await fireEndTurn(ctx);
      const startResults = await fireStartTurn({ ...ctx, currentTurn: currentTurn + 1 });
      [...endResults, ...startResults].forEach(r => messages.push(r.description));
    }

    await dispatch(fetchShip());
    await dispatch(invalidateCharacters());
    await dispatch(fetchCharacters());

    setResultMessages(messages);
    setPlotRolls([]);
    setDriveRoll(null);
    setStep("result");
    setTimeout(() => setStep("idle"), 4000);
  };

  // ─── Enter jump ───────────────────────────────────────────────────────────────

  const handleEnterJump = async () => {
    if (!ship || !destHex || !destSector) return;
    setStep("working");

    await dispatch(advanceTurn({
      shipUpdate: {
        status:                    "in_jump",
        destinationWorldHex:       destHex,
        destinationWorldSectorAbbr: destSector,
        jumpArrivesTurn:           currentTurn + 1,
      },
    }));

    const ctx = buildCtx("docked");
    const messages: string[] = [`Jump drive engaged. En route to ${destName ?? destHex}.`];

    if (ctx) {
      const results = await fireStartJumpTurn({ ...ctx, currentTurn: currentTurn + 1 });
      results.forEach(r => messages.push(r.description));
    }

    await dispatch(fetchShip());

    setResultMessages(messages);
    setDestHex(null);
    setDestSector(null);
    setDestName(null);
    setPlotRolls([]);
    setDriveRoll(null);
    setStep("result");
    setTimeout(() => setStep("idle"), 4000);
  };

  // ─── Proceed (exit jump) ───────────────────────────────────────────────────

  const handleProceed = async () => {
    if (!ship) return;
    setStep("working");

    await dispatch(advanceTurn({
      shipUpdate: {
        status:            "docked",
        currentWorldId:    ship.destinationWorldId,
        jumpArrivesTurn:   null,
      },
    }));

    const ctx = buildCtx("in_jump");
    const messages: string[] = ["Jump complete. Arrived at destination."];

    if (ctx) {
      const endResults   = await fireEndTurn(ctx);
      const startResults = await fireStartTurn({ ...ctx, currentTurn: currentTurn + 1 });
      [...endResults, ...startResults].forEach(r => messages.push(r.description));
    }

    await dispatch(fetchShip());
    await dispatch(invalidateCharacters());
    await dispatch(fetchCharacters());
    dispatch(refreshWorldCrew());

    setResultMessages(messages);
    setStep("result");
    setTimeout(() => setStep("idle"), 4000);
  };

  // ─── Fetch turn on mount ───────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchTurn());
  }, [dispatch]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (!ship) return null;

  const isInJump = ship.status === "in_jump";

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
                onClick={() => dispatch(openJumpRangeSelector())}
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
