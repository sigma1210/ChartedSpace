import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/devAuth";

// ─── GET /api/turn ────────────────────────────────────────────────────────────

export const GET = async () => {
  try {
    const dbUser = await getCurrentUser();
    if (!dbUser) return NextResponse.json({ currentTurn: 1 });

    return NextResponse.json({ currentTurn: dbUser.currentTurn });
  } catch (err) {
    console.error("[GET /api/turn]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
