import type { NextRequest } from "next/server";
import { getSession } from "@/features/auth";

/**
 * SSE response headers for proper streaming
 */
export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Connection: "keep-alive",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Cache-Control",
} as const;

/**
 * Generate a unique client ID
 */
export function generateClientId(): string {
  return `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract client metadata from request
 */
export async function extractClientMetadata(request: NextRequest) {
  const session = await getSession();
  const url = new URL(request.url);

  return {
    userId: session?.user?.id,
    sessionId: request.cookies.get("authjs.session-token")?.value,
    userAgent: request.headers.get("user-agent") ?? "unknown",
    ip:
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown",
    timestamp: new Date().toISOString(),
    query: Object.fromEntries(url.searchParams.entries()),
  };
}

/**
 * Create SSE response stream
 */
export function createSSEStream(
  onConnect: (controller: ReadableStreamDefaultController) => void,
): Response {
  const stream = new ReadableStream({
    start(controller) {
      onConnect(controller);
    },
    cancel() {
      // Stream was cancelled by client
    },
  });

  return new Response(stream, {
    headers: SSE_HEADERS,
  });
}

/**
 * Validate SSE event data
 */
export function validateEventData(data: unknown): boolean {
  try {
    JSON.stringify(data);
    return true;
  } catch {
    return false;
  }
}
