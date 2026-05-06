import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const name = process.env.SUPER_ADMIN_NAME || "NHSPC Super Admin";
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@nhspc-sylhet.gov.bd";
  const password = process.env.SUPER_ADMIN_PASSWORD || "ChangeMe123!";

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.quizConfig.upsert({
    where: { key: "sylhet-regional-quiz" },
    update: {},
    create: {
      key: "sylhet-regional-quiz",
      totalMarks: 50,
      updatedByName: name
    }
  });

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      role: Role.SUPER_ADMIN
    },
    create: {
      name,
      email,
      password: hashedPassword,
      role: Role.SUPER_ADMIN
    }
  });

  console.log(`Super Admin is ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
