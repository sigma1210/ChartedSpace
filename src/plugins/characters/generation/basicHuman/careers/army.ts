import type { LifepathCareerDefinition } from "../../lifepathTypes";

export const armyCareer = {
  id: "army",
  label: "Army",
  description: "Ground campaigns, garrison duty, and planetary operations.",
  assignments: [
    { id: "army.infantry", label: "Infantry", description: "Front-line combat and patrol work." },
    { id: "army.armor", label: "Armor", description: "Vehicle crews, heavy weapons, and breakthrough operations." },
    { id: "army.support", label: "Support", description: "Logistics, field engineering, and operational planning." },
  ],
  ranks: [
    { rank: 0, title: "Trooper", track: "enlisted" },
    {
      rank: 1,
      title: "Corporal",
      track: "enlisted",
      effects: [
        {
          id: "army.rank-1-gun-combat",
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
          id: "army.rank-2-leadership",
          type: "skill.add",
          payload: { skill: "Leadership", level: 1 },
        },
      ],
    },
    {
      rank: 3,
      title: "Sergeant Major",
      track: "enlisted",
      effects: [
        {
          id: "army.rank-3-tactics",
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
          id: "army.officer-rank-2-leadership",
          type: "skill.add",
          payload: { skill: "Leadership", level: 1 },
        },
      ],
    },
    {
      rank: 3,
      title: "Major",
      track: "officer",
      effects: [
        {
          id: "army.officer-rank-3-tactics",
          type: "skill.add",
          payload: { skill: "Tactics", level: 1 },
        },
      ],
    },
  ],
  skillTableIds: ["army.skills"],
  qualification: {
    id: "army.qualification",
    label: "Army Qualification",
    notation: "2d6",
    target: 6,
    characteristicModifier: "end",
    failureEffects: [
      {
        id: "army-recruiter-contact",
        type: "relationship.add",
        payload: { relationshipType: "contact", label: "Army recruiter" },
      },
    ],
  },
  qualificationModifiers: [
    {
      id: "army.military-academy-graduate",
      label: "Military Academy graduate",
      modifier: 1,
      when: "preCareerEducation",
      educationIds: ["military-academy"],
      graduated: true,
      honorsGraduated: false,
    },
    {
      id: "army.military-academy-honors",
      label: "Military Academy honors graduate",
      modifier: 2,
      when: "preCareerEducation",
      educationIds: ["military-academy"],
      honorsGraduated: true,
    },
    {
      id: "army.prior-career",
      label: "Prior career",
      modifier: -1,
      when: "hasCareerHistory",
    },
  ],
  commission: {
    id: "army.commission",
    label: "Army Commission",
    notation: "2d6",
    target: 8,
    characteristicModifier: "edu",
  },
  commissionModifiers: [
    {
      id: "army.commission.military-academy-graduate",
      label: "Military Academy graduate",
      modifier: 1,
      when: "preCareerEducation",
      educationIds: ["military-academy"],
      graduated: true,
      honorsGraduated: false,
    },
    {
      id: "army.commission.military-academy-honors",
      label: "Military Academy honors graduate",
      modifier: 2,
      when: "preCareerEducation",
      educationIds: ["military-academy"],
      honorsGraduated: true,
    },
  ],
  survival: {
    id: "army.survival",
    label: "Survival",
    notation: "2d6",
    target: 6,
    characteristicModifier: "end",
    skillModifier: "Recon",
    failureEffects: [
      {
        id: "army-mishap-injury",
        type: "injury.add",
        payload: { severity: "minor", label: "Field injury" },
      },
    ],
  },
  advancement: {
    id: "army.advancement",
    label: "Advancement",
    notation: "2d6",
    target: 7,
    characteristicModifier: "edu",
    skillModifier: "Leadership",
    successEffects: [
      {
        id: "army-rank",
        type: "career.promote",
        payload: { ranks: 1 },
      },
    ],
  },
  reenlistment: {
    id: "army.reenlistment",
    label: "Army Reenlistment",
    notation: "2d6",
    target: 6,
    characteristicModifier: "edu",
    data: {
      successOutcome: "may-continue",
      failureOutcome: "not-retained",
    },
  },
  eventTableId: "army.events",
  mishapTableId: "army.mishaps",
  benefitTableIds: ["army.benefits"],
} satisfies LifepathCareerDefinition;
