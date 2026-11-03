import { createPrismaDatabase } from "@/lib/adapters/prisma";
import type { Database } from "@/lib/ports";

/**
 * The single place the persistence implementation is chosen.
 *
 * To switch databases or drivers: implement `Database` (lib/ports) in a new
 * folder under lib/adapters, then change the one line below. Everything else
 * in the application, including every test that goes through `database`,
 * keeps working unchanged.
 */
const globalForDatabase = globalThis as unknown as { database?: Database };

export const database: Database =
  globalForDatabase.database ?? createPrismaDatabase();
if (process.env.NODE_ENV !== "production")
  globalForDatabase.database = database;
