-- Seed built-in system tags (idempotent: skips existing names)
INSERT INTO "Tag" (id, name, "isSystem", "createdAt") VALUES
  (gen_random_uuid(), 'ai', true, NOW()),
  (gen_random_uuid(), 'devops', true, NOW()),
  (gen_random_uuid(), 'frontend', true, NOW()),
  (gen_random_uuid(), 'backend', true, NOW()),
  (gen_random_uuid(), 'security', true, NOW()),
  (gen_random_uuid(), 'testing', true, NOW()),
  (gen_random_uuid(), 'database', true, NOW()),
  (gen_random_uuid(), 'cloud', true, NOW()),
  (gen_random_uuid(), 'mobile', true, NOW()),
  (gen_random_uuid(), 'data-science', true, NOW()),
  (gen_random_uuid(), 'java', true, NOW()),
  (gen_random_uuid(), '.net', true, NOW()),
  (gen_random_uuid(), 'nodejs', true, NOW()),
  (gen_random_uuid(), 'web-development', true, NOW()),
  (gen_random_uuid(), 'documentation', true, NOW()),
  (gen_random_uuid(), 'python', true, NOW()),
  (gen_random_uuid(), 'go', true, NOW()),
  (gen_random_uuid(), 'rust', true, NOW())
ON CONFLICT (name) DO UPDATE SET "isSystem" = true;
