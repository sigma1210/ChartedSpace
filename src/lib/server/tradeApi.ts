import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/devAuth";
import {
  creditCharacterCreditsForUser,
  debitCharacterCreditsForUser,
  getCharacterCreditsForUser,
  getCharactersForUserByIds,
} from "@/plugins/characters/server/characterService";
import shipTypes from "@/data/classic/ships.json";
import {
  calculateWorldPairSalePrice,
  deriveWorldPricePerTon,
  deriveSkillPriceModifier,
  filterTradeCodes,
  type TradeSkills,
} from "@/lib/trade";

const TRADE_SKILL_NAMES = ["Broker", "Streetwise", "Admin", "Steward"];

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

const getTradeSkills = (
  skills: Array<{ name: string; level: number }>,
): TradeSkills => ({
  broker:     Math.max(0, ...skills.filter(s => s.name === "Broker").map(s => s.level)),
  streetwise: Math.max(0, ...skills.filter(s => s.name === "Streetwise").map(s => s.level)),
  admin:      Math.max(0, ...skills.filter(s => s.name === "Admin").map(s => s.level)),
  steward:    Math.max(0, ...skills.filter(s => s.name === "Steward").map(s => s.level)),
});

export const getTradeMarket = async () => {
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
            characterId: true,
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

    const tradeCodes        = filterTradeCodes(world.remarks);
    const characters        = await getCharactersForUserByIds(
      dbUser.id,
      ship.crew.flatMap(c => c.characterId ? [c.characterId] : []),
    );
    const allSkills         = characters.flatMap(c => c.skills)
      .filter((skill) => TRADE_SKILL_NAMES.includes(skill.name));
    const tradeSkills       = getTradeSkills(allSkills);
    const basePricePerTon   = deriveWorldPricePerTon(tradeCodes, world.starport, world.techLevel);
    const skillModifier     = deriveSkillPriceModifier(tradeSkills);
    const finalPricePerTon  = Math.round(basePricePerTon * skillModifier);

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
    console.error("[GET trade market]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

export const buyTradeCargo = async (request: Request) => {
  try {
    const dbUser = await getCurrentUser();
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body: { commodity?: string; tons?: number } = await request.json();
    const commodity = typeof body.commodity === "string" ? body.commodity.trim() : "";
    const tons      = typeof body.tons === "number" && Number.isInteger(body.tons) ? body.tons : 0;

    if (!commodity) return NextResponse.json({ error: "Invalid commodity" },       { status: 400 });
    if (tons < 1)   return NextResponse.json({ error: "Tons must be at least 1" }, { status: 400 });

    const ship = await prisma.ship.findUnique({
      where: { userId: dbUser.id },
      select: {
        id:              true,
        type:            true,
        status:          true,
        currentLocation: true,
        cargo: { select: { tons: true } },
        crew: {
          where:  { characterId: { not: null } },
          select: {
            characterId:     true,
            isOwnerOperator: true,
          },
        },
      },
    });

    if (!ship)                    return NextResponse.json({ error: "Not found" },                        { status: 404 });
    if (ship.status !== "docked") return NextResponse.json({ error: "Ship must be docked to buy cargo" }, { status: 400 });

    const parsed = parseLocation(ship.currentLocation);
    if (!parsed) {
      return NextResponse.json({ error: "Ship has no current location" }, { status: 400 });
    }

    const world = await prisma.world.findFirst({
      where: { hex: parsed.hex, sector: { abbreviation: parsed.sectorAbbr } },
      select: { id: true, name: true, hex: true, starport: true, techLevel: true, remarks: true, sector: { select: { abbreviation: true } } },
    });

    if (!world) {
      return NextResponse.json({ error: "No world at current location — cannot trade" }, { status: 400 });
    }

    const typeData          = shipTypes.find(s => s.type === ship.type);
    const cargoCapacity     = typeData?.cargoCapacity ?? 0;
    const usedTons          = ship.cargo.reduce((sum, c) => sum + c.tons, 0);
    const remainingCapacity = cargoCapacity - usedTons;

    if (tons > remainingCapacity) {
      return NextResponse.json(
        { error: `Only ${remainingCapacity}T remaining in hold` },
        { status: 400 },
      );
    }

    const ownerCharacterId = ship.crew.find(c => c.isOwnerOperator)?.characterId ?? null;
    if (!ownerCharacterId) {
      return NextResponse.json({ error: "No owner-operator found on crew" }, { status: 400 });
    }

    const tradeCodes = filterTradeCodes(world.remarks);
    const characters = await getCharactersForUserByIds(
      dbUser.id,
      ship.crew.flatMap(c => c.characterId ? [c.characterId] : []),
    );
    const allSkills  = characters.flatMap(c => c.skills)
      .filter((skill) => TRADE_SKILL_NAMES.includes(skill.name));
    const pricePerTon = Math.round(
      deriveWorldPricePerTon(tradeCodes, world.starport, world.techLevel) *
      deriveSkillPriceModifier(getTradeSkills(allSkills)),
    );
    const totalCost = pricePerTon * tons;

    const debitedOwner = await debitCharacterCreditsForUser({
      userId:      dbUser.id,
      characterId: ownerCharacterId,
      amount:      totalCost,
    });
    if (!debitedOwner) throw new Error("Insufficient credits");

    let lot: Awaited<ReturnType<typeof prisma.cargoLot.create>>;
    try {
      lot = await prisma.cargoLot.create({
        data: {
          shipId:         ship.id,
          commodity,
          tons,
          purchasePrice:  totalCost,
          originLocation: ship.currentLocation!,
        },
      });
    } catch (err) {
      await creditCharacterCreditsForUser({
        userId:      dbUser.id,
        characterId: ownerCharacterId,
        amount:      totalCost,
      });
      throw err;
    }

    return NextResponse.json({
      cargoLot: {
        id:              lot.id,
        commodity:       lot.commodity,
        origin:          ship.currentLocation,
        originWorldName: world.name,
        tons:            lot.tons,
        purchasePrice:   lot.purchasePrice,
      },
      newCredits: debitedOwner.credits,
    }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Insufficient credits") {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 400 });
    }
    console.error("[POST trade cargo buy]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

interface SellTradeCargoParams { params: Promise<{ lotId: string }> }

export const sellTradeCargo = async (_req: Request, { params }: SellTradeCargoParams) => {
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
        acquiredAt:     true,
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

    const owner = await getCharacterCreditsForUser(dbUser.id, ownerCharacterId);
    if (!owner) return NextResponse.json({ error: "Owner character not found" }, { status: 400 });

    const salePricePerTon = calculateWorldPairSalePrice(originWorld, currentWorld);
    const saleProceeds    = Math.round(salePricePerTon * lot.tons);
    const profitLoss      = saleProceeds - lot.purchasePrice;

    await prisma.cargoLot.delete({ where: { id: lotId } });

    const creditedOwner = await creditCharacterCreditsForUser({
      userId:      dbUser.id,
      characterId: ownerCharacterId,
      amount:      saleProceeds,
    });

    if (!creditedOwner) {
      await prisma.cargoLot.create({
        data: {
          id:             lot.id,
          shipId:         lot.shipId,
          commodity:      lot.commodity,
          tons:           lot.tons,
          purchasePrice:  lot.purchasePrice,
          originLocation: lot.originLocation,
          acquiredAt:     lot.acquiredAt,
        },
      });
      return NextResponse.json({ error: "Owner character not found" }, { status: 400 });
    }

    return NextResponse.json({ saleProceeds, salePricePerTon: Math.round(salePricePerTon), profitLoss });
  } catch (err) {
    console.error("[POST trade cargo sell]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
