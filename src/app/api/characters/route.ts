import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { CharacterSheet } from "@/lib/characters/types";
import { getCurrentUser, isDevAuthMode } from "@/lib/devAuth";
import spawnPoints from "@/data/spawnPoints.json";
import shipTypes from "@/data/classic/ships.json";


const toHex = (n: number) => Math.min(15, Math.max(0, n)).toString(16).toUpperCase();

const REQUIRED_CREW = ["pilot", "navigator", "engineer", "steward"] as const;
type CrewRole = typeof REQUIRED_CREW[number];

const pickRandom = <T>(arr: readonly T[] | T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

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

const createShipForNewPlayer = async (
  tx: Prisma.TransactionClient,
  userId: string,
  characterId: string,
  role: CrewRole,
) => {
  const spawn = pickRandom(spawnPoints);
  const freeTrader = shipTypes[0];
  if (!freeTrader) {
    console.warn("[createShipForNewPlayer] no ship types configured");
    return;
  }

  const spawnLocation = `${spawn.sectorAbbr}:${spawn.hex}`;

  const ship = await tx.ship.create({
    data: {
      name:            "Free Trader",
      type:            freeTrader.type,
      jumpRating:      freeTrader.jumpRating,
      isMortgaged:     true,
      status:          "docked",
      currentLocation: spawnLocation,
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

  await tx.character.update({
    where: { id: characterId },
    data:  { currentLocation: spawnLocation },
  });
};

export const GET = async () => {
  try {
    const dbUser = await getCurrentUser();
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

    const body: { sheet: CharacterSheet; name?: string; role?: string } = await request.json();
    const sheet: CharacterSheet = body.sheet;

    if (!sheet?.upp || !sheet?.careers?.length) {
      return NextResponse.json({ error: "Invalid character sheet" }, { status: 400 });
    }

    const name = (body.name?.trim() || sheet.name || "Unnamed Traveller").trim();
    const role = REQUIRED_CREW.includes(body.role as CrewRole) ? (body.role as CrewRole) : null;
    const skills = Array.isArray(sheet.skills)
      ? sheet.skills.filter(s => s && typeof s.name === "string" && Number.isFinite(s.level))
      : [];
    const credits = Number.isFinite(sheet.credits) ? sheet.credits : 0;

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
        credits,
        sheet: sheet as unknown as Prisma.InputJsonValue,
      } as unknown as Prisma.CharacterUncheckedCreateInput;

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
    return errorResponse(err);
  }
};
