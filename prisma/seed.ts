import bcrypt from "bcryptjs";

import { db } from "../lib/db";

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
  for (const theme of themes)
    await db.theme.upsert({
      where: { slug: theme.slug },
      create: theme,
      update: { name: theme.name, description: theme.description },
    });
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD)
    throw new Error(
      "ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required for seeding.",
    );
  await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
    },
    update: {
      name: ADMIN_NAME,
      role: "ADMIN",
      // Keep the stored hash in step with the environment, otherwise changing
      // ADMIN_PASSWORD silently leaves the old one working.
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
    },
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
  .finally(() => db.$disconnect());
