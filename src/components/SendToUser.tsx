type Props = {
  users: string[];
  targetUser: string;
  setTargetUser: (v: string) => void;
  customMessage: string;
  setCustomMessage: (v: string) => void;
  sendToUser: () => void;
};

export default function SendToUser({
  users,
  targetUser,
  setTargetUser,
  customMessage,
  setCustomMessage,
  sendToUser,
}: Props) {
  return (
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
  );
}
