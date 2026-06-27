import "server-only";

import type { Prisma as CharacterDbPrisma } from "@/generated/character-prisma";
import type { CharacterGender, CharacterSheet } from "@/lib/characters/types";
import { generateAutomaticContactSheet } from "@/plugins/characters/generation/automaticContactGenerator";
import type { PendingGeneratedContact } from "@/plugins/characters/generation/pendingContacts";
import { characterPrisma } from "./characterPrisma";

export interface GeneratedContactInput {
  userId: string;
  sourceCharacterId: string;
  type: string;
  attitude: number;
  notes?: string | null;
  source?: string | null;
  targetTerms?: number;
}

export interface GeneratedContactResult {
  relationship: {
    id: string;
    fromCharacterId: string;
    toCharacterId: string;
    type: string;
    attitude: number;
  };
  character: {
    id: string;
    name: string;
    gender: CharacterGender | null;
  };
}

interface CreateGeneratedContactRecordInput {
  tx: CharacterDbPrisma.TransactionClient;
  userId: string;
  sourceCharacterId: string;
  currentLocation: string | null;
  type: string;
  attitude: number;
  notes?: string | null;
  source?: string | null;
  targetTerms?: number;
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

const clampAttitude = (attitude: number) =>
  Math.max(-100, Math.min(100, Math.trunc(attitude)));

const contactNotes = (pendingContact: PendingGeneratedContact) => {
  const context = [
    pendingContact.term === null ? null : `Term ${pendingContact.term}`,
    pendingContact.careerId,
    pendingContact.eventType,
  ].filter(Boolean).join(" / ");
  const label = context ? `${pendingContact.label} (${context})` : pendingContact.label;
  return pendingContact.notes ? `${label}: ${pendingContact.notes}` : label;
};

const createGeneratedContactRecord = async ({
  tx,
  userId,
  sourceCharacterId,
  currentLocation,
  type,
  attitude,
  notes = null,
  source = "manual-contact-generation",
  targetTerms = 2,
}: CreateGeneratedContactRecordInput): Promise<GeneratedContactResult> => {
  const relationshipType = type.trim();
  if (!relationshipType) throw new Error("Relationship type is required.");

  const sheet = generateAutomaticContactSheet({
    currentLocation,
    targetTerms,
  });
  const skills = normalizeSkills(sheet.skills);
  const relationshipAttitude = clampAttitude(attitude);

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

  const relationship = await tx.characterRelationship.create({
    data: {
      fromCharacterId: sourceCharacterId,
      toCharacterId: character.id,
      type: relationshipType,
      attitude: relationshipAttitude,
      notes,
      source,
    },
    select: {
      id: true,
      fromCharacterId: true,
      toCharacterId: true,
      type: true,
      attitude: true,
    },
  });

  return {
    relationship: {
      id: relationship.id,
      fromCharacterId: relationship.fromCharacterId,
      toCharacterId: relationship.toCharacterId,
      type: relationship.type,
      attitude: relationship.attitude,
    },
    character: {
      id: character.id,
      name: character.name,
      gender: sheet.gender ?? null,
    },
  };
};

export const materializePendingGeneratedContacts = async ({
  tx,
  userId,
  sourceCharacterId,
  currentLocation,
  pendingContacts,
  targetTerms = 2,
}: {
  tx: CharacterDbPrisma.TransactionClient;
  userId: string;
  sourceCharacterId: string;
  currentLocation: string | null;
  pendingContacts: readonly PendingGeneratedContact[];
  targetTerms?: number;
}): Promise<GeneratedContactResult[]> => {
  const results: GeneratedContactResult[] = [];

  for (const pendingContact of pendingContacts) {
    results.push(await createGeneratedContactRecord({
      tx,
      userId,
      sourceCharacterId,
      currentLocation,
      type: pendingContact.type,
      attitude: pendingContact.attitude,
      notes: contactNotes(pendingContact),
      source: pendingContact.sourceKey,
      targetTerms,
    }));
  }

  return results;
};

export const createGeneratedContactForCharacter = async ({
  userId,
  sourceCharacterId,
  type,
  attitude,
  notes = null,
  source = "manual-contact-generation",
  targetTerms = 2,
}: GeneratedContactInput): Promise<GeneratedContactResult | null> => {
  const sourceCharacter = await characterPrisma.character.findFirst({
    where: {
      id: sourceCharacterId,
      userId,
    },
    select: {
      id: true,
      currentLocation: true,
    },
  });

  if (!sourceCharacter) return null;

  return characterPrisma.$transaction((tx) =>
    createGeneratedContactRecord({
      tx,
      userId,
      sourceCharacterId: sourceCharacter.id,
      currentLocation: sourceCharacter.currentLocation,
      type,
      attitude,
      notes,
      source,
      targetTerms,
    }));
};
