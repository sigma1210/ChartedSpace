import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/actions/user";
import type { Prisma } from "@prisma/client";
import type { CharacterSheet } from "@/lib/characters/types";
import { getClerkId } from "@/lib/devAuth";

type Params = { params: Promise<{ id: string }> };

const resolveDbUser = async () => {
  const clerkId = await getClerkId();
  if (!clerkId) return undefined;
  return await getUser(clerkId);
};

const canModify = (characterUserId: string | null, dbUserId: string | null | undefined): boolean => {
  if (dbUserId === undefined) return false;
  return characterUserId === dbUserId;
};

// ─── PATCH /api/characters/[id] ──────────────────────────────────────────────

export const PATCH = async (request: Request, { params }: Params) => {
  try {
    const { id } = await params;
    const dbUser = await resolveDbUser();

    const character = await prisma.character.findUnique({ where: { id } });
    if (!character) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canModify(character.userId, dbUser?.id ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: { name?: string; sheet?: CharacterSheet; credits?: number } = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }

    if (typeof body.credits === "number" && Number.isInteger(body.credits)) {
      updates.credits = body.credits;
    }

    if (body.sheet) {
      const s = body.sheet;
      updates.sheet         = s as unknown as Prisma.InputJsonValue;
      updates.strength      = s.upp.str;
      updates.dexterity     = s.upp.dex;
      updates.endurance     = s.upp.end;
      updates.intelligence  = s.upp.int;
      updates.education     = s.upp.edu;
      updates.socialStanding = s.upp.soc;
      updates.credits       = s.credits;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const updated = await prisma.character.update({ where: { id }, data: updates });
    return NextResponse.json({ id: updated.id, name: updated.name });
  } catch (err) {
    console.error("[PATCH /api/characters/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

// ─── DELETE /api/characters/[id] ─────────────────────────────────────────────

export const DELETE = async (_request: Request, { params }: Params) => {
  try {
    const { id } = await params;
    const dbUser = await resolveDbUser();

    const character = await prisma.character.findUnique({ where: { id } });
    if (!character) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canModify(character.userId, dbUser?.id ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.character.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/characters/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
