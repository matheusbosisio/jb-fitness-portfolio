import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não foi definida.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const initialCategories = [
  { name: "Conjuntos", normalizedName: "conjuntos" },
  { name: "Macacões", normalizedName: "macacões" },
  { name: "Macaquinhos", normalizedName: "macaquinhos" },
];

async function main() {
  for (const category of initialCategories) {
    await prisma.category.upsert({
      where: { normalizedName: category.normalizedName },
      update: { name: category.name, active: true },
      create: category,
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
