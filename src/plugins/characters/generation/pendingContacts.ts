import type { CharacterSheet } from "@/lib/characters/types";
import type { LifepathRuntimeRelationship } from "./lifepath/runtimeTypes";

export interface PendingGeneratedContact {
  sourceKey: string;
  type: string;
  attitude: number;
  label: string;
  notes: string | null;
  careerId: string | null;
  term: number | null;
  eventId: string | null;
  eventType: string | null;
  role: string | null;
}

const relationshipAttitude = (type: string) => {
  switch (type) {
    case "ally":
      return 70;
    case "friend":
      return 50;
    case "patron":
      return 35;
    case "dependent":
      return 30;
    case "rival":
      return -40;
    case "enemy":
      return -80;
    case "contact":
    default:
      return 20;
  }
};

const isRelationship = (value: unknown): value is LifepathRuntimeRelationship => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<LifepathRuntimeRelationship>;
  return typeof record.type === "string" && typeof record.label === "string";
};

const sourceKeyForRelationship = (
  relationship: LifepathRuntimeRelationship,
  index: number,
) =>
  relationship.id
  ?? [
    relationship.eventId,
    relationship.eventType,
    relationship.careerId,
    relationship.term === undefined ? null : `term-${relationship.term}`,
    relationship.type,
    relationship.label,
    index,
  ].filter(Boolean).join(":");

export const extractPendingGeneratedContacts = (
  sheet: CharacterSheet,
): PendingGeneratedContact[] => {
  const relationships = sheet.generation.metadata?.relationships;
  if (!Array.isArray(relationships)) return [];

  return relationships.flatMap((candidate, index) => {
    if (!isRelationship(candidate)) return [];
    if (candidate.characterId) return [];

    const type = candidate.type.trim() || "contact";
    const label = candidate.label.trim() || "Unknown contact";

    return [{
      sourceKey: sourceKeyForRelationship(candidate, index),
      type,
      attitude: relationshipAttitude(type),
      label,
      notes: candidate.notes?.trim() || null,
      careerId: candidate.careerId ?? null,
      term: typeof candidate.term === "number" ? candidate.term : null,
      eventId: candidate.eventId ?? null,
      eventType: candidate.eventType ?? null,
      role: candidate.role ?? null,
    }];
  });
};
