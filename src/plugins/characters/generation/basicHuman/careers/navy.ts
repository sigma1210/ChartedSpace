import type { LifepathCareerDefinition } from "../../lifepathTypes";

export const navyCareer = {
  id: "navy",
  label: "Navy",
  description: "Starship service, fleet discipline, and hard vacuum operations.",
  assignments: [
    { id: "navy.line", label: "Line Crew", description: "Shipboard duty, watches, and combat stations." },
    { id: "navy.engineering", label: "Engineering", description: "Power plants, drives, and damage control." },
    { id: "navy.flight", label: "Flight", description: "Small craft, helm time, and tactical manoeuvres." },
  ],
  ranks: [
    { rank: 0, title: "Crewman", track: "enlisted" },
    {
      rank: 1,
      title: "Spacer",
      track: "enlisted",
      effects: [
        {
          id: "navy.rank-1-vacc-suit",
          type: "skill.add",
          payload: { skill: "Vacc Suit", level: 1 },
        },
      ],
    },
    {
      rank: 2,
      title: "Petty Officer",
      track: "enlisted",
      effects: [
        {
          id: "navy.rank-2-leadership",
          type: "skill.add",
          payload: { skill: "Leadership", level: 1 },
        },
      ],
    },
    {
      rank: 3,
      title: "Chief",
      track: "enlisted",
      effects: [
        {
          id: "navy.rank-3-mechanic",
          type: "skill.add",
          payload: { skill: "Mechanic", level: 1 },
        },
      ],
    },
    { rank: 1, title: "Ensign", track: "officer" },
    {
      rank: 2,
      title: "Lieutenant",
      track: "officer",
      effects: [
        {
          id: "navy.officer-rank-2-leadership",
          type: "skill.add",
          payload: { skill: "Leadership", level: 1 },
        },
      ],
    },
    {
      rank: 3,
      title: "Commander",
      track: "officer",
      effects: [
        {
          id: "navy.officer-rank-3-tactics",
          type: "skill.add",
          payload: { skill: "Tactics", level: 1 },
        },
      ],
    },
  ],
  skillTableIds: ["navy.skills"],
  qualification: {
    id: "navy.qualification",
    label: "Navy Qualification",
    notation: "2d6",
    target: 7,
    characteristicModifier: "edu",
    failureEffects: [
      {
        id: "navy-recruiter-contact",
        type: "relationship.add",
        payload: { relationshipType: "contact", label: "Navy recruiter" },
      },
    ],
  },
  qualificationModifiers: [
    {
      id: "navy.military-academy-graduate",
      label: "Military Academy graduate",
      modifier: 1,
      when: "preCareerEducation",
      educationIds: ["military-academy"],
      graduated: true,
      honorsGraduated: false,
    },
    {
      id: "navy.military-academy-honors",
      label: "Military Academy honors graduate",
      modifier: 2,
      when: "preCareerEducation",
      educationIds: ["military-academy"],
      honorsGraduated: true,
    },
    {
      id: "navy.prior-career",
      label: "Prior career",
      modifier: -1,
      when: "hasCareerHistory",
    },
  ],
  commission: {
    id: "navy.commission",
    label: "Navy Commission",
    notation: "2d6",
    target: 8,
    characteristicModifier: "soc",
  },
  commissionModifiers: [
    {
      id: "navy.commission.military-academy-graduate",
      label: "Military Academy graduate",
      modifier: 1,
      when: "preCareerEducation",
      educationIds: ["military-academy"],
      graduated: true,
      honorsGraduated: false,
    },
    {
      id: "navy.commission.military-academy-honors",
      label: "Military Academy honors graduate",
      modifier: 2,
      when: "preCareerEducation",
      educationIds: ["military-academy"],
      honorsGraduated: true,
    },
  ],
  survival: {
    id: "navy.survival",
    label: "Survival",
    notation: "2d6",
    target: 6,
    characteristicModifier: "int",
    skillModifier: "Vacc Suit",
    failureEffects: [
      {
        id: "navy-mishap-injury",
        type: "injury.add",
        payload: { severity: "minor", label: "Shipboard accident" },
      },
    ],
  },
  advancement: {
    id: "navy.advancement",
    label: "Advancement",
    notation: "2d6",
    target: 8,
    characteristicModifier: "edu",
    skillModifier: "Leadership",
    successEffects: [
      {
        id: "navy-rank",
        type: "career.promote",
        payload: { ranks: 1 },
      },
    ],
  },
  reenlistment: {
    id: "navy.reenlistment",
    label: "Navy Reenlistment",
    notation: "2d6",
    target: 6,
    characteristicModifier: "edu",
    data: {
      successOutcome: "may-continue",
      failureOutcome: "not-retained",
    },
  },
  eventTableId: "navy.events",
  mishapTableId: "navy.mishaps",
  benefitTableIds: ["navy.benefits"],
} satisfies LifepathCareerDefinition;
