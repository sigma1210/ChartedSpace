import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClerkId } from "@/lib/devAuth";

type Params = { params: Promise<{ crewId: string }> };

// DELETE /api/ship/crew/[crewId] — fire a crew member
export const DELETE = async (_req: Request, { params }: Params) => {
  try {
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { crewId } = await params;

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ship = await prisma.ship.findFirst({ where: { userId: user.id } });
    if (!ship) return NextResponse.json({ error: "No ship found" }, { status: 404 });

    const crew = await prisma.shipCrew.findUnique({ where: { id: crewId } });

    if (!crew || crew.shipId !== ship.id) {
      return NextResponse.json({ error: "Crew member not found" }, { status: 404 });
    }
    if (crew.isOwnerOperator) {
      return NextResponse.json({ error: "Cannot fire the owner-operator" }, { status: 400 });
    }

    await prisma.shipCrew.delete({ where: { id: crewId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/ship/crew/[crewId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

// PATCH /api/ship/crew/[crewId] — change the owner-operator's role
export const PATCH = async (req: Request, { params }: Params) => {
  try {
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { crewId } = await params;
    const body = await req.json() as { role?: string };

    if (!body.role) {
      return NextResponse.json({ error: "role is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ship = await prisma.ship.findFirst({ where: { userId: user.id } });
    if (!ship) return NextResponse.json({ error: "No ship found" }, { status: 404 });

    const crew = await prisma.shipCrew.findUnique({ where: { id: crewId } });

    if (!crew || crew.shipId !== ship.id) {
      return NextResponse.json({ error: "Crew member not found" }, { status: 404 });
    }
    if (!crew.isOwnerOperator) {
      return NextResponse.json({ error: "Only the owner-operator's role can be changed this way" }, { status: 400 });
    }
    if (crew.role === body.role) {
      return NextResponse.json({ ok: true });
    }

    await prisma.$transaction(async (tx) => {
      // If an NPC already holds the target role, fire them first
      const displaced = await tx.shipCrew.findFirst({
        where: { shipId: ship.id, role: body.role, isOwnerOperator: false },
      });
      if (displaced) {
        await tx.shipCrew.delete({ where: { id: displaced.id } });
      }

      await tx.shipCrew.update({ where: { id: crewId }, data: { role: body.role } });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/ship/crew/[crewId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
