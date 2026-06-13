import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/actions/user";
import { getClerkId } from "@/lib/devAuth";

interface ShipUpdateBody {
  status?: "docked" | "in_jump";
  currentWorldId?: string | null;
  currentWorldHex?: string;
  currentWorldSectorAbbr?: string;
  destinationWorldHex?: string;
  destinationWorldSectorAbbr?: string;
  jumpArrivesTurn?: number | null;
}

interface AdvanceBody {
  shipUpdate?: ShipUpdateBody;
}

// ─── POST /api/turn/advance ───────────────────────────────────────────────────

export const POST = async (request: Request) => {
  try {
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getUser(clerkId);
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body: AdvanceBody = await request.json().catch(() => ({}));
    const { shipUpdate } = body;

    let currentWorldId: string | null | undefined;
    if (shipUpdate?.currentWorldHex && shipUpdate?.currentWorldSectorAbbr) {
      const world = await prisma.world.findFirst({
        where: {
          hex: shipUpdate.currentWorldHex,
          sector: { abbreviation: shipUpdate.currentWorldSectorAbbr },
        },
        select: { id: true },
      });
      currentWorldId = world?.id ?? null;
    } else if (shipUpdate && "currentWorldHex" in shipUpdate) {
      currentWorldId = null;
    }

    // Resolve destination world FK if hex + sector provided
    let destinationWorldId: string | null | undefined;
    if (shipUpdate?.destinationWorldHex && shipUpdate?.destinationWorldSectorAbbr) {
      const world = await prisma.world.findFirst({
        where: {
          hex: shipUpdate.destinationWorldHex,
          sector: { abbreviation: shipUpdate.destinationWorldSectorAbbr },
        },
        select: { id: true },
      });
      destinationWorldId = world?.id ?? null;
    } else if (shipUpdate && "destinationWorldHex" in shipUpdate) {
      destinationWorldId = null;
    }

    // Build ship updates
    const shipData: Record<string, unknown> = {};
    if (shipUpdate?.status) shipData.status = shipUpdate.status;
    if (shipUpdate?.currentWorldId !== undefined) shipData.currentWorldId = shipUpdate.currentWorldId;
    if (currentWorldId !== undefined) shipData.currentWorldId = currentWorldId;
    if (destinationWorldId !== undefined) shipData.destinationWorldId = destinationWorldId;
    if (shipUpdate?.jumpArrivesTurn !== undefined) shipData.jumpArrivesTurn = shipUpdate.jumpArrivesTurn;

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
