# Server-Sent Events (SSE) Module

This module provides a complete Server-Sent Events implementation for real-time, server-to-client communication in the Nomey application.

## Features

- **Centralized SSE Manager**: Tracks active client connections and handles lifecycle management
- **Event Broadcasting**: Send events to specific users, sessions, or broadcast to all clients
- **Heartbeat System**: Automatic ping/pong to keep connections alive
- **Connection Cleanup**: Proper resource management and stale connection cleanup
- **Type Safety**: Full TypeScript support with proper event typing
- **React Hook**: Easy-to-use React hook for client-side SSE consumption
- **Test Interface**: Built-in test panel for development and debugging

## Architecture

### Core Components

1. **SSEManager** (`services/sse-manager.ts`): Low-level connection management
2. **SSEService** (`services/sse-service.ts`): High-level application interface
3. **useSSE Hook** (`hooks/useSSE.tsx`): React hook for client-side consumption
4. **SSE Helpers** (`utils/sse-helpers.ts`): Utility functions and constants

### API Endpoints

- `GET /api/sse` - Main SSE endpoint for client connections
- `POST /api/sse/test` - Send test events (development)
- `GET /api/sse/test` - Get connection statistics

## Usage

### Backend: Sending Events

```typescript
import { sseService } from "@/features/sse";

// Send notification to specific user
await sseService.notifyUser("user-123", {
  type: "order_update",
  title: "Order Status",
  message: "Your order has been shipped!",
  data: { orderId: "order-456", status: "shipped" },
});

// Broadcast announcement to all users
await sseService.broadcastAnnouncement({
  title: "System Maintenance",
  message: "Scheduled maintenance in 30 minutes",
  level: "warning",
});

// Send progress updates
await sseService.sendProgress("user-123", "video-upload", {
  percentage: 75,
  message: "Processing video...",
  completed: false,
});

// Send custom events
await sseService.sendCustomEvent(
  "chat_message",
  {
    roomId: "room-123",
    message: "Hello everyone!",
    sender: "user-456",
  },
  {
    filter: (client) => client.metadata?.roomId === "room-123",
  },
);
```

### Frontend: Consuming Events

```typescript
import { useSSE } from "@/features/sse/hooks/useSSE";

function MyComponent() {
  const { isConnected, lastEvent, events } = useSSE({
    onConnect: () => console.log("SSE connected"),
    onDisconnect: () => console.log("SSE disconnected"),
  });

  // Handle specific event types
  useEffect(() => {
    if (lastEvent?.type === "notification") {
      // Show notification UI
      showNotification(lastEvent.data);
    }
  }, [lastEvent]);

  return (
    <div>
      <div>Status: {isConnected ? "Connected" : "Disconnected"}</div>
      {lastEvent && (
        <div>
          Latest: {lastEvent.type} - {JSON.stringify(lastEvent.data)}
        </div>
      )}
    </div>
  );
}
```

### Integration Examples

#### Webhook Handler

```typescript
// In a webhook handler
export async function POST(request: NextRequest) {
  const webhookData = await request.json();

  // Process webhook...

  // Notify relevant users
  await sseService.notifyUser(webhookData.userId, {
    type: "webhook_received",
    title: "Update Available",
    message: "New data received",
    data: webhookData,
  });
}
```

#### Background Job

```typescript
// In a background job processor
async function processVideoUpload(userId: string, videoId: string) {
  // Send progress updates
  await sseService.sendProgress(userId, `video-${videoId}`, {
    percentage: 25,
    message: "Uploading to storage...",
  });

  // ... processing logic ...

  await sseService.sendProgress(userId, `video-${videoId}`, {
    percentage: 100,
    message: "Upload complete!",
    completed: true,
  });
}
```

## Event Types

### Built-in Event Types

1. **notification** - User-specific notifications
2. **announcement** - System-wide announcements
3. **update** - Real-time data updates
4. **progress** - Long-running operation progress
5. **ping** - Heartbeat/keepalive messages
6. **connection** - Connection status events

### Custom Events

You can send custom events with any type name:

```typescript
await sseService.sendCustomEvent("my_custom_event", {
  customData: "value",
});
```

## Configuration

### SSE Manager Options

```typescript
const sseManager = new SSEManager({
  heartbeatInterval: 30000, // 30 seconds
  connectionTimeout: 60000, // 60 seconds
  maxConnections: 1000, // Max concurrent connections
});
```

### Client Hook Options

```typescript
const { isConnected, lastEvent } = useSSE({
  url: "/api/sse", // SSE endpoint
  reconnectInterval: 3000, // Reconnect delay
  maxReconnectAttempts: 5, // Max reconnection attempts
  onConnect: () => {}, // Connection callback
  onDisconnect: () => {}, // Disconnection callback
  onError: (error) => {}, // Error callback
});
```

## Testing

### Test Panel

Visit `/sse-test` (protected route) to access the built-in test panel with:

- Connection status monitoring
- Server statistics display
- Test event sending buttons
- Real-time event history
- Connection management controls

### Manual Testing

```bash
# Connect to SSE endpoint
curl -N -H "Accept: text/event-stream" http://localhost:3000/api/sse

# Send test notification
curl -X POST http://localhost:3000/api/sse/test \
  -H "Content-Type: application/json" \
  -d '{"type": "notification", "message": "Test message"}'
```

## Monitoring

### Connection Statistics

```typescript
const stats = sseService.getConnectionStats();
// Returns: {
//   totalConnections: number,
//   userConnections: number,
//   sessionConnections: number,
//   staleConnections: number,
//   oldestConnection: number,
//   newestConnection: number
// }
```

### Health Checks

```typescript
const connectedUsers = sseService.getConnectedUsersCount();
const isUserOnline = sseService.isUserConnected("user-123");
```

## Error Handling

The SSE system includes comprehensive error handling:

- **Connection Errors**: Automatic reconnection with exponential backoff
- **Write Errors**: Automatic client cleanup on failed writes
- **Stale Connections**: Periodic cleanup of inactive connections
- **Resource Limits**: Connection limits to prevent resource exhaustion

## Security Considerations

- **Authentication**: SSE connections respect user authentication
- **Authorization**: Events can be filtered by user permissions
- **Rate Limiting**: Built-in connection limits and cleanup
- **CORS**: Configurable CORS headers for cross-origin requests

## Performance

- **Memory Management**: Automatic cleanup of stale connections
- **Event Batching**: Efficient event broadcasting to multiple clients
- **Heartbeat Optimization**: Configurable ping intervals
- **Connection Pooling**: Efficient client connection management

## Troubleshooting

### Common Issues

1. **Connection Drops**: Check heartbeat interval and network stability
2. **Memory Leaks**: Ensure proper client cleanup on disconnect
3. **High CPU Usage**: Monitor connection count and cleanup frequency
4. **Event Loss**: Verify client reconnection logic

### Debug Logging

Enable debug logging by setting appropriate log levels in the service context.

## Future Enhancements

- **Event Persistence**: Store events for offline clients
- **Event Filtering**: Advanced client-side event filtering
- **Metrics Integration**: Prometheus/monitoring integration
- **Clustering Support**: Multi-instance SSE coordination
- **WebSocket Fallback**: Automatic fallback for unsupported browsers
