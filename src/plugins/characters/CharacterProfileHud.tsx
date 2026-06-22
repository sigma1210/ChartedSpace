import type { CharacterSummary } from "./charactersSlice";
import { usePluginSelector } from "@/plugin-api";
import {
  selectEffectiveCharacterProfile,
  selectEffectiveCharacterProfileLocation,
  type CharacterProfileLocation,
} from "./selectors";

const STAT_LABELS = ["STR", "DEX", "END", "INT", "EDU", "SOC"] as const;
const STAT_MAX = 15;

const StatBar = ({ label, value }: { label: string; value: number }) => {
  const pct = Math.min(100, (value / STAT_MAX) * 100);

  return (
    <div className="flex items-center gap-1">
      <span className="w-5 font-mono text-[7px] uppercase text-(--hud-text-dim)">{label}</span>
      <span className="w-2.5 font-mono text-[8px] text-(--hud-text)">{value}</span>
      <div className="h-0.5 flex-1 overflow-hidden bg-(--hud-surface)">
        <div
          className="h-full bg-(--hud-accent)"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export const CharacterProfileHud = ({
  character,
  currentLocation,
}: {
  character: CharacterSummary | null;
  currentLocation: CharacterProfileLocation | null;
}) => {
  if (!character) {
    return (
      <div className="w-64 font-mono text-[9px] uppercase tracking-wider text-(--hud-text-dim)">
        No active character
      </div>
    );
  }

  const stats = [
    character.strength,
    character.dexterity,
    character.endurance,
    character.intelligence,
    character.education,
    character.socialStanding,
  ];
  const location = currentLocation ?? {
    worldName: character.worldName,
    sectorAbbr: character.sectorAbbr,
    hex: character.hex,
  };

  return (
    <div className="grid w-72 grid-cols-2 divide-x divide-(--hud-border) font-mono text-[7px] uppercase tracking-wider text-(--hud-text)">
      <div className="flex flex-col gap-2 pr-2">
        <div>
          <p className="mb-0.5 text-[7px] tracking-widest text-(--hud-text-dim)">
            Universal Person Profile
          </p>
          <p className="mb-1 text-[10px] tracking-widest text-(--hud-text)">
            {character.upp}
          </p>
          <div className="flex flex-col gap-0.5">
            {STAT_LABELS.map((label, index) => (
              <StatBar key={label} label={label} value={stats[index]} />
            ))}
          </div>
        </div>

        <div className="border-t border-(--hud-border-subtle) pt-1">
          <p className="text-[7px] tracking-widest text-(--hud-text-dim)">Credits</p>
          <p className="mt-0.5 text-[8px] text-(--hud-text)">
            Cr {character.credits.toLocaleString()}
          </p>
        </div>

        <div className="border-t border-(--hud-border-subtle) pt-1">
          <p className="text-[7px] tracking-widest text-(--hud-text-dim)">Current Location</p>
          {location.worldName ? (
            <>
              <p className="mt-0.5 text-[8px] text-(--hud-text)">
                {location.worldName}
              </p>
              <p className="text-[7px] text-(--hud-text-dim)">
                {location.sectorAbbr} / Hex {location.hex}
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-[7px] text-(--hud-text-dim)">No location set</p>
          )}
        </div>
      </div>

      <div className="pl-2">
        <p className="mb-1 text-[7px] tracking-widest text-(--hud-text-dim)">Skills</p>
        {character.skills.length === 0 ? (
          <p className="text-[7px] text-(--hud-text-dim)">No skills recorded</p>
        ) : (
          <ul className="flex max-h-36 flex-col gap-0.5 overflow-y-auto pr-1">
            {character.skills.map((skill) => (
              <li key={skill.name} className="flex justify-between gap-2">
                <span className="truncate text-(--hud-text)">{skill.name}</span>
                <span className="text-(--hud-text-dim)">... {skill.level}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export const CharacterProfileHudContent = () => {
  const character = usePluginSelector(selectEffectiveCharacterProfile);
  const currentLocation = usePluginSelector(selectEffectiveCharacterProfileLocation);

  return (
    <CharacterProfileHud
      character={character}
      currentLocation={currentLocation}
    />
  );
};
