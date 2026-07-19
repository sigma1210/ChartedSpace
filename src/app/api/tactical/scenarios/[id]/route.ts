import { NextResponse } from "next/server";
import { loadTacticalScenarioFile, TacticalScenarioFileError } from "@/plugins/characterCombat/server/tacticalScenarioFiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext<"/api/tactical/scenarios/[id]">) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ definition: await loadTacticalScenarioFile(id) });
  } catch (error) {
    if (error instanceof TacticalScenarioFileError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scenario file operation failed." }, { status: 500 });
  }
}
