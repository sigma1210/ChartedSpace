import type { LifepathTableDefinition } from "../../lifepathTypes";

export const eventTables = [
{
  id: "free-trader.events",
  label: "Free Trader Events",
  kind: "roll",
  scope: "career-event",
  notation: "2d6",
  entries: [
    {
      id: "free-trader.contact",
      label: "Useful Port Contact",
      range: [2, 6],
      effects: [
        {
          id: "free-trader.contact.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Port factor" },
        },
      ],
    },
    {
      id: "free-trader.social-choice",
      label: "Crew Entanglement",
      range: [7, 7],
      effects: [],
      choicePrompt: "Choose how this crew relationship settled.",
      choices: [
        {
          id: "crew-contact",
          label: "Contact",
          description: "You know who to call at a port.",
          effects: [
            {
              id: "free-trader.crew-contact.effect",
              type: "relationship.add",
              payload: { relationshipType: "contact", label: "Former crewmate" },
            },
          ],
        },
        {
          id: "crew-ally",
          label: "Ally",
          description: "You earned real loyalty under pressure.",
          effects: [
            {
              id: "free-trader.crew-ally.effect",
              type: "relationship.add",
              payload: { relationshipType: "ally", label: "Trusted crewmate" },
            },
          ],
        },
        {
          id: "crew-rival",
          label: "Rival",
          description: "The partnership became a professional rivalry.",
          effects: [
            {
              id: "free-trader.crew-rival.effect",
              type: "relationship.add",
              payload: { relationshipType: "rival", label: "Former crewmate" },
            },
          ],
        },
      ],
    },
    {
      id: "free-trader.lesson",
      label: "Hard-Won Lesson",
      range: [8, 11],
      effects: [],
      choicePrompt: "Choose what the term taught you.",
      choices: [
        {
          id: "choose-broker",
          label: "Broker",
          description: "You learned how to read a market.",
          effects: [
            {
              id: "free-trader.broker.skill",
              type: "skill.add",
              payload: { skill: "Broker", level: 1 },
            },
          ],
        },
        {
          id: "choose-pilot",
          label: "Pilot",
          description: "You spent more time at the controls.",
          effects: [
            {
              id: "free-trader.pilot.skill",
              type: "skill.add",
              payload: { skill: "Pilot", level: 1 },
            },
          ],
        },
      ],
    },
    {
      id: "free-trader.rival-event",
      label: "Trade Rival",
      range: [12, 12],
      effects: [
        {
          id: "free-trader.rival-event.effect",
          type: "relationship.add",
          payload: { relationshipType: "rival", label: "Competing broker" },
        },
      ],
    },
  ],
},
{
  id: "agent.events",
  label: "Agent Events",
  kind: "roll",
  scope: "career-event",
  notation: "2d6",
  entries: [
    {
      id: "agent-contact",
      label: "Useful Informant",
      range: [2, 6],
      effects: [
        {
          id: "agent-contact.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Confidential informant" },
        },
      ],
    },
    {
      id: "agent-social-choice",
      label: "Complicated Source",
      range: [7, 7],
      effects: [],
      choicePrompt: "Choose what the source became.",
      choices: [
        {
          id: "source-contact",
          label: "Contact",
          description: "The source remains useful but transactional.",
          effects: [
            {
              id: "agent.source-contact.effect",
              type: "relationship.add",
              payload: { relationshipType: "contact", label: "Complicated source" },
            },
          ],
        },
        {
          id: "source-ally",
          label: "Ally",
          description: "The source became a trusted partner.",
          effects: [
            {
              id: "agent.source-ally.effect",
              type: "relationship.add",
              payload: { relationshipType: "ally", label: "Trusted source" },
            },
          ],
        },
        {
          id: "source-enemy",
          label: "Enemy",
          description: "The source believes you burned them.",
          effects: [
            {
              id: "agent.source-enemy.effect",
              type: "relationship.add",
              payload: { relationshipType: "enemy", label: "Burned source" },
            },
          ],
        },
      ],
    },
    {
      id: "agent-casework",
      label: "Difficult Case",
      range: [8, 11],
      effects: [],
      choicePrompt: "Choose the technique that carried the case.",
      choices: [
        {
          id: "choose-investigate",
          label: "Investigate",
          description: "You learned how to follow a trail.",
          effects: [
            {
              id: "agent.investigate.skill",
              type: "skill.add",
              payload: { skill: "Investigate", level: 1 },
            },
          ],
        },
        {
          id: "choose-deception",
          label: "Deception",
          description: "You learned how to run a cover story.",
          effects: [
            {
              id: "agent.deception.skill",
              type: "skill.add",
              payload: { skill: "Deception", level: 1 },
            },
          ],
        },
      ],
    },
    {
      id: "agent-patron",
      label: "Powerful Handler",
      range: [12, 12],
      effects: [
        {
          id: "agent-patron.effect",
          type: "relationship.add",
          payload: { relationshipType: "patron", label: "Agency handler" },
        },
      ],
    },
  ],
},
{
  id: "scholar.events",
  label: "Scholar Events",
  kind: "roll",
  scope: "career-event",
  notation: "2d6",
  entries: [
    {
      id: "scholar-contact",
      label: "Academic Contact",
      range: [2, 6],
      effects: [
        {
          id: "scholar-contact.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Academic colleague" },
        },
      ],
    },
    {
      id: "scholar-discovery-choice",
      label: "Contested Discovery",
      range: [7, 7],
      effects: [],
      choicePrompt: "Choose what the discovery created.",
      choices: [
        {
          id: "discovery-patron",
          label: "Patron",
          description: "A sponsor wants more of your work.",
          effects: [
            {
              id: "scholar.discovery-patron.effect",
              type: "relationship.add",
              payload: { relationshipType: "patron", label: "Research sponsor" },
            },
          ],
        },
        {
          id: "discovery-rival",
          label: "Rival",
          description: "Another scholar disputes your claim.",
          effects: [
            {
              id: "scholar.discovery-rival.effect",
              type: "relationship.add",
              payload: { relationshipType: "rival", label: "Academic rival" },
            },
          ],
        },
      ],
    },
    {
      id: "scholar-breakthrough",
      label: "Useful Breakthrough",
      range: [8, 11],
      effects: [],
      choicePrompt: "Choose the expertise strengthened by the work.",
      choices: [
        {
          id: "choose-science",
          label: "Science",
          description: "The research deepened your scientific training.",
          effects: [
            {
              id: "scholar.science.skill",
              type: "skill.add",
              payload: { skill: "Science", level: 1 },
            },
          ],
        },
        {
          id: "choose-medic",
          label: "Medic",
          description: "The work sharpened your medical knowledge.",
          effects: [
            {
              id: "scholar.medic.skill",
              type: "skill.add",
              payload: { skill: "Medic", level: 1 },
            },
          ],
        },
      ],
    },
    {
      id: "scholar-renowned",
      label: "Institutional Patronage",
      range: [12, 12],
      effects: [
        {
          id: "scholar-renowned.effect",
          type: "relationship.add",
          payload: { relationshipType: "patron", label: "Research institute" },
        },
      ],
    },
  ],
},
{
  id: "entertainer.events",
  label: "Entertainer Events",
  kind: "roll",
  scope: "career-event",
  notation: "2d6",
  entries: [
    {
      id: "entertainer-contact",
      label: "Devoted Contact",
      range: [2, 6],
      effects: [
        {
          id: "entertainer-contact.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Industry contact" },
        },
      ],
    },
    {
      id: "entertainer-scandal-choice",
      label: "Public Scandal",
      range: [7, 7],
      effects: [],
      choicePrompt: "Choose what the scandal left behind.",
      choices: [
        {
          id: "scandal-rival",
          label: "Rival",
          description: "Someone used the scandal against you.",
          effects: [
            {
              id: "entertainer.scandal-rival.effect",
              type: "relationship.add",
              payload: { relationshipType: "rival", label: "Media rival" },
            },
          ],
        },
        {
          id: "scandal-patron",
          label: "Patron",
          description: "A powerful figure protected your reputation.",
          effects: [
            {
              id: "entertainer.scandal-patron.effect",
              type: "relationship.add",
              payload: { relationshipType: "patron", label: "Image fixer" },
            },
          ],
        },
      ],
    },
    {
      id: "entertainer-breakout",
      label: "Breakout Success",
      range: [8, 11],
      effects: [],
      choicePrompt: "Choose what the success taught you.",
      choices: [
        {
          id: "choose-art",
          label: "Art",
          description: "The work sharpened your craft.",
          effects: [
            {
              id: "entertainer.art.skill",
              type: "skill.add",
              payload: { skill: "Art", level: 1 },
            },
          ],
        },
        {
          id: "choose-persuade",
          label: "Persuade",
          description: "You learned how to move an audience.",
          effects: [
            {
              id: "entertainer.persuade.skill",
              type: "skill.add",
              payload: { skill: "Persuade", level: 1 },
            },
          ],
        },
      ],
    },
    {
      id: "entertainer-celebrity-patron",
      label: "Celebrity Patron",
      range: [12, 12],
      effects: [
        {
          id: "entertainer-celebrity-patron.effect",
          type: "relationship.add",
          payload: { relationshipType: "patron", label: "Celebrity patron" },
        },
      ],
    },
  ],
},
{
  id: "navy.events",
  label: "Navy Events",
  kind: "roll",
  scope: "career-event",
  notation: "2d6",
  entries: [
    {
      id: "navy-contact",
      label: "Fleet Contact",
      range: [2, 6],
      effects: [
        {
          id: "navy-contact.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Fleet quartermaster" },
        },
      ],
    },
    {
      id: "navy-duty-lesson",
      label: "Hard Duty Lesson",
      range: [7, 9],
      effects: [
        {
          id: "navy-duty-lesson.effect",
          type: "skill.add",
          payload: { skill: "Vacc Suit", level: 1 },
        },
      ],
    },
    {
      id: "navy-command-attention",
      label: "Command Attention",
      range: [10, 12],
      effects: [
        {
          id: "navy-command-attention.effect",
          type: "relationship.add",
          payload: { relationshipType: "patron", label: "Senior naval officer" },
        },
      ],
    },
  ],
},
{
  id: "army.events",
  label: "Army Events",
  kind: "roll",
  scope: "career-event",
  notation: "2d6",
  entries: [
    {
      id: "army-contact",
      label: "Unit Contact",
      range: [2, 6],
      effects: [
        {
          id: "army-contact.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Former squadmate" },
        },
      ],
    },
    {
      id: "army-field-lesson",
      label: "Field Lesson",
      range: [7, 9],
      effects: [
        {
          id: "army-field-lesson.effect",
          type: "skill.add",
          payload: { skill: "Recon", level: 1 },
        },
      ],
    },
    {
      id: "army-command-patron",
      label: "Command Notice",
      range: [10, 12],
      effects: [
        {
          id: "army-command-patron.effect",
          type: "relationship.add",
          payload: { relationshipType: "patron", label: "Army commander" },
        },
      ],
    },
  ],
},
{
  id: "marines.events",
  label: "Marines Events",
  kind: "roll",
  scope: "career-event",
  notation: "2d6",
  entries: [
    {
      id: "marines-contact",
      label: "Unit Contact",
      range: [2, 6],
      effects: [
        {
          id: "marines-contact.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Marine sergeant" },
        },
      ],
    },
    {
      id: "marines-hard-lesson",
      label: "Hard Fight",
      range: [7, 9],
      effects: [
        {
          id: "marines-hard-lesson.effect",
          type: "skill.add",
          payload: { skill: "Gun Combat", level: 1 },
        },
      ],
    },
    {
      id: "marines-patron",
      label: "Officer's Notice",
      range: [10, 12],
      effects: [
        {
          id: "marines-patron.effect",
          type: "relationship.add",
          payload: { relationshipType: "patron", label: "Marine officer" },
        },
      ],
    },
  ],
},
{
  id: "survey-scout.events",
  label: "Survey Scout Events",
  kind: "roll",
  scope: "career-event",
  notation: "2d6",
  entries: [
    {
      id: "survey-scout.contact",
      label: "Frontier Contact",
      range: [2, 6],
      effects: [
        {
          id: "survey-scout.contact.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Scout administrator" },
        },
      ],
    },
    {
      id: "survey-scout.social-choice",
      label: "Rescue Bond",
      range: [7, 7],
      effects: [],
      choicePrompt: "Choose what the rescue created.",
      choices: [
        {
          id: "rescue-contact",
          label: "Contact",
          description: "They can still be reached through scout channels.",
          effects: [
            {
              id: "survey-scout.rescue-contact.effect",
              type: "relationship.add",
              payload: { relationshipType: "contact", label: "Rescued scout" },
            },
          ],
        },
        {
          id: "rescue-ally",
          label: "Ally",
          description: "The rescue became a lasting bond.",
          effects: [
            {
              id: "survey-scout.rescue-ally.effect",
              type: "relationship.add",
              payload: { relationshipType: "ally", label: "Rescued scout" },
            },
          ],
        },
        {
          id: "rescue-rival",
          label: "Rival",
          description: "They resent what the rescue cost them.",
          effects: [
            {
              id: "survey-scout.rescue-rival.effect",
              type: "relationship.add",
              payload: { relationshipType: "rival", label: "Rescued scout" },
            },
          ],
        },
      ],
    },
    {
      id: "survey-scout.field-lesson",
      label: "Field Lesson",
      range: [8, 11],
      effects: [],
      choicePrompt: "Choose the lesson that stuck.",
      choices: [
        {
          id: "choose-recon",
          label: "Recon",
          description: "You became better at reading terrain.",
          effects: [
            {
              id: "survey-scout.recon.skill",
              type: "skill.add",
              payload: { skill: "Recon", level: 1 },
            },
          ],
        },
        {
          id: "choose-survival",
          label: "Survival",
          description: "You learned how not to die outdoors.",
          effects: [
            {
              id: "survey-scout.survival.skill",
              type: "skill.add",
              payload: { skill: "Survival", level: 1 },
            },
          ],
        },
      ],
    },
    {
      id: "survey-scout.rival",
      label: "Survey Rival",
      range: [12, 12],
      effects: [
        {
          id: "survey-scout.rival.effect",
          type: "relationship.add",
          payload: { relationshipType: "rival", label: "Competing surveyor" },
        },
      ],
    },
  ],
},
{
  id: "drifter.events",
  label: "Drifter Events",
  kind: "roll",
  scope: "career-event",
  notation: "2d6",
  entries: [
    {
      id: "drifter-contact",
      label: "Local Contact",
      range: [2, 5],
      effects: [
        {
          id: "drifter-contact.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Local fixer" },
        },
      ],
    },
    {
      id: "drifter-social-choice",
      label: "Shared Shelter",
      range: [6, 7],
      effects: [],
      choicePrompt: "Choose what came out of the shared shelter.",
      choices: [
        {
          id: "shelter-contact",
          label: "Contact",
          description: "You know someone who hears local rumors.",
          effects: [
            {
              id: "drifter-shelter-contact.effect",
              type: "relationship.add",
              payload: { relationshipType: "contact", label: "Old bunkmate" },
            },
          ],
        },
        {
          id: "shelter-ally",
          label: "Ally",
          description: "You looked out for each other.",
          effects: [
            {
              id: "drifter-shelter-ally.effect",
              type: "relationship.add",
              payload: { relationshipType: "ally", label: "Old bunkmate" },
            },
          ],
        },
        {
          id: "shelter-rival",
          label: "Rival",
          description: "Scarcity turned the bond sour.",
          effects: [
            {
              id: "drifter-shelter-rival.effect",
              type: "relationship.add",
              payload: { relationshipType: "rival", label: "Old bunkmate" },
            },
          ],
        },
      ],
    },
    {
      id: "drifter-lesson",
      label: "Useful Lesson",
      range: [8, 11],
      effects: [
        {
          id: "drifter-lesson.effect",
          type: "skill.add",
          payload: { skill: "Streetwise", level: 1 },
        },
      ],
    },
    {
      id: "drifter-rival",
      label: "Local Rival",
      range: [12, 12],
      effects: [
        {
          id: "drifter-rival.effect",
          type: "relationship.add",
          payload: { relationshipType: "rival", label: "Territorial local" },
        },
      ],
    },
  ],
},
] as const satisfies readonly LifepathTableDefinition[];
