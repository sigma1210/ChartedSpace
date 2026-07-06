import { NextResponse } from "next/server";
import { getCurrentUser, isDevAuthMode } from "@/lib/devAuth";
import {
  createGeneratedPosting,
  listOpenCharacterPostings,
  type CharacterPostingType,
} from "@/plugins/characters/server/postingService";

const postingTypes = new Set<CharacterPostingType>(["crew_available", "patron_job"]);

const parseText = (value: unknown) =>
  typeof value === "string" ? value.trim() : null;

const errorResponse = (err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  return NextResponse.json(
    {
      error: "Internal server error",
      ...(isDevAuthMode() ? { detail } : {}),
    },
    { status: 500 },
  );
};

export const GET = async (request: Request) => {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ items: [] });

    const url = new URL(request.url);
    const location = parseText(url.searchParams.get("location"));
    if (!location) return NextResponse.json({ items: [] });

    const items = await listOpenCharacterPostings({
      userId: user.id,
      location,
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[GET /api/characters/postings]", err);
    return errorResponse(err);
  }
};

export const POST = async (request: Request) => {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const type = parseText(body.type);
    const location = parseText(body.location);

    if (!type || !postingTypes.has(type as CharacterPostingType)) {
      return NextResponse.json({ error: "Invalid posting type" }, { status: 400 });
    }
    if (!location) {
      return NextResponse.json({ error: "location is required" }, { status: 400 });
    }

    const item = await createGeneratedPosting({
      userId: user.id,
      type: type as CharacterPostingType,
      location,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/characters/postings]", err);
    return errorResponse(err);
  }
};
