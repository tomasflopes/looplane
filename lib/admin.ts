import { currentVersion } from "@/lib/challenges/versions";
import { database } from "@/lib/container";
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
  return (await database.reports.studentRollups()).map((r) => ({
    id: r.user.id,
    name: r.user.name,
    email: r.user.email,
    createdAt: r.user.createdAt,
    classIds: r.classIds,
    invitedAt: r.invitedAt,
    inviteUsedAt: r.inviteUsedAt,
    lastActiveAt: r.lastActiveAt,
    solvedCount: r.solvedCount,
    attemptsCount: r.attemptsCount,
  }));
}

export type AdminClass = {
  id: string;
  name: string;
  createdAt: Date;
  memberIds: string[];
};

export const listClasses = (): Promise<AdminClass[]> =>
  database.classes.listWithMemberIds();

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
 * One row per student per challenge for the current version of each challenge.
 *
 * Progress is scoped to the version the student currently sees: if a teacher
 * publishes a new version of a challenge, the row reflects that new version
 * rather than a version that is no longer in play.
 */
export async function listSubmissionRows(): Promise<SubmissionRow[]> {
  const [students, challenges] = await Promise.all([
    database.reports.studentProgress(),
    database.challenges.listAll(),
  ]);

  const rows: SubmissionRow[] = [];
  for (const { student, classNames, progress: all } of students) {
    const progressByVersion = new Map(
      all.map((p) => [p.challengeVersionId, p]),
    );
    for (const challenge of challenges) {
      const version = currentVersion(challenge.versions);
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
