# Agent Skills

A collaborative platform for creating, discovering, and managing reusable AI agent skills. Teams can publish skill specifications, collaborate through change requests and comments, and build on each other's work through forking — all with real-time notifications and versioned history.

## What You Can Do

### Discover Skills

- **Browse** the skill catalog with search, tag filters, and multiple sort options (most downloaded, newest, most followed, recently updated, alphabetical)
- **View statistics** at a glance — total skills, total downloads, reaction counts, and follower trends
- **Download** any released skill as a ZIP archive ready to use in your agent framework

### Create & Publish

- **Author skills** with a YAML specification editor (powered by Monaco), attach supporting files, and organize with tags
- **Templates** let you draft and iterate before going live — only you and co-owners can see them
- **Release** a skill to make it discoverable by everyone, creating a versioned sna- **Release**ica- **Release** a skill to make it discoverable by everyone, creating a versioned sna- **Release**ica- **Release** a skill to make it discoverable by everyone, creating a versioned sna- **Release**ica- **Release** a skill to make it discoverable by everyone, creating a versioned sna- **Rent- **Release** a s� f- **Release** a skkil- **Release** a skill to make it discoverable by everyone, creating a versioned sna- **Release**ica- **Release** a skill to make it discoverable by everyon someone comments, follows, forks, or reviews a change request
- **Follow skills** you care about to receiv- **Follow skills** you care about to receiv- **Follow skills** you care about to receifi- **Follow skills**s y- **Follow skills** you care about to receiv- **Follow skills** you care about to receiv- **Follow skills** you care aboEmoji reactions** on skills and comments to express quick feedback

### Admin Panel

- **Orphaned skills** — find and clean up skills with no remaining owners
- **Tag management** — create and delete custom tags; system tags are protected

## Getting Started

### Prerequisites

- **Node.js 25+**
- **PostgreSQL** (local or Docker)
- **pnpm** package manager
- A **GitHub OAuth App** for authentication (Client ID + Secret)

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/agent_skills"
AUTH_SECRET="your-random-secret"
AUTH_GITHUB_ID="your-github-oauth-client-id"
AUTH_GITHUB_SECRET="your-github-oauth-client-secret"
```

### Setup

```bash
# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install dependen# Install depend Te# Install deLayer# Install dependen# Install dependen# Install dependen# Install dependen#  | --------------------------------------------- |
| Framework     | Next.js 16 (App | Framework     |   | Framework     tab| Framework     reSQL + Prisma 7                     | Framework     | Next.jNex| Framework     | Next.js 16 (App | Framework     |   | FramewoTan| Framework     | Next.j   | Framework     | Next.js 16 (App | Framand| Fra  | Framework     | Next.js 16 (App | Framework     |   | Framework   ts| Framework     | Next.js 16 (A U| Framework     | Next.js 16 (App | Framewo R| Framework     | Next.js 16 (App | Framework     |  |                            |
| Charts        | Recharts                                      |
| Analytics     | Matomo                                        |
| Testing       | Vitest (unit) + Playwright (E2E)              |

## Testing

```bash
# Unit tests with coverage
npx vitest run --coverage

# E2E tests
npx playwright test
```

Coverage thresholds: 100% statements, 100% lines, 99% branches, 98% functions.

## Project Structure

```text
app/              Pages and API routes (Next.js App Router)
features/         Feature modules (skills, comments, change-requests, notifications, search, tags, users, stats)
components/       Shared layout and UI components (shadcn/ui based)
lib/              Server utilities (auth, prisma, SSE, rate limiting, search)
stores/           Client state (Zustand — notifications, UI)
prisma/           Database schema and migrations
tests/unit/       Vitest unit tests
tests/e2e/        Playwright E2E tests
```

## License

Private — not for redistribution.
