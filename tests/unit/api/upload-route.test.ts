// tests/unit/api/upload-route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import JSZip from "jszip";

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true, retryAfter: 0 }),
}));

vi.mock("@/lib/api-helpers", () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { POST } from "@/app/api/v1/upload/route";
import { checkLimit } from "@/lib/api-helpers";

function makeSkillMd(name: string, description: string, body?: string): string {
  let content = `---\nname: ${name}\ndescription: ${description}\n---\n`;
  if (body) content += `\n${body}\n`;
  return content;
}

async function createZipBuffer(files: Record<string, string>, rootDir?: string): Promise<Buffer> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    const fullPath = rootDir ? `${rootDir}/${path}` : path;
    zip.file(fullPath, content);
  }
  return Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
}

function makeMultipartRequest(zipBuffer: Buffer, filename = "skill.zip"): NextRequest {
  const boundary = "----TestBoundary123";
  const bodyParts = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`,
    "Content-Type: application/zip\r\n\r\n",
  ];
  const header = Buffer.from(bodyParts.join(""));
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, zipBuffer, footer]);

  return new NextRequest("http://localhost/api/v1/upload", {
    method: "POST",
    body,
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
  });
}

describe("POST /api/v1/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkLimit).mockReturnValue(null);
  });

  it("should reject non-multipart requests", async () => {
    const req = new NextRequest("http://localhost/api/v1/upload", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("multipart");
  });

  it("should reject invalid zip data", async () => {
    const notZip = Buffer.from("not a zip file at all");
    const req = makeMultipartRequest(notZip);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid zip");
  });

  it("should accept a valid skill folder zip", async () => {
    const zipBuffer = await createZipBuffer({
      "SKILL.md": makeSkillMd("my-skill", "A valid skill", "# Instructions"),
    });
    const req = makeMultipartRequest(zipBuffer);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.name).toBe("my-skill");
    expect(json.data.description).toBe("A valid skill");
    expect(json.data.body).toContain("# Instructions");
  });

  it("should accept a zip with named root directory", async () => {
    const zipBuffer = await createZipBuffer(
      {
        "SKILL.md": makeSkillMd("pdf-processing", "PDF extraction tool"),
        "scripts/extract.py": "#!/usr/bin/env python3",
      },
      "pdf-processing"
    );
    const req = makeMultipartRequest(zipBuffer);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.name).toBe("pdf-processing");
    expect(json.files).toBeDefined();
    expect(json.files.find((f: { path: string }) => f.path === "scripts/extract.py")).toBeDefined();
  });

  it("should reject zip with mismatched directory name", async () => {
    const zipBuffer = await createZipBuffer(
      { "SKILL.md": makeSkillMd("my-skill", "test") },
      "wrong-name"
    );
    const req = makeMultipartRequest(zipBuffer);
    const res = await POST(req);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.details).toContain("must match skill name");
  });

  it("should reject zip missing SKILL.md", async () => {
    const zipBuffer = await createZipBuffer({ "README.md": "# Hello" });
    const req = makeMultipartRequest(zipBuffer);
    const res = await POST(req);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.details).toContain("SKILL.md");
  });

  it("should reject zip with invalid SKILL.md frontmatter", async () => {
    const zipBuffer = await createZipBuffer({
      "SKILL.md": "No frontmatter here",
    });
    const req = makeMultipartRequest(zipBuffer);
    const res = await POST(req);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.details).toContain("YAML frontmatter");
  });

  it("should reject zip with unsupported directories", async () => {
    const zipBuffer = await createZipBuffer({
      "SKILL.md": makeSkillMd("my-skill", "test"),
      "baddir/file.txt": "content",
    });
    const req = makeMultipartRequest(zipBuffer);
    const res = await POST(req);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.details).toContain("Unsupported directory");
  });

  it("should reject zip with invalid skill name in frontmatter", async () => {
    const zipBuffer = await createZipBuffer({
      "SKILL.md": makeSkillMd("Invalid-Name", "test"),
    });
    const req = makeMultipartRequest(zipBuffer);
    const res = await POST(req);

    expect(res.status).toBe(422);
  });

  it("should return 429 when rate limited", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), {
      status: 429,
    });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);

    const zipBuffer = await createZipBuffer({
      "SKILL.md": makeSkillMd("my-skill", "test"),
    });
    const req = makeMultipartRequest(zipBuffer);
    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});
