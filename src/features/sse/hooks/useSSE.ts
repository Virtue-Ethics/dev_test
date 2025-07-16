"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SSEEvent } from "../types";

interface UseSSEOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseSSEReturn {
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  events: SSEEvent[];
  connectionAttempts: number;
  connect: () => void;
  disconnect: () => void;
  clearEvents: () => void;
}

/**
 * Custom hook for managing SSE connections
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    url = "/api/sse",
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  const addEvent = useCallback((event: SSEEvent) => {
    setLastEvent(event);
    setEvents((prev) => [...prev.slice(-99), event]); // Keep last 100 events
  }, []);

  const connect = useCallback(() => {
    console.log(
      "[SSE] Attempting to connect... ",
      eventSourceRef.current?.readyState,
    );
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return; // Already connected
    }

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      console.log("[SSE] Created EventSource:", eventSource);
      eventSource.onopen = () => {
        console.log("[SSE] Connected");
        setIsConnected(true);
        setConnectionAttempts(0);
        onConnect?.();
      };

      eventSource.onerror = (error) => {
        console.error("[SSE] Connection error:", error);
        setIsConnected(false);
        onError?.(error);

        // Attempt reconnection if enabled and under limit
        if (
          shouldReconnectRef.current &&
          connectionAttempts < maxReconnectAttempts
        ) {
          setConnectionAttempts((prev) => prev + 1);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldReconnectRef.current) {
              connect();
            }
          }, reconnectInterval);
        }
      };

      eventSource.onmessage = (event) => {
        try {
          let data: unknown = null;
          if (typeof event.data === "string") {
            try {
              data = JSON.parse(event.data);
            } catch (parseError) {
              console.error("[SSE] Error parsing message:", parseError);
            }
          } else {
            console.warn("[SSE] Received non-string event data:", event.data);
            data = event.data;
          }
          addEvent({
            type: "message",
            data,
            id: event.lastEventId,
          });
        } catch (error) {
          console.error("[SSE] Error parsing message:", error);
        }
      };

      // Handle specific event types
      const eventTypes = [
        "notification",
        "announcement",
        "update",
        "progress",
        "ping",
        "connection",
      ];

      eventTypes.forEach((eventType) => {
        eventSource.addEventListener(eventType, (event) => {
          try {
            let data: unknown = null;
            if (typeof event.data === "string") {
              try {
                data = JSON.parse(event.data);
              } catch (parseError) {
                console.error(
                  `[SSE] Error parsing ${eventType} event:`,
                  parseError,
                );
              }
            } else {
              console.warn(
                `[SSE] Received non-string ${eventType} event data:`,
                event.data,
              );
              data = event.data;
            }
            addEvent({
              type: eventType,
              data,
              id: event.lastEventId,
            });
          } catch (error) {
            console.error(`[SSE] Error parsing ${eventType} event:`, error);
          }
        });
      });
    } catch (error) {
      console.error("[SSE] Error creating EventSource:", error);
      setIsConnected(false);
    }
  }, [
    url,
    connectionAttempts,
    maxReconnectAttempts,
    reconnectInterval,
    onConnect,
    onError,
    addEvent,
  ]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    onDisconnect?.();
  }, [onDisconnect]);

  // Auto-connect on mount
  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    lastEvent,
    events,
    connectionAttempts,
    connect,
    disconnect,
    clearEvents,
  };
}
