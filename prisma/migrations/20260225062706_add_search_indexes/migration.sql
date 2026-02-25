-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for trigram search on skill name
CREATE INDEX IF NOT EXISTS idx_skill_name_trgm ON "Skill" USING GIN (name gin_trgm_ops);

-- GIN index for trigram search on skill description
CREATE INDEX IF NOT EXISTS idx_skill_desc_trgm ON "Skill" USING GIN (description gin_trgm_ops);

-- GIN index for full-text search on skill name + description
CREATE INDEX IF NOT EXISTS idx_skill_fts ON "Skill" USING GIN (
  to_tsvector('english', name || ' ' || description)
);
