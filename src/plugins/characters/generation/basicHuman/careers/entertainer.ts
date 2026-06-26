import type { LifepathCareerDefinition } from "../../lifepathTypes";

export const entertainerCareer = {
  id: "entertainer",
  label: "Entertainer",
  description: "Performance, media, celebrity circles, scandal, and patronage.",
  assignments: [
    { id: "entertainer.performer", label: "Performer", description: "Stage, screen, recordings, and public spectacle." },
    { id: "entertainer.journalist", label: "Journalist", description: "Newsrooms, investigations, interviews, and spin." },
    { id: "entertainer.socialite", label: "Socialite", description: "Parties, patrons, fashion, and influence networks." },
  ],
  ranks: [
    { rank: 0, title: "Unknown" },
    {
      rank: 1,
      title: "Working Talent",
      effects: [
        {
          id: "entertainer.rank-1-art",
          type: "skill.add",
          payload: { skill: "Art", level: 1 },
        },
      ],
    },
    {
      rank: 2,
      title: "Recognized Name",
      effects: [
        {
          id: "entertainer.rank-2-persuade",
          type: "skill.add",
          payload: { skill: "Persuade", level: 1 },
        },
      ],
    },
    {
      rank: 3,
      title: "Star",
      effects: [
        {
          id: "entertainer.rank-3-carouse",
          type: "skill.add",
          payload: { skill: "Carouse", level: 1 },
        },
      ],
    },
  ],
  skillTableIds: ["entertainer.skills"],
  qualification: {
    id: "entertainer.qualification",
    label: "Entertainer Qualification",
    notation: "2d6",
    target: 5,
    characteristicModifier: "soc",
    failureEffects: [
      {
        id: "entertainer-audition-contact",
        type: "relationship.add",
        payload: { relationshipType: "contact", label: "Casting assistant" },
      },
    ],
  },
  qualificationModifiers: [
    {
      id: "entertainer.university-graduate",
      label: "University graduate",
      modifier: 1,
      when: "preCareerEducation",
      educationIds: ["university"],
      graduated: true,
      honorsGraduated: false,
    },
    {
      id: "entertainer.university-honors",
      label: "University honors graduate",
      modifier: 2,
      when: "preCareerEducation",
      educationIds: ["university"],
      honorsGraduated: true,
    },
    {
      id: "entertainer.prior-career",
      label: "Prior career",
      modifier: -1,
      when: "hasCareerHistory",
    },
  ],
  survival: {
    id: "entertainer.survival",
    label: "Survival",
    notation: "2d6",
    target: 5,
    characteristicModifier: "soc",
    skillModifier: "Streetwise",
    failureEffects: [
      {
        id: "entertainer-mishap-injury",
        type: "injury.add",
        payload: { severity: "minor", label: "Public scandal" },
      },
    ],
  },
  advancement: {
    id: "entertainer.advancement",
    label: "Advancement",
    notation: "2d6",
    target: 7,
    characteristicModifier: "int",
    skillModifier: "Art",
    successEffects: [
      {
        id: "entertainer-rank",
        type: "career.promote",
        payload: { ranks: 1 },
      },
    ],
  },
  reenlistment: {
    id: "entertainer.reenlistment",
    label: "Entertainer Contract Renewal",
    notation: "2d6",
    target: 5,
    characteristicModifier: "soc",
    data: {
      successOutcome: "may-continue",
      failureOutcome: "contract-ended",
    },
  },
  eventTableId: "entertainer.events",
  mishapTableId: "entertainer.mishaps",
  benefitTableIds: ["entertainer.benefits"],
} satisfies LifepathCareerDefinition;
