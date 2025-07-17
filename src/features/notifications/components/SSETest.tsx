"use client";

import { useSession } from "@/features/auth/client";
import { api } from "@/trpc/react";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge"; // Assuming a Badge component exists

type ConnectionStatus = "connecting" | "connected" | "disconnected";
interface ConnectionStats {
  userIds: string[];
  totalUsers: number;
  totalConnections: number;
}

export function SSETest() {
  const session = useSession();
  const [latestMessage, setLatestMessage] = useState<string>("");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [eventHistory, setEventHistory] = useState<string[]>([]);

  const sendTestMutation = api.notifications.sendTest.useMutation();
  const broadcastTestMutation = api.notifications.broadcastTest.useMutation();

  useEffect(() => {
    if (!session?.user?.id) return;

    setConnectionStatus("connecting");
    const eventSource = new EventSource("/api/notifications/sse");

    const addLog = (log: string) => {
      setEventHistory((prev) => [
        `${new Date().toLocaleTimeString()} - ${log}`,
        ...prev,
      ]);
    };

    eventSource.addEventListener("connected", () => {
      setConnectionStatus("connected");
    });

    eventSource.addEventListener("test", (event) => {
      const data = JSON.parse(event.data as string) as { message: string };
      setLatestMessage(data.message);
    });

    eventSource.addEventListener("system-update", (event) => {
      const { log, stats } = JSON.parse(event.data as string) as {
        log: string;
        stats: ConnectionStats;
      };
      addLog(log);
      setStats(stats);
    });

    eventSource.onerror = () => {
      setConnectionStatus("disconnected");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [session?.user?.id]);

  const handleSendTest = () => {
    sendTestMutation.mutate({ message: "This is a test message." });
  };

  const handleBroadcastTest = () => {
    broadcastTestMutation.mutate({
      message: "This is a broadcast to everyone.",
    });
  };

  return (
    <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Control Panel */}
      <div className="bg-card text-card-foreground rounded-lg border p-4 md:col-span-1">
        <h2 className="text-lg font-semibold">SSE Control Panel</h2>
        <div className="mt-4 flex flex-col gap-3">
          <Button
            onClick={handleSendTest}
            disabled={connectionStatus !== "connected"}
          >
            Send Notification (to me)
          </Button>
          <Button
            variant="secondary"
            onClick={handleBroadcastTest}
            disabled={connectionStatus !== "connected"}
          >
            Send Broadcast (to all)
          </Button>
        </div>
        <p className="mt-4 font-mono text-sm">
          <span className="font-semibold">Last Event Received:</span>{" "}
          {latestMessage}
        </p>
      </div>

      {/* Stats and Logs */}
      <div className="bg-card text-card-foreground rounded-lg border p-4 md:col-span-2">
        <h2 className="text-lg font-semibold">Live Server Stats</h2>
        <div className="mt-4 flex items-center justify-between">
          <div>
            Status:{" "}
            <Badge
              variant={
                connectionStatus === "connected" ? "default" : "destructive"
              }
              className={`capitalize ${
                connectionStatus === "connected" ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {connectionStatus}
            </Badge>
          </div>
          <div>
            Connected Users:{" "}
            <Badge variant="secondary">{stats?.totalUsers ?? 0}</Badge>
          </div>
          <div>
            Total Connections:{" "}
            <Badge variant="secondary">{stats?.totalConnections ?? 0}</Badge>
          </div>
        </div>

        <h3 className="mt-6 text-base font-semibold">Event History</h3>
        <div className="bg-muted mt-2 h-48 overflow-y-auto rounded-md p-2 font-mono text-xs">
          {eventHistory.length === 0 ? (
            <p className="text-muted-foreground">Waiting for events...</p>
          ) : (
            eventHistory.map((log, i) => <p key={i}>{log}</p>)
          )}
        </div>
      </div>
    </div>
  );
}
