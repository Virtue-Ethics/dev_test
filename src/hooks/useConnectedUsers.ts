"use client";

import { useEffect, useState } from "react";

export function useConnectedUsers(userId: string) {
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch("/api/clients");
          const data = (await res.json()) as string[];
          setUsers(data.filter((id) => !id.startsWith(userId)));
        } catch (err) {
          console.error("Failed to fetch clients:", err);
        }
      })();
    }, 3000);

    return () => clearInterval(interval);
  }, [userId]);

  return { users };
}
