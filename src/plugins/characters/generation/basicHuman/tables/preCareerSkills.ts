import type { LifepathTableDefinition } from "../../lifepathTypes";

export const preCareerSkillTables = [
{
  id: "basic-human.university-skills",
  label: "University Skills",
  kind: "roll",
  scope: "skill",
  notation: "1d6",
  entries: [
    {
      id: "university.skill-admin",
      label: "Admin",
      range: [1, 1],
      effects: [
        {
          id: "university.skill-admin.effect",
          type: "skill.add",
          payload: { skill: "Admin", level: 1 },
        },
      ],
    },
    {
      id: "university.skill-science",
      label: "Science",
      range: [2, 2],
      effects: [
        {
          id: "university.skill-science.effect",
          type: "skill.add",
          payload: { skill: "Science", level: 1 },
        },
      ],
    },
    {
      id: "university.skill-medic",
      label: "Medic",
      range: [3, 3],
      effects: [
        {
          id: "university.skill-medic.effect",
          type: "skill.add",
          payload: { skill: "Medic", level: 1 },
        },
      ],
    },
    {
      id: "university.skill-electronics",
      label: "Electronics",
      range: [4, 4],
      effects: [
        {
          id: "university.skill-electronics.effect",
          type: "skill.add",
          payload: { skill: "Electronics", level: 1 },
        },
      ],
    },
    {
      id: "university.skill-diplomat",
      label: "Diplomat",
      range: [5, 5],
      effects: [
        {
          id: "university.skill-diplomat.effect",
          type: "skill.add",
          payload: { skill: "Diplomat", level: 1 },
        },
      ],
    },
    {
      id: "university.skill-advocate",
      label: "Advocate",
      range: [6, 6],
      effects: [
        {
          id: "university.skill-advocate.effect",
          type: "skill.add",
          payload: { skill: "Advocate", level: 1 },
        },
      ],
    },
  ],
},
{
  id: "basic-human.military-academy-skills",
  label: "Military Academy Skills",
  kind: "roll",
  scope: "skill",
  notation: "1d6",
  entries: [
    {
      id: "military-academy.skill-tactics",
      label: "Tactics",
      range: [1, 1],
      effects: [
        {
          id: "military-academy.skill-tactics.effect",
          type: "skill.add",
          payload: { skill: "Tactics", level: 1 },
        },
      ],
    },
    {
      id: "military-academy.skill-leadership",
      label: "Leadership",
      range: [2, 2],
      effects: [
        {
          id: "military-academy.skill-leadership.effect",
          type: "skill.add",
          payload: { skill: "Leadership", level: 1 },
        },
      ],
    },
    {
      id: "military-academy.skill-gun-combat",
      label: "Gun Combat",
      range: [3, 3],
      effects: [
        {
          id: "military-academy.skill-gun-combat.effect",
          type: "skill.add",
          payload: { skill: "Gun Combat", level: 1 },
        },
      ],
    },
    {
      id: "military-academy.skill-athletics",
      label: "Athletics",
      range: [4, 4],
      effects: [
        {
          id: "military-academy.skill-athletics.effect",
          type: "skill.add",
          payload: { skill: "Athletics", level: 1 },
        },
      ],
    },
    {
      id: "military-academy.skill-pilot",
      label: "Pilot",
      range: [5, 5],
      effects: [
        {
          id: "military-academy.skill-pilot.effect",
          type: "skill.add",
          payload: { skill: "Pilot", level: 1 },
        },
      ],
    },
    {
      id: "military-academy.skill-mechanic",
      label: "Mechanic",
      range: [6, 6],
      effects: [
        {
          id: "military-academy.skill-mechanic.effect",
          type: "skill.add",
          payload: { skill: "Mechanic", level: 1 },
        },
      ],
    },
  ],
},
] as const satisfies readonly LifepathTableDefinition[];
