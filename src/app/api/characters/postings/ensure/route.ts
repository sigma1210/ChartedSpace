import { NextResponse } from "next/server";
import { getCurrentUser, isDevAuthMode } from "@/lib/devAuth";
import { ensureLocalCharacterPostings } from "@/plugins/characters/server/postingService";

const parseText = (value: unknown) =>
  typeof value === "string" ? value.trim() : null;

const parseTarget = (value: unknown, fallback: number) => {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, Math.min(20, Math.floor(numberValue)));
};

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

export const POST = async (request: Request) => {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const location = parseText(body.location);
    if (!location) {
      return NextResponse.json({ error: "location is required" }, { status: 400 });
    }

    const targets = body.targets && typeof body.targets === "object"
      ? body.targets as Record<string, unknown>
      : {};
    const items = await ensureLocalCharacterPostings({
      userId: user.id,
      location,
      targets: {
        crew_available: parseTarget(targets.crew_available, 5),
        patron_job: parseTarget(targets.patron_job, 3),
      },
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[POST /api/characters/postings/ensure]", err);
    return errorResponse(err);
  }
};
