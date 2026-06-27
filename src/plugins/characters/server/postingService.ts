import "server-only";

import type { Prisma as CharacterDbPrisma } from "@/generated/character-prisma";
import type { CharacterGender, CharacterSheet } from "@/lib/characters/types";
import { generateAutomaticContactSheet } from "@/plugins/characters/generation/automaticContactGenerator";
import { characterPrisma } from "./characterPrisma";

export type CharacterPostingType = "crew_available" | "patron_job";

export interface CharacterPostingSummary {
  id: string;
  type: CharacterPostingType | string;
  title: string;
  description: string | null;
  location: string | null;
  role: string | null;
  status: string;
  characterId: string;
  characterName: string;
  characterGender: CharacterGender | null;
  createdAt: string;
}

const normalizeSkills = (skills: CharacterSheet["skills"]) => {
  const byName = new Map<string, number>();
  for (const skill of skills) {
    const name = skill.name.trim();
    if (!name) continue;
    byName.set(name, Math.max(byName.get(name) ?? skill.level, skill.level));
  }
  return [...byName.entries()].map(([name, level]) => ({ name, level }));
};

const postingTemplate = (type: CharacterPostingType) => {
  if (type === "patron_job") {
    return {
      title: "Patron contract available",
      description: "A local patron is looking for discreet, capable travellers.",
      role: "Patron",
    };
  }

  return {
    title: "Crew candidate available",
    description: "A qualified spacer is looking for a berth on a working ship.",
    role: "Crew",
  };
};

const rowToSummary = (row: {
  id: string;
  type: string;
  title: string;
  description: string | null;
  location: string | null;
  role: string | null;
  status: string;
  createdAt: Date;
  characterId: string;
  character: { name: string; sheet: unknown };
}): CharacterPostingSummary => {
  const sheet = row.character.sheet as CharacterSheet | null;
  const gender = sheet?.gender;

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    location: row.location,
    role: row.role,
    status: row.status,
    characterId: row.characterId,
    characterName: row.character.name,
    characterGender: gender === "female" || gender === "male" || gender === "nonbinary" ? gender : null,
    createdAt: row.createdAt.toISOString(),
  };
};

export const listOpenCharacterPostings = async ({
  userId,
  location,
}: {
  userId: string;
  location?: string | null;
}) => {
  const rows = await characterPrisma.characterPosting.findMany({
    where: {
      userId,
      status: "open",
      ...(location ? { location } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      location: true,
      role: true,
      status: true,
      createdAt: true,
      characterId: true,
      character: {
        select: {
          name: true,
          sheet: true,
        },
      },
    },
  });

  return rows.map(rowToSummary);
};

export const createGeneratedPosting = async ({
  userId,
  type,
  location = null,
}: {
  userId: string;
  type: CharacterPostingType;
  location?: string | null;
}) => {
  const template = postingTemplate(type);
  const sheet = generateAutomaticContactSheet({
    currentLocation: location,
    targetTerms: type === "patron_job" ? 3 : 2,
  });
  const skills = normalizeSkills(sheet.skills);

  const posting = await characterPrisma.$transaction(async (tx) => {
    const character = await tx.character.create({
      data: {
        userId,
        kind: "npc",
        name: sheet.name,
        strength: sheet.upp.str,
        dexterity: sheet.upp.dex,
        endurance: sheet.upp.end,
        intelligence: sheet.upp.int,
        education: sheet.upp.edu,
        socialStanding: sheet.upp.soc,
        credits: sheet.credits,
        currentLocation: sheet.currentLocation,
        sheet: sheet as unknown as CharacterDbPrisma.InputJsonValue,
      },
    });

    if (skills.length > 0) {
      await tx.characterSkill.createMany({
        data: skills.map((skill) => ({
          characterId: character.id,
          name: skill.name,
          level: skill.level,
        })),
      });
    }

    return tx.characterPosting.create({
      data: {
        userId,
        characterId: character.id,
        type,
        title: template.title,
        description: template.description,
        location,
        role: template.role,
      },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        location: true,
        role: true,
        status: true,
        createdAt: true,
        characterId: true,
        character: {
          select: {
            name: true,
            sheet: true,
          },
        },
      },
    });
  });

  return rowToSummary(posting);
};
