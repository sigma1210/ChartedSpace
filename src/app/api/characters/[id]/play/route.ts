import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/devAuth";
import {
  getCharacterForUser,
  recordCharacterShipAssignment,
} from "@/plugins/characters/server/characterService";
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

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const character = await getCharacterForUser(user.id, characterId);
    if (!character) return NextResponse.json({ error: "Character not found" }, { status: 404 });

    const existingShip = await prisma.ship.findFirst({ where: { userId: user.id } });
    if (existingShip) {
      return NextResponse.json({ error: "Ship already exists — resign first" }, { status: 409 });
    }

    const spawn = pickRandom(spawnPoints);
    const spawnLocation = `${spawn.sectorAbbr}:${spawn.hex}`;

    const freeTrader = shipTypes[0];

    const ship = await prisma.$transaction(async (tx) => {
      const ship = await tx.ship.create({
        data: {
          name:            "Free Trader",
          type:            freeTrader.type,
          jumpRating:      freeTrader.jumpRating,
          isMortgaged:     true,
          status:          "docked",
          currentLocation: spawnLocation,
          userId:          user.id,
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

      return ship;
    });

    await recordCharacterShipAssignment({
      characterId,
      userId:   user.id,
      shipId:   ship.id,
      role:     "pilot",
      location: spawnLocation,
    });

    return NextResponse.json({ spawnName: spawn.name, spawnHex: spawn.hex });
  } catch (err) {
    console.error("[POST /api/characters/[id]/play]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
