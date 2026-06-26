import type { LifepathGeneratorDefinition } from "../lifepathTypes";
import type { LifepathRuntimeState } from "./runtimeTypes";

export const createInitialLifepathState = (
  definition: LifepathGeneratorDefinition,
): LifepathRuntimeState => ({
  generatorId: definition.id,
  phase: "roll-characteristics",
  term: 1,
  age: definition.startingRules.age,
  selectedPreCareerEducationId: null,
  preCareerEducationOutcomes: [],
  preCareerHonorsGraduated: false,
  pendingPreCareerSkillRolls: 0,
  selectedCareerId: null,
  selectedAssignmentId: null,
  termSurvived: null,
  commissioned: false,
  pendingChoice: null,
  characteristics: {},
  careerRank: 0,
  completedTerms: 0,
  careerHistory: [],
  skills: [],
  relationships: [],
  injuries: [],
  credits: 0,
  benefits: {
    passages: {
      low: 0,
      middle: 0,
      high: 0,
    },
    ships: [],
    societies: [],
    weapons: [],
    retirementPay: null,
  },
  musterOut: null,
  actions: [],
  effects: [...(definition.startingRules.startingEffects ?? [])],
  log: [],
});
