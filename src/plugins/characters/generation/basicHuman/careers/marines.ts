import type { LifepathCareerDefinition } from "../../lifepathTypes";

export const marinesCareer = {
  id: "marines",
  label: "Marines",
  description: "Shipboard assault troops, boarding actions, and hostile landings.",
  assignments: [
    { id: "marines.assault", label: "Assault", description: "Boarding actions and spearhead drops." },
    { id: "marines.security", label: "Security", description: "Shipboard security, patrols, and hard-point defense." },
    { id: "marines.recon", label: "Recon", description: "Forward observation and dangerous scouting." },
  ],
  ranks: [
    { rank: 0, title: "Marine", track: "enlisted" },
    {
      rank: 1,
      title: "Lance Corporal",
      track: "enlisted",
      effects: [
        {
          id: "marines.rank-1-gun-combat",
          type: "skill.add",
          payload: { skill: "Gun Combat", level: 1 },
        },
      ],
    },
    {
      rank: 2,
      title: "Sergeant",
      track: "enlisted",
      effects: [
        {
          id: "marines.rank-2-leadership",
          type: "skill.add",
          payload: { skill: "Leadership", level: 1 },
        },
      ],
    },
    {
      rank: 3,
      title: "Gunnery Sergeant",
      track: "enlisted",
      effects: [
        {
          id: "marines.rank-3-tactics",
          type: "skill.add",
          payload: { skill: "Tactics", level: 1 },
        },
      ],
    },
    { rank: 1, title: "Lieutenant", track: "officer" },
    {
      rank: 2,
      title: "Captain",
      track: "officer",
      effects: [
        {
          id: "marines.officer-rank-2-tactics",
          type: "skill.add",
          payload: { skill: "Tactics", level: 1 },
        },
      ],
    },
    {
      rank: 3,
      title: "Major",
      track: "officer",
      effects: [
        {
          id: "marines.officer-rank-3-leadership",
          type: "skill.add",
          payload: { skill: "Leadership", level: 1 },
        },
      ],
    },
  ],
  skillTableIds: ["marines.skills"],
  qualification: {
    id: "marines.qualification",
    label: "Marines Qualification",
    notation: "2d6",
    target: 7,
    characteristicModifier: "end",
    failureEffects: [
      {
        id: "marines-recruiter-contact",
        type: "relationship.add",
        payload: { relationshipType: "contact", label: "Marine recruiter" },
      },
    ],
  },
  qualificationModifiers: [
    {
      id: "marines.military-academy-graduate",
      label: "Military Academy graduate",
      modifier: 1,
      when: "preCareerEducation",
      educationIds: ["military-academy"],
      graduated: true,
      honorsGraduated: false,
    },
    {
      id: "marines.military-academy-honors",
      label: "Military Academy honors graduate",
      modifier: 2,
      when: "preCareerEducation",
      educationIds: ["military-academy"],
      honorsGraduated: true,
    },
    {
      id: "marines.prior-career",
      label: "Prior career",
      modifier: -1,
      when: "hasCareerHistory",
    },
  ],
  commission: {
    id: "marines.commission",
    label: "Marines Commission",
    notation: "2d6",
    target: 9,
    characteristicModifier: "edu",
  },
  commissionModifiers: [
    {
      id: "marines.commission.military-academy-graduate",
      label: "Military Academy graduate",
      modifier: 1,
      when: "preCareerEducation",
      educationIds: ["military-academy"],
      graduated: true,
      honorsGraduated: false,
    },
    {
      id: "marines.commission.military-academy-honors",
      label: "Military Academy honors graduate",
      modifier: 2,
      when: "preCareerEducation",
      educationIds: ["military-academy"],
      honorsGraduated: true,
    },
  ],
  survival: {
    id: "marines.survival",
    label: "Survival",
    notation: "2d6",
    target: 7,
    characteristicModifier: "end",
    skillModifier: "Gun Combat",
    failureEffects: [
      {
        id: "marines-mishap-injury",
        type: "injury.add",
        payload: { severity: "minor", label: "Combat wound" },
      },
    ],
  },
  advancement: {
    id: "marines.advancement",
    label: "Advancement",
    notation: "2d6",
    target: 8,
    characteristicModifier: "edu",
    skillModifier: "Tactics",
    successEffects: [
      {
        id: "marines-rank",
        type: "career.promote",
        payload: { ranks: 1 },
      },
    ],
  },
  reenlistment: {
    id: "marines.reenlistment",
    label: "Marines Reenlistment",
    notation: "2d6",
    target: 6,
    characteristicModifier: "edu",
    data: {
      successOutcome: "may-continue",
      failureOutcome: "not-retained",
    },
  },
  eventTableId: "marines.events",
  mishapTableId: "marines.mishaps",
  benefitTableIds: ["marines.benefits"],
} satisfies LifepathCareerDefinition;
