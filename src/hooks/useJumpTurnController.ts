"use client";

import "@/lib/turns/index";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectShip } from "../store/selectors/ship.selectors";
import { selectCurrentTurn } from "../store/selectors/turn.selectors";
import { selectCharacters } from "../store/selectors/character.selectors";
import { advanceTurn, fetchTurn } from "../store/slices/turnSlice";
import { fetchShip } from "../store/slices/shipSlice";
import { fetchCharacters, invalidateCharacters } from "../store/slices/characterSlice";
import {
  clearJumpDestination,
  openJumpRangeSelector,
} from "../store/slices/uiSlice";
import { refreshWorldCrew } from "../store/slices/availableCrewSlice";
import { selectJumpReadiness } from "../store/selectors/jumpReadiness.selectors";
import { roll2d6, statDM } from "../lib/dice";
import {
  fireEndTurn,
  fireStartTurn,
  fireStartJumpTurn,
  type TurnEventContext,
} from "../lib/turns/handlers";
import type { RootState } from "../store/index";

const selectPendingJumpDestination = (state: RootState) =>
  state.ui.pendingJumpDestination;

export type TurnStep =
  | "idle"
  | "plottingCourse"
  | "firingDrive"
  | "working"
  | "result";

export interface RollRecord {
  attempt?: number;
  roll: number;
  dm: number;
  total: number;
  target: number;
  success: boolean;
}

const PLOT_TARGETS = [4, 6, 8] as const;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const useJumpTurnController = () => {
  const dispatch = useAppDispatch();
  const ship = useAppSelector(selectShip);
  const currentTurn = useAppSelector(selectCurrentTurn);
  const characters = useAppSelector(selectCharacters);
  const pending = useAppSelector(selectPendingJumpDestination);
  const jumpReadiness = useAppSelector(selectJumpReadiness);

  const [step, setStep] = useState<TurnStep>("idle");
  const [, setJumpAttempt] = useState(0);
  const [plotRolls, setPlotRolls] = useState<RollRecord[]>([]);
  const [driveRoll, setDriveRoll] = useState<RollRecord | null>(null);
  const [resultMessages, setResultMessages] = useState<string[]>([]);
  const [destHex, setDestHex] = useState<string | null>(null);
  const [destSector, setDestSector] = useState<string | null>(null);
  const [destName, setDestName] = useState<string | null>(null);

  const navChar = (() => {
    const id = ship?.crew.find((c) => c.role === "navigator")?.characterId;
    return id ? characters.find((c) => c.id === id) ?? null : null;
  })();

  const engChar = (() => {
    const id = ship?.crew.find((c) => c.role === "engineer")?.characterId;
    return id ? characters.find((c) => c.id === id) ?? null : null;
  })();

  const navSkill =
    navChar?.skills.find((s) => s.name === "Navigation")?.level ?? 0;
  const navDM = navSkill + statDM(navChar?.intelligence ?? 7);

  const engSkill =
    engChar?.skills.find((s) => s.name === "Engineer")?.level ?? 0;
  const engDM = engSkill + statDM(engChar?.education ?? 7);

  const ownerCharacter = (() => {
    const id = ship?.crew.find((c) => c.isOwnerOperator)?.characterId;
    return id ? characters.find((c) => c.id === id) ?? null : null;
  })();

  const buildCtx = useCallback(
    (previousStatus: "docked" | "in_jump"): TurnEventContext | null => {
      if (!ship) return null;
      return { currentTurn, previousStatus, ship, ownerCharacter };
    },
    [currentTurn, ownerCharacter, ship],
  );

  const resetChecks = useCallback(() => {
    setPlotRolls([]);
    setDriveRoll(null);
  }, []);

  const handleRemainOnWorld = useCallback(
    async (reason?: string) => {
      if (!ship) return;
      setStep("working");

      await dispatch(
        advanceTurn({
          shipUpdate: { status: "docked", currentWorldId: ship.currentWorldId },
        }),
      );

      const ctx = buildCtx("docked");
      const messages: string[] = [];
      if (reason) messages.push(reason);

      if (ctx) {
        const endResults = await fireEndTurn(ctx);
        const startResults = await fireStartTurn({
          ...ctx,
          currentTurn: currentTurn + 1,
        });
        [...endResults, ...startResults].forEach((r) =>
          messages.push(r.description),
        );
      }

      await dispatch(fetchShip());
      await dispatch(invalidateCharacters());
      await dispatch(fetchCharacters());

      setResultMessages(messages);
      resetChecks();
      setStep("result");
      setTimeout(() => setStep("idle"), 4000);
    },
    [buildCtx, currentTurn, dispatch, resetChecks, ship],
  );

  const handleEnterJump = useCallback(async () => {
    if (!ship || !destHex || !destSector) return;
    setStep("working");

    await dispatch(
      advanceTurn({
        shipUpdate: {
          status: "in_jump",
          destinationWorldHex: destHex,
          destinationWorldSectorAbbr: destSector,
          jumpArrivesTurn: currentTurn + 1,
        },
      }),
    );

    const ctx = buildCtx("docked");
    const messages: string[] = [
      `Jump drive engaged. En route to ${destName ?? destHex}.`,
    ];

    if (ctx) {
      const results = await fireStartJumpTurn({
        ...ctx,
        currentTurn: currentTurn + 1,
      });
      results.forEach((r) => messages.push(r.description));
    }

    await dispatch(fetchShip());

    setResultMessages(messages);
    setDestHex(null);
    setDestSector(null);
    setDestName(null);
    resetChecks();
    setStep("result");
    setTimeout(() => setStep("idle"), 4000);
  }, [
    buildCtx,
    currentTurn,
    destHex,
    destName,
    destSector,
    dispatch,
    resetChecks,
    ship,
  ]);

  const handleProceed = useCallback(async () => {
    if (!ship) return;
    setStep("working");

    await dispatch(
      advanceTurn({
        shipUpdate: {
          status: "docked",
          currentWorldId: ship.destinationWorldId,
          jumpArrivesTurn: null,
        },
      }),
    );

    const ctx = buildCtx("in_jump");
    const messages: string[] = ["Jump complete. Arrived at destination."];

    if (ctx) {
      const endResults = await fireEndTurn(ctx);
      const startResults = await fireStartTurn({
        ...ctx,
        currentTurn: currentTurn + 1,
      });
      [...endResults, ...startResults].forEach((r) =>
        messages.push(r.description),
      );
    }

    await dispatch(fetchShip());
    await dispatch(invalidateCharacters());
    await dispatch(fetchCharacters());
    dispatch(refreshWorldCrew());

    setResultMessages(messages);
    setStep("result");
    setTimeout(() => setStep("idle"), 4000);
  }, [buildCtx, currentTurn, dispatch, ship]);

  const openJumpSelector = useCallback(() => {
    dispatch(openJumpRangeSelector());
  }, [dispatch]);

  useEffect(() => {
    if (!pending || step !== "idle") return;

    /*
     * This is an event handoff from the jump range modal into this local
     * state machine. Keeping the destination in local state lets the modal
     * close and the UI slice clear its transient pending value while plotting
     * and drive checks continue to run.
     */
    /* eslint-disable react-hooks/set-state-in-effect */
    setDestHex(pending.hex);
    setDestSector(pending.sectorAbbr);
    setDestName(pending.name);
    setStep("plottingCourse");
    setJumpAttempt(0);
    setPlotRolls([]);
    /* eslint-enable react-hooks/set-state-in-effect */
    dispatch(clearJumpDestination());
  }, [pending, step, dispatch]);

  const isPlotting = useRef(false);

  useEffect(() => {
    if (step !== "plottingCourse" || isPlotting.current) return;
    isPlotting.current = true;

    const runPlot = async () => {
      for (let i = 0; i < 3; i++) {
        const target = PLOT_TARGETS[i];
        const raw = roll2d6();
        const total = raw + navDM;
        const success = total >= target;

        const record: RollRecord = {
          attempt: i + 1,
          roll: raw,
          dm: navDM,
          total,
          target,
          success,
        };
        setPlotRolls((prev) => [...prev, record]);
        setJumpAttempt(i + 1);

        await delay(1000);

        if (success) {
          setStep("firingDrive");
          isPlotting.current = false;
          return;
        }
      }

      isPlotting.current = false;
      await handleRemainOnWorld(
        "Navigation failed after 3 attempts. Remaining on world.",
      );
    };

    runPlot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const isFiring = useRef(false);

  useEffect(() => {
    if (step !== "firingDrive" || isFiring.current) return;
    isFiring.current = true;

    const runDrive = async () => {
      await delay(600);
      const raw = roll2d6();
      const total = raw + engDM;
      const success = total >= 4;

      const record: RollRecord = {
        roll: raw,
        dm: engDM,
        total,
        target: 4,
        success,
      };
      setDriveRoll(record);

      await delay(1000);

      if (success) {
        isFiring.current = false;
        await handleEnterJump();
      } else {
        isFiring.current = false;
        await handleRemainOnWorld(
          "Misjump! Jump drive failure. Remaining on world.",
        );
      }
    };

    runDrive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    dispatch(fetchTurn());
  }, [dispatch]);

  return {
    currentTurn,
    driveRoll,
    handleProceed,
    handleRemainOnWorld,
    isInJump: ship?.status === "in_jump",
    jumpReadiness,
    openJumpSelector,
    plotRolls,
    resultMessages,
    ship,
    step,
  };
};
