// app/api/v1/sse/skills/[id]/followers/route.ts

import { createSSEStream } from '@/lib/sse';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const { stream } = createSSEStream(`skill_followers:${id}`);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
