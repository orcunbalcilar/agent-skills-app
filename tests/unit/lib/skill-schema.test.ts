// tests/unit/lib/skill-schema.test.ts
import { describe, it, expect } from "vitest";
import { skillSpecSchema, validateSkillSpec } from "@/lib/skill-schema";

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
});

describe("validateSkillSpec", () => {
  it("should return success for valid spec", () => {
    const result = validateSkillSpec({
      name: "valid-skill",
      description: "A valid skill",
    });
    expect(result.success).toBe(true);
  });

  it("should return errors for invalid spec", () => {
    const result = validateSkillSpec({
      name: "",
      description: "",
    });
    expect(result.success).toBe(false);
  });
});
