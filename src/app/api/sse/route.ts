import { type NextRequest } from "next/server";
import { sseManager } from "@/features/sse";
import {
  generateClientId,
  extractClientMetadata,
  createSSEStream,
} from "@/features/sse/";

/**
 * SSE endpoint for client connections
 * Handles GET requests to establish Server-Sent Event streams
 */
export async function GET(request: NextRequest) {
  try {
    // Generate unique client ID
    const clientId = generateClientId();

    // Extract client metadata
    const metadata = await extractClientMetadata(request);

    console.log(`[SSE] New connection attempt: ${clientId}`, {
      userId: metadata.userId,
      userAgent: metadata.userAgent,
      ip: metadata.ip,
    });

    // Create SSE stream
    return createSSEStream((controller) => {
      try {
        // Add client to manager
        const client = sseManager.addClient(clientId, controller, metadata);

        console.log(`[SSE] Client connected: ${clientId}`, {
          userId: client.userId,
          totalConnections: sseManager.getStats().totalConnections,
        });

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          console.log(`[SSE] Client disconnected: ${clientId}`);
          sseManager.removeClient(clientId, "client_disconnect");
        });
      } catch (error) {
        console.error(`[SSE] Error setting up client ${clientId}:`, error);
        try {
          controller.close();
        } catch (closeError) {
          console.error(`[SSE] Error closing controller:`, closeError);
        }
      }
    });
  } catch (error) {
    console.error("[SSE] Error in SSE endpoint:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
