import { NextResponse } from "next/server";
import type { Prisma as CharacterDbPrisma } from "@/generated/character-prisma";
import { characterPrisma } from "@/plugins/characters/server/characterPrisma";
import type { CharacterGender, CharacterSheet } from "@/lib/characters/types";
import { getCurrentUser, isDevAuthMode } from "@/lib/devAuth";
import { extractPendingGeneratedContacts } from "@/plugins/characters/generation/pendingContacts";
import { materializePendingGeneratedContacts } from "@/plugins/characters/server/contactGenerationService";
import { generateCharacterPortraitAvatar } from "@/plugins/characters/server/avatarGenerationService";

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

const normalizeGender = (value: unknown): CharacterGender | null =>
  value === "female" || value === "male" ? value : null;

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
        kind:           true,
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
        relationshipsFrom: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            type: true,
            attitude: true,
            notes: true,
            source: true,
            toCharacterId: true,
            toCharacter: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const items = rows.map(c => {
      const colonIdx = c.currentLocation?.indexOf(":") ?? -1;
      const sectorAbbr = colonIdx !== -1 ? c.currentLocation!.slice(0, colonIdx) : null;
      const hex        = colonIdx !== -1 ? c.currentLocation!.slice(colonIdx + 1) : null;
      const sheet = c.sheet as CharacterSheet | null;
      const history = normalizeHistory(sheet);
      const sheetMetadata = sheet?.generation?.metadata;
      return {
        id:             c.id,
        kind:           c.kind,
        name:           c.name,
        gender:         normalizeGender(sheet?.gender ?? sheetMetadata?.gender),
        avatar:         sheet?.avatar ?? sheetMetadata?.avatar ?? null,
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
        relationships:   c.relationshipsFrom.map((relationship) => ({
          id:              relationship.id,
          type:            relationship.type,
          attitude:        relationship.attitude,
          notes:           relationship.notes,
          source:          relationship.source,
          toCharacterId:   relationship.toCharacterId,
          toCharacterName: relationship.toCharacter.name,
        })),
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
    const gender = normalizeGender(sheet.gender ?? sheet.generation?.metadata?.gender);
    const sheetForStorage: CharacterSheet = {
      ...sheet,
      name,
      gender,
      generation: {
        ...sheet.generation,
        metadata: {
          ...(sheet.generation.metadata ?? {}),
          gender,
        },
      },
    };
    const skills = normalizeSkills(sheet.skills);
    const credits = Number.isFinite(sheet.credits) ? sheet.credits : 0;

    const saved = await characterPrisma.$transaction(async (tx) => {
      const data: CharacterDbPrisma.CharacterCreateInput = {
        name,
        kind:           "player",
        userId:         user.id,
        strength:       sheet.upp.str,
        dexterity:      sheet.upp.dex,
        endurance:      sheet.upp.end,
        intelligence:   sheet.upp.int,
        education:      sheet.upp.edu,
        socialStanding: sheet.upp.soc,
        credits,
        sheet:          sheetForStorage as unknown as CharacterDbPrisma.InputJsonValue,
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

      const generatedContacts = await materializePendingGeneratedContacts({
        tx,
        userId: user.id,
        sourceCharacterId: created.id,
        currentLocation: sheetForStorage.currentLocation,
        pendingContacts: extractPendingGeneratedContacts(sheetForStorage),
      });

      return {
        character: created,
        generatedContacts,
      };
    });

    let avatarGenerated = false;
    let avatarError: string | null = null;

    try {
      const avatarResult = await generateCharacterPortraitAvatar({
        characterId: saved.character.id,
        sheet: sheetForStorage,
      });

      if (avatarResult) {
        await characterPrisma.character.update({
          where: { id: saved.character.id },
          data: {
            sheet: avatarResult.sheet as unknown as CharacterDbPrisma.InputJsonValue,
          },
        });
        avatarGenerated = true;
      }
    } catch (err) {
      avatarError = err instanceof Error ? err.message : String(err);
      console.error("[POST /api/characters avatar]", err);
    }

    return NextResponse.json({
      id: saved.character.id,
      name: saved.character.name,
      generatedContacts: saved.generatedContacts.length,
      avatarGenerated,
      ...(avatarError ? { avatarError } : {}),
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/characters]", err);
    return errorResponse(err);
  }
};
