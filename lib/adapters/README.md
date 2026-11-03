# Persistence adapters

The application talks to its database only through the interfaces in
`lib/ports/index.ts` (`Database` and the repositories it is made of) and the
plain types in `lib/domain/types.ts`. `lib/container.ts` is the one place that
chooses the implementation.

```
pages / actions / services  ->  database (lib/container.ts)  ->  adapter
                                      typed by lib/ports           lib/adapters/<name>
```

ESLint forbids importing `@prisma/client` or anything under `lib/adapters`
outside this folder, `lib/container.ts` and `tests/adapters`, so the boundary
cannot erode by accident.

## Writing a new adapter (another driver, ORM or database)

1. Create `lib/adapters/<name>/index.ts` exporting `create<Name>Database():
Database`.
2. Implement every repository. The contract notes at the top of
   `lib/ports/index.ts` are binding: ordering, `UniqueViolationError` on
   duplicates, cascading user deletion, and atomic `transaction`.
3. `transaction(work, { serializeOn })` must run `work` atomically and make
   transactions sharing a `serializeOn` key run one at a time. (Postgres: an
   advisory lock. Elsewhere: a row lock, a mutex, a queue.) The submission flow
   depends on this to keep a student's attempts and cooldown consistent.
4. Change the one line in `lib/container.ts` to use it.
5. Run `TEST_DATABASE_URL=... pnpm test`. `tests/integration.test.ts`,
   `tests/auth.test.ts` and `tests/admin.test.ts` only use the ports, so they are
   the contract suite your adapter must pass. Keep storage-specific checks (like
   `tests/adapters/prisma-rls.test.ts`) next to the adapter.

Schema and migrations are adapter concerns too: the Prisma adapter's live in
`prisma/`.
