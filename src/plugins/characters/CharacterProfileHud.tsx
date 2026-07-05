import Image from "next/image";
import { useState } from "react";
import type { CharacterHistoryEntry, CharacterRelationshipSummary, CharacterSummary } from "./charactersSlice";
import { usePluginDispatch, usePluginSelector } from "@/plugin-api";
import { fetchCharacters, invalidateCharacters, setSelectedProfileCharacter } from "./charactersSlice";
import {
  selectEffectiveCharacterProfile,
  selectEffectiveCharacterProfileLocation,
  type CharacterProfileLocation,
} from "./selectors";

const STAT_LABELS = ["STR", "DEX", "END", "INT", "EDU", "SOC"] as const;
const STAT_MAX = 15;
type CharacterProfileTab = "profile" | "skills" | "education" | "careers" | "contacts" | "history";
type ContactGenerationState = "idle" | "generating" | "error";

const educationStatusLabel = (status: string) => {
  switch (status) {
    case "admitted":
      return "Admitted";
    case "not-admitted":
      return "Not Admitted";
    case "graduated":
      return "Graduated";
    case "honors":
      return "Honors";
    case "not-graduated":
      return "Did Not Graduate";
    default:
      return "Unknown";
  }
};

const genderLabel = (gender: CharacterSummary["gender"]) => {
  if (gender === "female") return "Female";
  if (gender === "male") return "Male";
  return "Unknown";
};

const kindLabel = (kind: CharacterSummary["kind"]) =>
  kind === "npc" ? "Non-Player Character" : "Player Character";

const attitudeLabel = (attitude: number) => {
  if (attitude >= 75) return "Devoted";
  if (attitude >= 40) return "Friendly";
  if (attitude > 10) return "Warm";
  if (attitude >= -10) return "Neutral";
  if (attitude > -40) return "Cool";
  if (attitude > -75) return "Hostile";
  return "Bitter";
};

const formatRelationshipType = (type: string) =>
  type
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const formatRelationshipSource = (source: string) =>
  source
    .split(/[:._-]+/)
    .filter((part) => part && !/^\d+$/.test(part))
    .slice(0, 4)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" / ");

const relationshipOrigin = (relationship: CharacterRelationshipSummary) =>
  relationship.notes
  ?? (relationship.source ? formatRelationshipSource(relationship.source) : null);

const preCareerHistoryTypes = new Set([
  "preCareer.skip",
  "preCareer.select",
  "preCareer.qualification.roll",
  "preCareer.graduation.roll",
]);

const historyStageLabel = (
  entry: CharacterHistoryEntry,
) => {
  if (entry.stage === "preCareer") return "Pre-Career";
  if (entry.stage === "musterOut") return "Muster-Out";
  if (entry.stage === "background") return "Background";
  if (entry.term !== null) return `Term ${entry.term}`;
  return preCareerHistoryTypes.has(entry.type) ? "Pre-Career" : "Background";
};

const groupHistoryByTerm = (history: readonly CharacterHistoryEntry[]) => {
  const groups = new Map<string, { label: string; entries: CharacterHistoryEntry[] }>();

  for (const entry of history) {
    const label = historyStageLabel(entry);
    const key = entry.stage === "careerTerm" && entry.term !== null
      ? `term-${entry.term}`
      : entry.stage ?? label;
    const group = groups.get(key) ?? { label, entries: [] };
    group.entries.push(entry);
    groups.set(key, group);
  }

  return [...groups.values()];
};

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
  contactGenerationState,
  contactGenerationError,
  onGenerateContact,
  onViewCharacter,
}: {
  character: CharacterSummary | null;
  currentLocation: CharacterProfileLocation | null;
  contactGenerationState?: ContactGenerationState;
  contactGenerationError?: string | null;
  onGenerateContact?: (characterId: string) => void;
  onViewCharacter?: (characterId: string) => void;
}) => {
  const [activeTabState, setActiveTabState] = useState<{
    characterId: string | null;
    tab: CharacterProfileTab;
  }>({ characterId: null, tab: "profile" });
  const [failedPortraitPath, setFailedPortraitPath] = useState<string | null>(null);

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
  const history = character.history ?? [];
  const education = character.educationHistory ?? null;
  const careers = character.careers ?? [];
  const relationships = character.relationships ?? [];
  const historyGroups = groupHistoryByTerm(history);
  const portraitPath = character.avatar?.currentPortraitPath ?? null;
  const showPortrait = portraitPath && failedPortraitPath !== portraitPath;
  const activeTab = activeTabState.characterId === character.id
    ? activeTabState.tab
    : "profile";
  const tabs: { id: CharacterProfileTab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "skills", label: `Skills ${character.skills.length}` },
    { id: "education", label: "Education" },
    { id: "careers", label: `Careers ${careers.length}` },
    { id: "contacts", label: `Contacts ${relationships.length}` },
    { id: "history", label: `History ${history.length}` },
  ];

  return (
    <div className="flex max-h-[70vh] w-72 flex-col gap-1 overflow-hidden font-mono text-[7px] uppercase tracking-wider text-(--hud-text)">
      <div className="flex items-center gap-1 border-b border-(--hud-border-subtle) pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTabState({ characterId: character.id, tab: tab.id })}
            className={[
              "h-5 border px-1.5 text-[7px] uppercase tracking-wider transition-colors",
              activeTab === tab.id
                ? "border-(--hud-accent) text-(--hud-text)"
                : "border-(--hud-border-subtle) text-(--hud-text-dim) hover:border-(--hud-border) hover:text-(--hud-text)",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="min-h-0 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 divide-x divide-(--hud-border)">
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
                <p className="text-[7px] tracking-widest text-(--hud-text-dim)">Kind</p>
                <p className="mt-0.5 text-[8px] text-(--hud-text)">
                  {kindLabel(character.kind)}
                </p>
              </div>

              <div className="border-t border-(--hud-border-subtle) pt-1">
                <p className="text-[7px] tracking-widest text-(--hud-text-dim)">Gender</p>
                <p className="mt-0.5 text-[8px] text-(--hud-text)">
                  {genderLabel(character.gender)}
                </p>
              </div>

              <div className="border-t border-(--hud-border-subtle) pt-1">
                <p className="text-[7px] tracking-widest text-(--hud-text-dim)">Credits</p>
                <p className="mt-0.5 text-[8px] text-(--hud-text)">
                  Cr {character.credits.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="pl-2">
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
              {showPortrait && (
                <div className="relative mt-2 aspect-square w-24 overflow-hidden border border-(--hud-border-subtle) bg-(--hud-surface-2)">
                  <Image
                    src={portraitPath}
                    alt={`${character.name} portrait`}
                    fill
                    sizes="96px"
                    onError={() => setFailedPortraitPath(portraitPath)}
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "skills" && (
        <div>
          <p className="mb-1 text-[7px] tracking-widest text-(--hud-text-dim)">Skills</p>
          {character.skills.length === 0 ? (
            <p className="text-[7px] text-(--hud-text-dim)">No skills recorded</p>
          ) : (
            <ul className="grid max-h-44 grid-cols-2 gap-x-3 gap-y-0.5 overflow-y-auto pr-1">
              {character.skills.map((skill) => (
                <li key={skill.name} className="flex justify-between gap-2">
                  <span className="truncate text-(--hud-text)">{skill.name}</span>
                  <span className="text-(--hud-text-dim)">... {skill.level}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "education" && (
        <div>
          <p className="mb-1 text-[7px] tracking-widest text-(--hud-text-dim)">Education</p>
          {!education ? (
            <p className="text-[7px] text-(--hud-text-dim)">No pre-career education recorded</p>
          ) : (
            <div className="border border-(--hud-border-subtle) bg-(--hud-surface-2)/50 px-1.5 py-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[8px] text-(--hud-text)">
                  {education.label}
                </span>
                <span className="shrink-0 text-[7px] text-(--hud-text-dim)">
                  {educationStatusLabel(education.admission)}
                </span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1">
                <div className="border-t border-(--hud-border-subtle) pt-1">
                  <p className="text-(--hud-text-dim)">Admission</p>
                  <p className="mt-0.5 text-(--hud-text)">
                    {educationStatusLabel(education.admission)}
                  </p>
                </div>
                <div className="border-t border-(--hud-border-subtle) pt-1">
                  <p className="text-(--hud-text-dim)">Graduation</p>
                  <p className="mt-0.5 text-(--hud-text)">
                    {educationStatusLabel(education.graduation)}
                  </p>
                </div>
              </div>
              <div className="mt-1 border-t border-(--hud-border-subtle) pt-1">
                <p className="text-(--hud-text-dim)">Education Skills</p>
                {education.skills.length === 0 ? (
                  <p className="mt-0.5 text-(--hud-text-dim)">No education skills recorded</p>
                ) : (
                  <p className="mt-0.5 normal-case tracking-normal text-(--hud-text)">
                    {education.skills.join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "careers" && (
        <div>
          <p className="mb-1 text-[7px] tracking-widest text-(--hud-text-dim)">Careers</p>
          {careers.length === 0 ? (
            <p className="text-[7px] text-(--hud-text-dim)">No career summary recorded</p>
          ) : (
            <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto pr-1">
              {careers.map((career) => (
                <li
                  key={`${career.careerId}-${career.assignmentLabel ?? "career"}`}
                  className="border border-(--hud-border-subtle) bg-(--hud-surface-2)/50 px-1.5 py-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[8px] text-(--hud-text)">
                      {career.careerLabel}
                    </span>
                    <span className="shrink-0 text-[7px] text-(--hud-text-dim)">
                      {career.terms} term{career.terms === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-(--hud-text-dim)">
                    <span className="truncate">
                      {career.assignmentLabel ?? "Unassigned"}
                    </span>
                    <span className="shrink-0">
                      Rank {career.finalRank}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-(--hud-text-dim)">
                    <span className="truncate normal-case tracking-normal">
                      {career.finalRankTitle ?? "No rank title"}
                    </span>
                    <span className="shrink-0">
                      {career.commissioned ? "Commissioned" : "Enlisted"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "contacts" && (
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[7px] tracking-widest text-(--hud-text-dim)">Contacts</p>
            <button
              type="button"
              onClick={() => onGenerateContact?.(character.id)}
              disabled={contactGenerationState === "generating"}
              className="h-5 border border-(--hud-border-subtle) px-1.5 text-[7px] uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-(--hud-border) hover:text-(--hud-text) disabled:cursor-not-allowed disabled:opacity-40"
            >
              {contactGenerationState === "generating" ? "Generating..." : "Generate"}
            </button>
          </div>
          {contactGenerationError && (
            <div className="mb-1 border border-(--hud-error)/40 bg-(--hud-error)/5 px-1.5 py-1 text-[7px] text-(--hud-error)">
              {contactGenerationError}
            </div>
          )}
          {relationships.length === 0 ? (
            <p className="text-[7px] text-(--hud-text-dim)">No directed contacts recorded</p>
          ) : (
            <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto pr-1">
              {relationships.map((relationship) => (
                <li
                  key={relationship.id}
                  className="border border-(--hud-border-subtle) bg-(--hud-surface-2)/50"
                >
                  <button
                    type="button"
                    onClick={() => onViewCharacter?.(relationship.toCharacterId)}
                    className="block w-full px-1.5 py-1 text-left transition-colors hover:bg-(--hud-surface-2)"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[8px] text-(--hud-text)">
                        {relationship.toCharacterName}
                      </span>
                      <span className="shrink-0 text-[7px] text-(--hud-text-dim)">
                        {relationship.attitude}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-(--hud-text-dim)">
                      <span className="truncate">
                        {formatRelationshipType(relationship.type)}
                      </span>
                      <span className="shrink-0">
                        {attitudeLabel(relationship.attitude)}
                      </span>
                    </div>
                    {relationshipOrigin(relationship) && (
                      <p className="mt-0.5 truncate normal-case tracking-normal text-(--hud-text-dim)">
                        {relationshipOrigin(relationship)}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div>
          <p className="mb-1 text-[7px] tracking-widest text-(--hud-text-dim)">History</p>
          {history.length === 0 ? (
            <p className="text-[7px] text-(--hud-text-dim)">No generation history recorded</p>
          ) : (
            <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-1">
              {historyGroups.map((group) => (
                <section key={group.label}>
                  <div className="sticky top-0 z-10 border-y border-(--hud-border-subtle) bg-(--hud-surface)/95 px-1 py-0.5 text-[7px] tracking-widest text-(--hud-text-dim)">
                    {group.label}
                  </div>
                  <ol className="mt-1 flex flex-col gap-1">
                    {group.entries.map((entry, index) => (
                      <li
                        key={`${entry.type}-${entry.term ?? "x"}-${index}`}
                        className="border-l border-(--hud-border-subtle) pl-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[7px] text-(--hud-text)">
                            {entry.label}
                          </span>
                          {typeof entry.roll === "number" && (
                            <span className="shrink-0 text-[7px] text-(--hud-text-dim)">
                              Roll {entry.roll}
                            </span>
                          )}
                        </div>
                        {entry.detail && (
                          <p className="mt-0.5 normal-case tracking-normal text-(--hud-text-dim)">
                            {entry.detail}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CharacterProfileHudContent = () => {
  const dispatch = usePluginDispatch();
  const character = usePluginSelector(selectEffectiveCharacterProfile);
  const currentLocation = usePluginSelector(selectEffectiveCharacterProfileLocation);
  const [contactGenerationState, setContactGenerationState] = useState<ContactGenerationState>("idle");
  const [contactGenerationError, setContactGenerationError] = useState<string | null>(null);

  const handleGenerateContact = async (characterId: string) => {
    if (contactGenerationState === "generating") return;
    setContactGenerationState("generating");
    setContactGenerationError(null);

    try {
      const response = await fetch(`/api/characters/${characterId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contact",
          attitude: 25,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setContactGenerationError(
          typeof body.error === "string" ? body.error : "Failed to generate contact",
        );
        setContactGenerationState("error");
        return;
      }

      dispatch(invalidateCharacters());
      await dispatch(fetchCharacters());
      setContactGenerationState("idle");
    } catch (err) {
      console.error("[generate contact]", err);
      setContactGenerationError("Failed to generate contact");
      setContactGenerationState("error");
    }
  };

  const handleViewCharacter = (characterId: string) => {
    dispatch(setSelectedProfileCharacter(characterId));
  };

  return (
    <CharacterProfileHud
      character={character}
      currentLocation={currentLocation}
      contactGenerationState={contactGenerationState}
      contactGenerationError={contactGenerationError}
      onGenerateContact={handleGenerateContact}
      onViewCharacter={handleViewCharacter}
    />
  );
};
