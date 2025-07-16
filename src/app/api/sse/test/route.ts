import { type NextRequest } from "next/server";
import { sseService } from "@/features/sse";
import { getSession } from "@/features/auth";

/**
 * Test endpoint for SSE functionality
 * Allows testing different types of SSE events
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    type SseTestRequestBody = {
      type: "notification" | "announcement" | "update" | "progress" | "custom";
      message?: string;
      data?: Record<string, unknown>;
    };
    const body = (await request.json()) as SseTestRequestBody;
    const { type, message, data } = body;

    let result: number;

    switch (type) {
      case "notification":
        result = await sseService.notifyUser(session.user.id, {
          type: "test",
          title: "Test Notification",
          message: message ?? "This is a test notification",
          data,
        });
        break;

      case "announcement":
        result = await sseService.broadcastAnnouncement({
          title: "Test Announcement",
          message: message ?? "This is a test announcement",
          level: "info",
          data,
        });
        break;

      case "update":
        result = await sseService.sendUpdate("test-update", {
          message: message ?? "This is a test update",
          ...data,
        });
        break;

      case "progress":
        result = await sseService.sendProgress(
          session.user.id,
          "test-operation",
          {
            percentage:
              typeof data?.percentage === "number" ? data.percentage : 50,
            message: message ?? "Test progress update",
            completed:
              typeof data?.completed === "boolean" ? data.completed : false,
          },
        );
        break;

      case "custom":
        result = await sseService.sendCustomEvent("test-custom", {
          message: message ?? "This is a custom test event",
          ...data,
        });
        break;

      default:
        return Response.json({ error: "Invalid event type" }, { status: 400 });
    }

    return Response.json({
      success: true,
      clientsNotified: result,
      stats: sseService.getConnectionStats(),
    });
  } catch (error) {
    console.error("[SSE Test] Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Get SSE connection statistics
 */
export async function GET() {
  try {
    const stats = sseService.getConnectionStats();
    const connectedUsers = sseService.getConnectedUsersCount();

    return Response.json({
      ...stats,
      connectedUsers,
      isHealthy: stats.totalConnections >= 0,
    });
  } catch (error) {
    console.error("[SSE Test] Error getting stats:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
