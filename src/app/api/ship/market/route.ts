import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/devAuth";
import shipTypes from "@/data/classic/ships.json";
import {
  deriveWorldPricePerTon,
  deriveSkillPriceModifier,
  filterTradeCodes,
  type TradeSkills,
} from "@/lib/trade";

const TRADE_SKILL_NAMES = ["Broker", "Streetwise", "Admin", "Steward"];

const parseLocation = (location: string | null) => {
  if (!location) return null;
  const colonIdx = location.indexOf(":");
  if (colonIdx === -1) return null;
  return { sectorAbbr: location.slice(0, colonIdx), hex: location.slice(colonIdx + 1) };
};

// ─── GET /api/ship/market ─────────────────────────────────────────────────────

export const GET = async () => {
  try {
    const dbUser = await getCurrentUser();
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ship = await prisma.ship.findUnique({
      where: { userId: dbUser.id },
      select: {
        type:            true,
        status:          true,
        currentLocation: true,
        cargo:           { select: { tons: true } },
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

    if (!ship)                    return NextResponse.json({ error: "Not found" },             { status: 404 });
    if (ship.status !== "docked") return NextResponse.json({ error: "Ship is not docked" },   { status: 400 });

    const parsed = parseLocation(ship.currentLocation);
    if (!parsed) return NextResponse.json({ error: "Ship has no current location" }, { status: 400 });

    const world = await prisma.world.findFirst({
      where: { hex: parsed.hex, sector: { abbreviation: parsed.sectorAbbr } },
      select: { name: true, starport: true, techLevel: true, remarks: true },
    });

    if (!world) return NextResponse.json({ error: "No world at current location — cannot trade" }, { status: 400 });

    const typeData          = shipTypes.find(s => s.type === ship.type);
    const cargoCapacity     = typeData?.cargoCapacity ?? 0;
    const usedTons          = ship.cargo.reduce((sum, c) => sum + c.tons, 0);
    const remainingCapacity = cargoCapacity - usedTons;

    const tradeCodes  = filterTradeCodes(world.remarks);
    const allSkills   = ship.crew.flatMap(c => c.character?.skills ?? []);

    const tradeSkills: TradeSkills = {
      broker:     Math.max(0, ...allSkills.filter(s => s.name === "Broker").map(s => s.level)),
      streetwise: Math.max(0, ...allSkills.filter(s => s.name === "Streetwise").map(s => s.level)),
      admin:      Math.max(0, ...allSkills.filter(s => s.name === "Admin").map(s => s.level)),
      steward:    Math.max(0, ...allSkills.filter(s => s.name === "Steward").map(s => s.level)),
    };

    const basePricePerTon  = deriveWorldPricePerTon(tradeCodes, world.starport, world.techLevel);
    const skillModifier    = deriveSkillPriceModifier(tradeSkills);
    const finalPricePerTon = Math.round(basePricePerTon * skillModifier);

    return NextResponse.json({
      worldName:         world.name,
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
