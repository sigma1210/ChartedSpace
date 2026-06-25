import type { LifepathGeneratorDefinition } from "./lifepathTypes";

export const basicHumanLifepathDefinition: LifepathGeneratorDefinition = {
  id: "basic-human-lifepath",
  label: "Basic Human Lifepath",
  version: "0.1.0",
  sophontId: "human",
  data: {
    tableSource: "charted-space-starter",
    tableSourceLabel: "Charted Space starter tables",
    qualificationFallbackCareerId: "drifter",
  },
  characteristics: [
    { id: "str", label: "Strength", abbreviation: "STR" },
    { id: "dex", label: "Dexterity", abbreviation: "DEX" },
    { id: "end", label: "Endurance", abbreviation: "END" },
    { id: "int", label: "Intellect", abbreviation: "INT" },
    { id: "edu", label: "Education", abbreviation: "EDU" },
    { id: "soc", label: "Standing", abbreviation: "SOC" },
  ],
  startingRules: {
    age: 18,
    characteristicRollNotation: "2d6",
    backgroundSkillTableIds: ["basic-human.background-skills"],
  },
  term: {
    id: "basic-human.term",
    label: "Term",
    phases: ["choose-assignment", "survival", "skill", "event", "advancement", "aging", "complete"],
  },
  careers: [
    {
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
      },
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
    },
    {
      id: "survey-scout",
      label: "Survey Scout",
      description: "Frontier survey, courier work, and field improvisation.",
      data: {
        qualificationFailureCareerIds: ["free-trader"],
      },
      assignments: [
        { id: "survey-scout.field", label: "Field", description: "Unknown worlds and rough landings." },
        { id: "survey-scout.courier", label: "Courier", description: "Fast routes and sensitive messages." },
      ],
      ranks: [
        { rank: 0, title: "Scout", track: "enlisted" },
        {
          rank: 1,
          title: "Senior Scout",
          track: "enlisted",
          effects: [
            {
              id: "survey-scout.rank-1.recon",
              type: "skill.add",
              payload: { skill: "Recon", level: 1 },
            },
          ],
        },
        {
          rank: 2,
          title: "Survey Lead",
          track: "enlisted",
          effects: [
            {
              id: "survey-scout.rank-2.survival",
              type: "skill.add",
              payload: { skill: "Survival", level: 1 },
            },
          ],
        },
        {
          rank: 3,
          title: "Mission Chief",
          track: "enlisted",
          effects: [
            {
              id: "survey-scout.rank-3.astrogation",
              type: "skill.add",
              payload: { skill: "Astrogation", level: 1 },
            },
          ],
        },
        {
          rank: 1,
          title: "Mission Officer",
          track: "officer",
          effects: [
            {
              id: "survey-scout.officer-rank-1.admin",
              type: "skill.add",
              payload: { skill: "Admin", level: 1 },
            },
          ],
        },
        {
          rank: 2,
          title: "Survey Commander",
          track: "officer",
          effects: [
            {
              id: "survey-scout.officer-rank-2.leadership",
              type: "skill.add",
              payload: { skill: "Leadership", level: 1 },
            },
          ],
        },
        {
          rank: 3,
          title: "Sector Liaison",
          track: "officer",
          effects: [
            {
              id: "survey-scout.officer-rank-3.diplomat",
              type: "skill.add",
              payload: { skill: "Diplomat", level: 1 },
            },
          ],
        },
      ],
      skillTableIds: ["survey-scout.skills"],
      qualification: {
        id: "survey-scout.qualification",
        label: "Survey Scout Qualification",
        notation: "2d6",
        target: 5,
        characteristicModifier: "int",
      },
      commission: {
        id: "survey-scout.commission",
        label: "Survey Scout Commission",
        notation: "2d6",
        target: 8,
        characteristicModifier: "edu",
      },
      survival: {
        id: "survey-scout.survival",
        label: "Survival",
        notation: "2d6",
        target: 6,
        characteristicModifier: "end",
        skillModifier: "Survival",
        failureEffects: [
          {
            id: "survey-scout.accident",
            type: "injury.add",
            payload: { severity: "minor", label: "Survey accident" },
          },
        ],
      },
      advancement: {
        id: "survey-scout.advancement",
        label: "Advancement",
        notation: "2d6",
        target: 8,
        characteristicModifier: "edu",
        skillModifier: "Recon",
        successEffects: [
          {
            id: "survey-scout.rank",
            type: "career.promote",
            payload: { ranks: 1 },
          },
        ],
      },
      eventTableId: "survey-scout.events",
      mishapTableId: "survey-scout.mishaps",
      benefitTableIds: ["survey-scout.benefits"],
    },
    {
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
    },
  ],
  tables: [
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
      id: "free-trader.cash-benefits",
      label: "Free Trader Cash Benefits",
      kind: "roll",
      scope: "benefit",
      notation: "1d6",
      entries: [
        {
          id: "free-trader.cash-small",
          label: "Operating Cash",
          range: [1, 2],
          effects: [
            {
              id: "free-trader.cash-small.effect",
              type: "credit.add",
              payload: { amount: 10000 },
            },
          ],
        },
        {
          id: "free-trader.cash-large",
          label: "Strong Payout",
          range: [3, 6],
          effects: [
            {
              id: "free-trader.cash-large.effect",
              type: "credit.add",
              payload: { amount: 25000 },
            },
          ],
        },
      ],
    },
    {
      id: "free-trader.material-benefits",
      label: "Free Trader Material Benefits",
      kind: "roll",
      scope: "benefit",
      notation: "1d6",
      entries: [
        {
          id: "free-trader.middle-passage",
          label: "Middle Passage",
          range: [1, 3],
          effects: [
            {
              id: "free-trader.middle-passage.effect",
              type: "benefit.add",
              payload: { benefitType: "middle-passage", amount: 1 },
            },
          ],
        },
        {
          id: "free-trader.ship-share",
          label: "Free Trader Share",
          range: [4, 6],
          effects: [
            {
              id: "free-trader.ship-share.effect",
              type: "benefit.add",
              payload: { benefitType: "ship", value: "free_trader" },
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
      id: "survey-scout.benefits",
      label: "Survey Scout Benefits",
      kind: "roll",
      scope: "benefit",
      notation: "1d6",
      entries: [
        {
          id: "survey-scout.cash",
          label: "Survey Bonus",
          range: [1, 2],
          effects: [
            {
              id: "survey-scout.cash.effect",
              type: "credit.add",
              payload: { amount: 8000 },
            },
          ],
        },
        {
          id: "survey-scout.weapon",
          label: "Field Weapon",
          range: [3, 4],
          effects: [
            {
              id: "survey-scout.weapon.effect",
              type: "benefit.add",
              payload: { benefitType: "weapon", value: "field carbine" },
            },
          ],
        },
        {
          id: "survey-scout.high-passage",
          label: "High Passage",
          range: [5, 5],
          effects: [
            {
              id: "survey-scout.high-passage.effect",
              type: "benefit.add",
              payload: { benefitType: "high-passage", amount: 1 },
            },
          ],
        },
        {
          id: "survey-scout.ship",
          label: "Scout Ship Access",
          range: [6, 6],
          effects: [
            {
              id: "survey-scout.ship.effect",
              type: "benefit.add",
              payload: { benefitType: "ship", value: "scout" },
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
    {
      id: "drifter.benefits",
      label: "Drifter Benefits",
      kind: "roll",
      scope: "benefit",
      notation: "1d6",
      entries: [
        {
          id: "drifter-cash",
          label: "Scraped Savings",
          range: [1, 4],
          effects: [
            {
              id: "drifter-cash.effect",
              type: "credit.add",
              payload: { amount: 2000 },
            },
          ],
        },
        {
          id: "drifter-low-passage",
          label: "Low Passage",
          range: [5, 6],
          effects: [
            {
              id: "drifter-low-passage.effect",
              type: "benefit.add",
              payload: { benefitType: "low-passage", amount: 1 },
            },
          ],
        },
      ],
    },
  ],
};
