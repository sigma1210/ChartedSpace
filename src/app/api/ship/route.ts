import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/actions/user";
import { getClerkId } from "@/lib/devAuth";
import shipTypes from "@/data/classic/ships.json";

const resolveDbUser = async () => {
  const clerkId = await getClerkId();
  if (!clerkId) return undefined;
  return await getUser(clerkId);
};

// ─── GET /api/ship ────────────────────────────────────────────────────────────

export const GET = async () => {
  try {
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getUser(clerkId);
    if (!dbUser) return NextResponse.json({ ship: null });

    const ship = await prisma.ship.findUnique({
      where: { userId: dbUser.id },
      select: {
        id:           true,
        name:         true,
        type:         true,
        jumpRating:   true,
        status:       true,
        isMortgaged:  true,
        mortgagePaid: true,
        currentWorldId: true,
        currentWorld: {
          select: {
            name:   true,
            hex:    true,
            sector: { select: { abbreviation: true } },
          },
        },
        crew: {
          select: {
            id:              true,
            role:            true,
            isOwnerOperator: true,
            monthlySalary:   true,
            characterId:     true,
            npcName:         true,
            character:       { select: { name: true } },
          },
        },
        cargo: {
          select: {
            id:           true,
            commodity:    true,
            tons:         true,
            purchasePrice: true,
            originWorld:  { select: { name: true } },
          },
          orderBy: { acquiredAt: "asc" },
        },
      },
    });

    if (!ship) return NextResponse.json({ ship: null });

    const typeData = shipTypes.find(s => s.type === ship.type);

    return NextResponse.json({
      ship: {
        id:             ship.id,
        name:           ship.name,
        type:           ship.type,
        jumpRating:     ship.jumpRating,
        status:         ship.status,
        isMortgaged:    ship.isMortgaged,
        mortgagePaid:   ship.mortgagePaid,
        currentWorldId: ship.currentWorldId,
        worldName:      ship.currentWorld?.name ?? null,
        sectorAbbr:     ship.currentWorld?.sector.abbreviation ?? null,
        hex:            ship.currentWorld?.hex ?? null,
        cargoCapacity:  typeData?.cargoCapacity ?? 0,
        crew:           ship.crew.map(c => ({
          id:              c.id,
          role:            c.role,
          isOwnerOperator: c.isOwnerOperator,
          monthlySalary:   c.monthlySalary,
          characterId:     c.characterId,
          characterName:   c.character?.name ?? null,
          npcName:         c.npcName,
        })),
        cargo:          ship.cargo.map(lot => ({
          id:              lot.id,
          commodity:       lot.commodity,
          tons:            lot.tons,
          purchasePrice:   lot.purchasePrice,
          originWorldName: lot.originWorld?.name ?? null,
        })),
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

    const body: { name?: string } = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
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
