import { NextResponse } from "next/server";
import { listTacticalScenarioFiles, saveTacticalScenarioAs, TacticalScenarioFileError } from "@/plugins/characterCombat/server/tacticalScenarioFiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const errorResponse = (error: unknown) => error instanceof TacticalScenarioFileError
  ? NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  : NextResponse.json({ error: error instanceof Error ? error.message : "Scenario file operation failed." }, { status: 500 });

export async function GET() {
  try {
    return NextResponse.json({ scenarios: await listTacticalScenarioFiles() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let body: { name?: unknown; definition?: unknown };
  try {
    body = await request.json() as { name?: unknown; definition?: unknown };
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  try {
    if (typeof body.name !== "string") return NextResponse.json({ error: "A scenario name is required." }, { status: 400 });
    const definition = await saveTacticalScenarioAs(body.name, body.definition);
    return NextResponse.json({
      scenario: { id: definition.id, title: definition.title, isDefault: false },
      definition,
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
