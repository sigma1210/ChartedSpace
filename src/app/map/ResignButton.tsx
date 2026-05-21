"use client";

import { useState } from "react";
import { useAppDispatch } from "../../store/hooks";
import { invalidateShip } from "../../store/slices/shipSlice";
import { invalidateTurn } from "../../store/slices/turnSlice";
import { fetchCharacters, invalidateCharacters } from "../../store/slices/characterSlice";
import { openCharacterCreate, openCharacterList } from "../../store/slices/uiSlice";

type Step = "idle" | "confirming" | "resigning";

const ResignButton = () => {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState<Step>("idle");

  const handleConfirm = async () => {
    setStep("resigning");
    try {
      const res = await fetch("/api/resign", { method: "POST" });
      if (!res.ok) { setStep("idle"); return; }

      const { remainingCharacters } = await res.json() as { remainingCharacters: number };

      dispatch(invalidateShip());
      dispatch(invalidateTurn());
      dispatch(invalidateCharacters());
      await dispatch(fetchCharacters());

      if (remainingCharacters > 0) {
        dispatch(openCharacterList());
      } else {
        dispatch(openCharacterCreate());
      }
    } finally {
      setStep("idle");
    }
  };

  if (step === "confirming") {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
          Resign and restart?
        </span>
        <button
          onClick={handleConfirm}
          className="border border-(--hud-error) px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-(--hud-error) hover:bg-(--hud-error)/10 transition-colors"
        >
          Confirm
        </button>
        <button
          onClick={() => setStep("idle")}
          className="border border-(--hud-border) px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-(--hud-text-dim) hover:border-(--hud-accent) transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (step === "resigning") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider text-(--hud-text-dim) animate-pulse">
        Resigning…
      </span>
    );
  }

  return (
    <button
      onClick={() => setStep("confirming")}
      className="border border-(--hud-border) px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-(--hud-text-dim) hover:border-(--hud-error) hover:text-(--hud-error) transition-colors"
    >
      Resign
    </button>
  );
};

export default ResignButton;
