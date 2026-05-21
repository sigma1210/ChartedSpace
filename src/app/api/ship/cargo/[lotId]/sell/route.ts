import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/actions/user";
import { getClerkId } from "@/lib/devAuth";
import { deriveTradeClassifications, calculateSalePrice } from "@/lib/trade";

const UWP_SELECT = {
  size:          true,
  atmosphere:    true,
  hydrographics: true,
  population:    true,
  government:    true,
  lawLevel:      true,
  techLevel:     true,
} as const;

// ─── POST /api/ship/cargo/[lotId]/sell ───────────────────────────────────────

interface Params { params: Promise<{ lotId: string }> }

export const POST = async (_req: Request, { params }: Params) => {
  try {
    const { lotId } = await params;
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getUser(clerkId);
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const lot = await prisma.cargoLot.findUnique({
      where: { id: lotId },
      select: {
        id:            true,
        tons:          true,
        purchasePrice: true,
        commodity:     true,
        originWorld:   { select: UWP_SELECT },
        ship: {
          select: {
            id:           true,
            status:       true,
            userId:       true,
            currentWorld: { select: UWP_SELECT },
            crew: {
              where:  { isOwnerOperator: true },
              select: { characterId: true },
              take:   1,
            },
          },
        },
      },
    });

    if (!lot)                                  return NextResponse.json({ error: "Lot not found" },                    { status: 404 });
    if (lot.ship.userId !== dbUser.id)         return NextResponse.json({ error: "Forbidden" },                        { status: 403 });
    if (lot.ship.status !== "docked")          return NextResponse.json({ error: "Ship must be docked to sell cargo" }, { status: 400 });
    if (!lot.ship.currentWorld)                return NextResponse.json({ error: "Ship has no current world" },         { status: 400 });

    const ownerCharacterId = lot.ship.crew[0]?.characterId ?? null;
    if (!ownerCharacterId) return NextResponse.json({ error: "No owner-operator found" }, { status: 400 });

    const originCodes = deriveTradeClassifications(lot.originWorld);
    const destCodes   = deriveTradeClassifications(lot.ship.currentWorld);
    const originTL    = parseInt(lot.originWorld.techLevel, 16);
    const destTL      = parseInt(lot.ship.currentWorld.techLevel, 16);

    const salePricePerTon = calculateSalePrice(originCodes, originTL, destCodes, destTL);
    const saleProceeds    = Math.round(salePricePerTon * lot.tons);
    const profitLoss      = saleProceeds - lot.purchasePrice;

    await prisma.$transaction(async (tx) => {
      await tx.cargoLot.delete({ where: { id: lotId } });
      await tx.character.update({
        where: { id: ownerCharacterId },
        data:  { credits: { increment: saleProceeds } },
      });
    });

    return NextResponse.json({ saleProceeds, salePricePerTon: Math.round(salePricePerTon), profitLoss });
  } catch (err) {
    console.error("[POST /api/ship/cargo/[lotId]/sell]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
