/**
 * Plain data shapes the application works with. They are deliberately free of
 * any ORM or driver type, so a persistence adapter can be replaced without
 * touching the code that uses these.
 */
export type Role = "ADMIN" | "STUDENT";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  role: Role;
  createdAt: Date;
}

export interface Theme {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface Challenge {
  id: string;
  slug: string;
  themeId: string;
  sequence: number;
}

export interface ChallengeVersion {
  id: string;
  challengeId: string;
  version: number;
  title: string;
  subtitle: string;
  difficulty: Difficulty;
  publishedAt: Date;
  sourcePath: string;
  contentHash: string | null;
  inputType: string;
  outputType: string;
}

/** A challenge with all its versions, newest first. */
export type ChallengeWithVersions = Challenge & {
  versions: ChallengeVersion[];
};
export type ChallengeDetail = ChallengeWithVersions & { theme: Theme };
export type VersionDetail = ChallengeVersion & {
  challenge: Challenge & { theme: Theme };
};
/** A theme with its challenges ordered by sequence. */
export type ThemeWithChallenges = Theme & {
  challenges: ChallengeWithVersions[];
  /** Whether the requesting student marked this theme as an interest. */
  interested: boolean;
};

export interface Progress {
  id: string;
  studentId: string;
  challengeId: string;
  challengeVersionId: string;
  attempts: number;
  firstAttemptAt: Date | null;
  lastAttemptAt: Date | null;
  solvedAt: Date | null;
}

export interface Submission {
  id: string;
  studentId: string;
  challengeId: string;
  challengeVersionId: string;
  answer: string;
  correct: boolean;
  attemptNumber: number;
  submittedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  lastUsedAt: Date;
}

export interface Invite {
  id: string;
  codeHash: string;
  studentId: string;
  usedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface SchoolClass {
  id: string;
  name: string;
  createdAt: Date;
}

export interface LoginThrottleState {
  attempts: number;
  windowStart: Date;
}

// Read models for the teacher screens.
export interface StudentRollup {
  user: User;
  classIds: string[];
  invitedAt: Date | null;
  inviteUsedAt: Date | null;
  lastActiveAt: Date | null;
  solvedCount: number;
  attemptsCount: number;
}
export interface StudentProgressRecord {
  student: User;
  classNames: string[];
  progress: Progress[];
}
