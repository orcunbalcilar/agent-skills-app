// src/lib/skill-schema.ts
// Zod schema based on agentskills.io specification
// Fields: name (1-64 chars, lowercase alphanumeric+hyphens), description (1-1024 chars),
//         license (optional), compatibility (optional, max 500 chars),
//         metadata (optional key-value map), allowed-tools (optional),
//         body (markdown content)
import { z } from "zod";

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
