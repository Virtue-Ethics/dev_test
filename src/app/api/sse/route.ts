import { type NextRequest } from "next/server";
import { sseManager } from "@/lib/sse/sseManager";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id") ?? `user-${Date.now()}`;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const write = (data: string) => controller.enqueue(encoder.encode(data));

      write(`event: connected\ndata: Connected as ${userId}\n\n`);
      sseManager.addClient(userId, {
        write: write,
        end: () => controller.close(),
      });

      const interval = setInterval(() => {
        write(`event: ping\ndata: {}\n\n`);
      }, 15_000);

      req.signal.addEventListener("abort", () => {
        sseManager.removeClient(userId);
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
