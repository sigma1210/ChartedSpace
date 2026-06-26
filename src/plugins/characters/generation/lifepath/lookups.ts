import type {
  LifepathAssignmentDefinition,
  LifepathCareerDefinition,
  LifepathGeneratorDefinition,
  LifepathTableDefinition,
  LifepathTableEntry,
} from "../lifepathTypes";

export const findCareer = (
  definition: LifepathGeneratorDefinition,
  careerId: string,
): LifepathCareerDefinition | null =>
  definition.careers.find((career) => career.id === careerId) ?? null;

export const findAssignment = (
  career: LifepathCareerDefinition,
  assignmentId: string,
): LifepathAssignmentDefinition | null =>
  career.assignments.find((assignment) => assignment.id === assignmentId) ?? null;

export const findTable = (
  definition: LifepathGeneratorDefinition,
  tableId: string,
): LifepathTableDefinition | null =>
  definition.tables.find((table) => table.id === tableId) ?? null;

export const findTableEntry = (
  table: LifepathTableDefinition,
  roll: number,
): LifepathTableEntry | null =>
  table.entries.find((entry) => {
    if (!entry.range) return false;
    return roll >= entry.range[0] && roll <= entry.range[1];
  }) ?? null;
