import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/actions/user";
import { getClerkId } from "@/lib/devAuth";
import shipTypes from "@/data/classic/ships.json";
import {
  deriveWorldPricePerTon,
  deriveSkillPriceModifier,
  filterTradeCodes,
  type TradeSkills,
} from "@/lib/trade";

const TRADE_SKILL_NAMES = ["Broker", "Streetwise", "Admin", "Steward"];

// ─── POST /api/ship/cargo ─────────────────────────────────────────────────────

export const POST = async (request: Request) => {
  try {
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getUser(clerkId);
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body: { commodity?: string; tons?: number } = await request.json();
    const commodity = typeof body.commodity === "string" ? body.commodity.trim() : "";
    const tons      = typeof body.tons === "number" && Number.isInteger(body.tons) ? body.tons : 0;

    if (!commodity) return NextResponse.json({ error: "Invalid commodity" },       { status: 400 });
    if (tons < 1)   return NextResponse.json({ error: "Tons must be at least 1" }, { status: 400 });

    const ship = await prisma.ship.findUnique({
      where: { userId: dbUser.id },
      select: {
        id:             true,
        type:           true,
        status:         true,
        currentWorldId: true,
        currentWorld: {
          select: {
            starport:  true,
            techLevel: true,
            remarks:   true,
          },
        },
        cargo: { select: { tons: true } },
        crew: {
          where:  { characterId: { not: null } },
          select: {
            characterId:     true,
            isOwnerOperator: true,
            character: {
              select: {
                skills: {
                  where:  { name: { in: TRADE_SKILL_NAMES } },
                  select: { name: true, level: true },
                },
              },
            },
          },
        },
      },
    });

    if (!ship)                    return NextResponse.json({ error: "Not found" },                        { status: 404 });
    if (ship.status !== "docked") return NextResponse.json({ error: "Ship must be docked to buy cargo" }, { status: 400 });
    if (!ship.currentWorld || !ship.currentWorldId) {
      return NextResponse.json({ error: "Ship has no current world" }, { status: 400 });
    }

    const typeData          = shipTypes.find(s => s.type === ship.type);
    const cargoCapacity     = typeData?.cargoCapacity ?? 0;
    const usedTons          = ship.cargo.reduce((sum, c) => sum + c.tons, 0);
    const remainingCapacity = cargoCapacity - usedTons;

    if (tons > remainingCapacity) {
      return NextResponse.json(
        { error: `Only ${remainingCapacity}T remaining in hold` },
        { status: 400 }
      );
    }

    const ownerCharacterId = ship.crew.find(c => c.isOwnerOperator)?.characterId ?? null;
    if (!ownerCharacterId) {
      return NextResponse.json({ error: "No owner-operator found on crew" }, { status: 400 });
    }

    const tradeCodes  = filterTradeCodes(ship.currentWorld.remarks);
    const allSkills   = ship.crew.flatMap(c => c.character?.skills ?? []);

    const tradeSkills: TradeSkills = {
      broker:     Math.max(0, ...allSkills.filter(s => s.name === "Broker").map(s => s.level)),
      streetwise: Math.max(0, ...allSkills.filter(s => s.name === "Streetwise").map(s => s.level)),
      admin:      Math.max(0, ...allSkills.filter(s => s.name === "Admin").map(s => s.level)),
      steward:    Math.max(0, ...allSkills.filter(s => s.name === "Steward").map(s => s.level)),
    };

    const pricePerTon = Math.round(
      deriveWorldPricePerTon(tradeCodes, ship.currentWorld.starport, ship.currentWorld.techLevel) *
      deriveSkillPriceModifier(tradeSkills)
    );
    const totalCost = pricePerTon * tons;

    const result = await prisma.$transaction(async (tx) => {
      const owner = await tx.character.findUnique({
        where:  { id: ownerCharacterId },
        select: { credits: true },
      });
      if (!owner)                   throw new Error("Insufficient credits");
      if (owner.credits < totalCost) throw new Error("Insufficient credits");

      const lot = await tx.cargoLot.create({
        data: {
          shipId:        ship.id,
          commodity,
          tons,
          purchasePrice: totalCost,
          originWorldId: ship.currentWorldId!,
        },
      });

      const updated = await tx.character.update({
        where:  { id: ownerCharacterId },
        data:   { credits: { decrement: totalCost } },
        select: { credits: true },
      });

      return { lot, newCredits: updated.credits };
    });

    return NextResponse.json({
      cargoLot: {
        id:            result.lot.id,
        commodity:     result.lot.commodity,
        tons:          result.lot.tons,
        purchasePrice: result.lot.purchasePrice,
      },
      newCredits: result.newCredits,
    }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Insufficient credits") {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 400 });
    }
    console.error("[POST /api/ship/cargo]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
