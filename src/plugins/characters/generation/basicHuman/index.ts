import { basicHumanCareers } from "./careers";
import { basicHumanTables } from "./tables";
import type { LifepathGeneratorDefinition } from "../lifepathTypes";

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
  careers: basicHumanCareers,
  tables: basicHumanTables,
};
