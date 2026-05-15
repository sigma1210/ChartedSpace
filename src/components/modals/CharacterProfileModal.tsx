"use client";

import { ChevronLeft, Pencil } from "lucide-react";
import HudModal from "./HudModal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { goBack } from "../../store/slices/uiSlice";
import { selectActiveCharacterId } from "../../store/selectors/ui.selectors";

const STAT_LABELS = ["STR", "DEX", "END", "INT", "EDU", "SOC"] as const;
const STAT_MAX = 15;

function StatBar({ label, value }: { label: string; value: number }) {
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
}

// Placeholder — will be replaced with server data
const PLACEHOLDER = {
  name: "— No character selected —",
  strength: 7, dexterity: 7, endurance: 7,
  intelligence: 7, education: 7, socialStanding: 7,
  credits: 0,
  skills: [] as { name: string; level: number }[],
  worldName: null as string | null,
  sectorName: null as string | null,
  sectorAbbr: null as string | null,
  hex: null as string | null,
  subsectorName: null as string | null,
  locationLog: [] as { arrivedAt: string; worldName: string; sectorAbbr: string; hex: string }[],
};

export default function CharacterProfileModal() {
  const dispatch = useAppDispatch();
  const characterId = useAppSelector(selectActiveCharacterId);
  const char = PLACEHOLDER;

  const upp = [
    char.strength, char.dexterity, char.endurance,
    char.intelligence, char.education, char.socialStanding,
  ]
    .map((v) => v.toString(16).toUpperCase())
    .join("");

  const headerRight = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => dispatch(goBack())}
        className="flex items-center gap-1 border border-(--hud-border) px-2 py-0.5 text-[10px] uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) transition-colors"
      >
        <ChevronLeft size={10} />
        Back
      </button>
      <button
        className="flex items-center gap-1 border border-(--hud-border) px-2 py-0.5 text-[10px] uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) transition-colors"
      >
        <Pencil size={10} />
        Edit
      </button>
    </div>
  );

  return (
    <HudModal title={char.name} headerRight={headerRight}>
      <div className="grid grid-cols-2 divide-x divide-(--hud-border)">
        {/* Left column — UPP + Credits */}
        <div className="flex flex-col gap-4 p-3">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
              Universal Person Profile
            </p>
            <p className="font-mono text-lg text-(--hud-text) tracking-widest mb-3">{upp}</p>
            <div className="flex flex-col gap-1.5">
              {STAT_LABELS.map((label, i) => (
                <StatBar
                  key={label}
                  label={label}
                  value={[char.strength, char.dexterity, char.endurance, char.intelligence, char.education, char.socialStanding][i]}
                />
              ))}
            </div>
          </div>
          <div className="border-t border-(--hud-border-subtle) pt-3">
            <p className="text-[10px] uppercase tracking-wider text-(--hud-text-dim)">Credits</p>
            <p className="font-mono text-sm text-(--hud-text) mt-1">
              Cr {char.credits.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Right column — Location + Skills */}
        <div className="flex flex-col divide-y divide-(--hud-border)">
          <div className="p-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
              Current Location
            </p>
            {char.worldName ? (
              <>
                <p className="font-mono text-sm text-(--hud-text)">◉ {char.worldName}</p>
                <p className="text-xs text-(--hud-text-dim) mt-0.5">
                  {char.sectorName} · Hex {char.hex}
                </p>
                {char.subsectorName && (
                  <p className="text-xs text-(--hud-text-dim)">Subsector — {char.subsectorName}</p>
                )}
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
                {char.skills.map((s) => (
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

      {/* Movement log */}
      <div className="border-t border-(--hud-border) p-3">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
          Movement Log
        </p>
        {char.locationLog.length === 0 ? (
          <p className="text-xs text-(--hud-text-dim)">No movements recorded</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {char.locationLog.map((entry, i) => (
              <li key={i} className="flex gap-3 text-xs text-(--hud-text-dim) font-mono">
                <span className="shrink-0">
                  {new Date(entry.arrivedAt).toISOString().slice(0, 10)}
                </span>
                <span>
                  {entry.worldName} ({entry.sectorAbbr}·{entry.hex})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </HudModal>
  );
}
