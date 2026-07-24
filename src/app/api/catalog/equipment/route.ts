import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/devAuth";
import {
  buildEquipmentMarket,
  loadEquipmentPurchaseContext,
  purchaseEquipment,
} from "@/plugins/equipmentCatalog/server";

const parseMultiplier = (value: unknown): 1 | 2 | 3 | null =>
  value === 1 || value === 2 || value === 3 ? value : null;

export const GET = async (request: Request) => {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    const purchaserCrewId = url.searchParams.get("purchaserCrewId");
    const priceMultiplier = parseMultiplier(Number(url.searchParams.get("priceMultiplier") ?? "1")) ?? 1;
    const context = await loadEquipmentPurchaseContext(user.id, purchaserCrewId);
    const items = await buildEquipmentMarket(context, priceMultiplier);
    return NextResponse.json({
      market: {
        ship: context.ship,
        location: context.location,
        currentTurn: context.currentTurn,
        world: context.world,
        ownerCredits: context.owner.credits,
        crew: context.crew,
        purchaser: context.purchaser,
        priceMultiplier,
        items,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load equipment market";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};

export const POST = async (request: Request) => {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json() as {
      purchaserCrewId?: unknown;
      catalogItemId?: unknown;
      priceMultiplier?: unknown;
    };
    const priceMultiplier = parseMultiplier(body.priceMultiplier);
    if (
      typeof body.purchaserCrewId !== "string"
      || typeof body.catalogItemId !== "string"
      || !priceMultiplier
    ) {
      return NextResponse.json({ error: "Invalid purchase request" }, { status: 400 });
    }
    const result = await purchaseEquipment({
      userId: user.id,
      purchaserCrewId: body.purchaserCrewId,
      catalogItemId: body.catalogItemId,
      priceMultiplier,
    });
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purchase failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
