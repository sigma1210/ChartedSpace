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
    agingRules: {
      startsAtAge: 34,
      characteristicCycle: ["end", "str", "dex"],
      modifier: -1,
    },
  },
  preCareerEducation: [
    {
      id: "university",
      label: "University",
      description: "Four years of formal education before entering a career.",
      qualification: {
        id: "university.qualification",
        label: "University Admission",
        notation: "2d6",
        target: 7,
        characteristicModifier: "edu",
      },
      graduation: {
        id: "university.graduation",
        label: "University Graduation",
        notation: "2d6",
        target: 7,
        characteristicModifier: "int",
      },
      honorsTarget: 11,
      skillTableIds: ["basic-human.university-skills"],
      successEffects: [
        {
          id: "university.age",
          type: "age.add",
          payload: { years: 4 },
        },
      ],
      failureEffects: [
        {
          id: "university.admissions-contact",
          type: "relationship.add",
          payload: {
            relationshipType: "contact",
            label: "Admissions tutor",
            source: "pre-career-education",
          },
        },
      ],
    },
    {
      id: "military-academy",
      label: "Military Academy",
      description: "Four years of officer training, discipline, and command preparation.",
      qualification: {
        id: "military-academy.qualification",
        label: "Military Academy Admission",
        notation: "2d6",
        target: 8,
        characteristicModifier: "edu",
      },
      graduation: {
        id: "military-academy.graduation",
        label: "Military Academy Graduation",
        notation: "2d6",
        target: 7,
        characteristicModifier: "end",
      },
      honorsTarget: 11,
      skillTableIds: ["basic-human.military-academy-skills"],
      successEffects: [
        {
          id: "military-academy.age",
          type: "age.add",
          payload: { years: 4 },
        },
      ],
      failureEffects: [
        {
          id: "military-academy-recruiter",
          type: "relationship.add",
          payload: {
            relationshipType: "contact",
            label: "Academy recruiter",
            source: "pre-career-education",
          },
        },
      ],
    },
  ],
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
    },
    {
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
    },
    {
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
    },
    {
      id: "entertainer",
      label: "Entertainer",
      description: "Performance, media, celebrity circles, scandal, and patronage.",
      assignments: [
        { id: "entertainer.performer", label: "Performer", description: "Stage, screen, recordings, and public spectacle." },
        { id: "entertainer.journalist", label: "Journalist", description: "Newsrooms, investigations, interviews, and spin." },
        { id: "entertainer.socialite", label: "Socialite", description: "Parties, patrons, fashion, and influence networks." },
      ],
      ranks: [
        { rank: 0, title: "Unknown" },
        {
          rank: 1,
          title: "Working Talent",
          effects: [
            {
              id: "entertainer.rank-1-art",
              type: "skill.add",
              payload: { skill: "Art", level: 1 },
            },
          ],
        },
        {
          rank: 2,
          title: "Recognized Name",
          effects: [
            {
              id: "entertainer.rank-2-persuade",
              type: "skill.add",
              payload: { skill: "Persuade", level: 1 },
            },
          ],
        },
        {
          rank: 3,
          title: "Star",
          effects: [
            {
              id: "entertainer.rank-3-carouse",
              type: "skill.add",
              payload: { skill: "Carouse", level: 1 },
            },
          ],
        },
      ],
      skillTableIds: ["entertainer.skills"],
      qualification: {
        id: "entertainer.qualification",
        label: "Entertainer Qualification",
        notation: "2d6",
        target: 5,
        characteristicModifier: "soc",
        failureEffects: [
          {
            id: "entertainer-audition-contact",
            type: "relationship.add",
            payload: { relationshipType: "contact", label: "Casting assistant" },
          },
        ],
      },
      qualificationModifiers: [
        {
          id: "entertainer.university-graduate",
          label: "University graduate",
          modifier: 1,
          when: "preCareerEducation",
          educationIds: ["university"],
          graduated: true,
          honorsGraduated: false,
        },
        {
          id: "entertainer.university-honors",
          label: "University honors graduate",
          modifier: 2,
          when: "preCareerEducation",
          educationIds: ["university"],
          honorsGraduated: true,
        },
        {
          id: "entertainer.prior-career",
          label: "Prior career",
          modifier: -1,
          when: "hasCareerHistory",
        },
      ],
      survival: {
        id: "entertainer.survival",
        label: "Survival",
        notation: "2d6",
        target: 5,
        characteristicModifier: "soc",
        skillModifier: "Streetwise",
        failureEffects: [
          {
            id: "entertainer-mishap-injury",
            type: "injury.add",
            payload: { severity: "minor", label: "Public scandal" },
          },
        ],
      },
      advancement: {
        id: "entertainer.advancement",
        label: "Advancement",
        notation: "2d6",
        target: 7,
        characteristicModifier: "int",
        skillModifier: "Art",
        successEffects: [
          {
            id: "entertainer-rank",
            type: "career.promote",
            payload: { ranks: 1 },
          },
        ],
      },
      reenlistment: {
        id: "entertainer.reenlistment",
        label: "Entertainer Contract Renewal",
        notation: "2d6",
        target: 5,
        characteristicModifier: "soc",
        data: {
          successOutcome: "may-continue",
          failureOutcome: "contract-ended",
        },
      },
      eventTableId: "entertainer.events",
      mishapTableId: "entertainer.mishaps",
      benefitTableIds: ["entertainer.benefits"],
    },
    {
      id: "navy",
      label: "Navy",
      description: "Starship service, fleet discipline, and hard vacuum operations.",
      assignments: [
        { id: "navy.line", label: "Line Crew", description: "Shipboard duty, watches, and combat stations." },
        { id: "navy.engineering", label: "Engineering", description: "Power plants, drives, and damage control." },
        { id: "navy.flight", label: "Flight", description: "Small craft, helm time, and tactical manoeuvres." },
      ],
      ranks: [
        { rank: 0, title: "Crewman", track: "enlisted" },
        {
          rank: 1,
          title: "Spacer",
          track: "enlisted",
          effects: [
            {
              id: "navy.rank-1-vacc-suit",
              type: "skill.add",
              payload: { skill: "Vacc Suit", level: 1 },
            },
          ],
        },
        {
          rank: 2,
          title: "Petty Officer",
          track: "enlisted",
          effects: [
            {
              id: "navy.rank-2-leadership",
              type: "skill.add",
              payload: { skill: "Leadership", level: 1 },
            },
          ],
        },
        {
          rank: 3,
          title: "Chief",
          track: "enlisted",
          effects: [
            {
              id: "navy.rank-3-mechanic",
              type: "skill.add",
              payload: { skill: "Mechanic", level: 1 },
            },
          ],
        },
        { rank: 1, title: "Ensign", track: "officer" },
        {
          rank: 2,
          title: "Lieutenant",
          track: "officer",
          effects: [
            {
              id: "navy.officer-rank-2-leadership",
              type: "skill.add",
              payload: { skill: "Leadership", level: 1 },
            },
          ],
        },
        {
          rank: 3,
          title: "Commander",
          track: "officer",
          effects: [
            {
              id: "navy.officer-rank-3-tactics",
              type: "skill.add",
              payload: { skill: "Tactics", level: 1 },
            },
          ],
        },
      ],
      skillTableIds: ["navy.skills"],
      qualification: {
        id: "navy.qualification",
        label: "Navy Qualification",
        notation: "2d6",
        target: 7,
        characteristicModifier: "edu",
        failureEffects: [
          {
            id: "navy-recruiter-contact",
            type: "relationship.add",
            payload: { relationshipType: "contact", label: "Navy recruiter" },
          },
        ],
      },
      qualificationModifiers: [
        {
          id: "navy.military-academy-graduate",
          label: "Military Academy graduate",
          modifier: 1,
          when: "preCareerEducation",
          educationIds: ["military-academy"],
          graduated: true,
          honorsGraduated: false,
        },
        {
          id: "navy.military-academy-honors",
          label: "Military Academy honors graduate",
          modifier: 2,
          when: "preCareerEducation",
          educationIds: ["military-academy"],
          honorsGraduated: true,
        },
        {
          id: "navy.prior-career",
          label: "Prior career",
          modifier: -1,
          when: "hasCareerHistory",
        },
      ],
      commission: {
        id: "navy.commission",
        label: "Navy Commission",
        notation: "2d6",
        target: 8,
        characteristicModifier: "soc",
      },
      commissionModifiers: [
        {
          id: "navy.commission.military-academy-graduate",
          label: "Military Academy graduate",
          modifier: 1,
          when: "preCareerEducation",
          educationIds: ["military-academy"],
          graduated: true,
          honorsGraduated: false,
        },
        {
          id: "navy.commission.military-academy-honors",
          label: "Military Academy honors graduate",
          modifier: 2,
          when: "preCareerEducation",
          educationIds: ["military-academy"],
          honorsGraduated: true,
        },
      ],
      survival: {
        id: "navy.survival",
        label: "Survival",
        notation: "2d6",
        target: 6,
        characteristicModifier: "int",
        skillModifier: "Vacc Suit",
        failureEffects: [
          {
            id: "navy-mishap-injury",
            type: "injury.add",
            payload: { severity: "minor", label: "Shipboard accident" },
          },
        ],
      },
      advancement: {
        id: "navy.advancement",
        label: "Advancement",
        notation: "2d6",
        target: 8,
        characteristicModifier: "edu",
        skillModifier: "Leadership",
        successEffects: [
          {
            id: "navy-rank",
            type: "career.promote",
            payload: { ranks: 1 },
          },
        ],
      },
      reenlistment: {
        id: "navy.reenlistment",
        label: "Navy Reenlistment",
        notation: "2d6",
        target: 6,
        characteristicModifier: "edu",
        data: {
          successOutcome: "may-continue",
          failureOutcome: "not-retained",
        },
      },
      eventTableId: "navy.events",
      mishapTableId: "navy.mishaps",
      benefitTableIds: ["navy.benefits"],
    },
    {
      id: "army",
      label: "Army",
      description: "Ground campaigns, garrison duty, and planetary operations.",
      assignments: [
        { id: "army.infantry", label: "Infantry", description: "Front-line combat and patrol work." },
        { id: "army.armor", label: "Armor", description: "Vehicle crews, heavy weapons, and breakthrough operations." },
        { id: "army.support", label: "Support", description: "Logistics, field engineering, and operational planning." },
      ],
      ranks: [
        { rank: 0, title: "Trooper", track: "enlisted" },
        {
          rank: 1,
          title: "Corporal",
          track: "enlisted",
          effects: [
            {
              id: "army.rank-1-gun-combat",
              type: "skill.add",
              payload: { skill: "Gun Combat", level: 1 },
            },
          ],
        },
        {
          rank: 2,
          title: "Sergeant",
          track: "enlisted",
          effects: [
            {
              id: "army.rank-2-leadership",
              type: "skill.add",
              payload: { skill: "Leadership", level: 1 },
            },
          ],
        },
        {
          rank: 3,
          title: "Sergeant Major",
          track: "enlisted",
          effects: [
            {
              id: "army.rank-3-tactics",
              type: "skill.add",
              payload: { skill: "Tactics", level: 1 },
            },
          ],
        },
        { rank: 1, title: "Lieutenant", track: "officer" },
        {
          rank: 2,
          title: "Captain",
          track: "officer",
          effects: [
            {
              id: "army.officer-rank-2-leadership",
              type: "skill.add",
              payload: { skill: "Leadership", level: 1 },
            },
          ],
        },
        {
          rank: 3,
          title: "Major",
          track: "officer",
          effects: [
            {
              id: "army.officer-rank-3-tactics",
              type: "skill.add",
              payload: { skill: "Tactics", level: 1 },
            },
          ],
        },
      ],
      skillTableIds: ["army.skills"],
      qualification: {
        id: "army.qualification",
        label: "Army Qualification",
        notation: "2d6",
        target: 6,
        characteristicModifier: "end",
        failureEffects: [
          {
            id: "army-recruiter-contact",
            type: "relationship.add",
            payload: { relationshipType: "contact", label: "Army recruiter" },
          },
        ],
      },
      qualificationModifiers: [
        {
          id: "army.military-academy-graduate",
          label: "Military Academy graduate",
          modifier: 1,
          when: "preCareerEducation",
          educationIds: ["military-academy"],
          graduated: true,
          honorsGraduated: false,
        },
        {
          id: "army.military-academy-honors",
          label: "Military Academy honors graduate",
          modifier: 2,
          when: "preCareerEducation",
          educationIds: ["military-academy"],
          honorsGraduated: true,
        },
        {
          id: "army.prior-career",
          label: "Prior career",
          modifier: -1,
          when: "hasCareerHistory",
        },
      ],
      commission: {
        id: "army.commission",
        label: "Army Commission",
        notation: "2d6",
        target: 8,
        characteristicModifier: "edu",
      },
      commissionModifiers: [
        {
          id: "army.commission.military-academy-graduate",
          label: "Military Academy graduate",
          modifier: 1,
          when: "preCareerEducation",
          educationIds: ["military-academy"],
          graduated: true,
          honorsGraduated: false,
        },
        {
          id: "army.commission.military-academy-honors",
          label: "Military Academy honors graduate",
          modifier: 2,
          when: "preCareerEducation",
          educationIds: ["military-academy"],
          honorsGraduated: true,
        },
      ],
      survival: {
        id: "army.survival",
        label: "Survival",
        notation: "2d6",
        target: 6,
        characteristicModifier: "end",
        skillModifier: "Recon",
        failureEffects: [
          {
            id: "army-mishap-injury",
            type: "injury.add",
            payload: { severity: "minor", label: "Field injury" },
          },
        ],
      },
      advancement: {
        id: "army.advancement",
        label: "Advancement",
        notation: "2d6",
        target: 7,
        characteristicModifier: "edu",
        skillModifier: "Leadership",
        successEffects: [
          {
            id: "army-rank",
            type: "career.promote",
            payload: { ranks: 1 },
          },
        ],
      },
      reenlistment: {
        id: "army.reenlistment",
        label: "Army Reenlistment",
        notation: "2d6",
        target: 6,
        characteristicModifier: "edu",
        data: {
          successOutcome: "may-continue",
          failureOutcome: "not-retained",
        },
      },
      eventTableId: "army.events",
      mishapTableId: "army.mishaps",
      benefitTableIds: ["army.benefits"],
    },
    {
      id: "marines",
      label: "Marines",
      description: "Shipboard assault troops, boarding actions, and hostile landings.",
      assignments: [
        { id: "marines.assault", label: "Assault", description: "Boarding actions and spearhead drops." },
        { id: "marines.security", label: "Security", description: "Shipboard security, patrols, and hard-point defense." },
        { id: "marines.recon", label: "Recon", description: "Forward observation and dangerous scouting." },
      ],
      ranks: [
        { rank: 0, title: "Marine", track: "enlisted" },
        {
          rank: 1,
          title: "Lance Corporal",
          track: "enlisted",
          effects: [
            {
              id: "marines.rank-1-gun-combat",
              type: "skill.add",
              payload: { skill: "Gun Combat", level: 1 },
            },
          ],
        },
        {
          rank: 2,
          title: "Sergeant",
          track: "enlisted",
          effects: [
            {
              id: "marines.rank-2-leadership",
              type: "skill.add",
              payload: { skill: "Leadership", level: 1 },
            },
          ],
        },
        {
          rank: 3,
          title: "Gunnery Sergeant",
          track: "enlisted",
          effects: [
            {
              id: "marines.rank-3-tactics",
              type: "skill.add",
              payload: { skill: "Tactics", level: 1 },
            },
          ],
        },
        { rank: 1, title: "Lieutenant", track: "officer" },
        {
          rank: 2,
          title: "Captain",
          track: "officer",
          effects: [
            {
              id: "marines.officer-rank-2-tactics",
              type: "skill.add",
              payload: { skill: "Tactics", level: 1 },
            },
          ],
        },
        {
          rank: 3,
          title: "Major",
          track: "officer",
          effects: [
            {
              id: "marines.officer-rank-3-leadership",
              type: "skill.add",
              payload: { skill: "Leadership", level: 1 },
            },
          ],
        },
      ],
      skillTableIds: ["marines.skills"],
      qualification: {
        id: "marines.qualification",
        label: "Marines Qualification",
        notation: "2d6",
        target: 7,
        characteristicModifier: "end",
        failureEffects: [
          {
            id: "marines-recruiter-contact",
            type: "relationship.add",
            payload: { relationshipType: "contact", label: "Marine recruiter" },
          },
        ],
      },
      qualificationModifiers: [
        {
          id: "marines.military-academy-graduate",
          label: "Military Academy graduate",
          modifier: 1,
          when: "preCareerEducation",
          educationIds: ["military-academy"],
          graduated: true,
          honorsGraduated: false,
        },
        {
          id: "marines.military-academy-honors",
          label: "Military Academy honors graduate",
          modifier: 2,
          when: "preCareerEducation",
          educationIds: ["military-academy"],
          honorsGraduated: true,
        },
        {
          id: "marines.prior-career",
          label: "Prior career",
          modifier: -1,
          when: "hasCareerHistory",
        },
      ],
      commission: {
        id: "marines.commission",
        label: "Marines Commission",
        notation: "2d6",
        target: 9,
        characteristicModifier: "edu",
      },
      commissionModifiers: [
        {
          id: "marines.commission.military-academy-graduate",
          label: "Military Academy graduate",
          modifier: 1,
          when: "preCareerEducation",
          educationIds: ["military-academy"],
          graduated: true,
          honorsGraduated: false,
        },
        {
          id: "marines.commission.military-academy-honors",
          label: "Military Academy honors graduate",
          modifier: 2,
          when: "preCareerEducation",
          educationIds: ["military-academy"],
          honorsGraduated: true,
        },
      ],
      survival: {
        id: "marines.survival",
        label: "Survival",
        notation: "2d6",
        target: 7,
        characteristicModifier: "end",
        skillModifier: "Gun Combat",
        failureEffects: [
          {
            id: "marines-mishap-injury",
            type: "injury.add",
            payload: { severity: "minor", label: "Combat wound" },
          },
        ],
      },
      advancement: {
        id: "marines.advancement",
        label: "Advancement",
        notation: "2d6",
        target: 8,
        characteristicModifier: "edu",
        skillModifier: "Tactics",
        successEffects: [
          {
            id: "marines-rank",
            type: "career.promote",
            payload: { ranks: 1 },
          },
        ],
      },
      reenlistment: {
        id: "marines.reenlistment",
        label: "Marines Reenlistment",
        notation: "2d6",
        target: 6,
        characteristicModifier: "edu",
        data: {
          successOutcome: "may-continue",
          failureOutcome: "not-retained",
        },
      },
      eventTableId: "marines.events",
      mishapTableId: "marines.mishaps",
      benefitTableIds: ["marines.benefits"],
    },
    {
      id: "survey-scout",
      label: "Survey Scout",
      description: "Frontier survey, courier work, and field improvisation.",
      data: {
        qualificationFailureCareerIds: ["free-trader"],
      },
      eligibility: {
        disallowAfterFailedReenlistment: true,
        minimumCharacteristics: {
          int: 6,
        },
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
        failureEffects: [
          {
            id: "survey-scout.qualification-contact",
            type: "relationship.add",
            payload: { relationshipType: "contact", label: "Scout recruiter" },
          },
        ],
      },
      qualificationModifiers: [
        {
          id: "survey-scout.prior-career",
          label: "Prior career",
          modifier: -1,
          when: "hasCareerHistory",
        },
      ],
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
      reenlistment: {
        id: "survey-scout.reenlistment",
        label: "Survey Scout Reenlistment",
        notation: "2d6",
        target: 6,
        characteristicModifier: "edu",
        data: {
          successOutcome: "may-continue",
          failureOutcome: "forced-out",
        },
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
      id: "agent.benefits",
      label: "Agent Benefits",
      kind: "roll",
      scope: "benefit",
      notation: "1d6",
      entries: [
        {
          id: "agent-cash",
          label: "Discretionary Funds",
          range: [1, 2],
          effects: [
            {
              id: "agent-cash.effect",
              type: "credit.add",
              payload: { amount: 12000 },
            },
          ],
        },
        {
          id: "agent-weapon",
          label: "Concealed Weapon",
          range: [3, 4],
          effects: [
            {
              id: "agent-weapon.effect",
              type: "benefit.add",
              payload: { benefitType: "weapon", value: "concealed pistol" },
            },
          ],
        },
        {
          id: "agent-passage",
          label: "High Passage",
          range: [5, 5],
          effects: [
            {
              id: "agent-passage.effect",
              type: "benefit.add",
              payload: { benefitType: "high-passage", amount: 1 },
            },
          ],
        },
        {
          id: "agent-contact-benefit",
          label: "Black File",
          range: [6, 6],
          effects: [
            {
              id: "agent-contact-benefit.effect",
              type: "relationship.add",
              payload: { relationshipType: "contact", label: "Protected source" },
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
      id: "scholar.benefits",
      label: "Scholar Benefits",
      kind: "roll",
      scope: "benefit",
      notation: "1d6",
      entries: [
        {
          id: "scholar-cash",
          label: "Grant Remainder",
          range: [1, 2],
          effects: [
            {
              id: "scholar-cash.effect",
              type: "credit.add",
              payload: { amount: 8000 },
            },
          ],
        },
        {
          id: "scholar-equipment",
          label: "Research Equipment",
          range: [3, 4],
          effects: [
            {
              id: "scholar-equipment.effect",
              type: "benefit.add",
              payload: { benefitType: "weapon", value: "scientific instrument kit" },
            },
          ],
        },
        {
          id: "scholar-passage",
          label: "Middle Passage",
          range: [5, 5],
          effects: [
            {
              id: "scholar-passage.effect",
              type: "benefit.add",
              payload: { benefitType: "middle-passage", amount: 1 },
            },
          ],
        },
        {
          id: "scholar-society",
          label: "Academic Society",
          range: [6, 6],
          effects: [
            {
              id: "scholar-society.effect",
              type: "relationship.add",
              payload: { relationshipType: "contact", label: "Academic society" },
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
      id: "entertainer.benefits",
      label: "Entertainer Benefits",
      kind: "roll",
      scope: "benefit",
      notation: "1d6",
      entries: [
        {
          id: "entertainer-cash",
          label: "Royalties",
          range: [1, 2],
          effects: [
            {
              id: "entertainer-cash.effect",
              type: "credit.add",
              payload: { amount: 10000 },
            },
          ],
        },
        {
          id: "entertainer-passage",
          label: "High Passage",
          range: [3, 4],
          effects: [
            {
              id: "entertainer-passage.effect",
              type: "benefit.add",
              payload: { benefitType: "high-passage", amount: 1 },
            },
          ],
        },
        {
          id: "entertainer-society",
          label: "Society Contact",
          range: [5, 5],
          effects: [
            {
              id: "entertainer-society.effect",
              type: "relationship.add",
              payload: { relationshipType: "contact", label: "Society host" },
            },
          ],
        },
        {
          id: "entertainer-patron-benefit",
          label: "Patron",
          range: [6, 6],
          effects: [
            {
              id: "entertainer-patron-benefit.effect",
              type: "relationship.add",
              payload: { relationshipType: "patron", label: "Media patron" },
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
      id: "navy.benefits",
      label: "Navy Benefits",
      kind: "roll",
      scope: "benefit",
      notation: "1d6",
      entries: [
        {
          id: "navy-cash",
          label: "Mustering Pay",
          range: [1, 2],
          effects: [
            {
              id: "navy-cash.effect",
              type: "credit.add",
              payload: { amount: 12000 },
            },
          ],
        },
        {
          id: "navy-weapon",
          label: "Service Weapon",
          range: [3, 4],
          effects: [
            {
              id: "navy-weapon.effect",
              type: "benefit.add",
              payload: { benefitType: "weapon", value: "service pistol" },
            },
          ],
        },
        {
          id: "navy-passage",
          label: "High Passage",
          range: [5, 5],
          effects: [
            {
              id: "navy-passage.effect",
              type: "benefit.add",
              payload: { benefitType: "high-passage", amount: 1 },
            },
          ],
        },
        {
          id: "navy-ship-share",
          label: "Ship Share",
          range: [6, 6],
          effects: [
            {
              id: "navy-ship-share.effect",
              type: "benefit.add",
              payload: { benefitType: "ship", value: "naval_prize_share" },
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
      id: "army.benefits",
      label: "Army Benefits",
      kind: "roll",
      scope: "benefit",
      notation: "1d6",
      entries: [
        {
          id: "army-cash",
          label: "Mustering Pay",
          range: [1, 2],
          effects: [
            {
              id: "army-cash.effect",
              type: "credit.add",
              payload: { amount: 10000 },
            },
          ],
        },
        {
          id: "army-weapon",
          label: "Service Weapon",
          range: [3, 4],
          effects: [
            {
              id: "army-weapon.effect",
              type: "benefit.add",
              payload: { benefitType: "weapon", value: "service rifle" },
            },
          ],
        },
        {
          id: "army-passage",
          label: "Middle Passage",
          range: [5, 5],
          effects: [
            {
              id: "army-passage.effect",
              type: "benefit.add",
              payload: { benefitType: "middle-passage", amount: 1 },
            },
          ],
        },
        {
          id: "army-society",
          label: "Veterans Society",
          range: [6, 6],
          effects: [
            {
              id: "army-society.effect",
              type: "benefit.add",
              payload: { benefitType: "society", value: "army veterans network" },
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
      id: "marines.benefits",
      label: "Marines Benefits",
      kind: "roll",
      scope: "benefit",
      notation: "1d6",
      entries: [
        {
          id: "marines-cash",
          label: "Mustering Pay",
          range: [1, 2],
          effects: [
            {
              id: "marines-cash.effect",
              type: "credit.add",
              payload: { amount: 9000 },
            },
          ],
        },
        {
          id: "marines-weapon",
          label: "Service Weapon",
          range: [3, 4],
          effects: [
            {
              id: "marines-weapon.effect",
              type: "benefit.add",
              payload: { benefitType: "weapon", value: "marine combat rifle" },
            },
          ],
        },
        {
          id: "marines-passage",
          label: "Middle Passage",
          range: [5, 5],
          effects: [
            {
              id: "marines-passage.effect",
              type: "benefit.add",
              payload: { benefitType: "middle-passage", amount: 1 },
            },
          ],
        },
        {
          id: "marines-contact-benefit",
          label: "Veteran Contact",
          range: [6, 6],
          effects: [
            {
              id: "marines-contact-benefit.effect",
              type: "relationship.add",
              payload: { relationshipType: "contact", label: "Marine veteran" },
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
