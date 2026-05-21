import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClerkId } from "@/lib/devAuth";
import spawnPoints from "@/data/spawnPoints.json";
import shipTypes from "@/data/classic/ships.json";

const pickRandom = <T>(arr: readonly T[] | T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

// ─── POST /api/characters/[id]/play ──────────────────────────────────────────
// Activates an existing character as the new captain. Creates a fresh ship at
// a random spawn world. Only allowed when the user has no existing ship.

interface Params { params: Promise<{ id: string }> }

export const POST = async (_req: Request, { params }: Params) => {
  try {
    const { id: characterId } = await params;
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, userId: true },
    });
    if (!character)                    return NextResponse.json({ error: "Character not found" }, { status: 404 });
    if (character.userId !== user.id)  return NextResponse.json({ error: "Forbidden" },           { status: 403 });

    const existingShip = await prisma.ship.findFirst({ where: { userId: user.id } });
    if (existingShip) {
      return NextResponse.json({ error: "Ship already exists — resign first" }, { status: 409 });
    }

    const spawn = pickRandom(spawnPoints);
    const world = await prisma.world.findFirst({
      where: { hex: spawn.hex, sector: { abbreviation: spawn.sectorAbbr } },
    });
    if (!world) {
      return NextResponse.json({ error: "Spawn world not found" }, { status: 500 });
    }

    const freeTrader = shipTypes[0];

    await prisma.$transaction(async (tx) => {
      const ship = await tx.ship.create({
        data: {
          name:           "Free Trader",
          type:           freeTrader.type,
          jumpRating:     freeTrader.jumpRating,
          isMortgaged:    true,
          status:         "docked",
          currentWorldId: world.id,
          userId:         user.id,
        },
      });

      await tx.shipCrew.create({
        data: {
          shipId:          ship.id,
          characterId,
          role:            "pilot",
          isOwnerOperator: true,
          monthlySalary:   0,
        },
      });

      await tx.character.update({
        where: { id: characterId },
        data:  { currentWorldId: world.id },
      });
    });

    return NextResponse.json({ spawnName: spawn.name, spawnHex: spawn.hex });
  } catch (err) {
    console.error("[POST /api/characters/[id]/play]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
