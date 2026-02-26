// app/api/v1/sse/stats/route.ts

import { createSSEStream } from "@/lib/sse";

export async function GET() {
  const { stream } = createSSEStream("global_stats");

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
