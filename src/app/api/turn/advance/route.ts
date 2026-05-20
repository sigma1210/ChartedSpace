import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/actions/user";
import { getClerkId } from "@/lib/devAuth";
import shipTypes from "@/data/classic/ships.json";

interface ShipUpdateBody {
  status?: "docked" | "in_jump";
  currentWorldId?: string | null;
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
    if (destinationWorldId !== undefined) shipData.destinationWorldId = destinationWorldId;
    if (shipUpdate?.jumpArrivesTurn !== undefined) shipData.jumpArrivesTurn = shipUpdate.jumpArrivesTurn;

    const hasShipUpdate = Object.keys(shipData).length > 0;
    const enteringJump  = shipData.status === "in_jump";

    // Resolve fuel cost and owner if we're about to enter jump
    let fuelCost    = 0;
    let ownerId: string | null = null;

    if (enteringJump) {
      const ship = await prisma.ship.findFirst({
        where: { userId: dbUser.id },
        select: {
          type: true,
          crew: {
            where:  { isOwnerOperator: true },
            select: { characterId: true },
          },
        },
      });

      const typeData = (shipTypes as Array<{ type: string; fuelCostPerJump?: number }>)
        .find(s => s.type === ship?.type);
      fuelCost = typeData?.fuelCostPerJump ?? 0;
      ownerId  = ship?.crew[0]?.characterId ?? null;

      // Pre-flight credit check
      if (fuelCost > 0 && ownerId) {
        const owner = await prisma.character.findUnique({
          where:  { id: ownerId },
          select: { credits: true },
        });
        if (!owner || owner.credits < fuelCost) {
          return NextResponse.json(
            { error: `Insufficient credits for fuel. Need Cr${fuelCost.toLocaleString()}.` },
            { status: 402 },
          );
        }
      }
    }

    const currentTurn = await prisma.$transaction(async (tx) => {
      // Deduct fuel cost atomically with ship state change
      if (enteringJump && fuelCost > 0 && ownerId) {
        await tx.character.update({
          where: { id: ownerId },
          data:  { credits: { decrement: fuelCost } },
        });
      }

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
