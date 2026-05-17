import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOrUpdateUser, getUser } from "@/actions/user";
import type { Prisma } from "@prisma/client";
import type { CharacterSheet } from "@/lib/characters/types";

const DEV_MODE = process.env.DEV_MODE === "true";

const toHex = (n: number) => Math.min(15, Math.max(0, n)).toString(16).toUpperCase();

export const GET = async () => {
  try {
    const { userId: clerkId } = await auth();

    let where: Prisma.CharacterWhereInput;
    if (DEV_MODE) {
      where = { userId: null } as unknown as Prisma.CharacterWhereInput;
    } else {
      if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const dbUser = await getUser(clerkId);
      if (!dbUser) return NextResponse.json({ items: [] });
      where = { userId: dbUser.id };
    }

    const rows = await prisma.character.findMany({
      where,
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
        skills: { select: { name: true, level: true } },
        currentWorld: {
          select: {
            name:   true,
            hex:    true,
            sector: { select: { abbreviation: true } },
          },
        },
      },
    });

    const items = rows.map(c => ({
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
      worldName:      c.currentWorld?.name ?? null,
      sectorAbbr:     c.currentWorld?.sector.abbreviation ?? null,
      hex:            c.currentWorld?.hex ?? null,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[GET /api/characters]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

export const POST = async (request: Request) => {
  try {
    const { userId: clerkId } = await auth();

    // Resolve DB user — skip in DEV_MODE so characters can be saved without webhook sync
    let dbUserId: string | undefined;
    if (!DEV_MODE) {
      if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const user = await createOrUpdateUser({ clerkId });
      if (!user) return NextResponse.json({ error: "Failed to resolve user" }, { status: 500 });
      dbUserId = user.id;
    }

    const body: { sheet: CharacterSheet; name?: string } = await request.json();
    const sheet: CharacterSheet = body.sheet;

    if (!sheet?.upp || !sheet?.careers?.length) {
      return NextResponse.json({ error: "Invalid character sheet" }, { status: 400 });
    }

    const name = (body.name?.trim() || sheet.name || "Unnamed Traveller").trim();

    const character = await prisma.$transaction(async (tx) => {
      const data = {
        name,
        userId:         dbUserId ?? null,
        strength:       sheet.upp.str,
        dexterity:      sheet.upp.dex,
        endurance:      sheet.upp.end,
        intelligence:   sheet.upp.int,
        education:      sheet.upp.edu,
        socialStanding: sheet.upp.soc,
        credits:        sheet.credits,
        sheet:          sheet as unknown as Prisma.InputJsonValue,
        currentWorldId: sheet.currentWorldId ?? null,
      } as unknown as Prisma.CharacterUncheckedCreateInput;
      const created = await tx.character.create({ data });
      if (sheet.skills.length > 0) {
        await tx.characterSkill.createMany({
          data: sheet.skills.map(s => ({
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
