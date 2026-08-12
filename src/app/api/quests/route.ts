import { NextResponse } from "next/server";
import { createQuestFile, listQuestFiles, QuestFileError } from "@/plugins/quest/server/questFiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const errorResponse = (error: unknown) => error instanceof QuestFileError
  ? NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  : NextResponse.json({ error: error instanceof Error ? error.message : "Quest file operation failed." }, { status: 500 });

export async function GET() {
  try {
    return NextResponse.json({ quests: await listQuestFiles() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: unknown; definition?: unknown };
    if (typeof body.name !== "string") return NextResponse.json({ error: "A quest name is required." }, { status: 400 });
    const definition = await createQuestFile(body.name, body.definition);
    return NextResponse.json({ quest: { id: definition.id, title: definition.title, isDefault: false }, definition }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

