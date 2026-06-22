"use client";

import { useRef, useState, useEffect } from "react";
import { usePluginDispatch, usePluginSelector } from "@/plugin-api";
import { invalidateCharacters, fetchCharacters } from "./charactersSlice";
import { selectCharacters } from "./selectors";
import { generateCharacter, CharacterDeathError } from "@/lib/characters/engine";
import { RandomDecisionProvider } from "@/lib/characters/providers/random";
import {
  HumanDecisionProvider,
  GenerationCancelledError,
} from "@/lib/characters/providers/human";
import type { CharacterSheet, DecisionPoint } from "@/lib/characters/types";

// ─── Display helpers ──────────────────────────────────────────────────────────

const uppHex = (sheet: CharacterSheet) =>
  [sheet.upp.str, sheet.upp.dex, sheet.upp.end, sheet.upp.int, sheet.upp.edu, sheet.upp.soc]
    .map(v => Math.min(15, v).toString(16).toUpperCase())
    .join("");

const CAREER_INFO: Record<string, { label: string; desc: string }> = {
  navy:      { label: "Navy",      desc: "Starships · Space combat" },
  marines:   { label: "Marines",   desc: "Boarding · Planetary raids" },
  army:      { label: "Army",      desc: "Ground forces · Defense" },
  scouts:    { label: "Scouts",    desc: "Survey · Courier" },
  merchants: { label: "Merchants", desc: "Trade · Free traders" },
  other:     { label: "Other",     desc: "Criminal · Miscellaneous" },
};

const TABLE_NAMES: Record<string, string> = {
  personal_development:  "Personal Development",
  service_skills:        "Service Skills",
  advanced_education:    "Advanced Education",
  advanced_education_2:  "Advanced Education II",
  officer:               "Officer",
};

const stepTitle = (point: DecisionPoint): { heading: string; sub?: string } => {
  switch (point.step) {
    case "career_selection":
      return { heading: "Choose Your Career" };
    case "skill_table_choice":
      return {
        heading: "Choose a Skill Table",
        sub: point.term ? `Term ${point.term}` : undefined,
      };
    case "reenlistment_decision":
      return {
        heading: "Re-enlist or Muster Out?",
        sub: [
          point.term ? `Term ${point.term} complete` : null,
          point.roll !== undefined ? `Reenlistment roll: ${point.roll}` : null,
        ].filter(Boolean).join(" · "),
      };
    case "muster_roll_type":
      return { heading: "Cash or Benefits?" };
    default:
      return { heading: point.step };
  }
};

const optionLabel = (step: string, opt: { id: string; label: string }): string => {
  if (step === "skill_table_choice") return TABLE_NAMES[opt.id] ?? opt.label;
  if (step === "career_selection") return CAREER_INFO[opt.id]?.label ?? opt.label;
  return opt.label;
};

const makeLogEntry = (point: DecisionPoint, id: string): string => {
  switch (point.step) {
    case "career_selection":
      return `Career: ${CAREER_INFO[id]?.label ?? id}`;
    case "skill_table_choice":
      return `T${point.term} · ${TABLE_NAMES[id] ?? id}`;
    case "reenlistment_decision":
      return `T${point.term} · ${id === "reenlist" ? "Re-enlisted" : "Mustered out"}${
        point.roll !== undefined ? ` (roll ${point.roll})` : ""
      }`;
    case "muster_roll_type":
      return `Muster · ${id === "cash" ? "Cash" : "Benefits"}`;
    default:
      return id;
  }
};

// ─── Sheet display ────────────────────────────────────────────────────────────

const SheetDisplay = ({ sheet }: { sheet: CharacterSheet }) => {
  const career = sheet.careers[0];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">UPP</span>
        <span className="font-mono text-[11px] tracking-[0.14em] text-(--hud-accent)">{uppHex(sheet)}</span>
        <div className="mt-0.5 flex gap-2">
          {(
            [
              ["STR", sheet.upp.str],
              ["DEX", sheet.upp.dex],
              ["END", sheet.upp.end],
              ["INT", sheet.upp.int],
              ["EDU", sheet.upp.edu],
              ["SOC", sheet.upp.soc],
            ] as [string, number][]
          ).map(([label, value]) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="font-mono text-[7px] uppercase tracking-wider text-(--hud-text-dim)">{label}</span>
              <span className="font-mono text-[9px] text-(--hud-text)">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">Career</span>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] capitalize text-(--hud-text)">{career.career}</span>
          <span className="font-mono text-[8px] text-(--hud-text-dim)">
            {career.terms} term{career.terms !== 1 ? "s" : ""}
            {career.commissioned ? ` · Rank ${career.rank}` : ""}
          </span>
          <span className="font-mono text-[8px] text-(--hud-text-dim)">Age {sheet.age}</span>
        </div>
      </div>

      {sheet.skills.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">Skills</span>
          <div className="flex flex-wrap gap-1">
            {sheet.skills.map(s => (
              <span
                key={s.name}
                className="border border-(--hud-border) bg-(--hud-surface-2) px-1 py-0.5 font-mono text-[8px] text-(--hud-text)"
              >
                {s.name}-{s.level}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">Credits</span>
          <span className="font-mono text-[10px] text-(--hud-accent)">Cr{sheet.credits.toLocaleString()}</span>
        </div>
        {sheet.benefits.retirementPay !== null && (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">Retirement</span>
            <span className="font-mono text-[10px] text-(--hud-text)">Cr{sheet.benefits.retirementPay.toLocaleString()}/yr</span>
          </div>
        )}
        {sheet.benefits.ships.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">Ship</span>
            <span className="font-mono text-[10px] capitalize text-(--hud-text)">{sheet.benefits.ships.join(", ")}</span>
          </div>
        )}
        {sheet.benefits.passages.low + sheet.benefits.passages.middle + sheet.benefits.passages.high > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">Passages</span>
            <span className="font-mono text-[9px] text-(--hud-text)">
              {[
                sheet.benefits.passages.high   ? `${sheet.benefits.passages.high}H`   : "",
                sheet.benefits.passages.middle ? `${sheet.benefits.passages.middle}M` : "",
                sheet.benefits.passages.low    ? `${sheet.benefits.passages.low}L`    : "",
              ].filter(Boolean).join(" ")}
            </span>
          </div>
        )}
        {sheet.benefits.weapons.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">Weapons</span>
            <span className="font-mono text-[9px] text-(--hud-text)">{sheet.benefits.weapons.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

const CREW_ROLES = [
  { id: "pilot",     label: "Pilot",     desc: "Flies the ship" },
  { id: "navigator", label: "Navigator", desc: "Plots jump routes" },
  { id: "engineer",  label: "Engineer",  desc: "Maintains drives and power plant" },
  { id: "steward",   label: "Steward",   desc: "Passengers and cargo" },
] as const;

type CrewRoleId = typeof CREW_ROLES[number]["id"];
type Phase = "idle" | "running" | "deciding" | "complete" | "dead";
type SaveState = "idle" | "saving" | "saved" | "error";

export const CharacterCreateHudContent = () => {
  const dispatch = usePluginDispatch();
  const characters = usePluginSelector(selectCharacters);

  const [phase, setPhase] = useState<Phase>("idle");
  const [sheet, setSheet] = useState<CharacterSheet | null>(null);
  const [deathMsg, setDeathMsg] = useState<string | null>(null);
  const [pendingPoint, setPendingPoint] = useState<DecisionPoint | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [charName, setCharName] = useState("Unnamed Traveller");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<CrewRoleId | null>(null);
  const providerRef = useRef<HumanDecisionProvider | null>(null);

  useEffect(() => {
    dispatch(fetchCharacters());
  }, [dispatch]);

  const isFirstCharacter = characters.length === 0;

  const reset = () => {
    providerRef.current?.cancel();
    providerRef.current = null;
    setPhase("idle");
    setSheet(null);
    setDeathMsg(null);
    setPendingPoint(null);
    setLog([]);
    setCharName("Unnamed Traveller");
    setSaveState("idle");
    setSavedId(null);
    setSelectedRole(null);
  };

  // ── Random mode ─────────────────────────────────────────────────────────────
  const handleRandom = async () => {
    reset();
    setPhase("running");
    try {
      const result = await generateCharacter(
        "Unnamed Traveller",
        new RandomDecisionProvider(),
        { mode: "random" }
      );
      setSheet(result);
      setCharName("Unnamed Traveller");
      setPhase("complete");
    } catch (e) {
      if (e instanceof CharacterDeathError) {
        setDeathMsg((e as CharacterDeathError).message);
        setPhase("dead");
      }
    }
  };

  // ── Guided mode ─────────────────────────────────────────────────────────────
  const handleGuided = () => {
    reset();
    const provider = new HumanDecisionProvider((point) => setPendingPoint(point));
    providerRef.current = provider;
    setPhase("deciding");

    generateCharacter("Unnamed Traveller", provider, { mode: "guided" })
      .then(result => {
        setSheet(result);
        setCharName("Unnamed Traveller");
        setPendingPoint(null);
        setPhase("complete");
      })
      .catch(e => {
        if (e instanceof CharacterDeathError) {
          setDeathMsg((e as CharacterDeathError).message);
          setPendingPoint(null);
          setPhase("dead");
        } else if (!(e instanceof GenerationCancelledError)) {
          setPhase("idle");
        }
      });
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!sheet || saveState === "saving" || saveState === "saved") return;
    if (isFirstCharacter && !selectedRole) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet,
          name: charName,
          ...(isFirstCharacter && selectedRole ? { role: selectedRole } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[save character]", err);
        setSaveState("error");
        return;
      }
      const data: { id: string; name: string } = await res.json();
      setSavedId(data.id);
      setSaveState("saved");
      dispatch(invalidateCharacters());
      await dispatch(fetchCharacters());
    } catch (err) {
      console.error("[save character]", err);
      setSaveState("error");
    }
  };

  const handleChoice = (point: DecisionPoint, id: string) => {
    if (!providerRef.current) return;
    setLog(prev => [...prev, makeLogEntry(point, id)]);
    setPendingPoint(null);
    providerRef.current.choose(id);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const title = phase === "idle"
    ? "Character Generation"
    : phase === "deciding" || phase === "running"
    ? "Character Generation — In Progress"
    : phase === "complete"
    ? "Character Generation — Complete"
    : "Character Generation";

  return (
    <div className="flex max-h-[50vh] w-[420px] flex-col gap-2 overflow-y-auto p-0.5">
      <div className="font-mono text-[8px] font-bold uppercase tracking-wider text-(--hud-text)">
        {title}
      </div>

        {/* ── Idle: mode selection ───────────────────────────────────────────── */}
        {phase === "idle" && (
          <div className="flex gap-2">
            <button
              onClick={handleRandom}
              className="group flex flex-1 flex-col gap-0.5 border border-(--hud-border) px-2 py-1.5 text-left transition-colors hover:border-(--hud-accent)"
            >
              <span className="font-mono text-[9px] uppercase tracking-wider text-(--hud-text) transition-colors group-hover:text-(--hud-accent)">
                Random
              </span>
              <span className="font-mono text-[8px] text-(--hud-text-dim)">
                Instant lifepath
              </span>
            </button>
            <button
              onClick={handleGuided}
              className="group flex flex-1 flex-col gap-0.5 border border-(--hud-border) px-2 py-1.5 text-left transition-colors hover:border-(--hud-accent)"
            >
              <span className="font-mono text-[9px] uppercase tracking-wider text-(--hud-text) transition-colors group-hover:text-(--hud-accent)">
                Guided
              </span>
              <span className="font-mono text-[8px] text-(--hud-text-dim)">
                Step-by-step
              </span>
            </button>
          </div>
        )}

        {/* ── Running: random generating ────────────────────────────────────── */}
        {phase === "running" && (
          <p className="animate-pulse font-mono text-[8px] text-(--hud-text-dim)">Generating…</p>
        )}

        {/* ── Deciding: guided decision point ───────────────────────────────── */}
        {phase === "deciding" && pendingPoint && (
          <div className="flex flex-col gap-2">
            {/* Prompt */}
            {(() => {
              const { heading, sub } = stepTitle(pendingPoint);
              return (
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-(--hud-text)">
                    ◈ {heading}
                  </span>
                  {sub && (
                    <span className="font-mono text-[8px] text-(--hud-text-dim)">{sub}</span>
                  )}
                </div>
              );
            })()}

            {/* Options */}
            <div className={
              pendingPoint.step === "career_selection"
                ? "grid grid-cols-3 gap-1"
                : "flex flex-wrap gap-1"
            }>
              {pendingPoint.options.map(opt => {
                const label = optionLabel(pendingPoint.step, opt);
                const desc = pendingPoint.step === "career_selection"
                  ? CAREER_INFO[opt.id]?.desc
                  : undefined;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleChoice(pendingPoint, opt.id)}
                    className="flex flex-col gap-0.5 border border-(--hud-border) px-2 py-1 text-left transition-colors hover:border-(--hud-accent) hover:bg-(--hud-accent)/5"
                  >
                    <span className="font-mono text-[9px] text-(--hud-text)">{label}</span>
                    {desc && (
                      <span className="font-mono text-[7px] text-(--hud-text-dim)">{desc}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Decision log */}
            {log.length > 0 && (
              <div className="flex flex-col gap-0.5 border-t border-(--hud-border)/40 pt-1">
                {log.map((entry, i) => (
                  <span key={i} className="font-mono text-[8px] text-(--hud-text-dim)">
                    {entry}
                  </span>
                ))}
              </div>
            )}

            {/* Cancel */}
            <button
              onClick={reset}
              className="self-start font-mono text-[8px] text-(--hud-text-dim) transition-colors hover:text-(--hud-error)"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Deciding: between steps (engine running internally) ────────────── */}
        {phase === "deciding" && !pendingPoint && (
          <p className="animate-pulse font-mono text-[8px] text-(--hud-text-dim)">Resolving…</p>
        )}

        {/* ── Dead ──────────────────────────────────────────────────────────── */}
        {phase === "dead" && deathMsg && (
          <div className="flex flex-col gap-2">
            <div className="border border-(--hud-error)/40 bg-(--hud-error)/5 px-2 py-1 font-mono text-[9px] text-(--hud-error)">
              {deathMsg} — the character is lost.
            </div>
            <button
              onClick={reset}
              className="self-start border border-(--hud-border) px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-accent)"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Complete: character sheet ──────────────────────────────────────── */}
        {phase === "complete" && sheet && (
          <div className="flex flex-col gap-2">
            <SheetDisplay sheet={sheet} />

            {/* Save controls */}
            <div className="flex flex-col gap-2 border-t border-(--hud-border)/40 pt-2">
              {saveState !== "saved" ? (
                <>
                  {/* Role picker — first character only */}
                  {isFirstCharacter && (
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
                        Choose Your Crew Role
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        {CREW_ROLES.map(r => (
                          <button
                            key={r.id}
                            onClick={() => setSelectedRole(r.id)}
                            className={[
                              "flex flex-col gap-0.5 border px-2 py-1 text-left transition-colors",
                              selectedRole === r.id
                                ? "border-(--hud-accent) bg-(--hud-accent)/5 text-(--hud-accent)"
                                : "border-(--hud-border) hover:border-(--hud-accent) text-(--hud-text)",
                            ].join(" ")}
                          >
                            <span className="font-mono text-[8px] uppercase tracking-wider">{r.label}</span>
                            <span className="font-mono text-[7px] text-(--hud-text-dim)">{r.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
                      Character Name
                    </label>
                    <input
                      type="text"
                      value={charName}
                      onChange={e => setCharName(e.target.value)}
                      maxLength={64}
                      className="w-full border border-(--hud-border) bg-(--hud-surface-2) px-1.5 py-1 font-mono text-[9px] text-(--hud-text) outline-none focus:border-(--hud-accent)"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saveState === "saving" || !charName.trim() || (isFirstCharacter && !selectedRole)}
                      className="border border-(--hud-accent) px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-(--hud-accent) transition-colors hover:bg-(--hud-accent)/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {saveState === "saving" ? "Saving…" : "Save Character"}
                    </button>
                    <button
                      onClick={reset}
                      className="border border-(--hud-border) px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-accent)"
                    >
                      Generate Another
                    </button>
                    {saveState === "error" && (
                      <span className="font-mono text-[8px] text-(--hud-error)">Save failed</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[9px] text-(--hud-accent)">
                      ✓ {charName} saved
                    </span>
                    {savedId && (
                      <span className="font-mono text-[8px] text-(--hud-text-dim)">{savedId}</span>
                    )}
                  </div>
                  <button
                    onClick={reset}
                    className="border border-(--hud-border) px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-accent)"
                  >
                    Generate Another
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export default CharacterCreateHudContent;
