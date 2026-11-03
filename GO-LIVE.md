# Go-live checklist

What the code now covers is in the README. This lists what still needs a
person. Tick each box before real students sign in.

## Blockers (do before launch)

- [ ] **Content.** 3 challenges exist (F1 x2, Mobility x1); _Cars_ and _Medicine_
      are empty "coming soon" themes, and each theme dead-ends after its last
      challenge. Decide the minimum viable catalogue and write it.
- [ ] **Hosting.** Either Vercel + Supabase (README, "Deploying on Vercel +
      Supabase"; HTTPS is automatic) or Docker with
      `docker compose --profile tls up -d --build`. Confirm sign-in sticks on
      the real domain. The Vercel path has not been exercised on real
      Vercel/Supabase yet: do a staging deploy first.
- [ ] **Real secrets.** Generate `SESSION_SECRET`, `CHALLENGE_SERVER_SECRET`,
      `POSTGRES_PASSWORD`, `ADMIN_PASSWORD` (e.g. `openssl rand -base64 32`).
      Never change `CHALLENGE_SERVER_SECRET` afterwards.
- [ ] **Backups.** On Supabase use the Pro plan's backups (free has none and
      pauses when idle). With Docker, nothing backs up the `postgres_data` volume. Schedule
      `docker compose exec -T db pg_dump -U challenge_platform challenge_platform | gzip > backup.sql.gz`
      off the machine, and do one restore test.
- [ ] **Privacy / consent.** Students are likely minors. Add a privacy notice
      and get whatever consent your school or jurisdiction requires. The
      platform stores name, email, answers and timestamps; "Delete" on the
      students screen erases a student.
- [ ] **Uptime monitor** on `GET /api/health`.
- [ ] **Run CI once** on GitHub (`.github/workflows/ci.yml`) and make it
      required for merging.

## Soon after launch

- Student self-service password change (today a reset goes through the teacher).
- Teacher bulk import in the UI (the `pnpm run invite -- --csv` CLI exists).
- Pagination/filters on Admin > Submissions. It loads every student x challenge
  row, fine for a few classes, slow beyond a few hundred students.
- Content-Security-Policy header (needs nonce support for Next inline scripts).
- Error tracking (Sentry or similar); today errors only go to container logs.
- Hints or a "give up and see the solution" path; today an unsolved challenge
  blocks the rest of its theme forever.
- Per-class views/exports for teachers.

## Known trade-offs

- Rate limiting is per email, so an attacker can lock a known email for 15
  minutes. The alternative (per IP) needs a trusted proxy header.
- A new challenge version means students re-solve it with new input; progress
  on the old version is kept but does not count toward the new one.
