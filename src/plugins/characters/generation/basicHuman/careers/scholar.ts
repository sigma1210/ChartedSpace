import type { LifepathCareerDefinition } from "../../lifepathTypes";

export const scholarCareer = {
  id: "scholar",
  label: "Scholar",
  description: "Research, medicine, field science, and institutional politics.",
  assignments: [
    { id: "scholar.researcher", label: "Researcher", description: "Laboratories, archives, grants, and peer review." },
    { id: "scholar.physician", label: "Physician", description: "Clinics, trauma wards, and public health duty." },
    { id: "scholar.field-scientist", label: "Field Scientist", description: "Expeditions, surveys, and uncomfortable evidence." },
  ],
  ranks: [
    { rank: 0, title: "Assistant" },
    {
      rank: 1,
      title: "Researcher",
      effects: [
        {
          id: "scholar.rank-1-science",
          type: "skill.add",
          payload: { skill: "Science", level: 1 },
        },
      ],
    },
    {
      rank: 2,
      title: "Senior Scholar",
      effects: [
        {
          id: "scholar.rank-2-admin",
          type: "skill.add",
          payload: { skill: "Admin", level: 1 },
        },
      ],
    },
    {
      rank: 3,
      title: "Professor",
      effects: [
        {
          id: "scholar.rank-3-diplomat",
          type: "skill.add",
          payload: { skill: "Diplomat", level: 1 },
        },
      ],
    },
  ],
  skillTableIds: ["scholar.skills"],
  qualification: {
    id: "scholar.qualification",
    label: "Scholar Qualification",
    notation: "2d6",
    target: 6,
    characteristicModifier: "edu",
    failureEffects: [
      {
        id: "scholar-admissions-contact",
        type: "relationship.add",
        payload: { relationshipType: "contact", label: "Academic advisor" },
      },
    ],
  },
  qualificationModifiers: [
    {
      id: "scholar.university-graduate",
      label: "University graduate",
      modifier: 1,
      when: "preCareerEducation",
      educationIds: ["university"],
      graduated: true,
      honorsGraduated: false,
    },
    {
      id: "scholar.university-honors",
      label: "University honors graduate",
      modifier: 2,
      when: "preCareerEducation",
      educationIds: ["university"],
      honorsGraduated: true,
    },
    {
      id: "scholar.prior-career",
      label: "Prior career",
      modifier: -1,
      when: "hasCareerHistory",
    },
  ],
  survival: {
    id: "scholar.survival",
    label: "Survival",
    notation: "2d6",
    target: 5,
    characteristicModifier: "edu",
    skillModifier: "Science",
    failureEffects: [
      {
        id: "scholar-mishap-injury",
        type: "injury.add",
        payload: { severity: "minor", label: "Research accident" },
      },
    ],
  },
  advancement: {
    id: "scholar.advancement",
    label: "Advancement",
    notation: "2d6",
    target: 7,
    characteristicModifier: "int",
    skillModifier: "Admin",
    successEffects: [
      {
        id: "scholar-rank",
        type: "career.promote",
        payload: { ranks: 1 },
      },
    ],
  },
  reenlistment: {
    id: "scholar.reenlistment",
    label: "Scholar Reappointment",
    notation: "2d6",
    target: 5,
    characteristicModifier: "edu",
    data: {
      successOutcome: "may-continue",
      failureOutcome: "grant-ended",
    },
  },
  eventTableId: "scholar.events",
  mishapTableId: "scholar.mishaps",
  benefitTableIds: ["scholar.benefits"],
} satisfies LifepathCareerDefinition;
