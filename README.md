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

`db:seed` creates the four themes and the configured admin (`ADMIN_PASSWORD` must be at least 10 characters). `challenges:sync` validates and imports the three repository-owned demo challenge metadata records. Production deployment runs `pnpm run challenges:sync` before `pnpm run build` / `pnpm run start`.

Useful commands: `pnpm run challenges:validate`, `pnpm test`, `pnpm run build`, and `pnpm run start`.

### Docker Compose

The included Compose stack runs the Next.js app and PostgreSQL together. Copy `.env.example` to `.env`, replace every placeholder (including `POSTGRES_PASSWORD`), then run:

```bash
docker compose up --build
```

The app waits for PostgreSQL, applies migrations, idempotently seeds themes/admin, synchronizes challenge metadata, and starts at `http://localhost:3000`. PostgreSQL is also available to local Prisma commands at `localhost:${POSTGRES_PORT:-5432}`. Data survives container recreation in the named `postgres_data` volume. Stop it with `docker compose down`; append `-v` only when you explicitly want to remove all local database data.

`APP_PORT` changes the published port of the app (default `3000`). PostgreSQL is published on loopback only. The container runs as an unprivileged user, restarts itself, gives up with a clear error if migrations cannot apply (instead of looping forever) and exposes `GET /api/health` (a database round trip) to Docker and uptime monitors.

### HTTPS

Browsers only store the session cookie over HTTPS (it is `Secure` in production). For a public deployment put a domain in `.env` and start the bundled Caddy proxy, which obtains and renews certificates automatically:

```bash
# .env: DOMAIN=challenges.example.com  APP_BIND=127.0.0.1
docker compose --profile tls up -d --build
```

For a plain-HTTP demo on a LAN set `COOKIE_SECURE=false`, otherwise nobody can sign in.

## Deploying on Vercel + Supabase

The app runs as serverless functions on Vercel with Supabase as the database. Challenge files are bundled with the functions (`outputFileTracingIncludes`), `postinstall` generates the Prisma client, and `vercel-build` migrates, seeds and syncs challenges before building. Only **production** deploys touch the database; previews skip those steps.

1. **Supabase**: create a project. Under _Connect_ copy two connection strings (replace the password; URL-encode special characters):
   - `DATABASE_URL` = **transaction pooler** (port `6543`), with `?pgbouncer=true&connection_limit=1` appended. Used by the running app.
   - `DIRECT_URL` = **session pooler** (port `5432`, same `*.pooler.supabase.com` host). Used only by migrations. Do not use the `db.<ref>.supabase.co` host: it is IPv6-only on the free plan and Vercel builds cannot reach it.
2. **Vercel**: import the repository (it detects Next.js and pnpm). Add these environment variables for **Production only**: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `CHALLENGE_SERVER_SECRET`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Leave `COOKIE_SECURE` unset. Pick the function region closest to your Supabase region.
3. Deploy. The first production build creates the tables, the themes and the admin, and publishes the challenges. Sign in at `/login` with the admin email and password.

Notes:

- Row level security is enabled on every table (migration `enable_rls`), so Supabase's public REST API and anon key expose nothing. `tests/rls.test.ts` fails if a future migration adds a table without it.
- Each production deploy re-applies migrations, resets the admin password from `ADMIN_PASSWORD`, and refuses to publish if a released challenge version changed on disk.
- Free-tier Supabase projects pause after a week of inactivity and have no backups. For a real class use the Pro plan, or schedule your own `pg_dump`.

## Required configuration

`DATABASE_URL`, `SESSION_SECRET`, and `CHALLENGE_SERVER_SECRET` are required by the server. The last two must be distinct, long random values; the server refuses to start if they are equal, or (in production) still carry the `.env.example` placeholder. Never rotate `CHALLENGE_SERVER_SECRET` after launch: it changes every student's input. `COOKIE_SECURE` is optional (see HTTPS). `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are required for the seed command; the admin password is bcrypt-hashed. No server variable has a `NEXT_PUBLIC_` prefix.

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

### Redeeming an invite and signing in

A student enters the invite code at `/login`. Activation atomically consumes the invite, opens a 14-day session and sends them to `/set-password`, where they choose a password (10+ characters). From then on they sign in with **email + password**; no page works until a password is set.

Issuing a new invite is also the **password reset**: redeeming it clears the old password and revokes the student's other sessions, so a lost password is one click for the teacher ("New code" on the students screen).

Password sign-in is rate limited per email (8 failures per 15 minutes, stored in PostgreSQL so it survives restarts and holds across replicas). Wrong password and unknown email give the same message and cost the same time. Emails are stored lower-case.

## Teacher tools

Administrators get an **Admin** link in the navigation and three screens under `/admin`:

- **Students** - add one student at a time; **Delete** erases a student and all of their submissions and progress (for data-removal requests). The invite code is generated and shown once with a copy button. The list shows each student's class, whether their invite has been redeemed, when they were last seen, and how much they have solved. **New code** issues a replacement if a code is lost.
- **Classes** - create a class such as "Period 1" and move students in and out of it. Classes are optional and a student can belong to several.
- **Submissions** - one row per student per challenge showing the status (solved, in progress, not started), the number of tries, and when they first tried, last tried and solved it. Every column sorts.

Students see the newest version of a challenge that is already published, so scheduling a v2 for next week hides nothing today. Unlocking the next challenge needs the previous one solved in _any_ version, so publishing a new version never re-locks students who had already got past it. A page left open across a republish is told to reload instead of recording an answer against the old version.

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

## Architecture: swappable persistence

Application code never touches a database driver. It depends on the repository interfaces in `lib/ports` and the plain types in `lib/domain`, and gets its implementation from `lib/container.ts`. The only implementation today is `lib/adapters/prisma`. ESLint enforces the boundary. To change database or driver, write a new adapter and change one line; see `lib/adapters/README.md`. The submission flow's per-student serialisation is expressed as `transaction(work, { serializeOn })`, so how it is achieved (advisory lock, row lock) stays inside the adapter.

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
