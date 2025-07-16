import { sseManager } from "@/lib/sse/sseManager";
import { NextResponse } from "next/server";

export async function GET() {
  const clients = sseManager.getClientIds();
  return NextResponse.json(clients);
}
