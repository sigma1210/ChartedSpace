import { NextResponse } from "next/server";
import { deleteQuestFile, loadQuestFile, QuestFileError, updateQuestFile } from "@/plugins/quest/server/questFiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const errorResponse = (error: unknown) => error instanceof QuestFileError
  ? NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  : NextResponse.json({ error: error instanceof Error ? error.message : "Quest file operation failed." }, { status: 500 });

export async function GET(_request: Request, context: RouteContext<"/api/quests/[id]">) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ definition: await loadQuestFile(id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext<"/api/quests/[id]">) {
  try {
    const { id } = await context.params;
    const body = await request.json() as { definition?: unknown };
    const definition = await updateQuestFile(id, body.definition);
    return NextResponse.json({ quest: { id: definition.id, title: definition.title, isDefault: false }, definition });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/quests/[id]">) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ deleted: await deleteQuestFile(id) });
  } catch (error) {
    return errorResponse(error);
  }
}

