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
  requireAuth: vi.fn().mockResolvedValue({ user: { id: "u1" } }),
}));



import { POST } from "@/app/api/v1/upload/route";
import { checkLimit, requireAuth } from "@/lib/api-helpers";

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
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(null as never);
    const req = new NextRequest("http://localhost/api/v1/upload", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
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

  it("should warn about non-standard directories", async () => {
    const zipBuffer = await createZipBuffer({
      "SKILL.md": makeSkillMd("my-skill", "test"),
      "baddir/file.txt": "content",
    });
    const req = makeMultipartRequest(zipBuffer);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.warnings).toBeDefined();
    expect(json.warnings[0]).toContain("Non-standard directory");
  });

  it("should reject when form field is string not file", async () => {
    const boundary = "----TestBoundary123";
    const bodyParts = [
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="file"\r\n\r\n`,
      `just a string value`,
      `\r\n--${boundary}--\r\n`,
    ];
    const body = Buffer.from(bodyParts.join(""));

    const req = new NextRequest("http://localhost/api/v1/upload", {
      method: "POST",
      body,
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("No file");
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

  it("should reject oversized zip files with 413", async () => {
    const zipBuffer = await createZipBuffer({
      "SKILL.md": makeSkillMd("my-skill", "test"),
    });
    const req = makeMultipartRequest(zipBuffer);

    // Mock formData to return a file-like object with size exceeding MAX_BYTES
    const mockFile = {
      size: 10 * 1024 * 1024 + 1,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    };
    vi.spyOn(req, "formData").mockResolvedValue({
      get: () => mockFile,
    } as unknown as FormData);

    const res = await POST(req);
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toContain("10 MB limit");
  });

  it("should return 500 on unexpected errors", async () => {
    const zipBuffer = await createZipBuffer({
      "SKILL.md": makeSkillMd("my-skill", "test"),
    });
    const req = makeMultipartRequest(zipBuffer);
    vi.spyOn(req, "formData").mockRejectedValue(new Error("unexpected"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Internal Server Error");
  });

  it("should reject empty zip archive", async () => {
    // Create a zip with only directory entries, no files
    const zip = new JSZip();
    zip.folder("empty-dir");
    const buffer = Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
    const req = makeMultipartRequest(buffer);
    const res = await POST(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.details).toContain("empty");
  });

  it("should filter out macOS resource fork and system files", async () => {
    const zip = new JSZip();
    zip.file("SKILL.md", makeSkillMd("my-skill", "A valid skill", "# Body"));
    zip.file("__MACOSX/._SKILL.md", "resource fork");
    zip.file("._hidden", "resource fork");
    zip.file(".DS_Store", "binary junk");
    zip.file("Thumbs.db", "binary junk");
    zip.file("desktop.ini", "config");
    const buffer = Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
    const req = makeMultipartRequest(buffer);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("my-skill");
  });

  it("should handle SKILL.md with no body content", async () => {
    // No body after frontmatter — body is falsy
    const zipBuffer = await createZipBuffer({
      "SKILL.md": "---\nname: my-skill\ndescription: A skill\n---\n",
    });
    const req = makeMultipartRequest(zipBuffer);
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.name).toBe("my-skill");
    expect(json.data.body).toBeUndefined();
  });

  it("should reject zip with unparseable YAML in frontmatter", async () => {
    const zipBuffer = await createZipBuffer({
      "SKILL.md": "---\ninvalid: yaml: content: [broken\n---\n",
    });
    const req = makeMultipartRequest(zipBuffer);
    const res = await POST(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.details).toContain("Invalid YAML");
  });

  it("should handle entries spanning multiple root dirs", async () => {
    const zip = new JSZip();
    zip.file("dir1/SKILL.md", makeSkillMd("my-skill", "A skill", "# Body"));
    zip.file("dir2/other.txt", "content");
    const buffer = Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
    const req = makeMultipartRequest(buffer);
    const res = await POST(req);
    // detectRootPrefix returns "" since entries span multiple root dirs
    // find looks for "SKILL.md" but entries are "dir1/SKILL.md" and "dir2/other.txt"
    expect(res.status).toBe(422);
  });

  it("should reject when content-type header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/upload", {
      method: "POST",
      body: "data",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("multipart");
  });
});
