import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/devAuth";
import { calculateWorldPairSalePrice } from "@/lib/trade";

const UWP_SELECT = {
  size:          true,
  atmosphere:    true,
  hydrographics: true,
  population:    true,
  government:    true,
  lawLevel:      true,
  techLevel:     true,
} as const;

const parseLocation = (location: string | null) => {
  if (!location) return null;
  const colonIdx = location.indexOf(":");
  if (colonIdx === -1) return null;
  return { sectorAbbr: location.slice(0, colonIdx), hex: location.slice(colonIdx + 1) };
};

// ─── POST /api/ship/cargo/[lotId]/sell ───────────────────────────────────────

interface Params { params: Promise<{ lotId: string }> }

export const POST = async (_req: Request, { params }: Params) => {
  try {
    const { lotId } = await params;

    const dbUser = await getCurrentUser();
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const lot = await prisma.cargoLot.findUnique({
      where: { id: lotId },
      select: {
        id:             true,
        tons:           true,
        purchasePrice:  true,
        commodity:      true,
        originLocation: true,
        shipId:         true,
      },
    });

    if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 });

    const ship = await prisma.ship.findUnique({
      where: { id: lot.shipId },
      select: {
        id:              true,
        status:          true,
        userId:          true,
        currentLocation: true,
        crew: {
          where:  { isOwnerOperator: true },
          select: { characterId: true },
          take:   1,
        },
      },
    });

    if (!ship)                          return NextResponse.json({ error: "Ship not found" },                   { status: 404 });
    if (ship.userId !== dbUser.id)      return NextResponse.json({ error: "Forbidden" },                        { status: 403 });
    if (ship.status !== "docked")       return NextResponse.json({ error: "Ship must be docked to sell cargo" }, { status: 400 });

    const currentParsed = parseLocation(ship.currentLocation);
    const originParsed  = parseLocation(lot.originLocation);

    if (!currentParsed) return NextResponse.json({ error: "Ship has no current location" }, { status: 400 });
    if (!originParsed)  return NextResponse.json({ error: "Lot has no origin location" },   { status: 400 });

    const [currentWorld, originWorld] = await Promise.all([
      prisma.world.findFirst({
        where: { hex: currentParsed.hex, sector: { abbreviation: currentParsed.sectorAbbr } },
        select: UWP_SELECT,
      }),
      prisma.world.findFirst({
        where: { hex: originParsed.hex, sector: { abbreviation: originParsed.sectorAbbr } },
        select: UWP_SELECT,
      }),
    ]);

    if (!currentWorld) return NextResponse.json({ error: "No world at current location — cannot sell" }, { status: 400 });
    if (!originWorld)  return NextResponse.json({ error: "No world at origin location" },                { status: 400 });

    const ownerCharacterId = ship.crew[0]?.characterId ?? null;
    if (!ownerCharacterId) return NextResponse.json({ error: "No owner-operator found" }, { status: 400 });

    const salePricePerTon = calculateWorldPairSalePrice(originWorld, currentWorld);
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
