import { sseManager } from "@/lib/sse/sseManager";
import { NextResponse } from "next/server";

interface Data {
  id?: string;
  message?: string;
}

export async function POST(req: Request) {
  const { id, message } = (await req.json()) as Data;

  if (!id || !message) {
    return NextResponse.json(
      { error: "Missing id or message" },
      { status: 400 },
    );
  }

  sseManager.sendToClient(id, "message", { text: message });

  return NextResponse.json({ ok: true });
}
