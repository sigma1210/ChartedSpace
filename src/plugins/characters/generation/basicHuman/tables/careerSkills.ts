import type { LifepathTableDefinition } from "../../lifepathTypes";

export const careerSkillTables = [
{
  id: "free-trader.skills",
  label: "Free Trader Skills",
  kind: "roll",
  scope: "skill",
  notation: "1d6",
  entries: [
    {
      id: "free-trader.skill-broker",
      label: "Broker",
      range: [1, 2],
      effects: [
        {
          id: "free-trader.skill-broker.effect",
          type: "skill.add",
          payload: { skill: "Broker", level: 1 },
        },
      ],
    },
    {
      id: "free-trader.skill-pilot",
      label: "Pilot",
      range: [3, 4],
      effects: [
        {
          id: "free-trader.skill-pilot.effect",
          type: "skill.add",
          payload: { skill: "Pilot", level: 1 },
        },
      ],
    },
    {
      id: "free-trader.skill-admin",
      label: "Admin",
      range: [5, 5],
      effects: [
        {
          id: "free-trader.skill-admin.effect",
          type: "skill.add",
          payload: { skill: "Admin", level: 1 },
        },
      ],
    },
    {
      id: "free-trader.skill-streetwise",
      label: "Streetwise",
      range: [6, 6],
      effects: [
        {
          id: "free-trader.skill-streetwise.effect",
          type: "skill.add",
          payload: { skill: "Streetwise", level: 1 },
        },
      ],
    },
  ],
},
{
  id: "agent.skills",
  label: "Agent Skills",
  kind: "roll",
  scope: "skill",
  notation: "1d6",
  entries: [
    {
      id: "agent.skill-investigate",
      label: "Investigate",
      range: [1, 1],
      effects: [
        {
          id: "agent.skill-investigate.effect",
          type: "skill.add",
          payload: { skill: "Investigate", level: 1 },
        },
      ],
    },
    {
      id: "agent.skill-streetwise",
      label: "Streetwise",
      range: [2, 2],
      effects: [
        {
          id: "agent.skill-streetwise.effect",
          type: "skill.add",
          payload: { skill: "Streetwise", level: 1 },
        },
      ],
    },
    {
      id: "agent.skill-deception",
      label: "Deception",
      range: [3, 3],
      effects: [
        {
          id: "agent.skill-deception.effect",
          type: "skill.add",
          payload: { skill: "Deception", level: 1 },
        },
      ],
    },
    {
      id: "agent.skill-recon",
      label: "Recon",
      range: [4, 4],
      effects: [
        {
          id: "agent.skill-recon.effect",
          type: "skill.add",
          payload: { skill: "Recon", level: 1 },
        },
      ],
    },
    {
      id: "agent.skill-admin",
      label: "Admin",
      range: [5, 5],
      effects: [
        {
          id: "agent.skill-admin.effect",
          type: "skill.add",
          payload: { skill: "Admin", level: 1 },
        },
      ],
    },
    {
      id: "agent.skill-gun-combat",
      label: "Gun Combat",
      range: [6, 6],
      effects: [
        {
          id: "agent.skill-gun-combat.effect",
          type: "skill.add",
          payload: { skill: "Gun Combat", level: 1 },
        },
      ],
    },
  ],
},
{
  id: "scholar.skills",
  label: "Scholar Skills",
  kind: "roll",
  scope: "skill",
  notation: "1d6",
  entries: [
    {
      id: "scholar.skill-science",
      label: "Science",
      range: [1, 1],
      effects: [
        {
          id: "scholar.skill-science.effect",
          type: "skill.add",
          payload: { skill: "Science", level: 1 },
        },
      ],
    },
    {
      id: "scholar.skill-medic",
      label: "Medic",
      range: [2, 2],
      effects: [
        {
          id: "scholar.skill-medic.effect",
          type: "skill.add",
          payload: { skill: "Medic", level: 1 },
        },
      ],
    },
    {
      id: "scholar.skill-investigate",
      label: "Investigate",
      range: [3, 3],
      effects: [
        {
          id: "scholar.skill-investigate.effect",
          type: "skill.add",
          payload: { skill: "Investigate", level: 1 },
        },
      ],
    },
    {
      id: "scholar.skill-electronics",
      label: "Electronics",
      range: [4, 4],
      effects: [
        {
          id: "scholar.skill-electronics.effect",
          type: "skill.add",
          payload: { skill: "Electronics", level: 1 },
        },
      ],
    },
    {
      id: "scholar.skill-admin",
      label: "Admin",
      range: [5, 5],
      effects: [
        {
          id: "scholar.skill-admin.effect",
          type: "skill.add",
          payload: { skill: "Admin", level: 1 },
        },
      ],
    },
    {
      id: "scholar.skill-diplomat",
      label: "Diplomat",
      range: [6, 6],
      effects: [
        {
          id: "scholar.skill-diplomat.effect",
          type: "skill.add",
          payload: { skill: "Diplomat", level: 1 },
        },
      ],
    },
  ],
},
{
  id: "entertainer.skills",
  label: "Entertainer Skills",
  kind: "roll",
  scope: "skill",
  notation: "1d6",
  entries: [
    {
      id: "entertainer.skill-art",
      label: "Art",
      range: [1, 1],
      effects: [
        {
          id: "entertainer.skill-art.effect",
          type: "skill.add",
          payload: { skill: "Art", level: 1 },
        },
      ],
    },
    {
      id: "entertainer.skill-persuade",
      label: "Persuade",
      range: [2, 2],
      effects: [
        {
          id: "entertainer.skill-persuade.effect",
          type: "skill.add",
          payload: { skill: "Persuade", level: 1 },
        },
      ],
    },
    {
      id: "entertainer.skill-carouse",
      label: "Carouse",
      range: [3, 3],
      effects: [
        {
          id: "entertainer.skill-carouse.effect",
          type: "skill.add",
          payload: { skill: "Carouse", level: 1 },
        },
      ],
    },
    {
      id: "entertainer.skill-deception",
      label: "Deception",
      range: [4, 4],
      effects: [
        {
          id: "entertainer.skill-deception.effect",
          type: "skill.add",
          payload: { skill: "Deception", level: 1 },
        },
      ],
    },
    {
      id: "entertainer.skill-streetwise",
      label: "Streetwise",
      range: [5, 5],
      effects: [
        {
          id: "entertainer.skill-streetwise.effect",
          type: "skill.add",
          payload: { skill: "Streetwise", level: 1 },
        },
      ],
    },
    {
      id: "entertainer.skill-diplomat",
      label: "Diplomat",
      range: [6, 6],
      effects: [
        {
          id: "entertainer.skill-diplomat.effect",
          type: "skill.add",
          payload: { skill: "Diplomat", level: 1 },
        },
      ],
    },
  ],
},
{
  id: "navy.skills",
  label: "Navy Skills",
  kind: "roll",
  scope: "skill",
  notation: "1d6",
  entries: [
    {
      id: "navy.skill-vacc-suit",
      label: "Vacc Suit",
      range: [1, 1],
      effects: [
        {
          id: "navy.skill-vacc-suit.effect",
          type: "skill.add",
          payload: { skill: "Vacc Suit", level: 1 },
        },
      ],
    },
    {
      id: "navy.skill-gunner",
      label: "Gunner",
      range: [2, 2],
      effects: [
        {
          id: "navy.skill-gunner.effect",
          type: "skill.add",
          payload: { skill: "Gunner", level: 1 },
        },
      ],
    },
    {
      id: "navy.skill-mechanic",
      label: "Mechanic",
      range: [3, 3],
      effects: [
        {
          id: "navy.skill-mechanic.effect",
          type: "skill.add",
          payload: { skill: "Mechanic", level: 1 },
        },
      ],
    },
    {
      id: "navy.skill-electronics",
      label: "Electronics",
      range: [4, 4],
      effects: [
        {
          id: "navy.skill-electronics.effect",
          type: "skill.add",
          payload: { skill: "Electronics", level: 1 },
        },
      ],
    },
    {
      id: "navy.skill-pilot",
      label: "Pilot",
      range: [5, 5],
      effects: [
        {
          id: "navy.skill-pilot.effect",
          type: "skill.add",
          payload: { skill: "Pilot", level: 1 },
        },
      ],
    },
    {
      id: "navy.skill-tactics",
      label: "Tactics",
      range: [6, 6],
      effects: [
        {
          id: "navy.skill-tactics.effect",
          type: "skill.add",
          payload: { skill: "Tactics", level: 1 },
        },
      ],
    },
  ],
},
{
  id: "army.skills",
  label: "Army Skills",
  kind: "roll",
  scope: "skill",
  notation: "1d6",
  entries: [
    {
      id: "army.skill-gun-combat",
      label: "Gun Combat",
      range: [1, 1],
      effects: [
        {
          id: "army.skill-gun-combat.effect",
          type: "skill.add",
          payload: { skill: "Gun Combat", level: 1 },
        },
      ],
    },
    {
      id: "army.skill-recon",
      label: "Recon",
      range: [2, 2],
      effects: [
        {
          id: "army.skill-recon.effect",
          type: "skill.add",
          payload: { skill: "Recon", level: 1 },
        },
      ],
    },
    {
      id: "army.skill-athletics",
      label: "Athletics",
      range: [3, 3],
      effects: [
        {
          id: "army.skill-athletics.effect",
          type: "skill.add",
          payload: { skill: "Athletics", level: 1 },
        },
      ],
    },
    {
      id: "army.skill-heavy-weapons",
      label: "Heavy Weapons",
      range: [4, 4],
      effects: [
        {
          id: "army.skill-heavy-weapons.effect",
          type: "skill.add",
          payload: { skill: "Heavy Weapons", level: 1 },
        },
      ],
    },
    {
      id: "army.skill-leadership",
      label: "Leadership",
      range: [5, 5],
      effects: [
        {
          id: "army.skill-leadership.effect",
          type: "skill.add",
          payload: { skill: "Leadership", level: 1 },
        },
      ],
    },
    {
      id: "army.skill-tactics",
      label: "Tactics",
      range: [6, 6],
      effects: [
        {
          id: "army.skill-tactics.effect",
          type: "skill.add",
          payload: { skill: "Tactics", level: 1 },
        },
      ],
    },
  ],
},
{
  id: "marines.skills",
  label: "Marines Skills",
  kind: "roll",
  scope: "skill",
  notation: "1d6",
  entries: [
    {
      id: "marines.skill-gun-combat",
      label: "Gun Combat",
      range: [1, 1],
      effects: [
        {
          id: "marines.skill-gun-combat.effect",
          type: "skill.add",
          payload: { skill: "Gun Combat", level: 1 },
        },
      ],
    },
    {
      id: "marines.skill-vacc-suit",
      label: "Vacc Suit",
      range: [2, 2],
      effects: [
        {
          id: "marines.skill-vacc-suit.effect",
          type: "skill.add",
          payload: { skill: "Vacc Suit", level: 1 },
        },
      ],
    },
    {
      id: "marines.skill-athletics",
      label: "Athletics",
      range: [3, 3],
      effects: [
        {
          id: "marines.skill-athletics.effect",
          type: "skill.add",
          payload: { skill: "Athletics", level: 1 },
        },
      ],
    },
    {
      id: "marines.skill-melee",
      label: "Melee",
      range: [4, 4],
      effects: [
        {
          id: "marines.skill-melee.effect",
          type: "skill.add",
          payload: { skill: "Melee", level: 1 },
        },
      ],
    },
    {
      id: "marines.skill-recon",
      label: "Recon",
      range: [5, 5],
      effects: [
        {
          id: "marines.skill-recon.effect",
          type: "skill.add",
          payload: { skill: "Recon", level: 1 },
        },
      ],
    },
    {
      id: "marines.skill-tactics",
      label: "Tactics",
      range: [6, 6],
      effects: [
        {
          id: "marines.skill-tactics.effect",
          type: "skill.add",
          payload: { skill: "Tactics", level: 1 },
        },
      ],
    },
  ],
},
{
  id: "survey-scout.skills",
  label: "Survey Scout Skills",
  kind: "roll",
  scope: "skill",
  notation: "1d6",
  entries: [
    {
      id: "survey-scout.skill-recon",
      label: "Recon",
      range: [1, 2],
      effects: [
        {
          id: "survey-scout.skill-recon.effect",
          type: "skill.add",
          payload: { skill: "Recon", level: 1 },
        },
      ],
    },
    {
      id: "survey-scout.skill-survival",
      label: "Survival",
      range: [3, 4],
      effects: [
        {
          id: "survey-scout.skill-survival.effect",
          type: "skill.add",
          payload: { skill: "Survival", level: 1 },
        },
      ],
    },
    {
      id: "survey-scout.skill-pilot",
      label: "Pilot",
      range: [5, 5],
      effects: [
        {
          id: "survey-scout.skill-pilot.effect",
          type: "skill.add",
          payload: { skill: "Pilot", level: 1 },
        },
      ],
    },
    {
      id: "survey-scout.skill-astrogation",
      label: "Astrogation",
      range: [6, 6],
      effects: [
        {
          id: "survey-scout.skill-astrogation.effect",
          type: "skill.add",
          payload: { skill: "Astrogation", level: 1 },
        },
      ],
    },
  ],
},
{
  id: "drifter.skills",
  label: "Drifter Skills",
  kind: "roll",
  scope: "skill",
  notation: "1d6",
  entries: [
    {
      id: "drifter.skill-streetwise",
      label: "Streetwise",
      range: [1, 3],
      effects: [
        {
          id: "drifter.skill-streetwise.effect",
          type: "skill.add",
          payload: { skill: "Streetwise", level: 1 },
        },
      ],
    },
    {
      id: "drifter.skill-survival",
      label: "Survival",
      range: [4, 6],
      effects: [
        {
          id: "drifter.skill-survival.effect",
          type: "skill.add",
          payload: { skill: "Survival", level: 1 },
        },
      ],
    },
  ],
},
] as const satisfies readonly LifepathTableDefinition[];
