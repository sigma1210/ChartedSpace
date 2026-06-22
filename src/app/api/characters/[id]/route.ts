import { NextResponse } from "next/server";
import type { Prisma as CharacterDbPrisma } from "@/generated/character-prisma";
import { characterPrisma } from "@/plugins/characters/server/characterPrisma";
import type { CharacterSheet } from "@/lib/characters/types";
import { getCurrentUser } from "@/lib/devAuth";

type Params = { params: Promise<{ id: string }> };

const resolveDbUser = async () => {
  return await getCurrentUser();
};

const canModify = (characterUserId: string | null, dbUserId: string | null | undefined): boolean => {
  if (dbUserId === undefined) return false;
  return characterUserId === dbUserId;
};

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

// ─── PATCH /api/characters/[id] ──────────────────────────────────────────────

export const PATCH = async (request: Request, { params }: Params) => {
  try {
    const { id } = await params;
    const dbUser = await resolveDbUser();

    const character = await characterPrisma.character.findUnique({ where: { id } });
    if (!character) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canModify(character.userId, dbUser?.id ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: { name?: string; sheet?: CharacterSheet; credits?: number } = await request.json();
    const updates: CharacterDbPrisma.CharacterUpdateInput = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }

    if (typeof body.credits === "number" && Number.isInteger(body.credits)) {
      updates.credits = body.credits;
    }

    if (body.sheet) {
      const s = body.sheet;
      updates.sheet         = s as unknown as CharacterDbPrisma.InputJsonValue;
      updates.strength      = s.upp.str;
      updates.dexterity     = s.upp.dex;
      updates.endurance     = s.upp.end;
      updates.intelligence  = s.upp.int;
      updates.education     = s.upp.edu;
      updates.socialStanding = s.upp.soc;
      updates.credits       = s.credits;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const updated = await characterPrisma.$transaction(async (tx) => {
      const updated = await tx.character.update({ where: { id }, data: updates });

      if (body.sheet) {
        const skills = normalizeSkills(body.sheet.skills);
        await tx.characterSkill.deleteMany({ where: { characterId: id } });
        if (skills.length > 0) {
          await tx.characterSkill.createMany({
            data: skills.map((skill) => ({
              characterId: id,
              name:        skill.name,
              level:       skill.level,
            })),
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ id: updated.id, name: updated.name });
  } catch (err) {
    console.error("[PATCH /api/characters/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

// ─── DELETE /api/characters/[id] ─────────────────────────────────────────────

export const DELETE = async (_request: Request, { params }: Params) => {
  try {
    const { id } = await params;
    const dbUser = await resolveDbUser();

    const character = await characterPrisma.character.findUnique({ where: { id } });
    if (!character) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canModify(character.userId, dbUser?.id ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await characterPrisma.character.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/characters/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
