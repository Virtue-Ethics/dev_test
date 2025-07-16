import { NextResponse } from "next/server";
import { sseManager } from "@/lib/sse/sseManager";

export async function POST() {
  console.log("📣 Broadcasting to", sseManager.getClientIds());
  sseManager.broadcast("message", { text: "Hello from server!" });
  return NextResponse.json({ status: "sent" });
}
