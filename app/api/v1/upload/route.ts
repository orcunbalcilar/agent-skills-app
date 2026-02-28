// app/api/v1/upload/route.ts

import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";
import { validateSkillFolder, type SkillFolderEntry } from "@/lib/skill-schema";
import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB max zip size

function fail(details: string, status = 422) {
  return NextResponse.json(
    { error: "Invalid skill folder", details },
    { status },
  );
}

export async function POST(req: NextRequest) {
  const limit = checkLimit(`POST /api/v1/upload ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data with a zip file" },
        { status: 400 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const blob = file as Blob;
    if (blob.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Zip exceeds 10 MB limit (got ${blob.size} bytes)` },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch {
      return NextResponse.json({ error: "Invalid zip file" }, { status: 400 });
    }

    const entries: SkillFolderEntry[] = [];
    const fileNames = Object.keys(zip.files).filter(
      (name) =>
        !zip.files[name].dir &&
        !name.startsWith("__MACOSX/") &&
        !name
          .split("/")
          .some(
            (seg) =>
              seg.startsWith("._") ||
              seg === ".DS_Store" ||
              seg === "Thumbs.db" ||
              seg === "desktop.ini",
          ),
    );
    for (const name of fileNames) {
      const content = await zip.files[name].async("string");
      entries.push({ path: name, content });
    }

    const result = validateSkillFolder(entries);
    if (!result.success) return fail(result.error!);

    return NextResponse.json({
      data: result.data,
      files: result.files,
      ...(result.warnings?.length ? { warnings: result.warnings } : {}),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
