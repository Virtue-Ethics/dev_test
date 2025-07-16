"use client";

import { useEffect, useState } from "react";

const USER_ID = "demoUser";
const TAB_ID = typeof window !== "undefined" ? crypto.randomUUID() : "server";
const CLIENT_ID = `${USER_ID}::${TAB_ID}`;

export function useSSEClient() {
  const [messages, setMessages] = useState<{ text: string; time: string }[]>(
    [],
  );
  const [customMessage, setCustomMessage] = useState("");
  const [targetUser, setTargetUser] = useState("");

  useEffect(() => {
    const evtSource = new EventSource(`/api/sse?id=${CLIENT_ID}`);

    evtSource.onmessage = (e: MessageEvent<string>) => {
      const data = JSON.parse(e.data) as { text: string };
      setMessages((prev) => [
        ...prev,
        { text: data.text, time: new Date().toLocaleTimeString() },
      ]);
    };

    evtSource.addEventListener("ping", () => console.log("💓 heartbeat"));
    evtSource.onerror = (e) => console.error("SSE error:", e);

    return () => evtSource.close();
  }, []);

  const clearMessages = () => setMessages([]);

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

  return {
    messages,
    clearMessages,
    sendBroadcast,
    sendToUser,
    customMessage,
    setCustomMessage,
    targetUser,
    setTargetUser,
    CLIENT_ID,
    USER_ID,
  };
}
