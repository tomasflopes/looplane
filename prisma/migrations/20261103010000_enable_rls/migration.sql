-- Supabase publishes every table in the `public` schema through its REST API,
-- readable with the public anon key unless row level security is on. This app
-- reaches the database only through Prisma, as the table owner, which bypasses
-- RLS. Enabling it with no policies therefore locks out the REST API without
-- affecting the app. It is harmless on plain PostgreSQL.
--
-- Any table added by a later migration must be covered the same way:
-- tests/rls.test.ts fails if one is missed.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = current_schema()
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', current_schema(), t.tablename);
  END LOOP;
END $$;
