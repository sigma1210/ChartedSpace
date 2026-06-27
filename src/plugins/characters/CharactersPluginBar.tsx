import { useState } from "react";
import { BriefcaseBusiness, LogOut, User, Users, UserPlus } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectHudVisible } from "@/store/selectors/hud.selectors";
import { setHudVisible } from "@/store/slices/hudSlice";
import { openModal } from "@/store/slices/uiSlice";
import { fetchShip, invalidateShip } from "@/plugins/ship";
import { fetchTurn, invalidateTurn } from "@/store/slices/turnSlice";
import { HudIconButton } from "@/components/world/HudPrimitives";
import {
  characterListHudId,
  characterProfessionalBoardHudId,
  characterProfileHudId,
} from "./metadata";
import {
  fetchCharacters,
  invalidateCharacters,
} from "./charactersSlice";

type ResignStep = "idle" | "confirming" | "resigning";

export const CharactersPluginBar = () => {
  const dispatch = useAppDispatch();
  const [resignStep, setResignStep] = useState<ResignStep>("idle");
  const [resignError, setResignError] = useState<string | null>(null);
  const profileVisible = useAppSelector(selectHudVisible(characterProfileHudId));
  const listVisible = useAppSelector(selectHudVisible(characterListHudId));
  const professionalBoardVisible = useAppSelector(selectHudVisible(characterProfessionalBoardHudId));

  const openHud = (id: string) => {
    dispatch(setHudVisible({ id, visible: true }));
  };

  const openCharacterGeneration = () => {
    dispatch(openModal("characterGeneration"));
  };

  const handleConfirmResign = async () => {
    setResignStep("resigning");
    setResignError(null);
    try {
      const res = await fetch("/api/resign", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setResignError(body.error ?? "Resign failed");
        setResignStep("idle");
        return;
      }

      const { remainingCharacters } = await res.json() as { remainingCharacters: number };

      dispatch(invalidateShip());
      dispatch(invalidateTurn());
      dispatch(invalidateCharacters());
      await Promise.all([
        dispatch(fetchShip()),
        dispatch(fetchTurn()),
        dispatch(fetchCharacters()),
      ]);

      if (remainingCharacters > 0) {
        openHud(characterListHudId);
      } else {
        openCharacterGeneration();
      }
    } finally {
      setResignStep("idle");
    }
  };

  if (resignStep === "confirming") {
    return (
      <div className="flex items-center gap-1">
        <span className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
          Resign?
        </span>
        <button
          type="button"
          onClick={handleConfirmResign}
          className="h-5 border border-(--hud-error) px-1.5 font-mono text-[8px] uppercase tracking-wider text-(--hud-error) transition-colors hover:bg-(--hud-error)/10"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setResignStep("idle")}
          className="h-5 border border-(--hud-border) px-1.5 font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-(--hud-accent)"
        >
          No
        </button>
      </div>
    );
  }

  if (resignStep === "resigning") {
    return (
      <span className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim) animate-pulse">
        Resigning…
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <HudIconButton
          title={profileVisible ? "Character profile visible" : "Open character profile"}
          onClick={() => openHud(characterProfileHudId)}
        >
          <User size={13} aria-hidden="true" />
        </HudIconButton>
        <HudIconButton
          title={listVisible ? "Character list visible" : "Open character list"}
          onClick={() => openHud(characterListHudId)}
        >
          <Users size={13} aria-hidden="true" />
        </HudIconButton>
        <HudIconButton
          title={professionalBoardVisible ? "Professional board visible" : "Open professional board"}
          onClick={() => openHud(characterProfessionalBoardHudId)}
        >
          <BriefcaseBusiness size={13} aria-hidden="true" />
        </HudIconButton>
        <HudIconButton
          title="Open character generator"
          onClick={openCharacterGeneration}
        >
          <UserPlus size={13} aria-hidden="true" />
        </HudIconButton>
        <HudIconButton
          title="Resign character"
          onClick={() => setResignStep("confirming")}
          variant="danger"
        >
          <LogOut size={13} aria-hidden="true" />
        </HudIconButton>
      </div>
      {resignError && (
        <span className="max-w-32 font-mono text-[7px] uppercase tracking-wider text-(--hud-error)">
          {resignError}
        </span>
      )}
    </div>
  );
};
