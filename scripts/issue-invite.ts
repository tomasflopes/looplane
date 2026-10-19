import fs from "node:fs";
import path from "node:path";

import { db } from "../lib/db";
import { createInviteCode, hashInviteCode } from "../lib/invites";

type Student = { name: string; email: string; expiresAt: Date | null };

function usage() {
  console.log(`Issue one-time invite codes for students.

Usage:
  pnpm run invite -- --name "Alice Smith" --email alice@example.com
  pnpm run invite -- --csv students.csv
  pnpm run invite -- --csv students.csv --expires 2026-12-31T23:59:59Z

The CSV needs a header row with "name" and "email" columns. Extra columns are
ignored. The plaintext codes are printed once and never stored: only their
SHA-256 hash reaches the database.`);
}

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i++;
    } else args[key] = "true";
  }
  return args;
}

function parseCsv(contents: string): { name: string; email: string }[] {
  const lines = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const separator = lines[0].includes(";") ? ";" : ",";
  const header = lines[0]
    .split(separator)
    .map((cell) => cell.trim().toLowerCase());
  const nameIndex = header.indexOf("name");
  const emailIndex = header.indexOf("email");
  if (nameIndex === -1 || emailIndex === -1)
    throw new Error('The CSV needs "name" and "email" columns.');
  return lines.slice(1).map((line) => {
    const cells = line.split(separator).map((cell) => cell.trim());
    return { name: cells[nameIndex], email: cells[emailIndex] };
  });
}

async function issue(student: Student) {
  const code = createInviteCode();
  return db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email: student.email },
    });
    const user =
      existing ??
      (await tx.user.create({
        data: { name: student.name, email: student.email, role: "STUDENT" },
      }));
    await tx.inviteCode.create({
      data: {
        codeHash: hashInviteCode(code),
        studentId: user.id,
        expiresAt: student.expiresAt,
      },
    });
    return { code, existed: Boolean(existing) };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  const expiresAt = args.expires ? new Date(args.expires) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime()))
    throw new Error(`--expires is not a valid date: ${args.expires}`);

  let students: { name: string; email: string }[] = [];
  if (args.csv) {
    const file = path.resolve(process.cwd(), args.csv);
    students = parseCsv(fs.readFileSync(file, "utf8"));
  } else if (args.name && args.email) {
    students = [{ name: args.name, email: args.email }];
  } else {
    return usage();
  }

  const rows: string[] = ["name,email,inviteCode"];
  for (const student of students) {
    if (!student.name || !student.email)
      throw new Error(`Every student needs a name and an email.`);
    const { code, existed } = await issue({
      name: student.name,
      email: student.email,
      expiresAt,
    });
    if (existed)
      console.error(
        `Note: ${student.email} already existed, issued a new invite.`,
      );
    rows.push(
      `"${student.name.replace(/"/g, '""')}","${student.email}",${code}`,
    );
  }

  console.log(rows.join("\n"));
  console.error(
    `\n${students.length} invite code(s) issued. The codes above are shown once.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
