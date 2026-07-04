"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, UserRoundMinus, UserRoundPlus } from "lucide-react";
import ships from "@/data/classic/ships.json";
import { ROLE_REQUIRED_SKILL } from "@/lib/crew";
import { selectEffectiveCharacterProfile } from "@/plugins/characters/selectors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchShip, invalidateShip } from "./shipPluginSlice";
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
  stateroomsTotal?: number;
}

type LoadStatus = "idle" | "loading" | "loaded" | "error";
type SaveStatus = "idle" | "saving";
type CrewChoice = { source: "crew-pool"; characterId: string; role: string } | null;

const shipDefinitions = ships as ShipDefinition[];

const roleLabel = (role: string) =>
  role
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const ShipCrewAssignmentHudContent = () => {
  const dispatch = useAppDispatch();
  const ship = useAppSelector(selectActiveShip);
  const shipLocation = useAppSelector(selectShipLocation);
  const currentCharacter = useAppSelector(selectEffectiveCharacterProfile);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [crewChoice, setCrewChoice] = useState<CrewChoice>(null);
  const [candidates, setCandidates] = useState<CharacterPostingSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [addingCandidateId, setAddingCandidateId] = useState<string | null>(null);
  const [removingCrewId, setRemovingCrewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locationKey = shipLocation?.sectorAbbr && shipLocation.hex
    ? `${shipLocation.sectorAbbr}:${shipLocation.hex}`
    : null;
  const definition = useMemo(
    () => shipDefinitions.find((item) => item.type === ship?.type) ?? null,
    [ship?.type],
  );
  const requiredRoles = definition?.requiredCrew ?? [];
  const stateroomsTotal = ship?.stateroomsTotal ?? definition?.stateroomsTotal ?? 0;
  const crewPoolSize = useMemo(() => {
    if (!ship) return 0;
    if (!currentCharacter) return ship.crew.length;
    return ship.crew.some((member) => member.characterId === currentCharacter.id)
      ? ship.crew.length
      : ship.crew.length + 1;
  }, [currentCharacter, ship]);
  const crewPoolRows = useMemo(() => {
    if (!ship) return [];
    const rows = ship.crew.map((member) => ({
      id: member.id,
      characterId: member.characterId,
      name: member.characterName ?? member.npcName ?? "Crew",
      role: member.role,
      isOwnerOperator: member.isOwnerOperator,
      synthetic: false,
    }));
    if (
      currentCharacter &&
      !ship.crew.some((member) => member.characterId === currentCharacter.id)
    ) {
      rows.unshift({
        id: `current-${currentCharacter.id}`,
        characterId: currentCharacter.id,
        name: currentCharacter.name,
        role: "unassigned",
        isOwnerOperator: false,
        synthetic: true,
      });
    }
    return rows;
  }, [currentCharacter, ship]);
  const totalCrewSalary = useMemo(
    () => ship?.crew.reduce((total, member) => total + member.monthlySalary, 0) ?? 0,
    [ship],
  );
  const crewCharacterIds = useMemo(
    () => new Set(ship?.crew.flatMap((member) => member.characterId ? [member.characterId] : []) ?? []),
    [ship],
  );
  const displayedCandidates = useMemo(
    () => locationKey ? candidates : [],
    [candidates, locationKey],
  );
  const displayedStatus = locationKey ? status : "loaded";
  const availableCandidates = useMemo(
    () => displayedCandidates.filter((candidate) => !crewCharacterIds.has(candidate.characterId)),
    [displayedCandidates, crewCharacterIds],
  );
  const crewAtCapacity = stateroomsTotal > 0 && crewPoolSize >= stateroomsTotal;
  const selectedCharacterAlreadyCrew =
    crewChoice
      ? crewCharacterIds.has(crewChoice.characterId) || crewChoice.characterId === currentCharacter?.id
      : false;
  const canSaveCrewChoice = Boolean(
    crewChoice &&
    selectedRole &&
    crewChoice.role === selectedRole &&
    saveStatus !== "saving" &&
    (!crewAtCapacity || selectedCharacterAlreadyCrew),
  );
  const selectedCrewName = crewChoice
    ? crewPoolRows.find((member) => member.characterId === crewChoice.characterId)?.name ?? null
    : null;

  const assignSelectedCrew = async () => {
    if (!crewChoice || !selectedRole) return;
    setSaveStatus("saving");
    setError(null);
    try {
      const response = await fetch("/api/ship/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crewChoice),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Failed to assign crew");
      setCrewChoice(null);
      dispatch(invalidateShip());
      await dispatch(fetchShip());
    } catch (err) {
      console.error("[ship crew assignment]", err);
      setError(err instanceof Error ? err.message : "Failed to assign crew");
    } finally {
      setSaveStatus("idle");
    }
  };

  const addCandidateToCrew = async (candidate: CharacterPostingSummary) => {
    setAddingCandidateId(candidate.id);
    setError(null);
    try {
      const response = await fetch("/api/ship/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-to-pool",
          postingId: candidate.id,
          characterId: candidate.characterId,
        }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Failed to add crew");
      setCandidates((items) => items.filter((item) => item.id !== candidate.id));
      setCrewChoice(null);
      dispatch(invalidateShip());
      await dispatch(fetchShip());
    } catch (err) {
      console.error("[ship crew assignment]", err);
      setError(err instanceof Error ? err.message : "Failed to add crew");
    } finally {
      setAddingCandidateId(null);
    }
  };

  const removeCrewMember = async (crewId: string) => {
    setRemovingCrewId(crewId);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentCharacter?.id) params.set("currentCharacterId", currentCharacter.id);
      const response = await fetch(`/api/crew/${crewId}?${params.toString()}`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Failed to remove crew");
      setCrewChoice((choice) => {
        const removed = crewPoolRows.find((member) => member.id === crewId);
        return removed?.characterId && choice?.characterId === removed.characterId ? null : choice;
      });
      dispatch(invalidateShip());
      await dispatch(fetchShip());
      if (locationKey) {
        const params = new URLSearchParams();
        params.set("location", locationKey);
        const postingsResponse = await fetch(`/api/characters/postings?${params.toString()}`);
        if (postingsResponse.ok) {
          const postingsBody = await postingsResponse.json() as { items: CharacterPostingSummary[] };
          setCandidates(postingsBody.items.filter((item) => item.type === "crew_available"));
        }
      }
    } catch (err) {
      console.error("[ship crew assignment]", err);
      setError(err instanceof Error ? err.message : "Failed to remove crew");
    } finally {
      setRemovingCrewId(null);
    }
  };

  useEffect(() => {
    if (!locationKey) {
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
        <div className="mt-1 grid grid-cols-2 gap-1 text-[7px] text-(--hud-text-dim)">
          <div className="border border-(--hud-border-subtle) px-1 py-0.5">
            Crew {crewPoolSize}/{stateroomsTotal || "?"}
          </div>
          <div className="border border-(--hud-border-subtle) px-1 py-0.5">
            Salaries Cr{totalCrewSalary.toLocaleString()}
          </div>
        </div>
      </div>

      {error && (
        <div className="border border-(--hud-error)/40 bg-(--hud-error)/5 px-1.5 py-1 text-(--hud-error)">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-1 overflow-hidden">
        <div className="min-h-0 overflow-y-auto pr-1">
          <div className="mb-1 text-[7px] text-(--hud-text-dim)">Roles</div>
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
                      onClick={() => {
                        setSelectedRole(role);
                        setCrewChoice(null);
                      }}
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
          <div className="mb-1 flex items-center justify-between gap-2 text-[7px] text-(--hud-text-dim)">
            <span>Crew Pool</span>
            {selectedRole && <span>{roleLabel(selectedRole)}</span>}
          </div>
          <ul className="mb-1 flex max-h-36 flex-col gap-1 overflow-y-auto">
            {crewPoolRows.map((member) => (
              <li
                key={member.id}
                className="border border-(--hud-border-subtle) bg-(--hud-surface-2)/30"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch">
                  <button
                    type="button"
                    disabled={!selectedRole || !member.characterId}
                    onClick={() => {
                      if (!selectedRole || !member.characterId) return;
                      setCrewChoice({
                        source: "crew-pool",
                        characterId: member.characterId,
                        role: selectedRole,
                      });
                    }}
                    title={
                      !selectedRole
                        ? "Select a crew slot first"
                        : !member.characterId
                        ? "This crew member cannot be assigned from the pool"
                        : "Pick for selected role"
                    }
                    className={`min-w-0 px-1.5 py-1 text-left transition-colors ${
                      crewChoice?.source === "crew-pool" &&
                      crewChoice.characterId === member.characterId &&
                      crewChoice.role === selectedRole
                        ? "bg-(--hud-accent)/10 text-(--hud-text)"
                        : "text-(--hud-text-dim)"
                    } ${
                      !selectedRole || !member.characterId
                        ? "cursor-not-allowed opacity-60"
                        : "hover:bg-(--hud-surface-2)"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[9px] text-(--hud-text)">
                        {member.name}
                      </span>
                      {crewChoice?.source === "crew-pool" &&
                        crewChoice.characterId === member.characterId &&
                        crewChoice.role === selectedRole && (
                          <Check size={10} aria-hidden="true" className="shrink-0 text-(--hud-accent)" />
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[7px] text-(--hud-text-dim)">
                      {member.synthetic ? "Current character" : member.role === "unassigned" ? "Unassigned" : roleLabel(member.role)}
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={
                      member.synthetic ||
                      member.isOwnerOperator ||
                      member.characterId === currentCharacter?.id ||
                      removingCrewId !== null
                    }
                    onClick={() => void removeCrewMember(member.id)}
                    title={
                      member.synthetic || member.characterId === currentCharacter?.id
                        ? "Cannot remove the current character"
                        : member.isOwnerOperator
                        ? "Cannot remove the owner-operator"
                        : "Remove from crew"
                    }
                    className={`flex w-6 items-center justify-center border-l border-(--hud-border-subtle) transition-colors ${
                      member.synthetic ||
                      member.isOwnerOperator ||
                      member.characterId === currentCharacter?.id ||
                      removingCrewId !== null
                        ? "cursor-not-allowed opacity-50"
                        : "text-(--hud-text-dim) hover:bg-(--hud-error)/10 hover:text-(--hud-error)"
                    }`}
                  >
                    {removingCrewId === member.id ? (
                      <Loader2 size={10} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <UserRoundMinus size={11} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={!canSaveCrewChoice}
            onClick={assignSelectedCrew}
            className={`mb-2 flex w-full items-center justify-center gap-1 border border-(--hud-accent)/50 px-1.5 py-1 text-[8px] transition-colors ${
              canSaveCrewChoice
                ? "bg-(--hud-accent)/10 text-(--hud-text) hover:bg-(--hud-accent)/15"
                : "cursor-not-allowed text-(--hud-text-dim) opacity-60"
            }`}
          >
            {saveStatus === "saving" && <Loader2 size={10} className="animate-spin" aria-hidden="true" />}
            {selectedCrewName && selectedRole
              ? `Assign ${selectedCrewName} to ${roleLabel(selectedRole)}`
              : "Assign Crew"}
          </button>
          <div className="mb-1 flex items-center justify-between gap-2 text-[7px] text-(--hud-text-dim)">
            <span>Job Board</span>
            {displayedStatus === "loading" && <Loader2 size={10} className="animate-spin" aria-hidden="true" />}
          </div>
          <div className="flex flex-col gap-1">
            {displayedStatus === "loading" ? (
              <div className="flex items-center justify-center gap-1.5 border border-(--hud-border-subtle) px-1.5 py-5 text-(--hud-text-dim)">
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                Loading
              </div>
            ) : availableCandidates.length === 0 ? (
              <div className="border border-(--hud-border-subtle) px-1.5 py-2 text-(--hud-text-dim)">
                No local crew postings
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {availableCandidates.map((candidate) => {
                  const addDisabled = crewAtCapacity || addingCandidateId !== null;
                  return (
                    <li
                      key={candidate.id}
                      className="border border-(--hud-border-subtle) bg-(--hud-surface-2)/30"
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 px-1.5 py-1">
                        <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[9px] text-(--hud-text)">
                            {candidate.characterName}
                          </span>
                          <UserRoundPlus size={10} aria-hidden="true" className="shrink-0 text-(--hud-text-dim)" />
                        </div>
                        <div className="mt-0.5 truncate text-(--hud-text-dim)">
                          Available crew candidate
                        </div>
                        </div>
                          <button
                            type="button"
                            disabled={addDisabled}
                            onClick={() => void addCandidateToCrew(candidate)}
                            title={crewAtCapacity ? "Crew pool is at stateroom capacity" : "Add to ship crew"}
                            className={`flex h-6 w-6 items-center justify-center border border-(--hud-border-subtle) transition-colors ${
                              addDisabled
                                ? "cursor-not-allowed opacity-60"
                                : "hover:bg-(--hud-surface-2)"
                            }`}
                          >
                            {addingCandidateId === candidate.id && (
                              <Loader2 size={9} className="animate-spin" aria-hidden="true" />
                            )}
                            {addingCandidateId !== candidate.id && <Plus size={11} aria-hidden="true" />}
                          </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
