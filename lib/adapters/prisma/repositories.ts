import type { Prisma, PrismaClient } from "@prisma/client";

import type { Repositories } from "@/lib/ports";
import { UniqueViolationError } from "@/lib/ports";

/** Either the pooled client or an open transaction. */
export type Client = PrismaClient | Prisma.TransactionClient;

const newestFirst = { orderBy: { version: "desc" } } as const;
const withVersions = { versions: newestFirst } as const;

/** Translate Prisma's unique-constraint error into the port's own error. */
async function unique<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      throw new UniqueViolationError();
    throw error;
  }
}

export function buildRepositories(c: Client): Repositories {
  return {
    users: {
      findById: (id) => c.user.findUnique({ where: { id } }),
      findByEmail: (email) => c.user.findUnique({ where: { email } }),
      findFirstWithRole: (role) => c.user.findFirst({ where: { role } }),
      create: (input) =>
        unique(
          c.user.create({
            data: {
              name: input.name,
              email: input.email,
              role: input.role,
              passwordHash: input.passwordHash ?? null,
            },
          }),
        ),
      upsertByEmail: (input) =>
        c.user.upsert({
          where: { email: input.email },
          create: {
            name: input.name,
            email: input.email,
            role: input.role,
            passwordHash: input.passwordHash ?? null,
          },
          update: {
            name: input.name,
            role: input.role,
            passwordHash: input.passwordHash ?? null,
          },
        }),
      setPasswordHash: async (id, passwordHash) => {
        await c.user.update({ where: { id }, data: { passwordHash } });
      },
      delete: async (id) => {
        await c.user.delete({ where: { id } });
      },
    },

    sessions: {
      create: async (input) => {
        await c.session.create({ data: input });
      },
      findByTokenHash: async (tokenHash) => {
        const row = await c.session.findUnique({
          where: { tokenHash },
          include: { user: true },
        });
        if (!row) return null;
        const { user, ...session } = row;
        return { session, user };
      },
      touch: async (id, at) => {
        await c.session.update({ where: { id }, data: { lastUsedAt: at } });
      },
      deleteByTokenHash: async (tokenHash) => {
        await c.session.deleteMany({ where: { tokenHash } });
      },
      deleteForUser: async (userId) => {
        await c.session.deleteMany({ where: { userId } });
      },
      deleteExpired: async (now) => {
        await c.session.deleteMany({ where: { expiresAt: { lt: now } } });
      },
      countForUser: (userId) => c.session.count({ where: { userId } }),
    },

    invites: {
      create: (input) =>
        c.inviteCode.create({
          data: {
            studentId: input.studentId,
            codeHash: input.codeHash,
            expiresAt: input.expiresAt ?? null,
          },
        }),
      findByCodeHash: (codeHash) =>
        c.inviteCode.findUnique({
          where: { codeHash },
          include: { student: true },
        }),
      // The `usedAt: null` predicate is re-checked after the row lock is
      // taken, so two simultaneous claims cannot both succeed.
      claim: async (id, at) => {
        const result = await c.inviteCode.updateMany({
          where: { id, usedAt: null },
          data: { usedAt: at },
        });
        return result.count === 1;
      },
    },

    classes: {
      listWithMemberIds: async () => {
        const rows = await c.class.findMany({
          orderBy: { name: "asc" },
          include: { memberships: { select: { studentId: true } } },
        });
        return rows.map(({ memberships, ...row }) => ({
          ...row,
          memberIds: memberships.map((m) => m.studentId),
        }));
      },
      findById: (id) => c.class.findUnique({ where: { id } }),
      findByName: (name) => c.class.findUnique({ where: { name } }),
      create: (name) => unique(c.class.create({ data: { name } })),
      delete: async (id) => {
        await c.class.delete({ where: { id } });
      },
      addMember: async (classId, studentId) => {
        await c.classMembership.upsert({
          where: { classId_studentId: { classId, studentId } },
          create: { classId, studentId },
          update: {},
        });
      },
      removeMember: async (classId, studentId) => {
        await c.classMembership.deleteMany({ where: { classId, studentId } });
      },
    },

    themes: {
      list: () => c.theme.findMany({ orderBy: { name: "asc" } }),
      findBySlug: (slug) => c.theme.findUnique({ where: { slug } }),
      listWithChallenges: async (studentId) => {
        const rows = await c.theme.findMany({
          orderBy: { name: "asc" },
          include: {
            challenges: { orderBy: { sequence: "asc" }, include: withVersions },
            interests: { where: { studentId: studentId ?? "" } },
          },
        });
        return rows.map(({ interests, ...theme }) => ({
          ...theme,
          interested: interests.length > 0,
        }));
      },
      findBySlugWithChallenges: async (slug, studentId) => {
        const row = await c.theme.findUnique({
          where: { slug },
          include: {
            challenges: { orderBy: { sequence: "asc" }, include: withVersions },
            interests: { where: { studentId: studentId ?? "" } },
          },
        });
        if (!row) return null;
        const { interests, ...theme } = row;
        return { ...theme, interested: interests.length > 0 };
      },
      upsert: (input) =>
        c.theme.upsert({
          where: { slug: input.slug },
          create: input,
          update: { name: input.name, description: input.description },
        }),
      interestIds: async (studentId) =>
        (
          await c.studentInterest.findMany({
            where: { studentId },
            select: { themeId: true },
          })
        ).map((r) => r.themeId),
      replaceInterests: async (studentId, themeIds) => {
        const known = await c.theme.findMany({
          where: { id: { in: themeIds } },
          select: { id: true },
        });
        await c.studentInterest.deleteMany({ where: { studentId } });
        await c.studentInterest.createMany({
          data: known.map((t) => ({ studentId, themeId: t.id })),
          skipDuplicates: true,
        });
      },
    },

    challenges: {
      findBySlug: (slug) =>
        c.challenge.findUnique({
          where: { slug },
          include: { ...withVersions, theme: true },
        }),
      listAll: () =>
        c.challenge.findMany({
          orderBy: [{ theme: { name: "asc" } }, { sequence: "asc" }],
          include: { ...withVersions, theme: true },
        }),
      listByThemes: (themeIds) =>
        c.challenge.findMany({
          where: { themeId: { in: themeIds } },
          orderBy: { sequence: "asc" },
        }),
      findBySequence: (themeId, sequence) =>
        c.challenge.findFirst({ where: { themeId, sequence } }),
      create: (input) => unique(c.challenge.create({ data: input })),
      findVersion: (id) =>
        c.challengeVersion.findUnique({
          where: { id },
          include: { challenge: { include: { theme: true } } },
        }),
      findVersions: (ids) =>
        c.challengeVersion.findMany({
          where: { id: { in: ids } },
          include: { challenge: { include: { theme: true } } },
        }),
      listVersions: (challengeId) =>
        c.challengeVersion.findMany({ where: { challengeId }, ...newestFirst }),
      findVersionByNumber: (challengeId, version) =>
        c.challengeVersion.findUnique({
          where: { challengeId_version: { challengeId, version } },
        }),
      createVersion: (input) => c.challengeVersion.create({ data: input }),
      updateVersionSource: async (id, input) => {
        await c.challengeVersion.update({ where: { id }, data: input });
      },
    },

    progress: {
      find: (studentId, challengeVersionId) =>
        c.challengeProgress.findUnique({
          where: {
            studentId_challengeVersionId: { studentId, challengeVersionId },
          },
        }),
      findMany: (studentId, versionIds) =>
        c.challengeProgress.findMany({
          where: { studentId, challengeVersionId: { in: versionIds } },
        }),
      listForStudent: (studentId) =>
        c.challengeProgress.findMany({ where: { studentId } }),
      solvedChallengeIds: async (studentId, challengeIds) => {
        if (!challengeIds.length) return new Set();
        const rows = await c.challengeProgress.findMany({
          where: {
            studentId,
            challengeId: { in: challengeIds },
            solvedAt: { not: null },
          },
          select: { challengeId: true },
        });
        return new Set(rows.map((r) => r.challengeId));
      },
      // Callers hold a per-student lock (see Database.transaction), so the
      // read-then-write below cannot interleave with another attempt.
      recordAttempt: async (input) => {
        const key = {
          studentId_challengeVersionId: {
            studentId: input.studentId,
            challengeVersionId: input.challengeVersionId,
          },
        };
        const existing = await c.challengeProgress.findUnique({ where: key });
        if (!existing)
          return c.challengeProgress.create({
            data: {
              studentId: input.studentId,
              challengeId: input.challengeId,
              challengeVersionId: input.challengeVersionId,
              attempts: 1,
              firstAttemptAt: input.now,
              lastAttemptAt: input.now,
              solvedAt: input.solved ? input.now : null,
            },
          });
        return c.challengeProgress.update({
          where: { id: existing.id },
          data: {
            attempts: existing.attempts + 1,
            lastAttemptAt: input.now,
            ...(input.solved ? { solvedAt: input.now } : {}),
          },
        });
      },
    },

    submissions: {
      create: async (input) => {
        await c.submission.create({ data: input });
      },
      listForStudent: (studentId) =>
        c.submission.findMany({
          where: { studentId },
          orderBy: { attemptNumber: "asc" },
        }),
    },

    throttle: {
      get: (key) => c.loginThrottle.findUnique({ where: { key } }),
      registerFailure: async (key, now, windowMs) => {
        const cutoff = new Date(now.getTime() - windowMs);
        await c.$executeRaw`
          INSERT INTO "LoginThrottle" ("key", "attempts", "windowStart")
          VALUES (${key}, 1, ${now})
          ON CONFLICT ("key") DO UPDATE SET
            "attempts" = CASE WHEN "LoginThrottle"."windowStart" < ${cutoff}
                              THEN 1 ELSE "LoginThrottle"."attempts" + 1 END,
            "windowStart" = CASE WHEN "LoginThrottle"."windowStart" < ${cutoff}
                              THEN ${now} ELSE "LoginThrottle"."windowStart" END`;
      },
      clear: async (key) => {
        await c.loginThrottle.deleteMany({ where: { key } });
      },
    },

    reports: {
      studentRollups: async () => {
        const students = await c.user.findMany({
          where: { role: "STUDENT" },
          orderBy: { name: "asc" },
          include: {
            classMemberships: { select: { classId: true } },
            sessions: {
              select: { lastUsedAt: true },
              orderBy: { lastUsedAt: "desc" },
              take: 1,
            },
            inviteCodes: {
              select: { usedAt: true, createdAt: true },
              orderBy: { createdAt: "desc" },
            },
            progress: { select: { solvedAt: true, attempts: true } },
          },
        });
        return students.map((s) => {
          const { classMemberships, sessions, inviteCodes, progress, ...user } =
            s;
          return {
            user,
            classIds: classMemberships.map((m) => m.classId),
            invitedAt: inviteCodes[0]?.createdAt ?? null,
            // The most recent redemption of any code, not just the newest
            // one: a replacement is issued on top of a redeemed invite.
            inviteUsedAt: inviteCodes.find((i) => i.usedAt)?.usedAt ?? null,
            lastActiveAt: sessions[0]?.lastUsedAt ?? null,
            solvedCount: progress.filter((p) => p.solvedAt).length,
            attemptsCount: progress.reduce((sum, p) => sum + p.attempts, 0),
          };
        });
      },
      studentProgress: async () => {
        const students = await c.user.findMany({
          where: { role: "STUDENT" },
          orderBy: { name: "asc" },
          include: {
            classMemberships: {
              include: { class: { select: { name: true } } },
            },
            progress: true,
          },
        });
        return students.map(({ classMemberships, progress, ...student }) => ({
          student,
          classNames: classMemberships.map((m) => m.class.name),
          progress,
        }));
      },
    },
  };
}
