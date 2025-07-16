type Client = {
  id?: string;
  write: (data: string) => void;
  end: () => void;
};

class SSEManager {
  private clients = new Map<string, Client>();

  addClient(id: string, res: Client) {
    this.clients.set(id, res);
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  sendToClient(id: string, event: string, data: Record<string, string>) {
    const res = this.clients.get(id);
    if (res) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }

  broadcast(event: string, data: Record<string, string>) {
    for (const res of this.clients.values()) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }

  heartbeat() {
    for (const res of this.clients.values()) {
      res.write(`event: ping\ndata: {}\n\n`);
    }
  }
  getClientIds(): string[] {
    return Array.from(this.clients.keys());
  }
}

export const sseManager = new SSEManager();
