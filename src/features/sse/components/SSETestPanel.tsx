"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { useSSE } from "../hooks/useSSE";

interface SSEStats {
  totalConnections: number;
  connectedUsers: number;
  userConnections: number;
  sessionConnections: number;
  staleConnections: number;
  isHealthy: boolean;
}

const SSETestPanel = () => {
  const {
    isConnected,
    lastEvent,
    events,
    connectionAttempts,
    connect,
    disconnect,
    clearEvents,
  } = useSSE();
  const [stats, setStats] = useState<SSEStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendTestEvent = async (
    type: string,
    message?: string,
    data?: unknown,
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message, data }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: unknown = await response.json();
      console.log("Test event sent:", result);
    } catch (error) {
      console.error("Error sending test event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/sse/test");
      if (response.ok) {
        const json: unknown = await response.json();
        // Basic runtime check to ensure json matches SSEStats shape
        if (
          typeof json === "object" &&
          json !== null &&
          typeof (json as SSEStats).totalConnections === "number" &&
          typeof (json as SSEStats).connectedUsers === "number" &&
          typeof (json as SSEStats).userConnections === "number" &&
          typeof (json as SSEStats).sessionConnections === "number" &&
          typeof (json as SSEStats).staleConnections === "number" &&
          typeof (json as SSEStats).isHealthy === "boolean"
        ) {
          setStats(json as SSEStats);
        } else {
          console.error("Fetched stats do not match SSEStats type", json);
        }
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 rounded-lg bg-white p-6 shadow-lg">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">SSE Test Panel</h2>
        <p className="text-gray-600">Test Server-Sent Events functionality</p>
      </div>

      {/* Connection Status */}
      <div className="rounded-lg bg-gray-50 p-4">
        <h3 className="mb-2 font-semibold text-gray-800">Connection Status</h3>
        <div className="flex items-center gap-4">
          <div
            className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className={isConnected ? "text-green-700" : "text-red-700"}>
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          {connectionAttempts > 0 && (
            <span className="text-orange-600">
              (Attempts: {connectionAttempts})
            </span>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            onClick={() => {
              console.log("[SSE] Test Panel Connecting...");
              connect();
            }}
            disabled={isConnected}
            size="sm"
            variant="default"
          >
            Connect
          </Button>
          <Button
            onClick={disconnect}
            disabled={!isConnected}
            size="sm"
            variant="destructive"
          >
            Disconnect
          </Button>
          <Button onClick={fetchStats} size="sm" variant="secondary">
            Refresh Stats
          </Button>
        </div>
      </div>

      {/* Server Stats */}
      {stats && (
        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-gray-800">
            Server Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div>
              <span className="text-gray-600">Total Connections:</span>
              <span className="ml-2 font-medium text-gray-600">
                {stats.totalConnections}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Connected Users:</span>
              <span className="ml-2 font-medium text-gray-600">
                {stats.connectedUsers}
              </span>
            </div>
            <div>
              <span className="text-gray-600">User Connections:</span>
              <span className="ml-2 font-medium text-gray-600">
                {stats.userConnections}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Session Connections:</span>
              <span className="ml-2 font-medium text-gray-600">
                {stats.sessionConnections}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Stale Connections:</span>
              <span className="ml-2 font-medium text-gray-600">
                {stats.staleConnections}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Health Status:</span>
              <span
                className={`ml-2 font-medium ${stats.isHealthy ? "text-green-600" : "text-red-600"}`}
              >
                {stats.isHealthy ? "Healthy" : "Unhealthy"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Test Controls */}
      <div className="rounded-lg bg-gray-50 p-4">
        <h3 className="mb-3 font-semibold text-gray-800">Send Test Events</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <Button
            onClick={() =>
              sendTestEvent("notification", "Test notification message")
            }
            disabled={isLoading || !isConnected}
            size="sm"
          >
            Notification
          </Button>
          <Button
            onClick={() =>
              sendTestEvent("announcement", "Important announcement")
            }
            disabled={isLoading || !isConnected}
            size="sm"
          >
            Announcement
          </Button>
          <Button
            onClick={() =>
              sendTestEvent("update", "Data updated", { version: "1.2.3" })
            }
            disabled={isLoading || !isConnected}
            size="sm"
          >
            Update
          </Button>
          <Button
            onClick={() =>
              sendTestEvent("progress", "Processing...", { percentage: 75 })
            }
            disabled={isLoading || !isConnected}
            size="sm"
          >
            Progress
          </Button>
          <Button
            onClick={() =>
              sendTestEvent("custom", "Custom event data", { custom: true })
            }
            disabled={isLoading || !isConnected}
            size="sm"
          >
            Custom
          </Button>
          <Button onClick={clearEvents} variant="destructive" size="sm">
            Clear Events
          </Button>
        </div>
      </div>

      {/* Latest Event */}
      {lastEvent && (
        <div className="rounded-lg bg-green-50 p-4">
          <h3 className="mb-2 font-semibold text-gray-800">Latest Event</h3>
          <div className="rounded border bg-white p-3">
            <div className="mb-1 text-sm text-gray-600">
              Type:{" "}
              <span className="font-medium text-blue-600">
                {lastEvent.type}
              </span>
              {lastEvent.id && (
                <span className="ml-4">
                  ID: <span className="font-mono text-xs">{lastEvent.id}</span>
                </span>
              )}
            </div>
            <pre className="overflow-x-auto rounded bg-gray-400 p-2 text-xs">
              {JSON.stringify(lastEvent.data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Event History */}
      <div className="rounded-lg bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            Event History ({events.length})
          </h3>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">No events received yet</p>
          ) : (
            events
              .slice()
              .reverse()
              .map((event, index) => (
                <div
                  key={index}
                  className="rounded border bg-white p-2 text-xs"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-blue-600">
                      {event.type}
                    </span>
                    {event.id && (
                      <span className="font-mono text-gray-500">
                        {event.id}
                      </span>
                    )}
                  </div>
                  <pre className="overflow-x-auto text-gray-700">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SSETestPanel;
