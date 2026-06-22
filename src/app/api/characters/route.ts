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
      },
    });

    const items = rows.map(c => {
      const colonIdx = c.currentLocation?.indexOf(":") ?? -1;
      const sectorAbbr = colonIdx !== -1 ? c.currentLocation!.slice(0, colonIdx) : null;
      const hex        = colonIdx !== -1 ? c.currentLocation!.slice(colonIdx + 1) : null;
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
