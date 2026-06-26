import { NextResponse } from "next/server";
import type { Prisma as CharacterDbPrisma } from "@/generated/character-prisma";
import { characterPrisma } from "@/plugins/characters/server/characterPrisma";
import type { CharacterSheet } from "@/lib/characters/types";
import { getCurrentUser, isDevAuthMode } from "@/lib/devAuth";

const toHex = (n: number) => Math.min(15, Math.max(0, n)).toString(16).toUpperCase();

const normalizeSkills = (skills: CharacterSheet["skills"]) => {
  if (!Array.isArray(skills)) return [];
  const byName = new Map<string, number>();
  for (const skill of skills) {
    if (!skill || typeof skill.name !== "string" || !Number.isFinite(skill.level)) continue;
    const name = skill.name.trim();
    if (!name) continue;
    byName.set(name, Math.max(byName.get(name) ?? skill.level, skill.level));
  }
  return [...byName.entries()].map(([name, level]) => ({ name, level }));
};

const preCareerHistoryTypes = new Set([
  "preCareer.skip",
  "preCareer.select",
  "preCareer.qualification.roll",
  "preCareer.graduation.roll",
]);

const musterOutHistoryTypes = new Set([
  "generation.muster-out",
  "benefit.choice",
  "benefit.roll",
]);

const normalizeHistoryStage = (
  record: Record<string, unknown>,
): "background" | "preCareer" | "careerTerm" | "musterOut" => {
  if (
    record.stage === "background"
    || record.stage === "preCareer"
    || record.stage === "careerTerm"
    || record.stage === "musterOut"
  ) {
    return record.stage;
  }

  const type = typeof record.type === "string" ? record.type : "";
  if (preCareerHistoryTypes.has(type)) return "preCareer";
  if (musterOutHistoryTypes.has(type)) return "musterOut";
  return typeof record.term === "number" ? "careerTerm" : "background";
};

const normalizeHistory = (sheet: CharacterSheet | null) => {
  const history = sheet?.generation?.metadata?.history;
  if (!Array.isArray(history)) return [];

  return history.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    if (typeof record.label !== "string" || typeof record.type !== "string") return [];
    return [{
      type: record.type,
      stage: normalizeHistoryStage(record),
      label: record.label,
      detail: typeof record.detail === "string" ? record.detail : null,
      term: typeof record.term === "number" ? record.term : null,
      roll: typeof record.roll === "number" ? record.roll : null,
    }];
  });
};

const educationLabelFromHistory = (label: string) =>
  label.replace(/^Selected pre-career education:\s*/i, "").trim();

const skillLabelFromHistory = (label: string) => {
  const [, result] = label.split(":");
  return (result ?? label).trim();
};

const normalizeEducation = (history: ReturnType<typeof normalizeHistory>) => {
  const selectedIndex = history.findIndex((entry) => entry.type === "preCareer.select");
  if (selectedIndex === -1) return null;

  const careerStartIndex = history.findIndex((entry, index) =>
    index > selectedIndex && entry.type === "career.select");
  const educationEntries = history.slice(
    selectedIndex,
    careerStartIndex === -1 ? undefined : careerStartIndex,
  );
  const selected = educationEntries.find((entry) => entry.type === "preCareer.select");
  if (!selected) return null;

  const admission = educationEntries.find((entry) => entry.type === "preCareer.qualification.roll");
  const graduation = educationEntries.find((entry) => entry.type === "preCareer.graduation.roll");
  const skills = educationEntries
    .filter((entry) => entry.type === "skill.roll")
    .map((entry) => skillLabelFromHistory(entry.label));

  return {
    label: educationLabelFromHistory(selected.label),
    admission: admission?.detail?.includes("not admitted")
      ? "not-admitted"
      : admission?.detail?.includes("admitted")
        ? "admitted"
        : "unknown",
    graduation: graduation?.detail?.includes("graduated with honors")
      ? "honors"
      : graduation?.detail?.includes("did not graduate")
        ? "not-graduated"
        : graduation?.detail?.includes("graduated")
          ? "graduated"
          : "unknown",
    skills,
  };
};

const normalizeCareers = (sheet: CharacterSheet | null) => {
  const careers = sheet?.generation?.metadata?.careers;
  if (!Array.isArray(careers)) return [];

  return careers.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const careerId = typeof record.careerId === "string" ? record.careerId : null;
    const careerLabel = typeof record.careerLabel === "string" ? record.careerLabel : null;
    if (!careerId || !careerLabel) return [];
    return [{
      careerId,
      careerLabel,
      assignmentLabel: typeof record.assignmentLabel === "string" ? record.assignmentLabel : null,
      terms: typeof record.terms === "number" ? record.terms : 0,
      finalRank: typeof record.finalRank === "number" ? record.finalRank : 0,
      finalRankTitle: typeof record.finalRankTitle === "string" ? record.finalRankTitle : null,
      commissioned: typeof record.commissioned === "boolean" ? record.commissioned : false,
    }];
  });
};

const errorResponse = (err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  return NextResponse.json(
    {
      error: "Internal server error",
      ...(isDevAuthMode() ? { detail } : {}),
    },
    { status: 500 },
  );
};

export const GET = async () => {
  try {
    const dbUser = await getCurrentUser();
    if (!dbUser) return NextResponse.json({ items: [] });

    const rows = await characterPrisma.character.findMany({
      where:   { userId: dbUser.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id:             true,
        name:           true,
        strength:       true,
        dexterity:      true,
        endurance:      true,
        intelligence:   true,
        education:      true,
        socialStanding: true,
        credits:        true,
        skills:          { select: { name: true, level: true } },
        currentLocation: true,
        sheet:           true,
      },
    });

    const items = rows.map(c => {
      const colonIdx = c.currentLocation?.indexOf(":") ?? -1;
      const sectorAbbr = colonIdx !== -1 ? c.currentLocation!.slice(0, colonIdx) : null;
      const hex        = colonIdx !== -1 ? c.currentLocation!.slice(colonIdx + 1) : null;
      const sheet = c.sheet as CharacterSheet | null;
      const history = normalizeHistory(sheet);
      return {
        id:             c.id,
        name:           c.name,
        upp:            [c.strength, c.dexterity, c.endurance, c.intelligence, c.education, c.socialStanding].map(toHex).join(""),
        strength:       c.strength,
        dexterity:      c.dexterity,
        endurance:      c.endurance,
        intelligence:   c.intelligence,
        education:      c.education,
        socialStanding: c.socialStanding,
        credits:        c.credits,
        skills:         c.skills,
        worldName:      null,
        sectorAbbr,
        hex,
        educationHistory: normalizeEducation(history),
        careers:        normalizeCareers(sheet),
        history,
      };
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[GET /api/characters]", err);
    return errorResponse(err);
  }
};

export const POST = async (request: Request) => {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Failed to resolve user" }, { status: 500 });

    const body: { sheet: CharacterSheet; name?: string } = await request.json();
    const sheet: CharacterSheet = body.sheet;

    if (!sheet?.upp || !sheet?.careers?.length) {
      return NextResponse.json({ error: "Invalid character sheet" }, { status: 400 });
    }

    const name = (body.name?.trim() || sheet.name || "Unnamed Traveller").trim();
    const skills = normalizeSkills(sheet.skills);
    const credits = Number.isFinite(sheet.credits) ? sheet.credits : 0;

    const character = await characterPrisma.$transaction(async (tx) => {
      const data: CharacterDbPrisma.CharacterCreateInput = {
        name,
        userId:         user.id,
        strength:       sheet.upp.str,
        dexterity:      sheet.upp.dex,
        endurance:      sheet.upp.end,
        intelligence:   sheet.upp.int,
        education:      sheet.upp.edu,
        socialStanding: sheet.upp.soc,
        credits,
        sheet:          sheet as unknown as CharacterDbPrisma.InputJsonValue,
      };

      const created = await tx.character.create({ data });

      if (skills.length > 0) {
        await tx.characterSkill.createMany({
          data: skills.map(s => ({
            characterId: created.id,
            name:        s.name,
            level:       s.level,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({ id: character.id, name: character.name }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/characters]", err);
    return errorResponse(err);
  }
};
