import { NextResponse } from "next/server";
import { loadTacticalScenarioBundle, saveTacticalScenarioBundle, TacticalScenarioFileError } from "@/plugins/characterCombat/server/tacticalScenarioFiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext<"/api/tactical/scenarios/[id]">) {
  try {
    const { id } = await context.params;
    const bundle = await loadTacticalScenarioBundle(id);
    return NextResponse.json({ definition: bundle.scenario, consoleVictory: bundle.consoleVictory });
  } catch (error) {
    if (error instanceof TacticalScenarioFileError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scenario file operation failed." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext<"/api/tactical/scenarios/[id]">) {
  let body: { definition?: unknown; consoleVictory?: unknown };
  try {
    body = await request.json() as { definition?: unknown; consoleVictory?: unknown };
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  try {
    const { id } = await context.params;
    const saved = await saveTacticalScenarioBundle(id, body.definition, body.consoleVictory);
    return NextResponse.json({
      scenario: { id: saved.scenario.id, title: saved.scenario.title, isDefault: false },
      definition: saved.scenario,
      consoleVictory: saved.consoleVictory,
    });
  } catch (error) {
    if (error instanceof TacticalScenarioFileError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scenario file operation failed." }, { status: 500 });
  }
}
