import "server-only";

import { PrismaClient } from "@/generated/character-prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForCharacterPrisma = globalThis as unknown as {
  characterPrisma?: PrismaClient;
};

const createCharacterPrismaClient = () => {
  const connectionString = process.env.CHARACTER_DATABASE_URL;
  if (!connectionString) {
    throw new Error("CHARACTER_DATABASE_URL is not configured");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
};

const cachedCharacterPrisma = globalForCharacterPrisma.characterPrisma;

export const characterPrisma =
  cachedCharacterPrisma && typeof cachedCharacterPrisma.shipLockerItem?.findMany === "function"
    ? cachedCharacterPrisma
    : createCharacterPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForCharacterPrisma.characterPrisma = characterPrisma;
}
