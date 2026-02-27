// app/api/v1/upload/route.ts

import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";
import type { SkillFolderEntry } from "@/lib/skill-schema";
import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { parseFrontmatter, validateMetadata } from "skills-ref";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB max zip size

/** Allowed top-level directories inside a skill folder (per spec) */
const ALLOWED_DIRS = new Set(["scripts", "references", "assets"]);

function detectRootPrefix(entries: SkillFolderEntry[]): string {
  const firstPath = entries[0].path;
  const slashIdx = firstPath.indexOf("/");
  if (slashIdx === -1) return "";
  const topLevel = firstPath.substring(0, slashIdx);
  const allUnderOneDir = entries.every((e) =>
    e.path.startsWith(topLevel + "/"),
  );
  return allUnderOneDir ? topLevel + "/" : "";
}

function fail(details: string, status = 422) {
  return NextResponse.json(
    { error: "Invalid skill folder", details },
    { status },
  );
}

function validateDirectories(relativePaths: string[]): string | null {
  for (const rp of relativePaths) {
    if (rp === "SKILL.md") continue;
    const parts = rp.split("/");
    if (parts.length > 1 && !ALLOWED_DIRS.has(parts[0])) {
      return `Unsupported directory "${parts[0]}". Allowed: scripts/, references/, assets/`;
    }
  }
  return null;
}

function validateSkillEntries(
  entries: SkillFolderEntry[],
):
  | { error: string }
  | { data: Record<string, unknown>; files: SkillFolderEntry[] } {
  if (entries.length === 0) return { error: "Zip archive is empty" };

  const rootPrefix = detectRootPrefix(entries);

  const skillMdEntry = entries.find(
    (e) => e.path === rootPrefix + "SKILL.md" || e.path === "SKILL.md",
  );
  if (!skillMdEntry)
    return { error: "Zip must contain a SKILL.md file at the skill root" };

  let metadata: Record<string, unknown>;
  let body: string;
  try {
    [metadata, body] = parseFrontmatter(skillMdEntry.content);
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Invalid SKILL.md frontmatter",
    };
  }

  const problems = validateMetadata(metadata);
  if (problems.length > 0) return { error: problems.join("; ") };

  if (rootPrefix) {
    const dirName = rootPrefix.replace(/\/$/, "");
    if (dirName !== metadata.name) {
      return {
        error: `Directory name "${dirName}" must match skill name "${metadata.name}"`,
      };
    }
  }

  const relativePaths = entries.map((e) =>
    rootPrefix ? e.path.slice(rootPrefix.length) : e.path,
  );
  const dirError = validateDirectories(relativePaths);
  if (dirError) return { error: dirError };

  const files = entries.map((e) => ({
    path: rootPrefix ? e.path.slice(rootPrefix.length) : e.path,
    content: e.content,
  }));
  const data = { ...metadata, ...(body ? { body } : {}) };

  return { data, files };
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

    const result = validateSkillEntries(entries);
    if ("error" in result) return fail(result.error);

    return NextResponse.json({ data: result.data, files: result.files });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
