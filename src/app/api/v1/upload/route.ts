// src/app/api/v1/upload/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { checkLimit, getIp } from "@/lib/api-helpers";
import { validateSkillSpec } from "@/lib/skill-schema";

const MAX_BYTES = 512 * 1024;

export async function POST(req: NextRequest) {
  const limit = checkLimit(`POST /api/v1/upload ${getIp(req)}`);
  if (limit) return limit;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let rawSpec: unknown;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }
      const text = await (file as Blob).text();
      rawSpec = JSON.parse(text) as unknown;
    } else {
      rawSpec = await req.json() as unknown;
    }

    const byteSize = Buffer.byteLength(JSON.stringify(rawSpec), "utf8");
    if (byteSize > MAX_BYTES) {
      return NextResponse.json(
        { error: `Payload exceeds 512 KB (got ${byteSize} bytes)` },
        { status: 413 }
      );
    }

    const result = validateSkillSpec(rawSpec);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid skill spec", details: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
