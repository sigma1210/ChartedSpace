"use client";

import { useState } from "react";
import { X, UserMinus, UserPlus, ArrowRight } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { closeModal } from "../../store/slices/uiSlice";
import { selectActiveModal } from "../../store/selectors/ui.selectors";
import { selectShip } from "../../store/selectors/ship.selectors";
import { invalidateShip, fetchShip } from "../../store/slices/shipSlice";
import { selectAvailableCrew } from "../../store/selectors/availableCrew.selectors";
import { removeFromPool } from "../../store/slices/availableCrewSlice";
import {
  qualifiesForRole,
  skillLevelForRole,
  formatUPP,
  ROLE_REQUIRED_SKILL,
} from "../../lib/crew";
import type { AvailableCrewMember } from "../../types";
import type { CrewMember } from "../../store/slices/shipSlice";
import shipTypes from "../../data/classic/ships.json";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  pilot:     "Pilot",
  navigator: "Navigator",
  engineer:  "Engineer",
  steward:   "Steward",
  gunner:    "Gunner",
  medic:     "Medic",
};

const ALL_ROLES = Object.keys(ROLE_REQUIRED_SKILL);

// ─── Crew slot (left panel) ───────────────────────────────────────────────────

interface CrewSlotProps {
  role:          string;
  member:        CrewMember | null;
  requiredRoles: string[];
  onFire:        (id: string) => void;
  onMoveCapTo:   (crewId: string, newRole: string) => void;
  firing:        string | null;
  moving:        string | null;
}

const CrewSlot = ({
  role, member, requiredRoles,
  onFire, onMoveCapTo,
  firing, moving,
}: CrewSlotProps) => {
  const label = ROLE_LABELS[role] ?? role;

  return (
    <div className="py-1.5 border-b border-(--hud-border) last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-widest text-(--hud-text-dim)">
          {label}
        </span>

        {member ? (
          <>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] text-(--hud-text) truncate">
                {member.isOwnerOperator && (
                  <span className="text-(--hud-accent) mr-1">★</span>
                )}
                {member.characterName ?? member.npcName ?? "—"}
              </p>
              {member.keySkillName && (
                <p className="font-mono text-[9px] text-(--hud-text-dim)">
                  {member.keySkillName}-{member.keySkillLevel}
                  <span className="ml-2 text-(--hud-border)">
                    Cr{member.monthlySalary.toLocaleString()}/mo
                  </span>
                </p>
              )}
            </div>
            {!member.isOwnerOperator && (
              <button
                onClick={() => onFire(member.id)}
                disabled={firing === member.id}
                title="Fire crew member"
                className="shrink-0 text-(--hud-text-dim) hover:text-(--hud-error) disabled:opacity-40 transition-colors"
              >
                <UserMinus size={12} strokeWidth={1.5} />
              </button>
            )}
          </>
        ) : (
          <>
            <span className="flex-1 font-mono text-[10px] text-(--hud-text-dim) italic">
              Vacant
            </span>
            <span className="flex items-center gap-0.5 font-mono text-[9px] text-(--hud-border)">
              hire from pool <ArrowRight size={9} strokeWidth={1.5} />
            </span>
          </>
        )}
      </div>

      {/* Captain role-reassignment row */}
      {member?.isOwnerOperator && (
        <div className="mt-1 ml-22 flex flex-wrap gap-1">
          <span className="font-mono text-[9px] text-(--hud-border) mr-0.5">move to:</span>
          {requiredRoles
            .filter(r => r !== role)
            .map(r => (
              <button
                key={r}
                onClick={() => onMoveCapTo(member.id, r)}
                disabled={moving === member.id}
                className="font-mono text-[9px] border border-(--hud-border) px-1 py-px text-(--hud-text-dim) hover:border-(--hud-accent) hover:text-(--hud-accent) disabled:opacity-40 transition-colors"
              >
                {ROLE_LABELS[r] ?? r}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

// ─── Available crew card (right panel) ───────────────────────────────────────

interface AvailableCardProps {
  member:      AvailableCrewMember;
  currentCrew: CrewMember[];
  onHire:      (member: AvailableCrewMember, role: string, replaceId?: string) => void;
  hiring:      string | null;
}

const AvailableCard = ({ member, currentCrew, onHire, hiring }: AvailableCardProps) => {
  const eligibleRoles = ALL_ROLES.filter(r => qualifiesForRole(member, r));
  if (eligibleRoles.length === 0) return null;

  return (
    <div className="border border-(--hud-border) bg-(--hud-surface-2) p-2 flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold text-(--hud-text) truncate">
          {member.name}
        </span>
        <span className="font-mono text-[9px] text-(--hud-text-dim) shrink-0">
          Age {member.age}
        </span>
      </div>

      <p className="font-mono text-[9px] tracking-widest text-(--hud-text-dim)">
        {formatUPP(member.upp)}
      </p>

      <div className="flex flex-wrap gap-1">
        {eligibleRoles.map(role => {
          const level    = skillLevelForRole(member, role);
          const skillNm  = ROLE_REQUIRED_SKILL[role];
          const existing = currentCrew.find(c => c.role === role && !c.isOwnerOperator);

          return (
            <button
              key={role}
              onClick={() => onHire(member, role, existing?.id)}
              disabled={hiring === member.id}
              className="font-mono text-[9px] border border-(--hud-border) px-1.5 py-0.5 text-(--hud-text-dim) hover:border-(--hud-accent) hover:text-(--hud-accent) disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <UserPlus size={9} strokeWidth={1.5} />
              {ROLE_LABELS[role] ?? role}
              <span className="text-(--hud-border)">
                {skillNm}-{level}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

const CrewManagementModal = () => {
  const dispatch      = useAppDispatch();
  const activeModal   = useAppSelector(selectActiveModal);
  const ship          = useAppSelector(selectShip);
  const availableCrew = useAppSelector(selectAvailableCrew);

  const [firing,  setFiring]  = useState<string | null>(null);
  const [hiring,  setHiring]  = useState<string | null>(null);
  const [moving,  setMoving]  = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  if (activeModal !== "crewManagement") return null;
  if (!ship) return null;

  const typeData      = shipTypes.find(s => s.type === ship.type);
  const requiredRoles: string[] = typeData?.requiredCrew ?? [];

  const crewByRole = (role: string): CrewMember | null =>
    ship.crew.find(c => c.role === role) ?? null;

  const extraCrew = ship.crew.filter(
    c => !c.isOwnerOperator && !requiredRoles.includes(c.role),
  );

  // ─── Fire ───────────────────────────────────────────────────────────────────

  const handleFire = async (crewId: string) => {
    setFiring(crewId);
    setError(null);
    try {
      const res = await fetch(`/api/ship/crew/${crewId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? "Failed to fire crew member");
        return;
      }
      dispatch(invalidateShip());
      dispatch(fetchShip());
    } catch {
      setError("Request failed");
    } finally {
      setFiring(null);
    }
  };

  // ─── Move captain to a different role ────────────────────────────────────────

  const handleMoveCapTo = async (crewId: string, newRole: string) => {
    setMoving(crewId);
    setError(null);
    try {
      const res = await fetch(`/api/ship/crew/${crewId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? "Failed to change role");
        return;
      }
      dispatch(invalidateShip());
      dispatch(fetchShip());
    } catch {
      setError("Request failed");
    } finally {
      setMoving(null);
    }
  };

  // ─── Hire ───────────────────────────────────────────────────────────────────

  const handleHire = async (
    member:    AvailableCrewMember,
    role:      string,
    replaceId: string | undefined,
  ) => {
    setHiring(member.id);
    setError(null);
    try {
      const keySkillLevel = skillLevelForRole(member, role);
      const res = await fetch("/api/ship/crew", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          role,
          npcName:       member.name,
          keySkillLevel,
          replaceCrewId: replaceId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? "Failed to hire crew member");
        return;
      }
      dispatch(removeFromPool(member.id));
      dispatch(invalidateShip());
      dispatch(fetchShip());
    } catch {
      setError("Request failed");
    } finally {
      setHiring(null);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => dispatch(closeModal())}
    >
      <div
        className="hud-panel flex flex-col w-full max-w-2xl max-h-[80vh] mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="hud-panel-header flex items-center justify-between shrink-0">
          <span>{ship.name} — Crew</span>
          <button
            onClick={() => dispatch(closeModal())}
            aria-label="Close"
            className="text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Error bar */}
        {error && (
          <div className="px-3 py-1.5 bg-(--hud-error)/10 border-b border-(--hud-error)/30 font-mono text-[10px] text-(--hud-error)">
            {error}
          </div>
        )}

        {/* Body — two columns */}
        <div className="flex flex-1 overflow-hidden divide-x divide-(--hud-border)">

          {/* Left — Current crew */}
          <div className="flex flex-col w-72 shrink-0 overflow-y-auto p-3">
            <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-(--hud-text-dim)">
              Current Crew
            </p>

            {requiredRoles.map(role => (
              <CrewSlot
                key={role}
                role={role}
                member={crewByRole(role)}
                requiredRoles={requiredRoles}
                onFire={handleFire}
                onMoveCapTo={handleMoveCapTo}
                firing={firing}
                moving={moving}
              />
            ))}

            {extraCrew.length > 0 && (
              <>
                <p className="mt-3 mb-1 font-mono text-[9px] uppercase tracking-widest text-(--hud-text-dim)">
                  Additional
                </p>
                {extraCrew.map(c => (
                  <CrewSlot
                    key={c.id}
                    role={c.role}
                    member={c}
                    requiredRoles={requiredRoles}
                    onFire={handleFire}
                    onMoveCapTo={handleMoveCapTo}
                    firing={firing}
                    moving={moving}
                  />
                ))}
              </>
            )}
          </div>

          {/* Right — Available pool */}
          <div className="flex-1 flex flex-col overflow-hidden p-3">
            <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-(--hud-text-dim) shrink-0">
              Available at Port
              <span className="ml-2 text-(--hud-border) normal-case tracking-normal">
                {availableCrew.filter(m => ALL_ROLES.some(r => qualifiesForRole(m, r))).length} qualified
              </span>
            </p>

            {availableCrew.length === 0 ? (
              <p className="font-mono text-[9px] text-(--hud-text-dim) italic">
                No crew available at this port
              </p>
            ) : (
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                {availableCrew.map(member => (
                  <AvailableCard
                    key={member.id}
                    member={member}
                    currentCrew={ship.crew}
                    onHire={handleHire}
                    hiring={hiring}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default CrewManagementModal;
