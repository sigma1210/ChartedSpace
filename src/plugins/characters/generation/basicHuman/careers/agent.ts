import type { LifepathCareerDefinition } from "../../lifepathTypes";

export const agentCareer = {
  id: "agent",
  label: "Agent",
  description: "Investigations, intelligence work, security contracts, and quiet leverage.",
  assignments: [
    { id: "agent.law-enforcement", label: "Law Enforcement", description: "Local investigations, warrants, and public order." },
    { id: "agent.intelligence", label: "Intelligence", description: "Analysis, tradecraft, and covert contact networks." },
    { id: "agent.corporate", label: "Corporate", description: "Security audits, internal investigations, and deniable errands." },
  ],
  ranks: [
    { rank: 0, title: "Probationary Agent" },
    {
      rank: 1,
      title: "Agent",
      effects: [
        {
          id: "agent.rank-1-investigate",
          type: "skill.add",
          payload: { skill: "Investigate", level: 1 },
        },
      ],
    },
    {
      rank: 2,
      title: "Special Agent",
      effects: [
        {
          id: "agent.rank-2-streetwise",
          type: "skill.add",
          payload: { skill: "Streetwise", level: 1 },
        },
      ],
    },
    {
      rank: 3,
      title: "Case Officer",
      effects: [
        {
          id: "agent.rank-3-deception",
          type: "skill.add",
          payload: { skill: "Deception", level: 1 },
        },
      ],
    },
  ],
  skillTableIds: ["agent.skills"],
  qualification: {
    id: "agent.qualification",
    label: "Agent Qualification",
    notation: "2d6",
    target: 6,
    characteristicModifier: "int",
    failureEffects: [
      {
        id: "agent-screening-contact",
        type: "relationship.add",
        payload: { relationshipType: "contact", label: "Agency screener" },
      },
    ],
  },
  qualificationModifiers: [
    {
      id: "agent.university-graduate",
      label: "University graduate",
      modifier: 1,
      when: "preCareerEducation",
      educationIds: ["university"],
      graduated: true,
      honorsGraduated: false,
    },
    {
      id: "agent.university-honors",
      label: "University honors graduate",
      modifier: 2,
      when: "preCareerEducation",
      educationIds: ["university"],
      honorsGraduated: true,
    },
    {
      id: "agent.prior-career",
      label: "Prior career",
      modifier: -1,
      when: "hasCareerHistory",
    },
  ],
  survival: {
    id: "agent.survival",
    label: "Survival",
    notation: "2d6",
    target: 6,
    characteristicModifier: "int",
    skillModifier: "Streetwise",
    failureEffects: [
      {
        id: "agent-mishap-injury",
        type: "injury.add",
        payload: { severity: "minor", label: "Compromised operation" },
      },
    ],
  },
  advancement: {
    id: "agent.advancement",
    label: "Advancement",
    notation: "2d6",
    target: 8,
    characteristicModifier: "edu",
    skillModifier: "Investigate",
    successEffects: [
      {
        id: "agent-rank",
        type: "career.promote",
        payload: { ranks: 1 },
      },
    ],
  },
  reenlistment: {
    id: "agent.reenlistment",
    label: "Agent Reenlistment",
    notation: "2d6",
    target: 6,
    characteristicModifier: "int",
    data: {
      successOutcome: "may-continue",
      failureOutcome: "burned",
    },
  },
  eventTableId: "agent.events",
  mishapTableId: "agent.mishaps",
  benefitTableIds: ["agent.benefits"],
} satisfies LifepathCareerDefinition;
