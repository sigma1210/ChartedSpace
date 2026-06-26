import type { LifepathCareerDefinition } from "../../lifepathTypes";

export const surveyScoutCareer = {
  id: "survey-scout",
  label: "Survey Scout",
  description: "Frontier survey, courier work, and field improvisation.",
  data: {
    qualificationFailureCareerIds: ["free-trader"],
  },
  eligibility: {
    disallowAfterFailedReenlistment: true,
    minimumCharacteristics: {
      int: 6,
    },
  },
  assignments: [
    { id: "survey-scout.field", label: "Field", description: "Unknown worlds and rough landings." },
    { id: "survey-scout.courier", label: "Courier", description: "Fast routes and sensitive messages." },
  ],
  ranks: [
    { rank: 0, title: "Scout", track: "enlisted" },
    {
      rank: 1,
      title: "Senior Scout",
      track: "enlisted",
      effects: [
        {
          id: "survey-scout.rank-1.recon",
          type: "skill.add",
          payload: { skill: "Recon", level: 1 },
        },
      ],
    },
    {
      rank: 2,
      title: "Survey Lead",
      track: "enlisted",
      effects: [
        {
          id: "survey-scout.rank-2.survival",
          type: "skill.add",
          payload: { skill: "Survival", level: 1 },
        },
      ],
    },
    {
      rank: 3,
      title: "Mission Chief",
      track: "enlisted",
      effects: [
        {
          id: "survey-scout.rank-3.astrogation",
          type: "skill.add",
          payload: { skill: "Astrogation", level: 1 },
        },
      ],
    },
    {
      rank: 1,
      title: "Mission Officer",
      track: "officer",
      effects: [
        {
          id: "survey-scout.officer-rank-1.admin",
          type: "skill.add",
          payload: { skill: "Admin", level: 1 },
        },
      ],
    },
    {
      rank: 2,
      title: "Survey Commander",
      track: "officer",
      effects: [
        {
          id: "survey-scout.officer-rank-2.leadership",
          type: "skill.add",
          payload: { skill: "Leadership", level: 1 },
        },
      ],
    },
    {
      rank: 3,
      title: "Sector Liaison",
      track: "officer",
      effects: [
        {
          id: "survey-scout.officer-rank-3.diplomat",
          type: "skill.add",
          payload: { skill: "Diplomat", level: 1 },
        },
      ],
    },
  ],
  skillTableIds: ["survey-scout.skills"],
  qualification: {
    id: "survey-scout.qualification",
    label: "Survey Scout Qualification",
    notation: "2d6",
    target: 5,
    characteristicModifier: "int",
    failureEffects: [
      {
        id: "survey-scout.qualification-contact",
        type: "relationship.add",
        payload: { relationshipType: "contact", label: "Scout recruiter" },
      },
    ],
  },
  qualificationModifiers: [
    {
      id: "survey-scout.prior-career",
      label: "Prior career",
      modifier: -1,
      when: "hasCareerHistory",
    },
  ],
  commission: {
    id: "survey-scout.commission",
    label: "Survey Scout Commission",
    notation: "2d6",
    target: 8,
    characteristicModifier: "edu",
  },
  survival: {
    id: "survey-scout.survival",
    label: "Survival",
    notation: "2d6",
    target: 6,
    characteristicModifier: "end",
    skillModifier: "Survival",
    failureEffects: [
      {
        id: "survey-scout.accident",
        type: "injury.add",
        payload: { severity: "minor", label: "Survey accident" },
      },
    ],
  },
  advancement: {
    id: "survey-scout.advancement",
    label: "Advancement",
    notation: "2d6",
    target: 8,
    characteristicModifier: "edu",
    skillModifier: "Recon",
    successEffects: [
      {
        id: "survey-scout.rank",
        type: "career.promote",
        payload: { ranks: 1 },
      },
    ],
  },
  reenlistment: {
    id: "survey-scout.reenlistment",
    label: "Survey Scout Reenlistment",
    notation: "2d6",
    target: 6,
    characteristicModifier: "edu",
    data: {
      successOutcome: "may-continue",
      failureOutcome: "forced-out",
    },
  },
  eventTableId: "survey-scout.events",
  mishapTableId: "survey-scout.mishaps",
  benefitTableIds: ["survey-scout.benefits"],
} satisfies LifepathCareerDefinition;
