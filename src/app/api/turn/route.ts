import { NextResponse } from "next/server";
import { getUser } from "@/actions/user";
import { getClerkId } from "@/lib/devAuth";

// ─── GET /api/turn ────────────────────────────────────────────────────────────

export const GET = async () => {
  try {
    const clerkId = await getClerkId();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getUser(clerkId);
    if (!dbUser) return NextResponse.json({ currentTurn: 1 });

    return NextResponse.json({ currentTurn: dbUser.currentTurn });
  } catch (err) {
    console.error("[GET /api/turn]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
