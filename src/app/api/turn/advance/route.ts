import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/devAuth";

interface ShipUpdateBody {
  status?:              "docked" | "in_jump";
  currentLocation?:    string | null;
  destinationLocation?: string | null;
  jumpArrivesTurn?:    number | null;
}

interface AdvanceBody {
  shipUpdate?: ShipUpdateBody;
}

// ─── POST /api/turn/advance ───────────────────────────────────────────────────

export const POST = async (request: Request) => {
  try {
    const dbUser = await getCurrentUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body: AdvanceBody = await request.json().catch(() => ({}));
    const { shipUpdate } = body;

    const shipData: Record<string, unknown> = {};
    if (shipUpdate?.status)                       shipData.status              = shipUpdate.status;
    if (shipUpdate?.currentLocation !== undefined) shipData.currentLocation    = shipUpdate.currentLocation;
    if (shipUpdate?.destinationLocation !== undefined) shipData.destinationLocation = shipUpdate.destinationLocation;
    if (shipUpdate?.jumpArrivesTurn !== undefined) shipData.jumpArrivesTurn    = shipUpdate.jumpArrivesTurn;

    const hasShipUpdate = Object.keys(shipData).length > 0;

    const currentTurn = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where:  { id: dbUser.id },
        data:   { currentTurn: { increment: 1 } },
        select: { currentTurn: true },
      });

      if (hasShipUpdate) {
        await tx.ship.updateMany({ where: { userId: dbUser.id }, data: shipData });
      }

      return updated.currentTurn;
    });

    return NextResponse.json({ currentTurn });
  } catch (err) {
    console.error("[POST /api/turn/advance]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
