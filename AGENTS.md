# Agent Instructions

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
