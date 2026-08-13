import { NextResponse } from "next/server";
import { deleteDialogueFile, DialogueFileError, loadDialogueFile, updateDialogueFile } from "@/plugins/quest/server/dialogueFiles";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const failed = (error: unknown) => error instanceof DialogueFileError ? NextResponse.json({ error: error.message, code: error.code }, { status: error.status }) : NextResponse.json({ error: error instanceof Error ? error.message : "Dialogue file operation failed." }, { status: 500 });
export async function GET(_request: Request, context: RouteContext<"/api/quest-dialogues/[id]">) { try { const { id } = await context.params; return NextResponse.json({ definition: await loadDialogueFile(id) }); } catch (error) { return failed(error); } }
export async function PUT(request: Request, context: RouteContext<"/api/quest-dialogues/[id]">) { try { const { id } = await context.params; const body = await request.json() as { definition?: unknown }; const definition = await updateDialogueFile(id, body.definition); return NextResponse.json({ dialogue: { id: definition.id, title: definition.title }, definition }); } catch (error) { return failed(error); } }
export async function DELETE(_request: Request, context: RouteContext<"/api/quest-dialogues/[id]">) { try { const { id } = await context.params; return NextResponse.json({ deleted: await deleteDialogueFile(id) }); } catch (error) { return failed(error); } }
