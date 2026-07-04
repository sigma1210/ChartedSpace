import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/devAuth";
import shipTypes from "@/data/classic/ships.json";
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

const resolveDbUser = async () => {
  return await getCurrentUser();
};

const parseLocation = (location: string | null): { sectorAbbr: string; hex: string } | null => {
  if (!location) return null;
  const colonIdx = location.indexOf(":");
  if (colonIdx === -1) return null;
  return {
    sectorAbbr: location.slice(0, colonIdx),
    hex: location.slice(colonIdx + 1),
  };
};

const loadCrewCharacterNames = async (userId: string, characterIds: readonly string[]) => {
  try {
    const { getCharactersForUserByIds } = await import("@/plugins/characters/server/characterService");
    return new Map(
      (await getCharactersForUserByIds(userId, characterIds))
        .map((character) => [character.id, character.name]),
    );
  } catch (err) {
    console.warn("[GET /api/ship] Character name lookup failed", err);
    return new Map<string, string>();
  }
};

// ─── GET /api/ship ────────────────────────────────────────────────────────────

export const GET = async () => {
  try {
    const dbUser = await getCurrentUser();
    if (!dbUser) return NextResponse.json({ ship: null });

    const ship = await prisma.ship.findUnique({
      where: { userId: dbUser.id },
      select: {
        id:                  true,
        name:                true,
        type:                true,
        jumpRating:          true,
        status:              true,
        isMortgaged:         true,
        mortgagePaid:        true,
        currentLocation:     true,
        destinationLocation: true,
        jumpArrivesTurn:     true,
        crew: {
          select: {
            id:              true,
            role:            true,
            isOwnerOperator: true,
            monthlySalary:   true,
            characterId:     true,
            npcName:         true,
            keySkillName:    true,
            keySkillLevel:   true,
          },
        },
        cargo: {
          select: {
            id:             true,
            commodity:      true,
            tons:           true,
            purchasePrice:  true,
            originLocation: true,
          },
          orderBy: { acquiredAt: "asc" },
        },
      },
    });

    if (!ship) return NextResponse.json({ ship: null });

    const parsed = parseLocation(ship.currentLocation);
    const characterNamesById = await loadCrewCharacterNames(
      dbUser.id,
      ship.crew.flatMap(c => c.characterId ? [c.characterId] : []),
    );

    // Look up current world for display name and UWP (for cargo pricing)
    const world = parsed
      ? await prisma.world.findFirst({
          where: {
            hex:    parsed.hex,
            sector: { abbreviation: parsed.sectorAbbr },
          },
          select: { name: true, ...UWP_SELECT },
        })
      : null;

    // Collect unique origin locations from cargo and look them up in one query
    const originLocations = [...new Set(ship.cargo.map(lot => lot.originLocation).filter(Boolean))] as string[];
    const originWorlds = originLocations.length > 0
      ? await prisma.world.findMany({
          where: {
            OR: originLocations.map(loc => {
              const colonIdx = loc.indexOf(":");
              return {
                hex:    loc.slice(colonIdx + 1),
                sector: { abbreviation: loc.slice(0, colonIdx) },
              };
            }),
          },
          select: { name: true, hex: true, sector: { select: { abbreviation: true } }, ...UWP_SELECT },
        })
      : [];

    const originWorldByLocation = new Map(
      originWorlds.map(w => [`${w.sector.abbreviation}:${w.hex}`, w])
    );

    const typeData = shipTypes.find(s => s.type === ship.type);

    return NextResponse.json({
      ship: {
        id:                  ship.id,
        name:                ship.name,
        type:                ship.type,
        jumpRating:          ship.jumpRating,
        status:              ship.status,
        isMortgaged:         ship.isMortgaged,
        mortgagePaid:        ship.mortgagePaid,
        currentLocation:     ship.currentLocation,
        destinationLocation: ship.destinationLocation,
        jumpArrivesTurn:     ship.jumpArrivesTurn,
        worldName:           world?.name ?? null,
        sectorAbbr:          parsed?.sectorAbbr ?? null,
        hex:                 parsed?.hex ?? null,
        cargoCapacity:       typeData?.cargoCapacity ?? 0,
        stateroomsTotal:     typeData?.stateroomsTotal ?? 0,
        crew: ship.crew.map(c => ({
          id:              c.id,
          role:            c.role,
          isOwnerOperator: c.isOwnerOperator,
          monthlySalary:   c.monthlySalary,
          characterId:     c.characterId,
          characterName:   c.characterId ? characterNamesById.get(c.characterId) ?? null : null,
          npcName:         c.npcName,
          keySkillName:    c.keySkillName,
          keySkillLevel:   c.keySkillLevel,
        })),
        cargo: ship.cargo.map(lot => {
          const originWorld = lot.originLocation
            ? originWorldByLocation.get(lot.originLocation) ?? null
            : null;
          const salePricePerTon = (world && originWorld)
            ? Math.round(calculateWorldPairSalePrice(originWorld, world))
            : null;
          const saleProceeds = salePricePerTon !== null ? salePricePerTon * lot.tons : null;
          const profitLoss   = saleProceeds   !== null ? saleProceeds - lot.purchasePrice : null;
          return {
            id:              lot.id,
            commodity:       lot.commodity,
            origin:          lot.originLocation ?? null,
            tons:            lot.tons,
            purchasePrice:   lot.purchasePrice,
            originWorldName: originWorld?.name ?? null,
            salePricePerTon,
            saleProceeds,
            profitLoss,
          };
        }),
      },
    });
  } catch (err) {
    console.error("[GET /api/ship]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

// ─── PATCH /api/ship ──────────────────────────────────────────────────────────

export const PATCH = async (request: Request) => {
  try {
    const dbUser = await resolveDbUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ship = await prisma.ship.findUnique({ where: { userId: dbUser.id } });
    if (!ship) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body: {
      name?:               string;
      status?:             string;
      currentLocation?:    string | null;
      destinationLocation?: string | null;
      jumpArrivesTurn?:    number | null;
    } = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }

    if (body.status === "docked" || body.status === "in_jump") {
      updates.status = body.status;
    }

    if (body.currentLocation !== undefined) {
      updates.currentLocation = body.currentLocation;
    }

    if (body.destinationLocation !== undefined) {
      updates.destinationLocation = body.destinationLocation;
    }

    if (body.jumpArrivesTurn !== undefined) {
      updates.jumpArrivesTurn = body.jumpArrivesTurn;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const updated = await prisma.ship.update({ where: { id: ship.id }, data: updates });
    return NextResponse.json({ id: updated.id, name: updated.name });
  } catch (err) {
    console.error("[PATCH /api/ship]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
