import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/devAuth";
import {
  clearCharacterShipAssignment,
  countCharactersForUser,
} from "@/plugins/characters/server/characterService";

// ─── POST /api/resign ─────────────────────────────────────────────────────────
// Player-initiated restart. Clears the active ship assignment, deletes the ship,
// and resets turn to 1.
// Returns { remainingCharacters } so the client knows whether to show the
// character list (pick or generate) or go straight to character creation.

export const POST = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ship = await prisma.ship.findFirst({
      where: { userId: user.id },
      select: {
        id:              true,
        currentLocation: true,
        crew: {
          where:  { isOwnerOperator: true },
          select: { characterId: true },
          take:   1,
        },
      },
    });

    const captainId = ship?.crew[0]?.characterId ?? null;

    await prisma.$transaction(async (tx) => {
      // Ship deletion cascades to ShipCrew and CargoLot
      if (ship) {
        await tx.ship.delete({ where: { id: ship.id } });
      }
      // Reset turn counter
      await tx.user.update({
        where: { id: user.id },
        data:  { currentTurn: 1 },
      });
    });

    if (captainId) {
      await clearCharacterShipAssignment({
        characterId: captainId,
        userId:      user.id,
        location:    ship?.currentLocation ?? null,
      });
    }

    const remaining = await countCharactersForUser(user.id);

    return NextResponse.json({ remainingCharacters: remaining });
  } catch (err) {
    console.error("[POST /api/resign]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
