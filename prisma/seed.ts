import bcrypt from "bcryptjs";

import { database } from "../lib/container";
import { normalizeEmail, passwordProblem } from "../lib/password";

async function main() {
  const themes = [
    {
      slug: "f1",
      name: "F1",
      description: "Race-day data and simple algorithms.",
    },
    {
      slug: "mobility",
      name: "Mobility",
      description: "Everyday transport, numbers, and patterns.",
    },
    { slug: "cars", name: "Cars", description: "Challenges coming soon." },
    {
      slug: "medicine",
      name: "Medicine",
      description: "Challenges coming soon.",
    },
  ];
  for (const theme of themes) await database.themes.upsert(theme);
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD)
    throw new Error(
      "ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required for seeding.",
    );
  const problem = passwordProblem(ADMIN_PASSWORD);
  if (problem) throw new Error(`ADMIN_PASSWORD rejected: ${problem}`);
  const adminEmail = normalizeEmail(ADMIN_EMAIL);
  // Keep the stored hash in step with the environment, otherwise changing
  // ADMIN_PASSWORD silently leaves the old one working.
  await database.users.upsertByEmail({
    name: ADMIN_NAME,
    email: adminEmail,
    role: "ADMIN",
    passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
  });
  console.log(
    "Seeded themes and admin user. Run pnpm run challenges:sync next.",
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => database.disconnect());
