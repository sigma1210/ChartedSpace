import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOrUpdateUser, getUser } from "@/actions/user";
import type { Prisma } from "@prisma/client";
import type { CharacterSheet } from "@/lib/characters/types";
import { getClerkId } from "@/lib/devAuth";
import spawnPoints from "@/data/spawnPoints.json";
import shipTypes from "@/data/classic/ships.json";
import crewSalaries from "@/data/classic/crewSalaries.json";

const toHex = (n: number) => Math.min(15, Math.max(0, n)).toString(16).toUpperCase();

const REQUIRED_CREW = ["pilot", "navigator", "engineer", "steward"] as const;
type CrewRole = typeof REQUIRED_CREW[number];

const NPC_NAMES = [
  "Kiera Voss", "Talon Reth", "Mira Soto", "Dax Holt",
  "Sera Vance", "Joren Mak", "Lena Cruz", "Bram Tesh",
  "Yuki Hale", "Dorn Slater", "Cali Wren", "Fen Okafor",
];

const pickRandom = <T>(arr: readonly T[] | T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

const createShipForNewPlayer = async (
  tx: Prisma.TransactionClient,
  userId: string,
  characterId: string,
  role: CrewRole,
) => {
  const spawn = pickRandom(spawnPoints);
  const world = await tx.world.findFirst({
    where: { hex: spawn.hex, sector: { abbreviation: spawn.sectorAbbr } },
  });
  if (!world) {
    console.warn("[createShipForNewPlayer] spawn world not found:", spawn);
    return;
  }

  const freeTrader = shipTypes[0];

  const ship = await tx.ship.create({
    data: {
      name:           "Free Trader",
      type:           freeTrader.type,
      jumpRating:     freeTrader.jumpRating,
      isMortgaged:    true,
      status:         "docked",
      currentWorldId: world.id,
      userId,
    },
  });

  await tx.shipCrew.create({
    data: {
      shipId:          ship.id,
      characterId,
      role,
      isOwnerOperator: true,
      monthlySalary:   0,
    },
  });

  const remainingRoles = REQUIRED_CREW.filter(r => r !== role);
  const usedNames = new Set<string>();
  for (const npcRole of remainingRoles) {
    let npcName: string;
    do { npcName = pickRandom(NPC_NAMES); } while (usedNames.has(npcName));
    usedNames.add(npcName);
    await tx.shipCrew.create({
      data: {
        shipId:          ship.id,
        characterId:     null,
        npcName,
        role:            npcRole,
        isOwnerOperator: false,
        monthlySalary:   (crewSalaries as Record<string, number>)[npcRole] ?? 0,
      },
    });
  }

  await tx.character.update({
    where: { id: characterId },
    data:  { currentWorldId: world.id },
  });
};

export const GET = async () => {
  try {
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getUser(clerkId);
    if (!dbUser) return NextResponse.json({ items: [] });

    const rows = await prisma.character.findMany({
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
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await createOrUpdateUser({ clerkId });
    if (!user) return NextResponse.json({ error: "Failed to resolve user" }, { status: 500 });

    const body: { sheet: CharacterSheet; name?: string; role?: string } = await request.json();
    const sheet: CharacterSheet = body.sheet;

    if (!sheet?.upp || !sheet?.careers?.length) {
      return NextResponse.json({ error: "Invalid character sheet" }, { status: 400 });
    }

    const name = (body.name?.trim() || sheet.name || "Unnamed Traveller").trim();
    const role = REQUIRED_CREW.includes(body.role as CrewRole) ? (body.role as CrewRole) : null;

    const character = await prisma.$transaction(async (tx) => {
      const data = {
        name,
        userId:         user.id,
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

      if (role) {
        const existingShip = await tx.ship.findUnique({ where: { userId: user.id } });
        if (!existingShip) {
          await createShipForNewPlayer(tx, user.id, created.id, role);
        }
      }

      return created;
    });

    return NextResponse.json({ id: character.id, name: character.name }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/characters]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
