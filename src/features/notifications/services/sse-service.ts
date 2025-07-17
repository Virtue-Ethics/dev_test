import type { ReadableStreamDefaultController } from "stream/web";

/**
 * HMR-safe singleton for the connections map.
 */
declare global {
  var sseConnections:
    | Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>
    | undefined;
}

const connections =
  global.sseConnections ??
  new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();

if (process.env.NODE_ENV !== "production") {
  global.sseConnections = connections;
}

/**
 * Calculates the current connection statistics.
 */
function getConnectionStats() {
  const userIds = Array.from(connections.keys());
  const totalUsers = connections.size;
  const totalConnections = userIds.reduce(
    (acc, userId) => acc + (connections.get(userId)?.size ?? 0),
    0,
  );
  return { userIds, totalUsers, totalConnections };
}

/**
 * Broadcasts a system-wide update with the latest stats and a log message.
 * This is used to keep all clients in sync with the server's state.
 * @param log - The message to add to the event history.
 */
function broadcastSystemUpdate(log: string) {
  const stats = getConnectionStats();
  broadcastSSEEvent("system-update", { log, stats });
}

export function registerConnection(
  userId: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  let userConnections = connections.get(userId);
  if (!userConnections) {
    userConnections = new Set();
    connections.set(userId, userConnections);
  }
  userConnections.add(controller);

  broadcastSystemUpdate(`User ${userId.substring(0, 8)}... connected`);

  return () => {
    const userConns = connections.get(userId);
    if (!userConns) return;

    userConns.delete(controller);

    if (userConns.size === 0) {
      connections.delete(userId);
    }
    broadcastSystemUpdate(`User ${userId.substring(0, 8)}... disconnected`);
  };
}

export function sendSSEEvent(
  userId: string,
  event: string,
  data: Record<string, unknown>,
): boolean {
  const userConnections = connections.get(userId);

  if (!userConnections || userConnections.size === 0) {
    return false;
  }

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const payload = new TextEncoder().encode(message);

  for (const controller of userConnections) {
    try {
      controller.enqueue(payload);
    } catch (error) {
      console.error(`[SSE] Failed to send event to user ${userId}.`, error);
    }
  }
  broadcastSystemUpdate(
    `Sent '${event}' event to user ${userId.substring(0, 8)}...`,
  );
  return true;
}

export function broadcastSSEEvent(
  event: string,
  data: Record<string, unknown>,
) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const payload = new TextEncoder().encode(message);

  let sentCount = 0;
  for (const userConnections of connections.values()) {
    for (const controller of userConnections) {
      try {
        controller.enqueue(payload);
        sentCount++;
      } catch (error) {
        console.error(`[SSE] Failed to broadcast event.`, error);
      }
    }
  }

  if (event !== "system-update" && sentCount > 0) {
    broadcastSystemUpdate(
      `Broadcasted '${event}' event to ${sentCount} connection(s).`,
    );
  }
}
