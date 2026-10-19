import { db } from "@/lib/db";
import "server-only";

export type AdminStudent = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  classIds: string[];
  invitedAt: Date | null;
  inviteUsedAt: Date | null;
  lastActiveAt: Date | null;
  solvedCount: number;
  attemptsCount: number;
};

/**
 * Every student with the roll-up a teacher needs on the students screen:
 * which class they are in, whether their invite has been redeemed, when they
 * were last seen, and how much they have solved.
 */
export async function listStudents(): Promise<AdminStudent[]> {
  const students = await db.user.findMany({
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
  return students.map((student) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    createdAt: student.createdAt,
    classIds: student.classMemberships.map((m) => m.classId),
    invitedAt: student.inviteCodes[0]?.createdAt ?? null,
    // The most recent redemption of any code, not just the newest one: a
    // replacement code is issued on top of an already redeemed invite.
    inviteUsedAt: student.inviteCodes.find((i) => i.usedAt)?.usedAt ?? null,
    lastActiveAt: student.sessions[0]?.lastUsedAt ?? null,
    solvedCount: student.progress.filter((p) => p.solvedAt).length,
    attemptsCount: student.progress.reduce((sum, p) => sum + p.attempts, 0),
  }));
}

export type AdminClass = {
  id: string;
  name: string;
  createdAt: Date;
  memberIds: string[];
};

export async function listClasses(): Promise<AdminClass[]> {
  const classes = await db.class.findMany({
    orderBy: { name: "asc" },
    include: { memberships: { select: { studentId: true } } },
  });
  return classes.map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: c.createdAt,
    memberIds: c.memberships.map((m) => m.studentId),
  }));
}

export type SubmissionRow = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  classNames: string[];
  challengeId: string;
  challengeTitle: string;
  themeName: string;
  themeSlug: string;
  difficulty: string;
  attempts: number;
  firstAttemptAt: Date | null;
  lastAttemptAt: Date | null;
  solvedAt: Date | null;
  status: "solved" | "attempted" | "not-started";
};

/**
 * One row per student per challenge for the latest version of each challenge.
 *
 * Progress is scoped to the version the student currently sees: if a teacher
 * publishes a new version of a challenge, the row reflects that new version
 * rather than a version that is no longer in play.
 */
export async function listSubmissionRows(): Promise<SubmissionRow[]> {
  const [students, challenges] = await Promise.all([
    db.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { name: "asc" },
      include: {
        classMemberships: { include: { class: { select: { name: true } } } },
        progress: true,
      },
    }),
    db.challenge.findMany({
      orderBy: [{ theme: { name: "asc" } }, { sequence: "asc" }],
      include: {
        theme: { select: { name: true, slug: true } },
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    }),
  ]);

  const rows: SubmissionRow[] = [];
  for (const student of students) {
    const progressByVersion = new Map(
      student.progress.map((p) => [p.challengeVersionId, p]),
    );
    const classNames = student.classMemberships.map((m) => m.class.name);
    for (const challenge of challenges) {
      const version = challenge.versions[0];
      if (!version) continue;
      const progress = progressByVersion.get(version.id);
      const status: SubmissionRow["status"] = progress?.solvedAt
        ? "solved"
        : progress && progress.attempts > 0
          ? "attempted"
          : "not-started";
      rows.push({
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        classNames,
        challengeId: challenge.id,
        challengeTitle: version.title,
        themeName: challenge.theme.name,
        themeSlug: challenge.theme.slug,
        difficulty: version.difficulty,
        attempts: progress?.attempts ?? 0,
        firstAttemptAt: progress?.firstAttemptAt ?? null,
        lastAttemptAt: progress?.lastAttemptAt ?? null,
        solvedAt: progress?.solvedAt ?? null,
        status,
      });
    }
  }
  return rows;
}
