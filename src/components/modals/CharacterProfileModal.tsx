"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Check, Loader2 } from "lucide-react";
import HudModal from "./HudModal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { closeModal, goBack } from "../../store/slices/uiSlice";
import { fetchCharacters, invalidateCharacters, updateCharacterInList } from "../../store/slices/characterSlice";
import { fetchShip, invalidateShip } from "../../store/slices/shipSlice";
import { selectCurrentCharacter } from "../../store/selectors/character.selectors";
import { selectActiveModal } from "../../store/selectors/ui.selectors";
import { selectShip } from "../../store/selectors/ship.selectors";

const STAT_LABELS = ["STR", "DEX", "END", "INT", "EDU", "SOC"] as const;
const STAT_MAX = 15;

const StatBar = ({ label, value }: { label: string; value: number }) => {
  const pct = Math.min(100, (value / STAT_MAX) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 font-mono text-[10px] text-(--hud-text-dim) uppercase">{label}</span>
      <span className="w-4 font-mono text-xs text-(--hud-text)">{value}</span>
      <div className="flex-1 h-1.5 bg-(--hud-surface) rounded-full overflow-hidden">
        <div
          className="h-full bg-(--hud-accent) rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const UNNAMED = "Unnamed Traveller";

const CharacterProfileModal = () => {
  const dispatch = useAppDispatch();
  const activeModal = useAppSelector(selectActiveModal);
  const char = useAppSelector(selectCurrentCharacter);
  const ship = useAppSelector(selectShip);

  const [nameInput,  setNameInput]  = useState("");
  const [saveState,  setSaveState]  = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [playState,  setPlayState]  = useState<"idle" | "playing" | "error">("idle");

  useEffect(() => {
    setNameInput("");
    setSaveState("idle");
  }, [char?.id]);

  if (activeModal !== "characterProfile") return null;
  if (!char) return null;

  const isUnnamed = char.name === UNNAMED;
  const stats = [
    char.strength, char.dexterity, char.endurance,
    char.intelligence, char.education, char.socialStanding,
  ];

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || saveState === "saving") return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/characters/${char.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) { setSaveState("error"); return; }
      dispatch(updateCharacterInList({ id: char.id, name: trimmed }));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const handlePlayAsCaptain = async () => {
    if (!char || playState === "playing") return;
    setPlayState("playing");
    try {
      const res = await fetch(`/api/characters/${char.id}/play`, { method: "POST" });
      if (!res.ok) { setPlayState("error"); return; }
      dispatch(invalidateShip());
      dispatch(invalidateCharacters());
      await dispatch(fetchShip());
      await dispatch(fetchCharacters());
      dispatch(closeModal());
    } catch {
      setPlayState("error");
    } finally {
      setPlayState("idle");
    }
  };

  const headerRight = (
    <button
      onClick={() => dispatch(goBack())}
      className="flex items-center gap-1 border border-(--hud-border) px-2 py-0.5 text-[10px] uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) transition-colors"
    >
      <ChevronLeft size={10} />
      Back
    </button>
  );

  const title = isUnnamed && saveState === "saved" ? nameInput.trim() : char.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => dispatch(closeModal())}>
      <div className="w-full max-w-lg px-4" onClick={e => e.stopPropagation()}>
        <HudModal title={title} headerRight={headerRight}>

          {/* Name prompt for unnamed characters */}
          {isUnnamed && saveState !== "saved" && (
            <div className="border-b border-(--hud-border) p-3 flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
                Name this traveller
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSaveName()}
                  placeholder="Enter name…"
                  autoFocus
                  className="flex-1 border border-(--hud-border) bg-(--hud-surface-2) px-3 py-1.5 font-mono text-sm text-(--hud-text) placeholder:text-(--hud-text-dim) focus:border-(--hud-accent) focus:outline-none"
                />
                <button
                  onClick={handleSaveName}
                  disabled={!nameInput.trim() || saveState === "saving"}
                  className="flex items-center gap-1 border border-(--hud-accent) px-3 py-1.5 text-xs uppercase tracking-wider text-(--hud-accent) hover:bg-(--hud-accent) hover:text-(--hud-bg) transition-colors disabled:opacity-40"
                >
                  {saveState === "saving"
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Check size={12} />}
                  Save
                </button>
              </div>
              {saveState === "error" && (
                <p className="text-[10px] text-(--hud-error)">Failed to save — try again</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 divide-x divide-(--hud-border)">
            {/* Left — UPP + credits */}
            <div className="flex flex-col gap-4 p-3">
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
                  Universal Person Profile
                </p>
                <p className="font-mono text-lg text-(--hud-text) tracking-widest mb-3">{char.upp}</p>
                <div className="flex flex-col gap-1.5">
                  {STAT_LABELS.map((label, i) => (
                    <StatBar key={label} label={label} value={stats[i]} />
                  ))}
                </div>
              </div>
              <div className="border-t border-(--hud-border-subtle) pt-3">
                <p className="text-[10px] uppercase tracking-wider text-(--hud-text-dim)">Credits</p>
                <p className="font-mono text-sm text-(--hud-text) mt-1">
                  Cr {char.credits.toLocaleString()}
                </p>
              </div>

              {!ship && (
                <div className="border-t border-(--hud-border-subtle) pt-3 flex flex-col gap-1.5">
                  <button
                    onClick={handlePlayAsCaptain}
                    disabled={playState === "playing"}
                    className="w-full border border-(--hud-accent) px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-(--hud-accent) hover:bg-(--hud-accent)/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {playState === "playing" ? "Launching…" : "Play as Captain"}
                  </button>
                  {playState === "error" && (
                    <p className="text-[10px] text-(--hud-error)">Failed — try again</p>
                  )}
                </div>
              )}
            </div>

            {/* Right — location + skills */}
            <div className="flex flex-col divide-y divide-(--hud-border)">
              <div className="p-3">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
                  Current Location
                </p>
                {char.worldName ? (
                  <>
                    <p className="font-mono text-sm text-(--hud-text)">◉ {char.worldName}</p>
                    <p className="text-xs text-(--hud-text-dim) mt-0.5">
                      {char.sectorAbbr} · Hex {char.hex}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-(--hud-text-dim)">No location set</p>
                )}
              </div>

              <div className="p-3 flex-1">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
                  Skills
                </p>
                {char.skills.length === 0 ? (
                  <p className="text-xs text-(--hud-text-dim)">No skills recorded</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {char.skills.map(s => (
                      <li key={s.name} className="flex justify-between text-xs">
                        <span className="text-(--hud-text)">{s.name}</span>
                        <span className="font-mono text-(--hud-text-dim)">··· {s.level}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

        </HudModal>
      </div>
    </div>
  );
};

export default CharacterProfileModal;
