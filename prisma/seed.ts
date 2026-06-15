import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seeds a single admin user from env so you can log in immediately.
 *   SEED_EMAIL=you@example.com SEED_PASSWORD=changeme npm run db:seed
 */
async function main() {
  const email = (process.env.SEED_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.SEED_PASSWORD ?? "changeme123";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      passwordHash,
      preference: {
        create: {
          targetRoles: ["Software Engineer Graduate", "Cyber Security Graduate"],
          keywords: ["python", "typescript"],
          fields: ["Computer Science", "Cyber Security"],
          location: "London",
          countryCode: "gb",
          seniority: "grad",
          minMatchScore: 0,
        },
      },
    },
  });

  console.log(`Seeded user: ${user.email} (password: ${password})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
