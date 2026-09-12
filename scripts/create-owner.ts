import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/features/auth/password";
import { ownerSchema } from "../src/features/auth/validation";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não foi definida.");
}

const owner = ownerSchema.parse({
  name: process.env.OWNER_NAME,
  email: process.env.OWNER_EMAIL,
  password: process.env.OWNER_PASSWORD,
});

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existingUsers = await prisma.user.count();

  if (existingUsers > 0) {
    throw new Error("Já existe uma conta. A criação inicial foi bloqueada.");
  }

  await prisma.user.create({
    data: {
      name: owner.name,
      email: owner.email,
      passwordHash: await hashPassword(owner.password),
    },
  });

  console.log("Conta proprietária criada com sucesso.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
