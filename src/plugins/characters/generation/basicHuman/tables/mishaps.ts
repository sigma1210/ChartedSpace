import type { LifepathTableDefinition } from "../../lifepathTypes";

export const mishapTables = [
{
  id: "free-trader.mishaps",
  label: "Free Trader Mishaps",
  kind: "roll",
  scope: "mishap",
  notation: "1d6",
  entries: [
    {
      id: "free-trader.rival",
      label: "Deal Gone Sour",
      range: [1, 3],
      effects: [
        {
          id: "free-trader.rival.effect",
          type: "relationship.add",
          payload: { relationshipType: "rival", label: "Angry creditor" },
        },
        {
          id: "free-trader.leave",
          type: "career.leave",
          payload: { careerId: "free-trader" },
        },
      ],
    },
    {
      id: "free-trader.enemy",
      label: "Defaulted Backer",
      range: [4, 6],
      effects: [
        {
          id: "free-trader.enemy.effect",
          type: "relationship.add",
          payload: { relationshipType: "enemy", label: "Defaulted ship backer" },
        },
        {
          id: "free-trader.enemy.leave",
          type: "career.leave",
          payload: { careerId: "free-trader" },
        },
      ],
    },
  ],
},
{
  id: "agent.mishaps",
  label: "Agent Mishaps",
  kind: "roll",
  scope: "mishap",
  notation: "1d6",
  entries: [
    {
      id: "agent-injury",
      label: "Operation Went Bad",
      range: [1, 3],
      effects: [
        {
          id: "agent-injury.effect",
          type: "injury.add",
          payload: { severity: "minor", label: "Botched operation" },
        },
        {
          id: "agent-injury.leave",
          type: "career.leave",
          payload: { careerId: "agent" },
        },
      ],
    },
    {
      id: "agent-burned",
      label: "Cover Blown",
      range: [4, 6],
      effects: [
        {
          id: "agent-burned.effect",
          type: "relationship.add",
          payload: { relationshipType: "enemy", label: "Exposed target" },
        },
        {
          id: "agent-burned.leave",
          type: "career.leave",
          payload: { careerId: "agent" },
        },
      ],
    },
  ],
},
{
  id: "scholar.mishaps",
  label: "Scholar Mishaps",
  kind: "roll",
  scope: "mishap",
  notation: "1d6",
  entries: [
    {
      id: "scholar-accident",
      label: "Research Accident",
      range: [1, 3],
      effects: [
        {
          id: "scholar-accident.effect",
          type: "injury.add",
          payload: { severity: "minor", label: "Laboratory accident" },
        },
        {
          id: "scholar-accident.leave",
          type: "career.leave",
          payload: { careerId: "scholar" },
        },
      ],
    },
    {
      id: "scholar-disgrace",
      label: "Institutional Dispute",
      range: [4, 6],
      effects: [
        {
          id: "scholar-disgrace.effect",
          type: "relationship.add",
          payload: { relationshipType: "rival", label: "Hostile review board" },
        },
        {
          id: "scholar-disgrace.leave",
          type: "career.leave",
          payload: { careerId: "scholar" },
        },
      ],
    },
  ],
},
{
  id: "entertainer.mishaps",
  label: "Entertainer Mishaps",
  kind: "roll",
  scope: "mishap",
  notation: "1d6",
  entries: [
    {
      id: "entertainer-blacklisted",
      label: "Blacklisted",
      range: [1, 3],
      effects: [
        {
          id: "entertainer-blacklisted.effect",
          type: "relationship.add",
          payload: { relationshipType: "enemy", label: "Studio executive" },
        },
        {
          id: "entertainer-blacklisted.leave",
          type: "career.leave",
          payload: { careerId: "entertainer" },
        },
      ],
    },
    {
      id: "entertainer-dangerous-patron",
      label: "Dangerous Patron",
      range: [4, 6],
      effects: [
        {
          id: "entertainer-dangerous-patron.effect",
          type: "relationship.add",
          payload: { relationshipType: "enemy", label: "Dangerous patron" },
        },
        {
          id: "entertainer-dangerous-patron.leave",
          type: "career.leave",
          payload: { careerId: "entertainer" },
        },
      ],
    },
  ],
},
{
  id: "navy.mishaps",
  label: "Navy Mishaps",
  kind: "roll",
  scope: "mishap",
  notation: "1d6",
  entries: [
    {
      id: "navy-injury",
      label: "Damage Control Casualty",
      range: [1, 3],
      effects: [
        {
          id: "navy-injury.effect",
          type: "injury.add",
          payload: { severity: "minor", label: "Damage control injury" },
        },
        {
          id: "navy-injury.leave",
          type: "career.leave",
          payload: { careerId: "navy" },
        },
      ],
    },
    {
      id: "navy-rival",
      label: "Blamed for an Incident",
      range: [4, 6],
      effects: [
        {
          id: "navy-rival.effect",
          type: "relationship.add",
          payload: { relationshipType: "rival", label: "Former watch officer" },
        },
        {
          id: "navy-rival.leave",
          type: "career.leave",
          payload: { careerId: "navy" },
        },
      ],
    },
  ],
},
{
  id: "army.mishaps",
  label: "Army Mishaps",
  kind: "roll",
  scope: "mishap",
  notation: "1d6",
  entries: [
    {
      id: "army-injury",
      label: "Combat Injury",
      range: [1, 3],
      effects: [
        {
          id: "army-injury.effect",
          type: "injury.add",
          payload: { severity: "minor", label: "Combat injury" },
        },
        {
          id: "army-injury.leave",
          type: "career.leave",
          payload: { careerId: "army" },
        },
      ],
    },
    {
      id: "army-rival",
      label: "Command Dispute",
      range: [4, 6],
      effects: [
        {
          id: "army-rival.effect",
          type: "relationship.add",
          payload: { relationshipType: "rival", label: "Former platoon leader" },
        },
        {
          id: "army-rival.leave",
          type: "career.leave",
          payload: { careerId: "army" },
        },
      ],
    },
  ],
},
{
  id: "marines.mishaps",
  label: "Marines Mishaps",
  kind: "roll",
  scope: "mishap",
  notation: "1d6",
  entries: [
    {
      id: "marines-injury",
      label: "Assault Casualty",
      range: [1, 3],
      effects: [
        {
          id: "marines-injury.effect",
          type: "injury.add",
          payload: { severity: "minor", label: "Assault casualty" },
        },
        {
          id: "marines-injury.leave",
          type: "career.leave",
          payload: { careerId: "marines" },
        },
      ],
    },
    {
      id: "marines-enemy",
      label: "Enemy Made",
      range: [4, 6],
      effects: [
        {
          id: "marines-enemy.effect",
          type: "relationship.add",
          payload: { relationshipType: "enemy", label: "Former opposing commander" },
        },
        {
          id: "marines-enemy.leave",
          type: "career.leave",
          payload: { careerId: "marines" },
        },
      ],
    },
  ],
},
{
  id: "survey-scout.mishaps",
  label: "Survey Scout Mishaps",
  kind: "roll",
  scope: "mishap",
  notation: "1d6",
  entries: [
    {
      id: "survey-scout.enemy",
      label: "Survey Blame",
      range: [1, 3],
      effects: [
        {
          id: "survey-scout.enemy.effect",
          type: "relationship.add",
          payload: { relationshipType: "enemy", label: "Disgraced mission lead" },
        },
        {
          id: "survey-scout.leave",
          type: "career.leave",
          payload: { careerId: "survey-scout" },
        },
      ],
    },
    {
      id: "survey-scout.stranded-contact",
      label: "Stranded Together",
      range: [4, 6],
      effects: [
        {
          id: "survey-scout.stranded-contact.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Stranded survey tech" },
        },
        {
          id: "survey-scout.stranded-contact.leave",
          type: "career.leave",
          payload: { careerId: "survey-scout" },
        },
      ],
    },
  ],
},
{
  id: "drifter.mishaps",
  label: "Drifter Mishaps",
  kind: "roll",
  scope: "mishap",
  notation: "1d6",
  entries: [
    {
      id: "drifter-enemy",
      label: "Bad Blood",
      range: [1, 3],
      effects: [
        {
          id: "drifter-enemy.effect",
          type: "relationship.add",
          payload: { relationshipType: "enemy", label: "Dockside enemy" },
        },
        {
          id: "drifter-leave",
          type: "career.leave",
          payload: { careerId: "drifter" },
        },
      ],
    },
    {
      id: "drifter-rival-mishap",
      label: "Burned Bridge",
      range: [4, 6],
      effects: [
        {
          id: "drifter-rival-mishap.effect",
          type: "relationship.add",
          payload: { relationshipType: "rival", label: "Former workmate" },
        },
        {
          id: "drifter-rival-mishap.leave",
          type: "career.leave",
          payload: { careerId: "drifter" },
        },
      ],
    },
  ],
},
] as const satisfies readonly LifepathTableDefinition[];
