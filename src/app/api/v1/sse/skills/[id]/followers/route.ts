// src/app/api/v1/sse/skills/[id]/followers/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { createSSEStream } from "@/lib/sse";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const encoder = new TextEncoder();
  const stream = createSSEStream(`skill_followers:${id}`, encoder, () => {});

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
