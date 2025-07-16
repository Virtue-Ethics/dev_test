import { createServiceContext } from "@/utils/service-utils";
import type {
  SSEClient,
  SSEEvent,
  SSEManagerOptions,
  SSEBroadcastOptions,
  SSEConnectionHandler,
  SSEDisconnectionHandler,
} from "../types";

const { log } = createServiceContext("SSEManager");

/**
 * Centralized Server-Sent Events manager
 * Handles client connections, event dispatching, and connection lifecycle
 */
export class SSEManager {
  private readonly clients = new Map<string, SSEClient>();
  private readonly heartbeatInterval: number;
  private readonly connectionTimeout: number;
  private readonly maxConnections: number;
  private heartbeatTimer?: NodeJS.Timeout;
  private onConnection?: SSEConnectionHandler;
  private onDisconnection?: SSEDisconnectionHandler;

  constructor(options: SSEManagerOptions = {}) {
    this.heartbeatInterval = options.heartbeatInterval ?? 30000; // 30 seconds
    this.connectionTimeout = options.connectionTimeout ?? 60000; // 60 seconds
    this.maxConnections = options.maxConnections ?? 1000;

    this.startHeartbeat();
    log.info("SSE Manager initialized", {
      heartbeatInterval: this.heartbeatInterval,
      connectionTimeout: this.connectionTimeout,
      maxConnections: this.maxConnections,
    });
  }

  /**
   * Set connection event handlers
   */
  setEventHandlers(handlers: {
    onConnection?: SSEConnectionHandler;
    onDisconnection?: SSEDisconnectionHandler;
  }) {
    this.onConnection = handlers.onConnection;
    this.onDisconnection = handlers.onDisconnection;
  }

  /**
   * Add a new SSE client connection
   */
  addClient(
    clientId: string,
    controller: ReadableStreamDefaultController,
    metadata?: { userId?: string; sessionId?: string; [key: string]: unknown },
  ): SSEClient {
    // Check connection limits
    if (this.clients.size >= this.maxConnections) {
      throw new Error("Maximum SSE connections reached");
    }

    // Remove existing client with same ID if exists
    if (this.clients.has(clientId)) {
      this.removeClient(clientId, "duplicate_connection");
    }

    const client: SSEClient = {
      id: clientId,
      userId: metadata?.userId,
      sessionId: metadata?.sessionId,
      controller,
      lastPing: Date.now(),
      metadata,
    };

    this.clients.set(clientId, client);
    log.info("Client connected", { clientId, userId: client.userId });

    // Send initial connection confirmation
    this.sendToClient(clientId, {
      type: "connection",
      data: { status: "connected", clientId },
    });

    // Call connection handler
    this.onConnection?.(client);

    return client;
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string, reason?: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    try {
      // Close the controller if still open
      if (client.controller.desiredSize !== null) {
        client.controller.close();
      }
    } catch (error) {
      log.warn("Error closing client controller", { clientId, error });
    }

    this.clients.delete(clientId);
    log.info("Client disconnected", { clientId, reason });

    // Call disconnection handler
    this.onDisconnection?.(clientId, reason);

    return true;
  }

  /**
   * Get client by ID
   */
  getClient(clientId: string): SSEClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all clients, optionally filtered
   */
  getClients(filter?: (client: SSEClient) => boolean): SSEClient[] {
    const allClients = Array.from(this.clients.values());
    return filter ? allClients.filter(filter) : allClients;
  }

  /**
   * Get clients by user ID
   */
  getClientsByUserId(userId: string): SSEClient[] {
    return this.getClients((client) => client.userId === userId);
  }

  /**
   * Get clients by session ID
   */
  getClientsBySessionId(sessionId: string): SSEClient[] {
    return this.getClients((client) => client.sessionId === sessionId);
  }

  /**
   * Send event to a specific client
   */
  sendToClient(clientId: string, event: SSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      log.warn("Attempted to send to non-existent client", { clientId });
      return false;
    }

    return this.writeToClient(client, event);
  }

  /**
   * Send event to multiple clients based on user ID
   */
  sendToUser(userId: string, event: SSEEvent): number {
    const clients = this.getClientsByUserId(userId);
    let successCount = 0;

    for (const client of clients) {
      if (this.writeToClient(client, event)) {
        successCount++;
      }
    }

    log.info("Sent event to user clients", {
      userId,
      event: event.type,
      clientCount: clients.length,
      successCount,
    });

    return successCount;
  }

  /**
   * Broadcast event to multiple clients with options
   */
  broadcast(event: SSEEvent, options: SSEBroadcastOptions = {}): number {
    let clients = Array.from(this.clients.values());

    // Apply filters
    if (options.userId) {
      clients = clients.filter((client) => client.userId === options.userId);
    }

    if (options.sessionId) {
      clients = clients.filter(
        (client) => client.sessionId === options.sessionId,
      );
    }

    if (options.excludeClient) {
      clients = clients.filter((client) => client.id !== options.excludeClient);
    }

    if (options.filter) {
      clients = clients.filter(options.filter);
    }

    let successCount = 0;
    for (const client of clients) {
      if (this.writeToClient(client, event)) {
        successCount++;
      }
    }

    log.info("Broadcast event", {
      event: event.type,
      targetCount: clients.length,
      successCount,
      options,
    });

    return successCount;
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastToAll(event: SSEEvent, excludeClient?: string): number {
    return this.broadcast(event, { excludeClient });
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const now = Date.now();
    const clients = Array.from(this.clients.values());

    return {
      totalConnections: clients.length,
      userConnections: new Set(clients.map((c) => c.userId).filter(Boolean))
        .size,
      sessionConnections: new Set(
        clients.map((c) => c.sessionId).filter(Boolean),
      ).size,
      staleConnections: clients.filter(
        (c) => now - c.lastPing > this.connectionTimeout,
      ).length,
      oldestConnection: Math.min(...clients.map((c) => c.lastPing)),
      newestConnection: Math.max(...clients.map((c) => c.lastPing)),
    };
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections(): number {
    const now = Date.now();
    const staleClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (now - client.lastPing > this.connectionTimeout) {
        staleClients.push(clientId);
      }
    }

    for (const clientId of staleClients) {
      this.removeClient(clientId, "timeout");
    }

    if (staleClients.length > 0) {
      log.info("Cleaned up stale connections", { count: staleClients.length });
    }

    return staleClients.length;
  }

  /**
   * Shutdown the SSE manager
   */
  shutdown(): void {
    log.info("Shutting down SSE Manager");

    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    // Close all client connections
    const clientIds = Array.from(this.clients.keys());
    for (const clientId of clientIds) {
      this.removeClient(clientId, "server_shutdown");
    }

    log.info("SSE Manager shutdown complete");
  }

  /**
   * Write event to a specific client
   */
  private writeToClient(client: SSEClient, event: SSEEvent): boolean {
    try {
      const message = this.formatSSEMessage(event);
      const encoder = new TextEncoder();

      client.controller.enqueue(encoder.encode(message));
      client.lastPing = Date.now();

      return true;
    } catch (error) {
      log.warn("Failed to write to client", {
        clientId: client.id,
        error: error instanceof Error ? error.message : String(error),
      });

      // Remove client on write error
      this.removeClient(client.id, "write_error");
      return false;
    }
  }

  /**
   * Format event as SSE message
   */
  private formatSSEMessage(event: SSEEvent): string {
    let message = "";

    if (event.id) {
      message += `id: ${event.id}\n`;
    }

    if (event.type) {
      message += `event: ${event.type}\n`;
    }

    if (event.retry) {
      message += `retry: ${event.retry}\n`;
    }

    // Handle data - can be string or object
    const data =
      typeof event.data === "string" ? event.data : JSON.stringify(event.data);

    // Split multi-line data
    const dataLines = data.split("\n");
    for (const line of dataLines) {
      message += `data: ${line}\n`;
    }

    message += "\n"; // End with double newline

    return message;
  }

  /**
   * Start heartbeat to keep connections alive and clean up stale ones
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      // Send ping to all clients
      this.broadcastToAll({
        type: "ping",
        data: { timestamp: Date.now() },
      });

      // Clean up stale connections
      this.cleanupStaleConnections();
    }, this.heartbeatInterval);

    log.info("Heartbeat started", { interval: this.heartbeatInterval });
  }
}

// Singleton instance
export const sseManager = new SSEManager();
