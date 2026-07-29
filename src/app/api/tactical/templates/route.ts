import { NextResponse } from "next/server";
import {
  listTacticalTemplateFiles,
  saveTacticalTemplateFile,
  TacticalTemplateFileError,
} from "@/plugins/characterCombat/server/tacticalTemplateFiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const errorResponse = (error: unknown) => error instanceof TacticalTemplateFileError
  ? NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  : NextResponse.json({ error: error instanceof Error ? error.message : "Template image operation failed." }, { status: 500 });

export async function GET() {
  try {
    return NextResponse.json({ templates: await listTacticalTemplateFiles() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "The request body must be multipart form data." }, { status: 400 });
  }
  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "An image file is required." }, { status: 400 });
  }
  try {
    const template = await saveTacticalTemplateFile(image);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
