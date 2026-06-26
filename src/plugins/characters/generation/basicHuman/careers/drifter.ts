import type { LifepathCareerDefinition } from "../../lifepathTypes";

export const drifterCareer = {
  id: "drifter",
  label: "Drifter",
  description: "Odd jobs, uncertain shelter, and whatever work can be found.",
  data: {
    hideFromCareerSelection: true,
  },
  assignments: [
    { id: "drifter.wanderer", label: "Wanderer", description: "Moving between ports and taking work as it comes." },
  ],
  ranks: [
    { rank: 0, title: "Wanderer" },
    {
      rank: 1,
      title: "Known Face",
      effects: [
        {
          id: "drifter.rank-1.streetwise",
          type: "skill.add",
          payload: { skill: "Streetwise", level: 1 },
        },
      ],
    },
    {
      rank: 2,
      title: "Local Operator",
      effects: [
        {
          id: "drifter.rank-2.survival",
          type: "skill.add",
          payload: { skill: "Survival", level: 1 },
        },
      ],
    },
  ],
  skillTableIds: ["drifter.skills"],
  survival: {
    id: "drifter.survival",
    label: "Survival",
    notation: "2d6",
    target: 5,
    characteristicModifier: "end",
    skillModifier: "Streetwise",
    failureEffects: [
      {
        id: "drifter-hard-road",
        type: "injury.add",
        payload: { severity: "minor", label: "Hard road" },
      },
    ],
  },
  advancement: {
    id: "drifter.advancement",
    label: "Advancement",
    notation: "2d6",
    target: 9,
    characteristicModifier: "edu",
    skillModifier: "Streetwise",
  },
  eventTableId: "drifter.events",
  mishapTableId: "drifter.mishaps",
  benefitTableIds: ["drifter.benefits"],
} satisfies LifepathCareerDefinition;
