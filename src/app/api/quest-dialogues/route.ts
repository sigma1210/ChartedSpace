import { NextResponse } from "next/server";
import { createDialogueFile, DialogueFileError, listDialogueFiles } from "@/plugins/quest/server/dialogueFiles";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const failed = (error: unknown) => error instanceof DialogueFileError ? NextResponse.json({ error: error.message, code: error.code }, { status: error.status }) : NextResponse.json({ error: error instanceof Error ? error.message : "Dialogue file operation failed." }, { status: 500 });
export async function GET() { try { return NextResponse.json({ dialogues: await listDialogueFiles() }); } catch (error) { return failed(error); } }
export async function POST(request: Request) { try { const body = await request.json() as { name?: unknown; definition?: unknown }; if (typeof body.name !== "string") return NextResponse.json({ error: "A dialogue name is required." }, { status: 400 }); const definition = await createDialogueFile(body.name, body.definition); return NextResponse.json({ dialogue: { id: definition.id, title: definition.title }, definition }, { status: 201 }); } catch (error) { return failed(error); } }
