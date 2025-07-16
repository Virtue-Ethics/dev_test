import { sseManager } from "./sse-manager";
import { createServiceContext } from "@/utils/service-utils";
import type { SSEEvent, SSEBroadcastOptions } from "../types";

const { log } = createServiceContext("SSEService");

/**
 * High-level SSE service for application features
 * Provides a clean interface for backend modules to send notifications
 */
export const sseService = {
  /**
   * Send notification to a specific user
   */
  notifyUser: async (
    userId: string,
    notification: {
      type: string;
      title?: string;
      message: string;
      data?: unknown;
    },
  ): Promise<number> => {
    log.info("Sending notification to user", {
      userId,
      type: notification.type,
    });

    const event: SSEEvent = {
      type: "notification",
      data: {
        ...notification,
        timestamp: new Date().toISOString(),
        userId,
      },
      id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };

    return sseManager.sendToUser(userId, event);
  },

  /**
   * Send system-wide announcement
   */
  broadcastAnnouncement: async (announcement: {
    title: string;
    message: string;
    level?: "info" | "warning" | "error";
    data?: unknown;
  }): Promise<number> => {
    log.info("Broadcasting announcement", { title: announcement.title });

    const event: SSEEvent = {
      type: "announcement",
      data: {
        ...announcement,
        level: announcement.level ?? "info",
        timestamp: new Date().toISOString(),
      },
      id: `announcement-${Date.now()}`,
    };

    return sseManager.broadcastToAll(event);
  },

  /**
   * Send real-time update (e.g., for live data)
   */
  sendUpdate: async (
    updateType: string,
    data: unknown,
    options?: SSEBroadcastOptions,
  ): Promise<number> => {
    log.info("Sending real-time update", { updateType, options });

    const event: SSEEvent = {
      type: "update",
      data: {
        updateType,
        payload: data,
        timestamp: new Date().toISOString(),
      },
      id: `update-${updateType}-${Date.now()}`,
    };

    return sseManager.broadcast(event, options ?? {});
  },

  /**
   * Send progress update for long-running operations
   */
  sendProgress: async (
    userId: string,
    operationId: string,
    progress: {
      percentage: number;
      message?: string;
      completed?: boolean;
      error?: string;
    },
  ): Promise<number> => {
    log.info("Sending progress update", {
      userId,
      operationId,
      percentage: progress.percentage,
    });

    const event: SSEEvent = {
      type: "progress",
      data: {
        operationId,
        ...progress,
        timestamp: new Date().toISOString(),
      },
      id: `progress-${operationId}-${Date.now()}`,
    };

    return sseManager.sendToUser(userId, event);
  },

  /**
   * Send custom event
   */
  sendCustomEvent: async (
    eventType: string,
    data: unknown,
    options?: SSEBroadcastOptions,
  ): Promise<number> => {
    log.info("Sending custom event", { eventType, options });

    const event: SSEEvent = {
      type: eventType,
      data,
      id: `${eventType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };

    return sseManager.broadcast(event, options ?? {});
  },

  /**
   * Get connection statistics
   */
  getConnectionStats: () => {
    return sseManager.getStats();
  },

  /**
   * Get connected users count
   */
  getConnectedUsersCount: (): number => {
    const clients = sseManager.getClients();
    const uniqueUsers = new Set(clients.map((c) => c.userId).filter(Boolean));
    return uniqueUsers.size;
  },

  /**
   * Check if user is connected
   */
  isUserConnected: (userId: string): boolean => {
    return sseManager.getClientsByUserId(userId).length > 0;
  },
};
