"use client";
import { useEffect, useState } from "react";

type MessageItem = {
  text: string;
  time: string;
};

const USER_ID = "demoUser";
const TAB_ID = typeof window !== "undefined" ? crypto.randomUUID() : "server";
const CLIENT_ID = `${USER_ID}::${TAB_ID}`;

export default function SseTestPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [targetUser, setTargetUser] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  // Connect to SSE
  useEffect(() => {
    const evtSource = new EventSource(`/api/sse?id=${CLIENT_ID}`);

    evtSource.onmessage = (e: MessageEvent<string>) => {
      const formatted = JSON.parse(e.data) as { text: string };
      const newMessage: MessageItem = {
        text: formatted?.text,
        time: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, newMessage]);
    };

    evtSource.addEventListener("ping", () => {
      console.log("heartbeat");
    });

    evtSource.onerror = (e) => {
      console.error("SSE error:", e);
    };

    return () => evtSource.close();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch("/api/clients");
          const data = (await res.json()) as string[];
          setUsers(data.filter((id) => !id.startsWith(CLIENT_ID)));
        } catch (err) {
          console.error("Failed to fetch clients:", err);
        }
      })();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const sendBroadcast = async () => {
    await fetch("/api/sse-test", { method: "POST" });
  };

  const sendToUser = async () => {
    if (!targetUser || !customMessage) return;

    await fetch("/api/sse-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: targetUser, message: customMessage }),
    });

    setCustomMessage("");
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">SSE Demo</h1>

      {/* Broadcast + Clear */}
      <div className="mb-6 flex flex-wrap gap-4">
        <button
          onClick={sendBroadcast}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Broadcast Message
        </button>
        <button
          onClick={clearMessages}
          className="rounded bg-gray-600 px-4 py-2 text-white"
        >
          Clear Messages
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Connected Users */}
        <div className="rounded border bg-white p-4 shadow">
          <h2 className="mb-2 text-lg font-semibold">Active Users</h2>
          {users.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No connected users.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4">
              {users.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Send to Specific User */}
        <div className="rounded border bg-white p-4 shadow">
          <h2 className="mb-2 text-lg font-semibold">Send to Specific User</h2>
          <select
            className="mb-2 w-full rounded border p-2"
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
          >
            <option value="">Select User</option>
            {users.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <input
            className="mb-2 w-full rounded border p-2"
            placeholder="Enter message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
          />
          <button
            onClick={sendToUser}
            className="w-full rounded bg-green-600 px-4 py-2 text-white"
          >
            Send
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">Received Messages:</h2>
        <ul className="space-y-2">
          {messages.map((msg, idx) => (
            <li key={idx} className="rounded bg-gray-100 p-2 shadow-sm">
              <div className="text-sm text-gray-500">{msg.time}</div>
              <div className="text-base">{msg.text}</div>
            </li>
          ))}
          {messages.length === 0 && (
            <li className="text-gray-400 italic">No messages yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
