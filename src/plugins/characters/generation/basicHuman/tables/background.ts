import type { LifepathTableDefinition } from "../../lifepathTypes";

export const backgroundTables = [
{
  id: "basic-human.background-skills",
  label: "Background Skills",
  kind: "choice",
  scope: "background",
  entries: [
    {
      id: "background-admin",
      label: "Admin",
      effects: [
        {
          id: "background-admin.effect",
          type: "skill.add",
          payload: { skill: "Admin", level: 0 },
        },
      ],
    },
    {
      id: "background-broker",
      label: "Broker",
      effects: [
        {
          id: "background-broker.effect",
          type: "skill.add",
          payload: { skill: "Broker", level: 0 },
        },
      ],
    },
    {
      id: "background-pilot",
      label: "Pilot",
      effects: [
        {
          id: "background-pilot.effect",
          type: "skill.add",
          payload: { skill: "Pilot", level: 0 },
        },
      ],
    },
    {
      id: "background-streetwise",
      label: "Streetwise",
      effects: [
        {
          id: "background-streetwise.effect",
          type: "skill.add",
          payload: { skill: "Streetwise", level: 0 },
        },
      ],
    },
    {
      id: "background-survival",
      label: "Survival",
      effects: [
        {
          id: "background-survival.effect",
          type: "skill.add",
          payload: { skill: "Survival", level: 0 },
        },
      ],
    },
  ],
},
] as const satisfies readonly LifepathTableDefinition[];
