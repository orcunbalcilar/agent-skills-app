// tests/unit/lib/skill-schema.test.ts
import { describe, it, expect } from "vitest";
import {
  skillSpecSchema,
  validateSkillSpec,
  parseSkillMd,
  validateSkillFolder,
  type SkillFolderEntry,
} from "@/lib/skill-schema";

describe("skillSpecSchema", () => {
  it("should validate a minimal valid spec", () => {
    const result = skillSpecSchema.safeParse({
      name: "my-skill",
      description: "A test skill",
    });
    expect(result.success).toBe(true);
  });

  it("should validate a full spec", () => {
    const result = skillSpecSchema.safeParse({
      name: "my-skill",
      description: "A test skill",
      license: "MIT",
      compatibility: "vscode,cursor",
      metadata: { author: "test" },
      "allowed-tools": "read_file,write_file",
      body: "# My Skill\nInstructions here",
    });
    expect(result.success).toBe(true);
  });

  it("should reject an empty name", () => {
    const result = skillSpecSchema.safeParse({
      name: "",
      description: "test",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a name with uppercase letters", () => {
    const result = skillSpecSchema.safeParse({
      name: "MySkill",
      description: "test",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a name with consecutive hyphens", () => {
    const result = skillSpecSchema.safeParse({
      name: "my--skill",
      description: "test",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a name starting with a hyphen", () => {
    const result = skillSpecSchema.safeParse({
      name: "-my-skill",
      description: "test",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a name exceeding 64 characters", () => {
    const result = skillSpecSchema.safeParse({
      name: "a".repeat(65),
      description: "test",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a description exceeding 1024 characters", () => {
    const result = skillSpecSchema.safeParse({
      name: "my-skill",
      description: "a".repeat(1025),
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty description", () => {
    const result = skillSpecSchema.safeParse({
      name: "my-skill",
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing name", () => {
    const result = skillSpecSchema.safeParse({
      description: "test",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing description", () => {
    const result = skillSpecSchema.safeParse({
      name: "my-skill",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a spec exceeding 512 KB", () => {
    const result = skillSpecSchema.safeParse({
      name: "big-skill",
      description: "test",
      body: "x".repeat(512 * 1024),
    });
    expect(result.success).toBe(false);
  });

  it("should accept compatibility as string", () => {
    const result = skillSpecSchema.safeParse({
      name: "compat-skill",
      description: "test",
      compatibility: "vscode",
    });
    expect(result.success).toBe(true);
  });

  it("should reject compatibility exceeding 500 chars", () => {
    const result = skillSpecSchema.safeParse({
      name: "compat-skill",
      description: "test",
      compatibility: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("should reject a name ending with a hyphen", () => {
    const result = skillSpecSchema.safeParse({
      name: "my-skill-",
      description: "test",
    });
    expect(result.success).toBe(false);
  });

  it("should accept metadata as key-value strings", () => {
    const result = skillSpecSchema.safeParse({
      name: "meta-skill",
      description: "test",
      metadata: { author: "test-org", version: "1.0" },
    });
    expect(result.success).toBe(true);
  });

  it("should accept allowed-tools as string", () => {
    const result = skillSpecSchema.safeParse({
      name: "tools-skill",
      description: "test",
      "allowed-tools": "Bash(git:*) Bash(jq:*) Read",
    });
    expect(result.success).toBe(true);
  });
});

describe("validateSkillSpec", () => {
  it("should return success for valid spec", () => {
    const result = validateSkillSpec({
      name: "valid-skill",
      description: "A valid skill",
    });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.name).toBe("valid-skill");
  });

  it("should return errors for invalid spec", () => {
    const result = validateSkillSpec({
      name: "",
      description: "",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("parseSkillMd", () => {
  it("should parse a valid SKILL.md with frontmatter and body", () => {
    const content = `---
name: my-skill
description: A test skill for parsing
license: MIT
---

# My Skill

Instructions for using this skill.
`;
    const result = parseSkillMd(content);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.name).toBe("my-skill");
    expect(result.data!.description).toBe("A test skill for parsing");
    expect(result.data!.license).toBe("MIT");
    expect(result.data!.body).toContain("# My Skill");
    expect(result.data!.body).toContain("Instructions for using this skill.");
  });

  it("should parse SKILL.md without body", () => {
    const content = `---
name: no-body
description: A skill without body
---
`;
    const result = parseSkillMd(content);
    expect(result.success).toBe(true);
    expect(result.data!.name).toBe("no-body");
    expect(result.data!.body).toBeUndefined();
  });

  it("should parse SKILL.md with metadata", () => {
    const content = `---
name: meta-skill
description: A skill with metadata
metadata:
  author: example-org
  version: "1.0"
---

Some body.
`;
    const result = parseSkillMd(content);
    expect(result.success).toBe(true);
    expect(result.data!.metadata).toEqual({ author: "example-org", version: "1.0" });
  });

  it("should parse SKILL.md with allowed-tools", () => {
    const content = `---
name: tool-skill
description: A skill with tools
allowed-tools: Bash(git:*) Read
---
`;
    const result = parseSkillMd(content);
    expect(result.success).toBe(true);
    expect(result.data!["allowed-tools"]).toBe("Bash(git:*) Read");
  });

  it("should reject content without frontmatter delimiters", () => {
    const result = parseSkillMd("# Just markdown\nNo frontmatter here.");
    expect(result.success).toBe(false);
    expect(result.error).toContain("YAML frontmatter");
  });

  it("should reject frontmatter that parses to a non-object (scalar)", () => {
    const content = `---
just a plain string
---
`;
    const result = parseSkillMd(content);
    expect(result.success).toBe(false);
    expect(result.error).toContain("YAML mapping");
  });

  it("should reject frontmatter that parses to null", () => {
    const content = `---
~
---
`;
    const result = parseSkillMd(content);
    expect(result.success).toBe(false);
    expect(result.error).toContain("YAML mapping");
  });

  it("should reject frontmatter that parses to a scalar string", () => {
    const content = `---
just a bare string
---
`;
    const result = parseSkillMd(content);
    expect(result.success).toBe(false);
    expect(result.error).toContain("YAML mapping");
  });

  it("should reject invalid YAML in frontmatter", () => {
    const content = `---
name: [invalid yaml
description
---
`;
    const result = parseSkillMd(content);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid YAML");
  });

  it("should reject frontmatter with invalid name", () => {
    const content = `---
name: Invalid-Name
description: test
---
`;
    const result = parseSkillMd(content);
    expect(result.success).toBe(false);
  });

  it("should reject frontmatter with missing description", () => {
    const content = `---
name: my-skill
---
`;
    const result = parseSkillMd(content);
    expect(result.success).toBe(false);
  });

  it("should coerce metadata numeric values to strings", () => {
    const content = `---
name: coerce-skill
description: metadata coercion test
metadata:
  version: 2
  count: 42
---
`;
    const result = parseSkillMd(content);
    expect(result.success).toBe(true);
    expect(result.data!.metadata).toEqual({ version: "2", count: "42" });
  });

  it("should parse SKILL.md with compatibility field", () => {
    const content = `---
name: compat-skill
description: A skill with compatibility
compatibility: Requires git, docker, jq
---
`;
    const result = parseSkillMd(content);
    expect(result.success).toBe(true);
    expect(result.data!.compatibility).toBe("Requires git, docker, jq");
  });
});

describe("validateSkillFolder", () => {
  const makeSkillMd = (name: string, description: string, body?: string) => {
    let content = `---\nname: ${name}\ndescription: ${description}\n---\n`;
    if (body) content += `\n${body}\n`;
    return content;
  };

  it("should validate a minimal folder with just SKILL.md", () => {
    const entries: SkillFolderEntry[] = [
      { path: "SKILL.md", content: makeSkillMd("my-skill", "A test skill") },
    ];
    const result = validateSkillFolder(entries);
    expect(result.success).toBe(true);
    expect(result.data!.name).toBe("my-skill");
  });

  it("should validate a folder inside a named directory", () => {
    const entries: SkillFolderEntry[] = [
      { path: "my-skill/SKILL.md", content: makeSkillMd("my-skill", "A test skill") },
      { path: "my-skill/scripts/run.sh", content: "#!/bin/bash\necho hello" },
    ];
    const result = validateSkillFolder(entries);
    expect(result.success).toBe(true);
    expect(result.data!.name).toBe("my-skill");
    expect(result.files).toBeDefined();
    expect(result.files!.find((f) => f.path === "SKILL.md")).toBeDefined();
    expect(result.files!.find((f) => f.path === "scripts/run.sh")).toBeDefined();
  });

  it("should reject when directory name doesn't match skill name", () => {
    const entries: SkillFolderEntry[] = [
      { path: "wrong-name/SKILL.md", content: makeSkillMd("my-skill", "A test") },
      { path: "wrong-name/scripts/run.sh", content: "echo hi" },
    ];
    const result = validateSkillFolder(entries);
    expect(result.success).toBe(false);
    expect(result.error).toContain("must match skill name");
  });

  it("should reject empty entries", () => {
    const result = validateSkillFolder([]);
    expect(result.success).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("should reject when SKILL.md is missing", () => {
    const entries: SkillFolderEntry[] = [
      { path: "my-skill/README.md", content: "# Hello" },
    ];
    const result = validateSkillFolder(entries);
    expect(result.success).toBe(false);
    expect(result.error).toContain("SKILL.md");
  });

  it("should warn about non-standard directories", () => {
    const entries: SkillFolderEntry[] = [
      { path: "SKILL.md", content: makeSkillMd("my-skill", "test") },
      { path: "unsupported/file.txt", content: "nope" },
    ];
    const result = validateSkillFolder(entries);
    expect(result.success).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings![0]).toContain("Non-standard directory");
    expect(result.warnings![0]).toContain("unsupported");
  });

  it("should allow scripts/, references/, and assets/ directories", () => {
    const entries: SkillFolderEntry[] = [
      { path: "my-skill/SKILL.md", content: makeSkillMd("my-skill", "A full skill") },
      { path: "my-skill/scripts/extract.py", content: "print('hello')" },
      { path: "my-skill/references/REFERENCE.md", content: "# Reference" },
      { path: "my-skill/assets/template.json", content: "{}" },
    ];
    const result = validateSkillFolder(entries);
    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(4);
  });

  it("should allow files at root level besides SKILL.md", () => {
    const entries: SkillFolderEntry[] = [
      { path: "SKILL.md", content: makeSkillMd("my-skill", "test") },
      { path: "LICENSE.txt", content: "MIT License" },
    ];
    const result = validateSkillFolder(entries);
    expect(result.success).toBe(true);
  });

  it("should propagate SKILL.md validation errors", () => {
    const entries: SkillFolderEntry[] = [
      { path: "SKILL.md", content: "No frontmatter" },
    ];
    const result = validateSkillFolder(entries);
    expect(result.success).toBe(false);
    expect(result.error).toContain("YAML frontmatter");
  });

  it("should validate a full spec through folder validation", () => {
    const content = `---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents.
license: Apache-2.0
compatibility: Requires poppler-utils
metadata:
  author: example-org
  version: "1.0"
allowed-tools: Bash(pdftotext:*) Read
---

# PDF Processing

Step-by-step instructions for PDF processing.
`;
    const entries: SkillFolderEntry[] = [
      { path: "pdf-processing/SKILL.md", content },
      { path: "pdf-processing/scripts/extract.py", content: "#!/usr/bin/env python3" },
      { path: "pdf-processing/references/REFERENCE.md", content: "# API Reference" },
    ];
    const result = validateSkillFolder(entries);
    expect(result.success).toBe(true);
    expect(result.data!.name).toBe("pdf-processing");
    expect(result.data!.license).toBe("Apache-2.0");
    expect(result.data!.metadata).toEqual({ author: "example-org", version: "1.0" });
    expect(result.data!["allowed-tools"]).toBe("Bash(pdftotext:*) Read");
    expect(result.data!.body).toContain("# PDF Processing");
  });

  it("should handle entries in different top-level directories (no common root)", () => {
    const content = `---
name: test-skill
description: A test skill
---
`;
    const entries: SkillFolderEntry[] = [
      { path: "dir-a/SKILL.md", content },
      { path: "dir-b/other.py", content: "# code" },
    ];
    const result = validateSkillFolder(entries);
    // Should still fail because SKILL.md is not at root and no common root
    expect(result.success).toBe(false);
  });
});

