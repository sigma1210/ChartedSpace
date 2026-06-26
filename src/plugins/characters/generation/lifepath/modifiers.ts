import type {
  LifepathCareerDefinition,
  LifepathQualificationModifierDefinition,
} from "../lifepathTypes";
import type { LifepathRuntimeState } from "./runtimeTypes";

export const characteristicDm = (score: number): number => {
  if (score <= 0) return -3;
  if (score <= 2) return -2;
  if (score <= 5) return -1;
  if (score <= 8) return 0;
  if (score <= 11) return 1;
  if (score <= 14) return 2;
  return 3;
};

export const skillDm = (level: number | null | undefined): number =>
  typeof level === "number" ? level : -3;

export const matchingCheckModifiers = (
  state: LifepathRuntimeState,
  career: LifepathCareerDefinition,
  modifiers: readonly LifepathQualificationModifierDefinition[] = [],
): readonly LifepathQualificationModifierDefinition[] => {
  const survivalMatchedHistory = (modifier: LifepathQualificationModifierDefinition) =>
    state.careerHistory.filter((entry) =>
      typeof modifier.survived === "boolean" ? entry.survived === modifier.survived : true);
  const termCountMatches = (
    modifier: LifepathQualificationModifierDefinition,
    count: number,
  ) => {
    if (typeof modifier.minimumTerms === "number" && count < modifier.minimumTerms) return false;
    if (typeof modifier.maximumTerms === "number" && count > modifier.maximumTerms) return false;
    return count > 0;
  };
  const preCareerOutcomeMatches = (modifier: LifepathQualificationModifierDefinition) => {
    const educationIds = modifier.educationIds ?? [];
    return state.preCareerEducationOutcomes.some((outcome) => {
      if (educationIds.length > 0 && !educationIds.includes(outcome.educationId)) return false;
      if (typeof modifier.graduated === "boolean" && outcome.graduated !== modifier.graduated) return false;
      if (
        typeof modifier.honorsGraduated === "boolean"
        && outcome.honorsGraduated !== modifier.honorsGraduated
      ) {
        return false;
      }
      return true;
    });
  };

  return modifiers.filter((modifier) => {
    if (modifier.when === "preCareerEducation") return preCareerOutcomeMatches(modifier);
    const history = survivalMatchedHistory(modifier);
    if (modifier.when === "hasCareerHistory") return termCountMatches(modifier, history.length);
    if (modifier.when === "sameCareer") {
      const count = history.filter((entry) => entry.careerId === career.id).length;
      return termCountMatches(modifier, count);
    }
    if (modifier.when === "previousCareer") {
      const careerIds = modifier.careerIds ?? [];
      if (careerIds.length === 0) {
        const count = history.filter((entry) => entry.careerId !== career.id).length;
        return termCountMatches(modifier, count);
      }
      const count = history.filter((entry) => careerIds.includes(entry.careerId)).length;
      return termCountMatches(modifier, count);
    }
    return false;
  });
};

export const qualificationHistoryModifiers = (
  state: LifepathRuntimeState,
  career: LifepathCareerDefinition,
): readonly LifepathQualificationModifierDefinition[] =>
  matchingCheckModifiers(state, career, career.qualificationModifiers ?? []);

export const commissionHistoryModifiers = (
  state: LifepathRuntimeState,
  career: LifepathCareerDefinition,
): readonly LifepathQualificationModifierDefinition[] =>
  matchingCheckModifiers(state, career, career.commissionModifiers ?? []);
