"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, UserRoundPlus } from "lucide-react";
import ships from "@/data/classic/ships.json";
import { ROLE_REQUIRED_SKILL } from "@/lib/crew";
import { selectEffectiveCharacterProfile } from "@/plugins/characters/selectors";
import { useAppSelector } from "@/store/hooks";
import { selectActiveShip, selectShipLocation } from "./selectors";

interface CharacterPostingSummary {
  id: string;
  type: string;
  title: string;
  description: string | null;
  location: string | null;
  role: string | null;
  status: string;
  characterId: string;
  characterName: string;
  characterGender: "female" | "male" | "nonbinary" | null;
  characterSkills: Array<{ name: string; level: number }>;
  createdAt: string;
}

interface ShipDefinition {
  type: string;
  designation?: string;
  requiredCrew?: string[];
}

type LoadStatus = "idle" | "loading" | "loaded" | "error";
type CrewChoice =
  | { source: "current-character"; characterId: string; role: string }
  | { source: "posting"; postingId: string; characterId: string; role: string }
  | null;

const shipDefinitions = ships as ShipDefinition[];

const roleLabel = (role: string) =>
  role
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const skillLevelForCandidate = (candidate: CharacterPostingSummary, role: string) => {
  const requiredSkill = ROLE_REQUIRED_SKILL[role];
  if (!requiredSkill) return null;
  return candidate.characterSkills.find((skill) => skill.name === requiredSkill)?.level ?? null;
};

const skillLevelForSkills = (
  skills: Array<{ name: string; level: number }>,
  role: string,
) => {
  const requiredSkill = ROLE_REQUIRED_SKILL[role];
  if (!requiredSkill) return null;
  return skills.find((skill) => skill.name === requiredSkill)?.level ?? null;
};

export const ShipCrewAssignmentHudContent = () => {
  const ship = useAppSelector(selectActiveShip);
  const shipLocation = useAppSelector(selectShipLocation);
  const currentCharacter = useAppSelector(selectEffectiveCharacterProfile);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [crewChoice, setCrewChoice] = useState<CrewChoice>(null);
  const [candidates, setCandidates] = useState<CharacterPostingSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const locationKey = shipLocation?.sectorAbbr && shipLocation.hex
    ? `${shipLocation.sectorAbbr}:${shipLocation.hex}`
    : null;
  const definition = useMemo(
    () => shipDefinitions.find((item) => item.type === ship?.type) ?? null,
    [ship?.type],
  );
  const requiredRoles = definition?.requiredCrew ?? [];

  useEffect(() => {
    if (!locationKey) {
      setCandidates([]);
      setStatus("loaded");
      return;
    }

    const controller = new AbortController();
    const loadCandidates = async () => {
      setStatus("loading");
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("location", locationKey);
        const response = await fetch(`/api/characters/postings?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Failed to load crew candidates");
        const body = await response.json() as { items: CharacterPostingSummary[] };
        setCandidates(body.items.filter((item) => item.type === "crew_available"));
        setStatus("loaded");
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[ship crew assignment]", err);
        setError("Failed to load local crew");
        setStatus("error");
      }
    };

    void loadCandidates();
    return () => controller.abort();
  }, [locationKey]);

  if (!ship) {
    return (
      <div className="w-72 p-1 font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
        No active ship
      </div>
    );
  }

  return (
    <div className="flex max-h-[54vh] w-96 max-w-[84vw] flex-col gap-1 overflow-hidden p-0.5 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
      <div className="border-b border-(--hud-border-subtle) pb-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[9px] text-(--hud-text)">{ship.name}</span>
          <span className="shrink-0 text-(--hud-text-dim)">{definition?.designation ?? ship.type}</span>
        </div>
        <div className="mt-0.5 text-(--hud-text-dim)">
          {locationKey ? `Local candidates: ${locationKey}` : "Current system unavailable"}
        </div>
      </div>

      {error && (
        <div className="border border-(--hud-error)/40 bg-(--hud-error)/5 px-1.5 py-1 text-(--hud-error)">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1 overflow-hidden">
        <div className="min-h-0 overflow-y-auto pr-1">
          <div className="mb-1 text-[7px] text-(--hud-text-dim)">Required Crew</div>
          {requiredRoles.length === 0 ? (
            <div className="border border-(--hud-border-subtle) px-1.5 py-2 text-(--hud-text-dim)">
              No required crew data
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {requiredRoles.map((role) => {
                const assigned = ship.crew.find((member) => member.role === role);
                const active = selectedRole === role;
                return (
                  <li key={role} className="border border-(--hud-border-subtle) bg-(--hud-surface-2)/40">
                    <button
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`block w-full px-1.5 py-1 text-left transition-colors ${
                        active ? "bg-(--hud-accent)/10 text-(--hud-text)" : "hover:bg-(--hud-surface-2)"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px]">{roleLabel(role)}</span>
                        <span className="text-[7px] text-(--hud-text-dim)">
                          {ROLE_REQUIRED_SKILL[role] ?? "Any"}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate normal-case tracking-normal text-(--hud-text-dim)">
                        {assigned
                          ? assigned.characterName ?? assigned.npcName ?? "Assigned"
                          : "Open slot"}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="min-h-0 overflow-y-auto pr-1">
          {currentCharacter && (
            <div className="mb-1 border border-(--hud-accent)/50 bg-(--hud-accent)/10">
              <button
                type="button"
                disabled={!selectedRole}
                onClick={() => setCrewChoice({
                  source: "current-character",
                  characterId: currentCharacter.id,
                  role: selectedRole ?? "",
                })}
                title={selectedRole ? "Choose current character" : "Select a crew slot first"}
                className={`block w-full px-1.5 py-1 text-left transition-colors hover:bg-(--hud-accent)/15 ${
                  !selectedRole
                    ? "cursor-not-allowed opacity-60"
                    : ""
                } ${
                  crewChoice?.source === "current-character" &&
                  crewChoice.characterId === currentCharacter.id &&
                  crewChoice.role === selectedRole
                    ? "text-(--hud-text)"
                    : "text-(--hud-text-dim)"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[9px] text-(--hud-text)">
                    {currentCharacter.name}
                  </span>
                  <span className="shrink-0 text-[7px] text-(--hud-accent)">Current</span>
                </div>
                <div className="mt-0.5 truncate text-(--hud-text-dim)">
                  {!selectedRole
                    ? "Select a crew slot"
                    : ROLE_REQUIRED_SKILL[selectedRole]
                    ? `${ROLE_REQUIRED_SKILL[selectedRole]} ${skillLevelForSkills(currentCharacter.skills, selectedRole) ?? "untrained"}`
                    : "Available for this role"}
                </div>
              </button>
            </div>
          )}
          <div className="mb-1 flex items-center justify-between gap-2 text-[7px] text-(--hud-text-dim)">
            <span>Candidates</span>
            {status === "loading" && <Loader2 size={10} className="animate-spin" aria-hidden="true" />}
          </div>
          {!selectedRole ? (
            <div className="border border-(--hud-border-subtle) px-1.5 py-2 text-(--hud-text-dim)">
              Select a crew slot
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {status === "loading" ? (
                <div className="flex items-center justify-center gap-1.5 border border-(--hud-border-subtle) px-1.5 py-5 text-(--hud-text-dim)">
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  Loading
                </div>
              ) : candidates.length === 0 ? (
                <div className="border border-(--hud-border-subtle) px-1.5 py-2 text-(--hud-text-dim)">
                  No local crew postings
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {candidates.map((candidate) => {
                    const requiredSkill = ROLE_REQUIRED_SKILL[selectedRole];
                    const skillLevel = skillLevelForCandidate(candidate, selectedRole);
                    const qualified = !requiredSkill || skillLevel !== null;
                    return (
                      <li
                        key={candidate.id}
                        className={`border bg-(--hud-surface-2)/40 ${
                          qualified ? "border-(--hud-border-subtle)" : "border-(--hud-error)/30 opacity-60"
                        }`}
                      >
                    <button
                      type="button"
                      onClick={() => setCrewChoice({
                        source: "posting",
                        postingId: candidate.id,
                        characterId: candidate.characterId,
                        role: selectedRole,
                      })}
                      className={`block w-full px-1.5 py-1 text-left transition-colors hover:bg-(--hud-surface-2) ${
                        crewChoice?.source === "posting" &&
                        crewChoice.postingId === candidate.id &&
                        crewChoice.role === selectedRole
                          ? "text-(--hud-text)"
                          : "text-(--hud-text-dim)"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[9px] text-(--hud-text)">
                          {candidate.characterName}
                        </span>
                        <UserRoundPlus size={10} aria-hidden="true" className="shrink-0 text-(--hud-text-dim)" />
                      </div>
                      <div className="mt-0.5 truncate text-(--hud-text-dim)">
                        {requiredSkill
                          ? `${requiredSkill} ${skillLevel ?? "untrained"}`
                          : "No role skill required"}
                      </div>
                    </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
