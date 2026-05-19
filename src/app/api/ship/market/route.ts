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

// ─── GET /api/ship/market ─────────────────────────────────────────────────────

export const GET = async () => {
  try {
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getUser(clerkId);
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ship = await prisma.ship.findUnique({
      where: { userId: dbUser.id },
      select: {
        type:           true,
        status:         true,
        currentWorld: {
          select: {
            name:      true,
            starport:  true,
            techLevel: true,
            remarks:   true,
          },
        },
        cargo: { select: { tons: true } },
        crew: {
          where:  { characterId: { not: null } },
          select: {
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

    if (!ship)                 return NextResponse.json({ error: "Not found" },               { status: 404 });
    if (ship.status !== "docked") return NextResponse.json({ error: "Ship is not docked" },   { status: 400 });
    if (!ship.currentWorld)    return NextResponse.json({ error: "Ship has no current world" }, { status: 400 });

    const typeData          = shipTypes.find(s => s.type === ship.type);
    const cargoCapacity     = typeData?.cargoCapacity ?? 0;
    const usedTons          = ship.cargo.reduce((sum, c) => sum + c.tons, 0);
    const remainingCapacity = cargoCapacity - usedTons;

    const tradeCodes  = filterTradeCodes(ship.currentWorld.remarks);
    const allSkills   = ship.crew.flatMap(c => c.character?.skills ?? []);

    const tradeSkills: TradeSkills = {
      broker:     Math.max(0, ...allSkills.filter(s => s.name === "Broker").map(s => s.level)),
      streetwise: Math.max(0, ...allSkills.filter(s => s.name === "Streetwise").map(s => s.level)),
      admin:      Math.max(0, ...allSkills.filter(s => s.name === "Admin").map(s => s.level)),
      steward:    Math.max(0, ...allSkills.filter(s => s.name === "Steward").map(s => s.level)),
    };

    const basePricePerTon  = deriveWorldPricePerTon(tradeCodes, ship.currentWorld.starport, ship.currentWorld.techLevel);
    const skillModifier    = deriveSkillPriceModifier(tradeSkills);
    const finalPricePerTon = Math.round(basePricePerTon * skillModifier);

    return NextResponse.json({
      worldName:         ship.currentWorld.name,
      tradeCodes,
      basePricePerTon,
      skillModifier,
      pricePerTon:       finalPricePerTon,
      tradeSkills,
      remainingCapacity,
    });
  } catch (err) {
    console.error("[GET /api/ship/market]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
