"use client";

import { ChevronLeft } from "lucide-react";
import HudModal from "./HudModal";
import { useAppDispatch } from "../../store/hooks";
import { goBack } from "../../store/slices/uiSlice";

const STAT_FIELDS = [
  { key: "strength",       label: "STR" },
  { key: "dexterity",      label: "DEX" },
  { key: "endurance",      label: "END" },
  { key: "intelligence",   label: "INT" },
  { key: "education",      label: "EDU" },
  { key: "socialStanding", label: "SOC" },
] as const;

const CharacterCreateModal = () => {
  const dispatch = useAppDispatch();

  const headerRight = (
    <button
      onClick={() => dispatch(goBack())}
      className="flex items-center gap-1 border border-(--hud-border) px-2 py-0.5 text-[10px] uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) transition-colors"
    >
      <ChevronLeft size={10} />
      Back
    </button>
  );

  return (
    <HudModal title="New Character" headerRight={headerRight}>
      <form className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
            Character Name
          </label>
          <input
            type="text"
            placeholder="Enter name…"
            className="border border-(--hud-border) bg-(--hud-surface-2) px-3 py-2 font-mono text-sm text-(--hud-text) placeholder:text-(--hud-text-dim) focus:border-(--hud-accent) focus:outline-none"
          />
        </div>

        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
            UPP Stats (2–15)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {STAT_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
                  {label}
                </label>
                <input
                  type="number"
                  min={2}
                  max={15}
                  defaultValue={7}
                  className="border border-(--hud-border) bg-(--hud-surface-2) px-3 py-2 font-mono text-sm text-(--hud-text) focus:border-(--hud-accent) focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
            Starting Credits
          </label>
          <input
            type="number"
            min={0}
            defaultValue={1000}
            className="border border-(--hud-border) bg-(--hud-surface-2) px-3 py-2 font-mono text-sm text-(--hud-text) focus:border-(--hud-accent) focus:outline-none"
          />
        </div>

        <div className="flex justify-end border-t border-(--hud-border-subtle) pt-3">
          <button
            type="submit"
            className="border border-(--hud-accent) bg-(--hud-accent) px-6 py-2 text-xs uppercase tracking-wider text-(--hud-bg) hover:opacity-90 transition-opacity"
          >
            Create Character
          </button>
        </div>
      </form>
    </HudModal>
  );
}
export default CharacterCreateModal
