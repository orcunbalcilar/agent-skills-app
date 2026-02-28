# Agent Instructions

## Rules

- Always use official docs, use context7 tools/skills
- Always prefer the practices of any library or framework, no manual workaround just to develop or solve anything.
- Comprehensive unit and e2e test code coverage is required (100% statements/lines, 99% branches, 98% functions as enforced in vitest.config.ts). Never ever skip this crucial success factor in any work.
- Always cover all changes by tests and validate them all by running. Nothing is worse than slop code.
- Use skills in developing the features. They will give you the relevant best practices of the framework or library
- Always make detailed research on the web before taking any design or implementation decision. You can use the web to find the best practices, patterns, and solutions for the problem at hand.
- Always update the documentation and readme files to reflect the changes you made.
- Always try finishing all the work in one go. Do not leave any work half done.
- Always use Claude Opus 4.6 parallel subagents to be fast and efficient.
- Always work in parallel by using the unlimited Claude Opus 4.6 parallel subagents.
- Always be responsible for the project and its code quality. "None of these are caused by my changes." is not an acceptable answer. If you see any issues, fix them.
- Always learn from your mistakes. And update the Lessons section. This is as important as implementing the features.

## Testing Requirements

### Unit Tests

- **Coverage thresholds enforced in `vitest.config.ts`**: Statements 100%, Lines 100%, Branches 99%, Functions 98%
- **All changes must be covered by unit tests.** Run `npx vitest run --coverage` before considering any work complete.
- **60 test files, 540+ tests** across routes, hooks, components, libraries, stores, and types
- Test files live in `tests/unit/` mirroring source structure (e.g., `tests/unit/api/`, `tests/unit/hooks/`, `tests/unit/lib/`, `tests/unit/components/`, `tests/unit/stores/`)

### Unit Test Patterns

- Use `vi.hoisted()` for variables referenced inside `vi.mock()` factory functions
- Use `vi.useFakeTimers()` / `vi.useRealTimers()` for timer-dependent code (SSE heartbeats, intervals)
- Rate limit mocking: `vi.mocked(checkLimit).mockReturnValue(new Response(..., { status: 429 }) as never)` — always reset with `.mockReturnValue(null)` after
- Transaction mocking: `vi.mocked(prisma.$transaction).mockImplementation(async (cb) => cb(mockTx))`
- For optimistic update testing: set query data with `qc.setQueryData(...)` first, then trigger mutation error
- `setInterval` spy pattern: capture callback via `vi.spyOn(globalThis, 'setInterval')`, invoke manually after stream state changes
- ESM modules can't use `vi.spyOn` on exports — use `vi.mock("module", async (importOriginal) => { ... })` with `vi.fn()` wrapper instead

### Known v8 Coverage Artifacts

- SSE route files (notifications, followers, stats) report 50% funcs even though GET functions are exported, called, and 100% stmt/branch/line covered — this is a v8 provider artifact
- `notifications.ts` reports 83.33% funcs for the same reason
- `upload/route.ts` has 1 unreachable branch: `|| e.path === "SKILL.md"` in `find()` when `rootPrefix` is non-empty (structurally impossible since non-empty prefix means ALL entries share that prefix)
- `SkillForm.tsx` lines 158/176: `else if (initialData)` and `if (!initialData) return` are defensive guards structurally unreachable because edit mode always supplies `initialData`. Line 118 `json.files?.length` has a phantom branch from `?.` optional chaining.

### E2E Tests

- Playwright tests in `tests/e2e/` with chromium, firefox, admin-chromium projects
- Config in `playwright.config.ts`
- Run: `npx playwright test`

## Project Structure

- **Next.js 16** App Router with React 19
- **Vitest 4** with v8 coverage, jsdom environment
- **Playwright 1.58** for E2E
- **Prisma 7** with PostgreSQL
- **@tanstack/react-query 5** for data fetching
- **Zustand 5** for client state
- **NextAuth 5 (beta)** with JWT strategy

## Lessons

- Next.js now uses proxy instead of middleware. Middleware is deprecated.
- v8 coverage may report phantom branches for `?.()` optional chaining and `||`/`??` short-circuits that are unreachable
- `reader.cancel()` triggers the ReadableStream `cancel()` handler synchronously
- `vi.fn(originalFn)` wraps the original while allowing `mockImplementation` overrides and `mockRestore()`
- To test heartbeat/interval catch blocks: capture the callback via `setInterval` spy, cancel the stream, then invoke the captured callback manually
- Non-standard skill directories (beyond scripts/, references/, assets/) produce warnings instead of hard errors — widely used skills may have extra dirs like rules/
- Prisma seed scripts must guard against production with `NODE_ENV` check
- Use `prisma migrate deploy` (not `prisma migrate dev`) in production/CI — it applies pending migrations non-interactively
- Vercel deployments need a `vercel-build` script: `prisma generate && prisma migrate deploy && next build`
- No dotenv needed for vercel deployments. Vercel injects env vars at build/runtime; locally use `direnv` or shell exports
- Supabase PgBouncer (port 6543) hangs on `prisma migrate deploy` — use session mode (port 5432) via `DIRECT_URL` for migrations
- PATCH/PUT endpoints must mirror the same validation as their POST counterpart — missing validation on update routes is a common security gap that allows invalid data into the DB
- When adding validation to an update endpoint, mock skill objects in tests must include all fields used by validation fallbacks (e.g., `name`, `description` on the Prisma result)
- `PrismaPg` adapter with default config creates unbounded connection pools — always set `max` (e.g., `max: 10`) to prevent exceeding PostgreSQL `max_connections` (default 100), especially during parallel e2e test runs
- Seed scripts using `Promise.all` for many DB operations can exhaust connections — use sequential `for...of` loops instead
- E2e tests that create/delete data must use API `beforeAll`/`afterAll` to provision and clean up their own test data, never rely on seed data that other parallel tests might mutate
- E2e rate-limit tests need `Promise.all` for concurrent requests (serial `await` may not trigger the rate window) plus a 1.1s delay to reset the rate-limit window from prior runs
- Playwright `getByRole('button', { name: /delete/i })` strict mode fails when multiple buttons match — use `{ exact: true }` and/or `.first()` to disambiguate
- `test.describe.configure({ mode: 'serial' })` ensures `beforeAll`→test→`afterAll` ordering within a describe block when using `test.beforeAll` with shared state
