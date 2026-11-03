import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/adapters/prisma/client";

// Adapter-specific on purpose: this checks the Postgres schema, not a port.
const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("row level security", () => {
  it("is enabled on every table, so Supabase's public REST API exposes nothing", async () => {
    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = current_schema() AND NOT rowsecurity`;
    expect(rows.map((r) => r.tablename)).toEqual([]);
  });
});
