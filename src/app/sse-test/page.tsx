"use client";

import { useSSEClient } from "@/hooks/useSSEClient";
import { useConnectedUsers } from "@/hooks/useConnectedUsers";
import ConnectedUsers from "@/components/ConnectedUsers";
import SendToUser from "@/components/SendToUser";
import MessageList from "@/components/MessageList";

export default function SseTestPage() {
  const {
    messages,
    clearMessages,
    sendBroadcast,
    sendToUser,
    customMessage,
    setCustomMessage,
    targetUser,
    setTargetUser,
    CLIENT_ID,
  } = useSSEClient();

  const { users } = useConnectedUsers(CLIENT_ID);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">SSE Demo</h1>

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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ConnectedUsers users={users} />
        <SendToUser
          users={users}
          targetUser={targetUser}
          setTargetUser={setTargetUser}
          customMessage={customMessage}
          setCustomMessage={setCustomMessage}
          sendToUser={sendToUser}
        />
      </div>

      <MessageList messages={messages} />
    </div>
  );
}
