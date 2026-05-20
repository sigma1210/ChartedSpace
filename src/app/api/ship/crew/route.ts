import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClerkId } from "@/lib/devAuth";
import { calculateSalary, ROLE_REQUIRED_SKILL } from "@/lib/crew";

// POST /api/ship/crew — hire a crew member from the available pool
export const POST = async (req: Request) => {
  try {
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await req.json() as {
      role:         string;
      npcName:      string;
      keySkillLevel: number;
      replaceCrewId?: string;
    };

    const { role, npcName, keySkillLevel, replaceCrewId } = body;
    if (!role || !npcName) {
      return NextResponse.json({ error: "role and npcName required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ship = await prisma.ship.findFirst({ where: { userId: user.id } });
    if (!ship) return NextResponse.json({ error: "No ship found" }, { status: 404 });

    const keySkillName  = ROLE_REQUIRED_SKILL[role] ?? null;
    const monthlySalary = calculateSalary(role, keySkillLevel);

    await prisma.$transaction(async (tx) => {
      // Remove the crew member being replaced (if specified)
      if (replaceCrewId) {
        const existing = await tx.shipCrew.findUnique({ where: { id: replaceCrewId } });
        if (existing && existing.shipId === ship.id && !existing.isOwnerOperator) {
          await tx.shipCrew.delete({ where: { id: replaceCrewId } });
        }
      }

      // Add the new crew member
      await tx.shipCrew.create({
        data: {
          shipId:          ship.id,
          characterId:     null,
          npcName,
          role,
          isOwnerOperator: false,
          monthlySalary,
          keySkillName,
          keySkillLevel,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/ship/crew]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
