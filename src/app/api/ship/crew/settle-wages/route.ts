import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClerkId } from "@/lib/devAuth";
import { roll2d6 } from "@/lib/dice";
import shipTypes from "@/data/classic/ships.json";

// ─── POST /api/ship/crew/settle-wages ────────────────────────────────────────
// Runs once every 2 turns (caller is responsible for the turn-parity check).
// 1. Calculates total wages + mortgage due.
// 2. Deducts from owner's credits (may go negative).
// 3. If owner had enough credits: resets all NPC unpaidTurns to 0.
// 4. If not: increments unpaidTurns for each NPC, rolls 2D6 per crew —
//    quit if 2D6 roll ≤ unpaidTurns+2 (~3% at 1st miss, ~42% at 5th, ~72% at 7th).
// Returns: { total, newCredits, quit: string[], unpaidCrew: string[] }

export const POST = async () => {
  try {
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ship = await prisma.ship.findFirst({
      where: { userId: user.id },
      select: {
        id:         true,
        type:       true,
        isMortgaged: true,
        crew: {
          select: {
            id:              true,
            npcName:         true,
            characterId:     true,
            isOwnerOperator: true,
            monthlySalary:   true,
            unpaidTurns:     true,
          },
        },
      },
    });

    if (!ship) return NextResponse.json({ error: "No ship found" }, { status: 404 });

    const ownerEntry = ship.crew.find(c => c.isOwnerOperator);
    if (!ownerEntry?.characterId) {
      return NextResponse.json({ error: "No owner-operator found" }, { status: 400 });
    }

    const owner = await prisma.character.findUnique({
      where:  { id: ownerEntry.characterId },
      select: { credits: true },
    });
    if (!owner) return NextResponse.json({ error: "Owner character not found" }, { status: 404 });

    const typeData = (shipTypes as Array<{ type: string; monthlyMortgage?: number }>)
      .find(s => s.type === ship.type);
    const mortgage = ship.isMortgaged ? (typeData?.monthlyMortgage ?? 0) : 0;
    const salaries = ship.crew.reduce((sum, c) => sum + c.monthlySalary, 0);
    const total    = mortgage + salaries;

    if (total === 0) {
      return NextResponse.json({ total: 0, newCredits: owner.credits, quit: [], unpaidCrew: [] });
    }

    const canPay    = owner.credits >= total;
    const newCredits = owner.credits - total;

    const npcCrew = ship.crew.filter(c => !c.isOwnerOperator);
    const quitIds:   string[] = [];
    const quitNames: string[] = [];

    if (!canPay) {
      for (const npc of npcCrew) {
        // 2D6 minimum is 2, so threshold must be ≥ 2 to ever trigger.
        // unpaidTurns=0 → threshold 2 (~2.8%), unpaidTurns=5 → threshold 7 (~58%)
        const threshold = npc.unpaidTurns + 2;
        const roll = roll2d6();
        if (roll <= threshold) {
          quitIds.push(npc.id);
          quitNames.push(npc.npcName ?? "Unknown");
        }
      }
    }

    const unpaidNames = canPay
      ? []
      : npcCrew
          .filter(c => !quitIds.includes(c.id))
          .map(c => c.npcName ?? "Unknown");

    await prisma.$transaction(async (tx) => {
      // Deduct wages (may go negative)
      await tx.character.update({
        where: { id: ownerEntry.characterId! },
        data:  { credits: newCredits },
      });

      if (canPay) {
        // Reset all NPC unpaidTurns
        if (npcCrew.length > 0) {
          await tx.shipCrew.updateMany({
            where: { id: { in: npcCrew.map(c => c.id) } },
            data:  { unpaidTurns: 0 },
          });
        }
      } else {
        // Fire quitters
        if (quitIds.length > 0) {
          await tx.shipCrew.deleteMany({ where: { id: { in: quitIds } } });
        }
        // Increment unpaidTurns for crew who stayed
        const stayedIds = npcCrew.filter(c => !quitIds.includes(c.id)).map(c => c.id);
        if (stayedIds.length > 0) {
          await tx.shipCrew.updateMany({
            where: { id: { in: stayedIds } },
            data:  { unpaidTurns: { increment: 1 } },
          });
        }
      }
    });

    return NextResponse.json({
      total,
      newCredits,
      quit:       quitNames,
      unpaidCrew: unpaidNames,
    });
  } catch (err) {
    console.error("[POST /api/ship/crew/settle-wages]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
