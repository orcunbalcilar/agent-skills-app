// lib/skill-schema.ts
// Zod schema based on agentskills.io specification
// Supports both JSON spec and SKILL.md folder upload (zip) validation.
import { z } from "zod";
import yaml from "js-yaml";

const MAX_BYTES = 512 * 1024; // 512 KB

const nameRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const skillSpecSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(64, "Name must be at most 64 characters")
      .regex(
        nameRegex,
        "Name must be lowercase alphanumeric with hyphens, no consecutive hyphens, no leading/trailing hyphens"
      ),
    description: z
      .string()
      .min(1, "Description is required")
      .max(1024, "Description must be at most 1024 characters"),
    license: z.string().optional(),
    compatibility: z
      .string()
      .max(500, "Compatibility must be at most 500 characters")
      .optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    "allowed-tools": z.string().optional(),
    body: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const bytes = Buffer.byteLength(JSON.stringify(val), "utf8");
    if (bytes > MAX_BYTES) {
      ctx.addIssue({
        code: "custom",
        message: `Skill spec must be at most 512 KB (current: ${Math.ceil(bytes / 1024)} KB)`,
      });
    }
  });

export type SkillSpec = z.infer<typeof skillSpecSchema>;

export function validateSkillSpec(data: unknown): {
  success: boolean;
  data?: SkillSpec;
  error?: string;
} {
  const result = skillSpecSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const messages = result.error.issues.map((e: { message: string }) => e.message).join("; ");
  return { success: false, error: messages };
}

// ---------------------------------------------------------------------------
// SKILL.md frontmatter + body parsing (Agent Skills specification)
// ---------------------------------------------------------------------------

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Parse a SKILL.md file content into frontmatter fields + body.
 * Returns the parsed SkillSpec or an error string.
 */
export function parseSkillMd(content: string): {
  success: boolean;
  data?: SkillSpec;
  error?: string;
} {
  const match = FRONTMATTER_REGEX.exec(content);
  if (!match) {
    return { success: false, error: "SKILL.md must contain YAML frontmatter between --- delimiters" };
  }

  const [, frontmatterRaw, bodyRaw] = match;

  let frontmatter: Record<string, unknown>;
  try {
    frontmatter = yaml.load(frontmatterRaw) as Record<string, unknown>;
  } catch {
    return { success: false, error: "Invalid YAML in SKILL.md frontmatter" };
  }

  if (!frontmatter || typeof frontmatter !== "object") {
    return { success: false, error: "SKILL.md frontmatter must be a YAML mapping" };
  }

  // Assemble the spec from frontmatter + body
  const spec: Record<string, unknown> = { ...frontmatter };
  const body = bodyRaw.trim();
  if (body) {
    spec.body = body;
  }

  // Coerce metadata values to strings (YAML may parse numbers)
  if (spec.metadata && typeof spec.metadata === "object") {
    const md = spec.metadata as Record<string, unknown>;
    for (const key of Object.keys(md)) {
      md[key] = String(md[key]);
    }
  }

  return validateSkillSpec(spec);
}

// ---------------------------------------------------------------------------
// Zip-based skill folder validation
// ---------------------------------------------------------------------------

/** Allowed top-level directories inside a skill folder (per spec) */
const ALLOWED_DIRS = new Set(["scripts", "references", "assets"]);

export interface SkillFolderEntry {
  path: string;
  content: string;
}

function detectRootPrefix(entries: SkillFolderEntry[]): string {
  const firstPath = entries[0].path;
  const slashIdx = firstPath.indexOf("/");
  if (slashIdx === -1) return ""; // No directory prefix
  const topLevel = firstPath.substring(0, slashIdx);
  const allUnderOneDir = entries.every((e) => e.path.startsWith(topLevel + "/"));
  return allUnderOneDir ? topLevel + "/" : "";
}

function checkDirectories(relativePaths: string[]): string[] {
  const warned = new Set<string>();
  const warnings: string[] = [];
  for (const rp of relativePaths) {
    if (rp === "SKILL.md") continue;
    const parts = rp.split("/");
    if (parts.length > 1 && !ALLOWED_DIRS.has(parts[0]) && !warned.has(parts[0])) {
      warned.add(parts[0]);
      warnings.push(`Non-standard directory "${parts[0]}". Allowed by spec: scripts/, references/, assets/`);
    }
  }
  return warnings;
}

/**
 * Validate a skill folder's file listing extracted from a zip.
 * `entries` should contain { path, content } pairs with paths relative to
 * the zip root. The function finds the SKILL.md, validates its content,
 * and ensures the directory name matches the skill name.
 */
export function validateSkillFolder(entries: SkillFolderEntry[]): {
  success: boolean;
  data?: SkillSpec;
  files?: SkillFolderEntry[];
  warnings?: string[];
  error?: string;
} {
  if (entries.length === 0) {
    return { success: false, error: "Zip archive is empty" };
  }

  const rootPrefix = detectRootPrefix(entries);

  // Find SKILL.md
  const skillMdEntry = entries.find(
    (e) => e.path === rootPrefix + "SKILL.md" || e.path === "SKILL.md"
  );
  if (!skillMdEntry) {
    return { success: false, error: "Zip must contain a SKILL.md file at the skill root" };
  }

  // Parse and validate SKILL.md content
  const parseResult = parseSkillMd(skillMdEntry.content);
  if (!parseResult.success || !parseResult.data) {
    return { success: false, error: parseResult.error };
  }

  // If the files are inside a named directory, the directory name must match the skill name
  if (rootPrefix) {
    const dirName = rootPrefix.replace(/\/$/, "");
    if (dirName !== parseResult.data.name) {
      return {
        success: false,
        error: `Directory name "${dirName}" must match skill name "${parseResult.data.name}"`,
      };
    }
  }

  // Check for non-standard directories (warn but allow)
  const relativePaths = entries.map((e) =>
    rootPrefix ? e.path.slice(rootPrefix.length) : e.path
  );
  const warnings = checkDirectories(relativePaths);

  // Normalize entries to be relative to skill root
  const normalizedEntries = entries.map((e) => ({
    path: rootPrefix ? e.path.slice(rootPrefix.length) : e.path,
    content: e.content,
  }));

  return {
    success: true,
    data: parseResult.data,
    files: normalizedEntries,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
