// src/app/api/v1/sse/stats/route.ts

import { NextRequest } from "next/server";
import { createSSEStream } from "@/lib/sse";

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = createSSEStream("global_stats", encoder, () => {});

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
