import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/devAuth";
import { createGeneratedContactForCharacter } from "@/plugins/characters/server/contactGenerationService";

type Params = { params: Promise<{ id: string }> };

const parseText = (value: unknown) =>
  typeof value === "string" ? value.trim() : null;

const parseAttitude = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) ? value : null;

export const POST = async (request: Request, { params }: Params) => {
  try {
    const { id: sourceCharacterId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const type = parseText(body.type) ?? "contact";
    const attitude = parseAttitude(body.attitude) ?? 0;
    const notes = parseText(body.notes);
    const source = parseText(body.source) ?? "manual-contact-generation";

    if (!type) return NextResponse.json({ error: "Relationship type is required" }, { status: 400 });
    if (type.length > 64) return NextResponse.json({ error: "Relationship type is too long" }, { status: 400 });
    if (attitude < -100 || attitude > 100) {
      return NextResponse.json({ error: "Attitude must be between -100 and 100" }, { status: 400 });
    }

    const result = await createGeneratedContactForCharacter({
      userId: user.id,
      sourceCharacterId,
      type,
      attitude,
      notes,
      source,
    });

    if (!result) return NextResponse.json({ error: "Character not found" }, { status: 404 });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/characters/[id]/contacts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
