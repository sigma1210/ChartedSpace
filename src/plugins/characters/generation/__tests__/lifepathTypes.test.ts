import type { LifepathGeneratorDefinition } from "../lifepathTypes";

const sampleLifepathDefinition = {
  id: "sample-lifepath",
  label: "Sample Lifepath",
  version: "0.1.0",
  sophontId: "human",
  characteristics: [
    { id: "str", label: "Strength", abbreviation: "STR", rollNotation: "2d6", minimum: 1 },
    { id: "dex", label: "Dexterity", abbreviation: "DEX", rollNotation: "2d6", minimum: 1 },
    { id: "end", label: "Endurance", abbreviation: "END", rollNotation: "2d6", minimum: 1 },
    { id: "int", label: "Intellect", abbreviation: "INT", rollNotation: "2d6", minimum: 1 },
    { id: "edu", label: "Education", abbreviation: "EDU", rollNotation: "2d6", minimum: 1 },
    { id: "soc", label: "Standing", abbreviation: "SOC", rollNotation: "2d6", minimum: 1 },
  ],
  startingRules: {
    age: 18,
    characteristicRollNotation: "2d6",
    backgroundSkillTableIds: ["sample.background-skills"],
    startingEffects: [
      {
        id: "starting-note",
        type: "note.add",
        payload: { text: "Generated from a sample lifepath definition." },
      },
    ],
  },
  preCareerEducation: [
    {
      id: "sample-university",
      label: "University",
      description: "A pre-career education path used to prove the lifepath schema.",
      qualification: {
        id: "sample-university.qualification",
        label: "University Admission",
        notation: "2d6",
        target: 7,
        characteristicModifier: "edu",
      },
      graduation: {
        id: "sample-university.graduation",
        label: "University Graduation",
        notation: "2d6",
        target: 7,
        characteristicModifier: "int",
      },
      skillTableIds: ["sample-university.skills"],
      successEffects: [
        {
          id: "sample-university-age",
          type: "age.add",
          payload: { years: 4 },
        },
      ],
      failureEffects: [
        {
          id: "sample-university-contact",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Admissions tutor" },
        },
      ],
    },
  ],
  term: {
    id: "sample.term",
    label: "Four Year Term",
    phases: [
      "qualify",
      "choose-assignment",
      "survival",
      "event",
      "advancement",
      "skill",
      "aging",
      "reenlist",
      "benefits",
      "complete",
    ],
  },
  careers: [
    {
      id: "sample-scout",
      label: "Surveyor",
      description: "A small invented career used only to prove the lifepath schema.",
      qualification: {
        id: "sample-scout.qualify",
        label: "Surveyor Qualification",
        notation: "2d6",
        target: 6,
        characteristicModifier: "int",
        successEffects: [
          {
            id: "enter-surveyor",
            type: "career.enter",
            payload: { careerId: "sample-scout" },
          },
        ],
        failureEffects: [
          {
            id: "qualification-contact",
            type: "relationship.add",
            payload: { relationshipType: "contact", label: "Recruiter" },
          },
        ],
      },
      assignments: [
        {
          id: "sample-scout.field",
          label: "Field Survey",
          skillTableIds: ["sample-scout.skills"],
          survivalModifier: 1,
        },
        {
          id: "sample-scout.analysis",
          label: "Analysis",
          skillTableIds: ["sample-scout.skills", "sample.technical-skills"],
          advancementModifier: 1,
        },
      ],
      ranks: [
        {
          rank: 1,
          title: "Specialist",
          effects: [
            {
              id: "rank-specialist-skill",
              type: "skill.add",
              payload: { skill: "Science", level: 1 },
            },
          ],
        },
      ],
      skillTableIds: ["sample-scout.skills"],
      survival: {
        id: "sample-scout.survival",
        label: "Survival",
        notation: "2d6",
        target: 5,
        characteristicModifier: "end",
        failureEffects: [
          {
            id: "survival-injury",
            type: "injury.add",
            payload: { severity: "minor" },
          },
        ],
      },
      advancement: {
        id: "sample-scout.advancement",
        label: "Advancement",
        notation: "2d6",
        target: 8,
        characteristicModifier: "edu",
        successEffects: [
          {
            id: "advance-rank",
            type: "career.promote",
            payload: { careerId: "sample-scout" },
          },
        ],
      },
      eventTableId: "sample-scout.events",
      mishapTableId: "sample-scout.mishaps",
      benefitTableIds: ["sample-scout.benefits"],
    },
  ],
  tables: [
    {
      id: "sample-scout.events",
      label: "Surveyor Events",
      kind: "roll",
      scope: "career-event",
      notation: "2d6",
      entries: [
        {
          id: "sample-event-contact",
          label: "Useful Contact",
          range: [2, 7],
          effects: [
            {
              id: "event-contact",
              type: "relationship.add",
              payload: { relationshipType: "contact", label: "Port Authority Clerk" },
            },
          ],
        },
        {
          id: "sample-event-skill",
          label: "Field Lesson",
          range: [8, 12],
          effects: [
            {
              id: "event-skill",
              type: "skill.add",
              payload: { skill: "Recon", level: 1 },
            },
          ],
        },
      ],
    },
    {
      id: "sample-scout.mishaps",
      label: "Surveyor Mishaps",
      kind: "roll",
      scope: "mishap",
      notation: "1d6",
      entries: [
        {
          id: "sample-mishap-rival",
          label: "Professional Rival",
          range: [1, 6],
          effects: [
            {
              id: "mishap-rival",
              type: "relationship.add",
              payload: { relationshipType: "rival", label: "Competing Surveyor" },
            },
            {
              id: "mishap-leave",
              type: "career.leave",
              payload: { careerId: "sample-scout" },
            },
          ],
        },
      ],
    },
    {
      id: "sample-scout.benefits",
      label: "Surveyor Benefits",
      kind: "roll",
      scope: "benefit",
      notation: "1d6",
      entries: [
        {
          id: "sample-benefit-credit",
          label: "Completion Bonus",
          range: [1, 6],
          effects: [
            {
              id: "benefit-credit",
              type: "credit.add",
              payload: { amount: 5000 },
            },
          ],
        },
      ],
    },
    {
      id: "sample-scout.skills",
      label: "Surveyor Skills",
      kind: "roll",
      scope: "skill",
      notation: "1d6",
      entries: [
        {
          id: "sample-skill-pilot",
          label: "Pilot",
          range: [1, 3],
          effects: [
            {
              id: "skill-pilot",
              type: "skill.add",
              payload: { skill: "Pilot", level: 1 },
            },
          ],
        },
        {
          id: "sample-skill-science",
          label: "Science",
          range: [4, 6],
          effects: [
            {
              id: "skill-science",
              type: "skill.add",
              payload: { skill: "Science", level: 1 },
            },
          ],
        },
      ],
    },
    {
      id: "sample.background-skills",
      label: "Background Skills",
      kind: "choice",
      scope: "background",
      entries: [
        {
          id: "sample-background-admin",
          label: "Admin",
          effects: [
            {
              id: "background-admin",
              type: "skill.add",
              payload: { skill: "Admin", level: 0 },
            },
          ],
        },
      ],
    },
  ],
  relationships: [
    {
      id: "default-contact",
      type: "contact",
      label: "Contact",
      defaultEffects: [
        {
          id: "contact-note",
          type: "note.add",
          payload: { text: "A useful person known to the character." },
        },
      ],
    },
  ],
  completionRules: {
    requiredName: true,
    finalEffects: [
      {
        id: "complete-generation",
        type: "generation.complete",
        payload: { readyForPlay: true },
      },
    ],
  },
} satisfies LifepathGeneratorDefinition;

describe("LifepathGeneratorDefinition", () => {
  it("can represent a Mongoose-like lifepath structure without using published table content", () => {
    const career = sampleLifepathDefinition.careers[0];

    expect(sampleLifepathDefinition.term.phases).toContain("survival");
    expect(sampleLifepathDefinition.term.phases).toContain("event");
    expect(sampleLifepathDefinition.term.phases).toContain("benefits");
    expect(sampleLifepathDefinition.preCareerEducation?.[0]).toMatchObject({
      id: "sample-university",
      qualification: {
        target: 7,
      },
      graduation: {
        characteristicModifier: "int",
      },
      skillTableIds: ["sample-university.skills"],
    });
    expect(career.assignments.map((assignment) => assignment.id)).toEqual([
      "sample-scout.field",
      "sample-scout.analysis",
    ]);
    expect(career.survival.failureEffects?.[0].type).toBe("injury.add");
    expect(career.advancement?.successEffects?.[0].type).toBe("career.promote");
  });

  it("can represent event, mishap, benefit, skill, and relationship effects", () => {
    const tableScopes = sampleLifepathDefinition.tables.map((table) => table.scope);
    const effectTypes = sampleLifepathDefinition.tables.flatMap((table) =>
      table.entries.flatMap((entry) => entry.effects.map((effect) => effect.type)),
    );

    expect(tableScopes).toEqual(expect.arrayContaining([
      "career-event",
      "mishap",
      "benefit",
      "skill",
      "background",
    ]));
    expect(effectTypes).toEqual(expect.arrayContaining([
      "relationship.add",
      "career.leave",
      "credit.add",
      "skill.add",
    ]));
    expect(sampleLifepathDefinition.relationships?.[0].type).toBe("contact");
  });
});
