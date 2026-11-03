import type {
  ChallengeDetail,
  Challenge,
  ChallengeVersion,
  Difficulty,
  Invite,
  LoginThrottleState,
  Progress,
  Role,
  SchoolClass,
  Session,
  Submission,
  StudentProgressRecord,
  StudentRollup,
  Theme,
  ThemeWithChallenges,
  User,
  VersionDetail,
} from "@/lib/domain/types";

/**
 * Persistence ports.
 *
 * Application code depends on these interfaces and nothing else. To move to a
 * different database or driver, write an adapter that implements `Database`
 * (see lib/adapters/prisma) and select it in lib/container.ts. No other file
 * needs to change.
 *
 * Contract notes every adapter must honour:
 *  - Collections that say "newest first" or "by sequence" return in that order.
 *  - `create` methods throw `UniqueViolationError` when a unique value (user
 *    email, class name, challenge slug) is already taken.
 *  - Deleting a user removes everything that belongs to them.
 *  - Inside `transaction`, all repositories see one consistent unit of work
 *    that commits or rolls back as a whole.
 */
export class UniqueViolationError extends Error {
  constructor(message = "A record with that unique value already exists.") {
    super(message);
    this.name = "UniqueViolationError";
  }
}

export interface NewUser {
  name: string;
  email: string;
  role: Role;
  passwordHash?: string | null;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findFirstWithRole(role: Role): Promise<User | null>;
  create(input: NewUser): Promise<User>;
  /** Create, or update name/role/password of the user with this email. */
  upsertByEmail(input: NewUser): Promise<User>;
  setPasswordHash(id: string, passwordHash: string | null): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface SessionRepository {
  create(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  /** The session and its user, whether or not it has expired. */
  findByTokenHash(
    tokenHash: string,
  ): Promise<{ session: Session; user: User } | null>;
  touch(id: string, at: Date): Promise<void>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
  deleteForUser(userId: string): Promise<void>;
  deleteExpired(now: Date): Promise<void>;
  countForUser(userId: string): Promise<number>;
}

export interface InviteRepository {
  create(input: {
    studentId: string;
    codeHash: string;
    expiresAt?: Date | null;
  }): Promise<Invite>;
  findByCodeHash(
    codeHash: string,
  ): Promise<(Invite & { student: User }) | null>;
  /** Mark unused invite as used. False if it was already used (race loser). */
  claim(id: string, at: Date): Promise<boolean>;
}

export interface ClassRepository {
  listWithMemberIds(): Promise<(SchoolClass & { memberIds: string[] })[]>;
  findById(id: string): Promise<SchoolClass | null>;
  findByName(name: string): Promise<SchoolClass | null>;
  create(name: string): Promise<SchoolClass>;
  delete(id: string): Promise<void>;
  addMember(classId: string, studentId: string): Promise<void>;
  removeMember(classId: string, studentId: string): Promise<void>;
}

export interface NewTheme {
  slug: string;
  name: string;
  description: string;
}

export interface ThemeRepository {
  list(): Promise<Theme[]>;
  findBySlug(slug: string): Promise<Theme | null>;
  /** Ordered by name. Challenges by sequence, versions newest first. */
  listWithChallenges(studentId?: string): Promise<ThemeWithChallenges[]>;
  findBySlugWithChallenges(
    slug: string,
    studentId?: string,
  ): Promise<ThemeWithChallenges | null>;
  upsert(input: NewTheme): Promise<Theme>;
  interestIds(studentId: string): Promise<string[]>;
  /** Replace a student's interests. Unknown theme ids are ignored. */
  replaceInterests(studentId: string, themeIds: string[]): Promise<void>;
}

export interface NewVersion {
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

export interface ChallengeRepository {
  findBySlug(slug: string): Promise<ChallengeDetail | null>;
  /** Every challenge, ordered by theme name then sequence. */
  listAll(): Promise<ChallengeDetail[]>;
  listByThemes(themeIds: string[]): Promise<Challenge[]>;
  findBySequence(themeId: string, sequence: number): Promise<Challenge | null>;
  create(input: {
    slug: string;
    themeId: string;
    sequence: number;
  }): Promise<Challenge>;
  findVersion(id: string): Promise<VersionDetail | null>;
  findVersions(ids: string[]): Promise<VersionDetail[]>;
  /** Newest first. */
  listVersions(challengeId: string): Promise<ChallengeVersion[]>;
  findVersionByNumber(
    challengeId: string,
    version: number,
  ): Promise<ChallengeVersion | null>;
  createVersion(input: NewVersion): Promise<ChallengeVersion>;
  updateVersionSource(
    id: string,
    input: { sourcePath: string; contentHash: string | null },
  ): Promise<void>;
}

export interface AttemptInput {
  studentId: string;
  challengeId: string;
  challengeVersionId: string;
  now: Date;
  solved: boolean;
}

export interface ProgressRepository {
  find(studentId: string, versionId: string): Promise<Progress | null>;
  findMany(studentId: string, versionIds: string[]): Promise<Progress[]>;
  listForStudent(studentId: string): Promise<Progress[]>;
  /** Which of these challenges the student solved in ANY version. */
  solvedChallengeIds(
    studentId: string,
    challengeIds: string[],
  ): Promise<Set<string>>;
  /** Count one attempt: create the row or increment it. Returns the result. */
  recordAttempt(input: AttemptInput): Promise<Progress>;
}

export interface SubmissionRepository {
  create(input: {
    studentId: string;
    challengeId: string;
    challengeVersionId: string;
    answer: string;
    correct: boolean;
    attemptNumber: number;
  }): Promise<void>;
  listForStudent(studentId: string): Promise<Submission[]>;
}

export interface ThrottleRepository {
  get(key: string): Promise<LoginThrottleState | null>;
  /** Atomically count a failure, restarting the window once it has expired. */
  registerFailure(key: string, now: Date, windowMs: number): Promise<void>;
  clear(key: string): Promise<void>;
}

export interface ReportRepository {
  studentRollups(): Promise<StudentRollup[]>;
  studentProgress(): Promise<StudentProgressRecord[]>;
}

export interface Repositories {
  users: UserRepository;
  sessions: SessionRepository;
  invites: InviteRepository;
  classes: ClassRepository;
  themes: ThemeRepository;
  challenges: ChallengeRepository;
  progress: ProgressRepository;
  submissions: SubmissionRepository;
  throttle: ThrottleRepository;
  reports: ReportRepository;
}

export interface TransactionOptions {
  /**
   * Only one transaction per distinct key runs at a time; others wait their
   * turn. Used to serialise one student's submissions to one challenge.
   */
  serializeOn?: string;
}

export interface Database extends Repositories {
  /** Run `work` atomically. Rolls back if it throws. */
  transaction<T>(
    work: (repositories: Repositories) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;
  /** Cheap round trip proving the database is reachable. */
  ping(): Promise<void>;
  disconnect(): Promise<void>;
}
