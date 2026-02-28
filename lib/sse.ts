// lib/sse.ts
import { Client } from 'pg';

const notifyClient = new Client({ connectionString: process.env.DATABASE_URL });
let notifyClientConnected = false;

function sanitizeChannel(channel: string): string {
  return channel.replaceAll(/[^a-z0-9_]/gi, '_');
}

async function getNotifyClient(): Promise<Client> {
  if (!notifyClientConnected) {
    await notifyClient.connect();
    notifyClientConnected = true;
  }
  return notifyClient;
}

export async function pgNotify(channel: string, payload: string): Promise<void> {
  try {
    const client = await getNotifyClient();
    const safe = sanitizeChannel(channel);
    await client.query('SELECT pg_notify($1, $2)', [safe, payload]);
  } catch {
    // SSE notifications are best-effort
  }
}

export async function createListenClient(
  channel: string,
  onNotify: (payload: string) => void,
): Promise<() => Promise<void>> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const safe = sanitizeChannel(channel);
  await client.query(`LISTEN "${safe}"`);

  client.on('notification', (msg) => {
    if (msg.payload) {
      onNotify(msg.payload);
    }
  });

  return async () => {
    await client.query(`UNLISTEN "${safe}"`);
    await client.end();
  };
}

export function createSSEStream(
  channel: string,
  onCleanup?: () => void,
): { stream: ReadableStream; cleanup: () => Promise<void> } {
  const encoder = new TextEncoder();
  let cleanupFn: (() => Promise<void>) | null = null;
  let heartbeatId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      cleanupFn = await createListenClient(channel, (payload) => {
        try {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // Stream may be closed
        }
      });

      controller.enqueue(encoder.encode(': ping\n\n'));

      heartbeatId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          if (heartbeatId) clearInterval(heartbeatId);
        }
      }, 30_000);
    },
    cancel() {
      if (heartbeatId) clearInterval(heartbeatId);
      onCleanup?.();
      cleanupFn?.().catch(() => {});
    },
  });

  return {
    stream,
    cleanup: async () => {
      if (heartbeatId) clearInterval(heartbeatId);
      await cleanupFn?.();
    },
  };
}
