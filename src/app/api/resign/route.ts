import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClerkId } from "@/lib/devAuth";

// ─── POST /api/resign ─────────────────────────────────────────────────────────
// Player-initiated restart. Deletes the captain and ship, resets turn to 1.
// Returns { remainingCharacters } so the client knows whether to show the
// character list (pick or generate) or go straight to character creation.

export const POST = async () => {
  try {
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ship = await prisma.ship.findFirst({
      where: { userId: user.id },
      select: {
        id:   true,
        crew: { where: { isOwnerOperator: true }, select: { characterId: true }, take: 1 },
      },
    });

    const captainId = ship?.crew[0]?.characterId ?? null;

    await prisma.$transaction(async (tx) => {
      // Ship deletion cascades to ShipCrew and CargoLot
      if (ship) {
        await tx.ship.delete({ where: { id: ship.id } });
      }
      // Delete the captain character (cascades to CharacterSkill, LocationLog)
      if (captainId) {
        await tx.character.delete({ where: { id: captainId } });
      }
      // Reset turn counter
      await tx.user.update({
        where: { id: user.id },
        data:  { currentTurn: 1 },
      });
    });

    const remaining = await prisma.character.count({ where: { userId: user.id } });

    return NextResponse.json({ remainingCharacters: remaining });
  } catch (err) {
    console.error("[POST /api/resign]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
