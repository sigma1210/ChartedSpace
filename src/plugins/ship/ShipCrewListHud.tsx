"use client";

import Image from "next/image";
import { useState } from "react";
import { Settings } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setHudVisible } from "@/store/slices/hudSlice";
import { openModal } from "@/store/slices/uiSlice";
import { setSelectedProfileCharacter } from "@/plugins/characters/charactersSlice";
import { selectedCharacterProfileHudId } from "@/plugins/characters/metadata";
import { selectActiveShip, selectShipStatus } from "./selectors";
import type { CrewMember } from "./shipPluginSlice";

const crewName = (member: CrewMember) =>
  member.characterName ?? member.npcName ?? "Crew";

const roleLabel = (role: string) =>
  role === "unassigned" ? "Unassigned" : role;

const CrewAvatar = ({ member }: { member: CrewMember }) => {
  const [failedPortraitPath, setFailedPortraitPath] = useState<string | null>(null);
  const name = crewName(member);
  const portraitPath = member.characterAvatar?.currentPortraitPath ?? null;
  const showPortrait = portraitPath && failedPortraitPath !== portraitPath;

  return (
    <span className="relative block h-10 w-10 shrink-0 overflow-hidden border border-(--hud-border-subtle) bg-(--hud-surface)">
      {showPortrait && (
        <Image
          src={portraitPath}
          alt={`${name} portrait`}
          fill
          sizes="40px"
          onError={() => setFailedPortraitPath(portraitPath)}
          className="object-cover"
        />
      )}
      {!showPortrait && (
        <span className="flex h-full w-full items-center justify-center text-[11px] text-(--hud-text-dim)">
          {name.slice(0, 1)}
        </span>
      )}
    </span>
  );
};

export const ShipCrewListHudContent = () => {
  const dispatch = useAppDispatch();
  const ship = useAppSelector(selectActiveShip);
  const status = useAppSelector(selectShipStatus);

  const openProfile = (characterId: string | null) => {
    if (!characterId) return;
    dispatch(setSelectedProfileCharacter(characterId));
    dispatch(setHudVisible({ id: selectedCharacterProfileHudId, visible: true }));
  };

  const openCrewManagement = () => {
    dispatch(openModal("shipCrewAssignment"));
  };

  if (status === "loading") {
    return (
      <div className="w-72 p-1 font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
        Loading crew...
      </div>
    );
  }

  if (!ship) {
    return (
      <div className="w-72 p-1 font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
        No active ship
      </div>
    );
  }

  const crew = ship.crew;
  const salaryTotal = crew.reduce((total, member) => total + member.monthlySalary, 0);

  return (
    <div className="flex max-h-[42vh] w-80 flex-col gap-1 overflow-hidden p-0.5 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
      <div className="flex items-center justify-between border-b border-(--hud-border-subtle) pb-1">
        <div className="min-w-0">
          <div className="truncate text-[8px] text-(--hud-text-dim)">
            {ship.name} Crew
          </div>
          <div className="text-[7px] text-(--hud-text-dim)">
            {crew.length}/{ship.stateroomsTotal ?? "?"} berths · Cr {salaryTotal.toLocaleString()}/mo
          </div>
        </div>
        <button
          type="button"
          onClick={openCrewManagement}
          className="flex h-5 items-center gap-1 border border-(--hud-border) px-1.5 text-[8px] text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text)"
          title="Manage crew assignments"
        >
          <Settings size={10} aria-hidden="true" />
          Manage
        </button>
      </div>

      <div className="min-h-0 overflow-y-auto pr-1">
        {crew.length === 0 ? (
          <div className="py-5 text-center text-[8px] text-(--hud-text-dim)">
            No crew aboard
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {crew.map((member) => {
              const name = crewName(member);
              return (
                <li
                  key={member.id}
                  className="border border-(--hud-border-subtle) bg-(--hud-surface-2)/60"
                >
                  <button
                    type="button"
                    onClick={() => openProfile(member.characterId)}
                    disabled={!member.characterId}
                    className="flex w-full gap-2 px-1.5 py-1 text-left transition-colors hover:bg-(--hud-surface-2) disabled:cursor-default disabled:hover:bg-transparent"
                    title={member.characterId ? `View ${name}` : name}
                  >
                    <CrewAvatar member={member} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[9px] text-(--hud-text)">
                          {name}
                        </span>
                        {member.isOwnerOperator && (
                          <span className="shrink-0 border border-(--hud-border-subtle) px-1 text-[7px] text-(--hud-text-dim)">
                            Owner
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2 text-(--hud-text-dim)">
                        <span className="truncate">{roleLabel(member.role)}</span>
                        <span className="shrink-0">Cr {member.monthlySalary.toLocaleString()}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[7px] text-(--hud-text-dim)">
                        {member.keySkillName
                          ? `${member.keySkillName} ${Math.max(0, member.keySkillLevel)}`
                          : "No assigned skill"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ShipCrewListHudContent;
