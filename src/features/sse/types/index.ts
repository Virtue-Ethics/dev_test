export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
  metadata?: Record<string, unknown>;
}

export interface SSEEvent {
  type: string;
  data: unknown;
  id?: string;
  retry?: number;
}

export interface SSEMessage {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}

export interface SSEManagerOptions {
  heartbeatInterval?: number;
  connectionTimeout?: number;
  maxConnections?: number;
}

export interface SSEBroadcastOptions {
  userId?: string;
  sessionId?: string;
  excludeClient?: string;
  filter?: (client: SSEClient) => boolean;
}

export type SSEEventHandler = (event: SSEEvent, client: SSEClient) => void;
export type SSEConnectionHandler = (client: SSEClient) => void;
export type SSEDisconnectionHandler = (
  clientId: string,
  reason?: string,
) => void;
