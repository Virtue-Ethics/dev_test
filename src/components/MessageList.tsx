export default function MessageList({
  messages,
}: {
  messages: { text: string; time: string }[];
}) {
  return (
    <div className="mt-8">
      <h2 className="mb-2 text-lg font-semibold">Received Messages:</h2>
      <ul className="space-y-2">
        {messages.length === 0 ? (
          <li className="text-gray-400 italic">No messages yet.</li>
        ) : (
          messages.map((msg, idx) => (
            <li key={idx} className="rounded bg-gray-100 p-2 shadow-sm">
              <div className="text-sm text-gray-500">{msg.time}</div>
              <div className="text-base">{msg.text}</div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
