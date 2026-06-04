import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applySystemDataTurn, buildSystemData } from "@/lib/systemGeneration";
import { loadSectorCatalogWorld } from "@/lib/server/sectorCatalog";
import type { SystemData } from "@/lib/systemTypes";

const SYSTEM_GENERATOR_VERSION = 2;

type Params = { params: Promise<{ sectorAbbr: string; hex: string }> };

const parseTurn = (request: Request): number => {
  const url = new URL(request.url);
  const raw = url.searchParams.get("turn");
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const loadWorld = async (sectorAbbr: string, hex: string) => {
  return prisma.world.findFirst({
    where: {
      hex,
      sector: { abbreviation: sectorAbbr },
    },
    include: {
      sector: { select: { abbreviation: true } },
    },
  });
};

export const GET = async (request: Request, { params }: Params) => {
  try {
    const { sectorAbbr, hex } = await params;
    const currentTurn = parseTurn(request);
    const [dbWorld, catalogWorld] = await Promise.all([
      loadWorld(sectorAbbr, hex),
      loadSectorCatalogWorld(sectorAbbr, hex),
    ]);

    if (!dbWorld || !catalogWorld) {
      return NextResponse.json({ error: "World not found" }, { status: 404 });
    }

    const cache = prisma.worldSystemCache;
    const cached = cache
      ? await cache.findUnique({
          where: {
            worldId_generatorVersion: {
              worldId: dbWorld.id,
              generatorVersion: SYSTEM_GENERATOR_VERSION,
            },
          },
        })
      : null;

    if (!cache) {
      console.warn("[GET /api/worlds/:sectorAbbr/:hex/system] Prisma worldSystemCache delegate unavailable; returning uncached system data");
    }

    const cacheHit = !!cached;
    const stableData = cached
      ? (cached.data as unknown as SystemData)
      : buildSystemData(catalogWorld, {
          sectorAbbr: dbWorld.sector.abbreviation,
          currentTurn: 1,
        });

    if (!cached && cache) {
      await cache.upsert({
        where: {
          worldId_generatorVersion: {
            worldId: dbWorld.id,
            generatorVersion: SYSTEM_GENERATOR_VERSION,
          },
        },
        create: {
          worldId: dbWorld.id,
          generatorVersion: SYSTEM_GENERATOR_VERSION,
          data: stableData as unknown as Prisma.InputJsonValue,
        },
        update: {
          data: stableData as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({
      data: applySystemDataTurn(stableData, currentTurn),
      cache: {
        hit: cacheHit,
        generatorVersion: SYSTEM_GENERATOR_VERSION,
      },
    });
  } catch (err) {
    console.error("[GET /api/worlds/:sectorAbbr/:hex/system]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
