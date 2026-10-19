# Looplane programming challenge

Looplane is a single Next.js + PostgreSQL application for students to solve short programming challenges by submitting **output text only**. It never compiles or executes student programs. Challenge definitions, generators, reference solvers, and Markdown live in the repository; PostgreSQL stores only product state and synchronized metadata.

## Setup

Use Node.js LTS and PostgreSQL 15+.

```bash
cp .env.example .env
# edit DATABASE_URL and replace every secret/password
pnpm install --frozen-lockfile
pnpm run db:deploy
pnpm run db:seed
pnpm run challenges:sync
pnpm run dev
```

`db:seed` creates the four themes and the configured admin. `challenges:sync` validates and imports the three repository-owned demo challenge metadata records. Production deployment runs `pnpm run challenges:sync` before `pnpm run build` / `pnpm run start`.

Useful commands: `pnpm run challenges:validate`, `pnpm test`, `pnpm run build`, and `pnpm run start`.

### Docker Compose

The included Compose stack runs the Next.js app and PostgreSQL together. Copy `.env.example` to `.env`, replace every placeholder (including `POSTGRES_PASSWORD`), then run:

```bash
docker compose up --build
```

The app waits for PostgreSQL, applies migrations, idempotently seeds themes/admin, synchronizes challenge metadata, and starts at `http://localhost:3000`. PostgreSQL is also available to local Prisma commands at `localhost:${POSTGRES_PORT:-5432}`. Data survives container recreation in the named `postgres_data` volume. Stop it with `docker compose down`; append `-v` only when you explicitly want to remove all local database data.

`APP_PORT` changes the published port of the app (default `3000`).

## Required configuration

`DATABASE_URL`, `SESSION_SECRET`, and `CHALLENGE_SERVER_SECRET` are required by the server. The last two must be distinct, long random values. `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are required for the seed command; the admin password is bcrypt-hashed. No server variable has a `NEXT_PUBLIC_` prefix.

## Authentication and student provisioning

The seeded administrator signs in from `/login` using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

### Issuing invite codes

There are two ways. The API is the canonical one; the script is the convenient one for a whole class.

**From the command line** (no admin session needed, works against a local or a containerised database):

```bash
# one student
pnpm run invite -- --name "Alice Smith" --email alice@example.com

# a whole class, from a CSV with "name" and "email" columns
pnpm run invite -- --csv students.csv

# with an expiry date
pnpm run invite -- --csv students.csv --expires 2026-12-31T23:59:59Z
```

The codes are printed once as CSV on stdout and never stored: only their SHA-256 hash reaches the database. An existing student gets a fresh code rather than an error.

**Through the API** (requires an administrator session):

```bash
curl -X POST http://localhost:3000/api/admin/students \
  -H 'Content-Type: application/json' \
  -H 'Cookie: challenge_session=YOUR_ADMIN_SESSION' \
  -d '{"name":"Alice","email":"alice@example.com"}'
```

It returns the plaintext invite exactly once, alongside the student record.

### Redeeming an invite

A student enters the code at `/login`. Activation atomically consumes the invite and creates a 14-day opaque, database-backed, HttpOnly, SameSite=Lax session (Secure in production). Since the invite is single-use and deliberately not a password, expired sessions require an administrator-issued replacement invite.

## Teacher tools

Administrators get an **Admin** link in the navigation and three screens under `/admin`:

- **Students** - add one student at a time. The invite code is generated and shown once with a copy button. The list shows each student's class, whether their invite has been redeemed, when they were last seen, and how much they have solved. **New code** issues a replacement if a code is lost.
- **Classes** - create a class such as "Period 1" and move students in and out of it. Classes are optional and a student can belong to several.
- **Submissions** - one row per student per challenge showing the status (solved, in progress, not started), the number of tries, and when they first tried, last tried and solved it. Every column sorts.

Progress is scoped to the version of a challenge the student currently sees, so publishing a new version of a challenge shows that new version rather than a version that is no longer in play.

Only the `ADMIN` role can reach these screens; anyone else is redirected to their dashboard.

## Challenge authoring and publication

Create `challenges/<theme>/<sequence>-<slug>/` with `challenge.yaml`, `problem.md`, `solution.md`, `generator.ts`, and `reference-solution.ts`. The directory name, the `theme` and the `sequence` in `challenge.yaml` must agree; `pnpm run challenges:sync` refuses to publish a definition that disagrees.

```bash
pnpm run challenges:manifest   # refreshes lib/challenges/modules.ts
pnpm run challenges:validate   # checks the definitions without touching the database
pnpm run challenges:sync       # publishes them
```

`challenges:manifest` and `challenges:validate` and `challenges:sync` all regenerate `lib/challenges/modules.ts` first, so the static import list never drifts from the `challenges/` directory.

Metadata is schema-validated; generators receive the shared deterministic RNG and must not use `Math.random()`. Reference solvers return the expected output as text. Set `publishedAt` to publish at a server-UTC time.

A synchronized `(challenge id, version)` is immutable. The sync command compares the title, subtitle, difficulty, publication time and a SHA-256 fingerprint of all five source files; changing any of them requires a new `version`. Existing student progress and submissions remain attached to their original version; no historical records are migrated.

Themes must number their challenges `1..N` with no gaps: a gap would leave the challenge after it permanently locked, so the sync refuses to publish one.

## Design decisions

- Inputs are derived from `HMAC-SHA256(CHALLENGE_SERVER_SECRET, studentId:challengeId:version)` then a Mulberry32 PRNG. The seed, generator, solver, expected output, and validator are all server-only.
- Answer matching converts CRLF/CR to LF and removes final newline characters only. Attempt 3+ gets strict numeric high/low feedback; attempts 1–2 get only correct/incorrect. An answer that is numerically right but formatted differently is reported as a formatting problem rather than as "too low".
- PostgreSQL transactions plus an advisory transaction lock serialize a student's challenge submissions; accepted attempts have a five-second persisted cooldown. The transaction runs at `READ COMMITTED`: under `SERIALIZABLE` the snapshot is taken before the advisory lock is granted, so a waiting submission would read stale progress and be aborted by PostgreSQL.
- Availability is centralized in `getChallengeStatus`; publication precedes sequential progression locking. Listing pages use `getChallengeStatuses`, which resolves many challenges with a fixed number of queries.
- Markdown uses `react-markdown` with raw HTML disabled and safe URL protocols only.

## Coverage

`pnpm test` covers seeded PRNG repetition/bounds/different seeds, all three demo generator→reference-solver integrations, exact output normalization, meaningful whitespace, strict numeric parsing, high/low behavior, and challenge authoring validation.

The database integration tests need a disposable PostgreSQL database and are skipped without one:

```bash
createdb challenge_platform_test
TEST_DATABASE_URL="postgresql://user:postgres@localhost:5432/challenge_platform_test?schema=public" \
  pnpm exec prisma migrate deploy
TEST_DATABASE_URL="postgresql://user:postgres@localhost:5432/challenge_platform_test?schema=public" \
  pnpm exec vitest run tests/integration.test.ts
```

They cover the submission flow, concurrent submissions, the single-use invite race and challenge availability. Run them against a dedicated disposable PostgreSQL database in CI.
