// src/app/api/v1/sse/notifications/route.ts

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { createSSEStream } from "@/lib/sse";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const channel = `notifications:${session.user.id}`;
  const encoder = new TextEncoder();
  const stream = createSSEStream(channel, encoder, () => {});

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
