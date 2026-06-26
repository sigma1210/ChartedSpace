import type { LifepathCareerDefinition } from "../../lifepathTypes";

export const freeTraderCareer = {
  id: "free-trader",
  label: "Free Trader",
  description: "Independent commerce, uncertain patronage, and risk-heavy routes.",
  assignments: [
    { id: "free-trader.broker", label: "Broker", description: "Deals, cargo, and contacts." },
    { id: "free-trader.deck", label: "Deck Crew", description: "Shipboard operations." },
  ],
  ranks: [
    { rank: 0, title: "Crew" },
    {
      rank: 1,
      title: "Senior Crew",
      effects: [
        {
          id: "free-trader.rank-1.admin",
          type: "skill.add",
          payload: { skill: "Admin", level: 1 },
        },
      ],
    },
    {
      rank: 2,
      title: "Factor",
      effects: [
        {
          id: "free-trader.rank-2.broker",
          type: "skill.add",
          payload: { skill: "Broker", level: 1 },
        },
      ],
    },
    {
      rank: 3,
      title: "Captain",
      effects: [
        {
          id: "free-trader.rank-3.pilot",
          type: "skill.add",
          payload: { skill: "Pilot", level: 1 },
        },
      ],
    },
  ],
  skillTableIds: ["free-trader.skills"],
  qualification: {
    id: "free-trader.qualification",
    label: "Free Trader Qualification",
    notation: "2d6",
    target: 4,
    characteristicModifier: "soc",
    failureEffects: [
      {
        id: "free-trader.qualification-rival",
        type: "relationship.add",
        payload: { relationshipType: "rival", label: "Port broker" },
      },
    ],
  },
  qualificationModifiers: [
    {
      id: "free-trader.university-graduate",
      label: "University graduate",
      modifier: 1,
      when: "preCareerEducation",
      educationIds: ["university"],
      graduated: true,
      honorsGraduated: false,
    },
    {
      id: "free-trader.university-honors",
      label: "University honors graduate",
      modifier: 2,
      when: "preCareerEducation",
      educationIds: ["university"],
      honorsGraduated: true,
    },
    {
      id: "free-trader.prior-career",
      label: "Prior career",
      modifier: -1,
      when: "hasCareerHistory",
    },
  ],
  survival: {
    id: "free-trader.survival",
    label: "Survival",
    notation: "2d6",
    target: 5,
    characteristicModifier: "int",
    skillModifier: "Pilot",
    failureEffects: [
      {
        id: "free-trader.debt-scar",
        type: "injury.add",
        payload: { severity: "minor", label: "Bad debt and hard travel" },
      },
    ],
  },
  advancement: {
    id: "free-trader.advancement",
    label: "Advancement",
    notation: "2d6",
    target: 8,
    characteristicModifier: "edu",
    skillModifier: "Broker",
    successEffects: [
      {
        id: "free-trader.rank",
        type: "career.promote",
        payload: { ranks: 1 },
      },
    ],
  },
  eventTableId: "free-trader.events",
  mishapTableId: "free-trader.mishaps",
  benefitTableIds: ["free-trader.cash-benefits", "free-trader.material-benefits"],
} satisfies LifepathCareerDefinition;
