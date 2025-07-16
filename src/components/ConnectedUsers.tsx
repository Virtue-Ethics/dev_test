export default function ConnectedUsers({ users }: { users: string[] }) {
  return (
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
  );
}
