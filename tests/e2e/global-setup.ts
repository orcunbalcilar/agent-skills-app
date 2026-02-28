// tests/e2e/global-setup.ts
//
// Runs once before all Playwright tests.
// Resets the local database to a known state so every test run is isolated
// and deterministic — no leftover data from previous runs.

import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

export default async function globalSetup() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Truncate all data tables in one statement.
    // System tags (created by migration) are preserved via the WHERE clause below.
    await client.query(`
      TRUNCATE TABLE
        "FollowerSnapshot",
        "SkillDownloadEvent",
        "Notification",
        "CommentReaction",
        "SkillReaction",
        "Comment",
        "ChangeRequest",
        "Follower",
        "SkillTag",
        "SkillOwner",
        "SkillVersion",
        "Skill",
        "Account",
        "Session",
        "VerificationToken",
        "User"
      CASCADE
    `);

    // Remove non-system tags; system tags were seeded via migration
    await client.query(`DELETE FROM "Tag" WHERE "isSystem" = false`);
  } finally {
    await client.end();
  }

  // Re-seed the database with deterministic development data
  execSync('pnpm db:seed', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'development' },
  });
}
