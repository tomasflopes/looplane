import type { Database } from "@/lib/ports";

import { prisma } from "./client";
import { buildRepositories } from "./repositories";

/**
 * PostgreSQL through Prisma. This folder is the only place allowed to import
 * `@prisma/client` (enforced by ESLint).
 */
export function createPrismaDatabase(): Database {
  return {
    ...buildRepositories(prisma),
    transaction: (work, options) =>
      prisma.$transaction(async (tx) => {
        // Postgres advisory lock, released automatically at commit/rollback.
        // `$executeRaw`, not `$queryRaw`: the function returns void, which
        // Prisma cannot deserialize.
        if (options?.serializeOn)
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${options.serializeOn}))`;
        return work(buildRepositories(tx));
      }),
    ping: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
    disconnect: () => prisma.$disconnect(),
  };
}
