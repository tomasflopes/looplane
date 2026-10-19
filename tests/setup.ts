// Points the Prisma client at the disposable database used by the integration
// tests. Runs before any test module is imported.
if (process.env.TEST_DATABASE_URL)
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
