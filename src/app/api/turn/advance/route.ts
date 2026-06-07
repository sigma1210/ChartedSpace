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
    const requestedEnterJump = shipData.status === "in_jump";

    // Resolve fuel cost and owner if we're about to enter jump
    if (requestedEnterJump) {
      const currentTurn = await prisma.$transaction(async (tx) => {
        const ship = await tx.ship.findFirst({
          where: { userId: dbUser.id },
          select: {
            id: true,
            status: true,
            type: true,
            crew: {
              where: { isOwnerOperator: true },
              select: { characterId: true },
            },
          },
        });

        if (!ship) throw new Error("No ship found");

        const userTurn = await tx.user.findUnique({
          where: { id: dbUser.id },
          select: { currentTurn: true },
        });
        const currentTurnValue = userTurn?.currentTurn ?? 1;

        if (ship.status === "in_jump") {
          return currentTurnValue;
        }

        const transition = await tx.ship.updateMany({
          where: { id: ship.id, status: { not: "in_jump" } },
          data: shipData,
        });
        if (transition.count === 0) {
          return currentTurnValue;
        }

        const typeData = (shipTypes as Array<{ type: string; fuelCostPerJump?: number }>)
          .find(s => s.type === ship.type);
        const fuelCost = typeData?.fuelCostPerJump ?? 0;
        const ownerId = ship.crew[0]?.characterId ?? null;

        if (fuelCost > 0 && !ownerId) {
          throw new Error("No owner-operator found for fuel payment.");
        }

        if (fuelCost > 0 && ownerId) {
          const owner = await tx.character.findUnique({
            where: { id: ownerId },
            select: { credits: true },
          });
          if (!owner || owner.credits < fuelCost) {
            throw new Error(`Insufficient credits for fuel. Need Cr${fuelCost.toLocaleString()}.`);
          }

          await tx.character.update({
            where: { id: ownerId },
            data: { credits: { decrement: fuelCost } },
          });
        }

        const updated = await tx.user.update({
          where: { id: dbUser.id },
          data: { currentTurn: { increment: 1 } },
          select: { currentTurn: true },
        });

        return updated.currentTurn;
      });

      return NextResponse.json({ currentTurn });
    }

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
    if (err instanceof Error) {
      if (err.message === "No owner-operator found for fuel payment.") {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err.message.startsWith("Insufficient credits for fuel.")) {
        return NextResponse.json({ error: err.message }, { status: 402 });
      }
      if (err.message === "No ship found") {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
    }
    console.error("[POST /api/turn/advance]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
