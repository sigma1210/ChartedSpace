import fs from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  buildAvatarPromptSlug,
  DEFAULT_AVATAR_SLUG_FIELDS,
  type AvatarSlugValues,
  type CharacterAvatar,
} from "../src/lib/characters/avatar";
import { assignAvatarFromPool } from "../src/lib/characters/avatarPool";
import type { CharacterGender, CharacterSheet } from "../src/lib/characters/types";
import { Prisma, PrismaClient } from "../src/generated/character-prisma";

interface BackfillOptions {
  write: boolean;
  limit: number | null;
  manifestPath?: string;
}

const envFiles = [".env.local", ".env"];

const loadEnv = () => {
  for (const file of envFiles) {
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
};

const parsePositiveInt = (flag: string, value: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} requires a positive integer`);
  }
  return parsed;
};

const parseArgs = (args: string[]): BackfillOptions => {
  const options: BackfillOptions = {
    write: false,
    limit: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = (flag: string) => {
      const value = args[index + 1];
      if (!value) throw new Error(`${flag} requires a value`);
      index += 1;
      return value;
    };

    if (arg === "--") {
      continue;
    }
    if (arg === "--write") {
      options.write = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.write = false;
      continue;
    }
    if (arg === "--limit") {
      options.limit = parsePositiveInt(arg, nextValue(arg));
      continue;
    }
    if (arg.startsWith("--limit=")) {
      options.limit = parsePositiveInt("--limit", arg.slice("--limit=".length));
      continue;
    }
    if (arg === "--manifest") {
      options.manifestPath = nextValue(arg);
      continue;
    }
    if (arg.startsWith("--manifest=")) {
      options.manifestPath = arg.slice("--manifest=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
};

const choose = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

const normalizeGender = (value: unknown): CharacterGender | null => {
  if (value === "female" || value === "male") return value;
  return null;
};

const hasPortrait = (avatar: CharacterAvatar | null | undefined) =>
  Boolean(avatar?.currentPortraitPath?.trim());

const buildNpcSlugValues = (sheet: CharacterSheet): AvatarSlugValues => {
  const existing = sheet.avatar?.slugValues ?? {};
  const gender = normalizeGender(existing.gender) ?? normalizeGender(sheet.gender) ?? choose(["female", "male"] as const);
  const values: AvatarSlugValues = { gender };

  for (const field of DEFAULT_AVATAR_SLUG_FIELDS) {
    if (field.key === "gender") continue;
    const existingValue = existing[field.key];
    if (field.options.some((option) => option.id === existingValue)) {
      values[field.key] = existingValue;
      continue;
    }
    values[field.key] = choose(field.options).id;
  }

  return values;
};

const buildBackfilledSheet = (sheet: CharacterSheet, avatar: CharacterAvatar): CharacterSheet => ({
  ...sheet,
  avatar,
  generation: {
    ...sheet.generation,
    metadata: {
      ...(sheet.generation.metadata ?? {}),
      avatar,
    },
  },
});

const main = async () => {
  loadEnv();
  const options = parseArgs(process.argv.slice(2));
  const connectionString = process.env.CHARACTER_DATABASE_URL;
  if (!connectionString) throw new Error("CHARACTER_DATABASE_URL is not configured");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const rows = await prisma.character.findMany({
    where: { kind: "npc" },
    orderBy: { createdAt: "asc" },
    take: options.limit ?? undefined,
    select: {
      id: true,
      name: true,
      sheet: true,
    },
  });

  let skippedExisting = 0;
  let skippedInvalidSheet = 0;
  let skippedNoPoolMatch = 0;
  let backfilled = 0;

  try {
    for (const row of rows) {
      const sheet = row.sheet as CharacterSheet | null;
      if (!sheet || typeof sheet !== "object") {
        skippedInvalidSheet += 1;
        continue;
      }
      if (hasPortrait(sheet.avatar)) {
        skippedExisting += 1;
        continue;
      }

      const slugValues = buildNpcSlugValues(sheet);
      const promptSlug = buildAvatarPromptSlug(DEFAULT_AVATAR_SLUG_FIELDS, slugValues);
      const avatar = assignAvatarFromPool({
        slugValues,
        promptSlug,
        age: sheet.age,
        manifestPath: options.manifestPath,
      });

      if (!avatar) {
        skippedNoPoolMatch += 1;
        continue;
      }

      backfilled += 1;
      console.log(`${options.write ? "backfill" : "dry-run"} ${row.id} ${row.name}: ${avatar.currentPortraitPath}`);

      if (options.write) {
        await prisma.character.update({
          where: { id: row.id },
          data: {
            sheet: buildBackfilledSheet(sheet, avatar) as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(JSON.stringify({
    mode: options.write ? "write" : "dry-run",
    scanned: rows.length,
    backfilled,
    skippedExisting,
    skippedInvalidSheet,
    skippedNoPoolMatch,
  }, null, 2));
};

main().catch((err) => {
  console.error("[avatar-backfill-npcs]", err);
  process.exit(1);
});
