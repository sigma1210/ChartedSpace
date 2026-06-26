import {
  applyLifepathAction,
  characteristicDm,
  createInitialLifepathState,
  getCurrentLifepathStep,
  resolveLifepathTerm,
  skillDm,
  type LifepathRollProvider,
} from "../lifepathRunner";
import type { LifepathGeneratorDefinition } from "../lifepathTypes";

const definition: LifepathGeneratorDefinition = {
  id: "sample-lifepath",
  label: "Sample Lifepath",
  version: "0.1.0",
  sophontId: "human",
  data: {
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
  },
  term: {
    id: "sample.term",
    label: "Term",
    phases: ["choose-assignment", "survival", "skill", "event", "advancement", "complete"],
  },
  careers: [
    {
      id: "scout",
      label: "Scout",
      description: "Invented test career.",
      data: {
        qualificationFailureCareerIds: ["merchant"],
      },
      assignments: [
        { id: "scout.field", label: "Field" },
        { id: "scout.analysis", label: "Analysis" },
      ],
      ranks: [
        { rank: 0, title: "Scout" },
        {
          rank: 1,
          title: "Senior Scout",
          effects: [
            {
              id: "scout.rank-1.admin",
              type: "skill.add",
              payload: { skill: "Admin", level: 1 },
            },
          ],
        },
      ],
      skillTableIds: ["scout.skills"],
      qualification: {
        id: "scout.qualification",
        label: "Scout Qualification",
        notation: "2d6",
        target: 6,
        characteristicModifier: "edu",
        failureEffects: [
          {
            id: "scout.qualification-contact",
            type: "relationship.add",
            payload: { relationshipType: "contact", label: "Scout recruiter" },
          },
        ],
      },
      survival: {
        id: "scout.survival",
        label: "Survival",
        notation: "2d6",
        target: 6,
        failureEffects: [
          {
            id: "survival-injury",
            type: "injury.add",
            payload: { severity: "minor", label: "Training accident" },
          },
        ],
      },
      advancement: {
        id: "scout.advancement",
        label: "Advancement",
        notation: "2d6",
        target: 8,
        successEffects: [
          {
            id: "scout-promotion",
            type: "career.promote",
            payload: { ranks: 1 },
          },
        ],
      },
      eventTableId: "scout.events",
      mishapTableId: "scout.mishaps",
      benefitTableIds: ["scout.benefits"],
    },
    {
      id: "merchant",
      label: "Merchant",
      description: "Second invented test career.",
      assignments: [
        { id: "merchant.trade", label: "Trade" },
      ],
      skillTableIds: ["merchant.skills"],
      survival: {
        id: "merchant.survival",
        label: "Survival",
        notation: "2d6",
        target: 5,
      },
      eventTableId: "merchant.events",
      mishapTableId: "merchant.mishaps",
      benefitTableIds: ["merchant.benefits"],
    },
    {
      id: "drifter",
      label: "Drifter",
      description: "Fallback test career.",
      data: {
        hideFromCareerSelection: true,
      },
      assignments: [
        { id: "drifter.wanderer", label: "Wanderer" },
      ],
      skillTableIds: ["drifter.skills"],
      survival: {
        id: "drifter.survival",
        label: "Survival",
        notation: "2d6",
        target: 5,
      },
      eventTableId: "drifter.events",
      mishapTableId: "drifter.mishaps",
      benefitTableIds: ["drifter.benefits"],
    },
  ],
  tables: [
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
      ],
    },
    {
      id: "scout.skills",
      label: "Scout Skills",
      kind: "roll",
      scope: "skill",
      notation: "1d6",
      entries: [
        {
          id: "scout.skill-recon",
          label: "Recon",
          range: [1, 3],
          effects: [
            {
              id: "scout.skill-recon.effect",
              type: "skill.add",
              payload: { skill: "Recon", level: 1 },
            },
          ],
        },
        {
          id: "scout.skill-survival",
          label: "Survival",
          range: [4, 6],
          effects: [
            {
              id: "scout.skill-survival.effect",
              type: "skill.add",
              payload: { skill: "Survival", level: 1 },
            },
          ],
        },
      ],
    },
    {
      id: "scout.events",
      label: "Scout Events",
      kind: "roll",
      scope: "career-event",
      notation: "2d6",
      entries: [
        {
          id: "scout.contact",
          label: "Useful Contact",
          range: [2, 7],
          effects: [
            {
              id: "event-contact",
              type: "relationship.add",
              payload: { relationshipType: "contact", label: "Survey Clerk" },
            },
          ],
        },
        {
          id: "scout.skill",
          label: "Field Lesson",
          range: [8, 12],
          effects: [],
          choicePrompt: "Choose the skill learned in the field.",
          choices: [
            {
              id: "choose-recon",
              label: "Recon",
              effects: [
                {
                  id: "event-recon",
                  type: "skill.add",
                  payload: { skill: "Recon", level: 1 },
                },
              ],
            },
            {
              id: "choose-survival",
              label: "Survival",
              effects: [
                {
                  id: "event-survival",
                  type: "skill.add",
                  payload: { skill: "Survival", level: 1 },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "scout.mishaps",
      label: "Scout Mishaps",
      kind: "roll",
      scope: "mishap",
      notation: "1d6",
      entries: [
        {
          id: "scout.rival",
          label: "Professional Rival",
          range: [1, 6],
          effects: [
            {
              id: "mishap-rival",
              type: "relationship.add",
              payload: { relationshipType: "rival", label: "Rival Surveyor" },
            },
            {
              id: "mishap-leave",
              type: "career.leave",
              payload: { careerId: "scout" },
            },
          ],
        },
      ],
    },
    {
      id: "scout.benefits",
      label: "Scout Benefits",
      kind: "roll",
      scope: "benefit",
      notation: "1d6",
      entries: [
        {
          id: "scout.cash",
          label: "Cash",
          range: [1, 6],
          effects: [
            {
              id: "scout.cash.effect",
              type: "credit.add",
              payload: { amount: 5000 },
            },
          ],
        },
      ],
    },
  ],
};

const queuedRolls = (...rolls: number[]): LifepathRollProvider => {
  const queue = [...rolls];
  return {
    roll: () => {
      const next = queue.shift();
      if (next === undefined) throw new Error("No queued roll available.");
      return next;
    },
  };
};

const rolledInitialState = () =>
  applyLifepathAction(
    createInitialLifepathState(definition),
    definition,
    { type: "characteristics.roll" },
    queuedRolls(7, 8, 9, 10, 11, 12),
  );

const readyForScoutTerm = () => {
  const careerState = applyLifepathAction(
    rolledInitialState(),
    definition,
    { type: "career.select", careerId: "scout" },
  );
  const qualified = applyLifepathAction(
    careerState,
    definition,
    { type: "career.qualification.resolve" },
    queuedRolls(7),
  );
  return applyLifepathAction(qualified, definition, {
    type: "assignment.select",
    assignmentId: "scout.analysis",
  });
};

const preCareerDefinition: LifepathGeneratorDefinition = {
  ...definition,
  preCareerEducation: [
    {
      id: "university",
      label: "University",
      description: "Four years of formal education before attempting a career.",
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
          id: "university.contact",
          type: "relationship.add",
          payload: {
            relationshipType: "contact",
            label: "Admissions tutor",
          },
        },
      ],
    },
  ],
};

describe("lifepathRunner", () => {
  it("uses the Traveller characteristic DM table", () => {
    expect([
      [0, characteristicDm(0)],
      [1, characteristicDm(1)],
      [2, characteristicDm(2)],
      [3, characteristicDm(3)],
      [5, characteristicDm(5)],
      [6, characteristicDm(6)],
      [8, characteristicDm(8)],
      [9, characteristicDm(9)],
      [11, characteristicDm(11)],
      [12, characteristicDm(12)],
      [14, characteristicDm(14)],
      [15, characteristicDm(15)],
    ]).toEqual([
      [0, -3],
      [1, -2],
      [2, -2],
      [3, -1],
      [5, -1],
      [6, 0],
      [8, 0],
      [9, 1],
      [11, 1],
      [12, 2],
      [14, 2],
      [15, 3],
    ]);
  });

  it("uses the Traveller skill DM rule", () => {
    expect(skillDm(undefined)).toBe(-3);
    expect(skillDm(null)).toBe(-3);
    expect(skillDm(0)).toBe(0);
    expect(skillDm(1)).toBe(1);
    expect(skillDm(2)).toBe(2);
  });

  it("applies skill DMs only when a check names a skill", () => {
    const skillDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "scout"
          ? {
              ...career,
              qualification: {
                ...career.qualification!,
                skillModifier: "Broker",
              },
            }
          : career,
      ),
    };
    const careerState = applyLifepathAction(
      rolledInitialState(),
      skillDefinition,
      { type: "career.select", careerId: "scout" },
    );

    const untrained = applyLifepathAction(
      careerState,
      skillDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(7),
    );
    expect(untrained.phase).toBe("qualification-failed");
    expect(untrained.log.at(-1)).toMatchObject({
      data: {
        roll: 7,
        characteristicModifier: 1,
        skillName: "Broker",
        skillLevel: null,
        skillModifier: -3,
        total: 5,
        qualified: false,
      },
    });

    const skillZero = applyLifepathAction(
      {
        ...careerState,
        skills: [{ name: "Broker", level: 0 }],
      },
      skillDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(5),
    );
    expect(skillZero.phase).toBe("choose-assignment");
    expect(skillZero.log.at(-1)).toMatchObject({
      data: {
        roll: 5,
        characteristicModifier: 1,
        skillName: "Broker",
        skillLevel: 0,
        skillModifier: 0,
        total: 6,
        qualified: true,
      },
    });
  });

  it("applies career history DMs to qualification rolls", () => {
    const historyDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "scout"
          ? {
              ...career,
              qualificationModifiers: [
                {
                  id: "scout.prior-career",
                  label: "Prior career",
                  modifier: -1,
                  when: "hasCareerHistory",
                },
              ],
            }
          : career,
      ),
    };
    const complete = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(7, 2, 7, 7),
    );
    const choosingCareer = applyLifepathAction(
      complete,
      historyDefinition,
      { type: "career.change" },
    );
    const careerState = applyLifepathAction(
      choosingCareer,
      historyDefinition,
      { type: "career.select", careerId: "scout" },
    );

    expect(getCurrentLifepathStep(careerState, historyDefinition)).toMatchObject({
      kind: "roll",
      data: {
        careerId: "scout",
        modifiers: [
          {
            id: "scout.prior-career",
            label: "Prior career",
            modifier: -1,
          },
        ],
        extraModifierTotal: -1,
        modifierTotal: 0,
      },
    });

    const failed = applyLifepathAction(
      careerState,
      historyDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(5),
    );

    expect(failed.phase).toBe("qualification-failed");
    expect(failed.log.at(-1)).toMatchObject({
      type: "qualification.roll",
      label: "Scout Qualification: Not qualified",
      data: {
        roll: 5,
        characteristicModifier: 1,
        modifiers: [
          {
            id: "scout.prior-career",
            label: "Prior career",
            modifier: -1,
          },
        ],
        extraModifierTotal: -1,
        total: 5,
        qualified: false,
      },
    });
  });

  it("applies previous-career qualification DMs for matching career history", () => {
    const historyDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "merchant"
          ? {
              ...career,
              qualification: {
                id: "merchant.qualification",
                label: "Merchant Qualification",
                notation: "2d6",
                target: 6,
                characteristicModifier: "soc",
              },
              qualificationModifiers: [
                {
                  id: "merchant.scout-history",
                  label: "Scout service",
                  modifier: 1,
                  when: "previousCareer",
                  careerIds: ["scout"],
                },
              ],
            }
          : career,
      ),
    };
    const complete = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(7, 2, 7, 7),
    );
    const choosingCareer = applyLifepathAction(
      complete,
      historyDefinition,
      { type: "career.change" },
    );
    const careerState = applyLifepathAction(
      choosingCareer,
      historyDefinition,
      { type: "career.select", careerId: "merchant" },
    );

    expect(getCurrentLifepathStep(careerState, historyDefinition)).toMatchObject({
      kind: "roll",
      data: {
        careerId: "merchant",
        modifiers: [
          {
            id: "merchant.scout-history",
            label: "Scout service",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
        modifierTotal: 3,
      },
    });

    const qualified = applyLifepathAction(
      careerState,
      historyDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(3),
    );

    expect(qualified.phase).toBe("choose-assignment");
    expect(qualified.log.at(-1)).toMatchObject({
      type: "qualification.roll",
      label: "Merchant Qualification: Qualified",
      data: {
        roll: 3,
        characteristicModifier: 2,
        modifiers: [
          {
            id: "merchant.scout-history",
            label: "Scout service",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
        total: 6,
        qualified: true,
      },
    });
  });

  it("applies same-career qualification DMs only for the selected career history", () => {
    const historyDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "scout"
          ? {
              ...career,
              qualificationModifiers: [
                {
                  id: "scout.same-career",
                  label: "Prior scout service",
                  modifier: 2,
                  when: "sameCareer",
                },
              ],
            }
          : career.id === "merchant"
            ? {
                ...career,
                qualification: {
                  id: "merchant.qualification",
                  label: "Merchant Qualification",
                  notation: "2d6",
                  target: 6,
                  characteristicModifier: "soc",
                },
                qualificationModifiers: [
                  {
                    id: "merchant.same-career",
                    label: "Prior merchant service",
                    modifier: 2,
                    when: "sameCareer",
                  },
                ],
              }
            : career,
      ),
    };
    const complete = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(7, 2, 7, 7),
    );
    const choosingCareer = applyLifepathAction(
      complete,
      historyDefinition,
      { type: "career.change" },
    );
    const merchantState = applyLifepathAction(
      choosingCareer,
      historyDefinition,
      { type: "career.select", careerId: "merchant" },
    );

    expect(getCurrentLifepathStep(merchantState, historyDefinition)).toMatchObject({
      kind: "roll",
      data: {
        careerId: "merchant",
        modifiers: [],
        extraModifierTotal: 0,
        modifierTotal: 2,
      },
    });

    const scoutState = applyLifepathAction(
      choosingCareer,
      historyDefinition,
      { type: "career.select", careerId: "scout" },
    );

    expect(getCurrentLifepathStep(scoutState, historyDefinition)).toMatchObject({
      kind: "roll",
      data: {
        careerId: "scout",
        modifiers: [
          {
            id: "scout.same-career",
            label: "Prior scout service",
            modifier: 2,
          },
        ],
        extraModifierTotal: 2,
        modifierTotal: 3,
      },
    });
  });

  it("filters qualification history DMs by survived terms", () => {
    const historyDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "merchant"
          ? {
              ...career,
              qualification: {
                id: "merchant.qualification",
                label: "Merchant Qualification",
                notation: "2d6",
                target: 6,
                characteristicModifier: "soc",
              },
              qualificationModifiers: [
                {
                  id: "merchant.scout-survivor",
                  label: "Survived scout service",
                  modifier: 1,
                  when: "previousCareer",
                  careerIds: ["scout"],
                  survived: true,
                },
                {
                  id: "merchant.scout-mishap",
                  label: "Scout mishap",
                  modifier: -2,
                  when: "previousCareer",
                  careerIds: ["scout"],
                  survived: false,
                },
              ],
            }
          : career,
      ),
    };
    const survivedScout = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(7, 2, 7, 7),
    );
    const survivedChoice = applyLifepathAction(
      survivedScout,
      historyDefinition,
      { type: "career.change" },
    );
    const survivedMerchant = applyLifepathAction(
      survivedChoice,
      historyDefinition,
      { type: "career.select", careerId: "merchant" },
    );

    expect(getCurrentLifepathStep(survivedMerchant, historyDefinition)).toMatchObject({
      kind: "roll",
      data: {
        careerId: "merchant",
        modifiers: [
          {
            id: "merchant.scout-survivor",
            label: "Survived scout service",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
        modifierTotal: 3,
      },
    });

    const failedSurvival = applyLifepathAction(
      readyForScoutTerm(),
      definition,
      { type: "term.survival.resolve" },
      queuedRolls(4),
    );
    const mishap = applyLifepathAction(
      failedSurvival,
      definition,
      { type: "term.mishap.resolve" },
      queuedRolls(3),
    );
    const failedScout = applyLifepathAction(
      mishap,
      definition,
      { type: "term.aging.resolve" },
    );
    const failedChoice = applyLifepathAction(
      failedScout,
      historyDefinition,
      { type: "career.change" },
    );
    const failedMerchant = applyLifepathAction(
      failedChoice,
      historyDefinition,
      { type: "career.select", careerId: "merchant" },
    );

    expect(getCurrentLifepathStep(failedMerchant, historyDefinition)).toMatchObject({
      kind: "roll",
      data: {
        careerId: "merchant",
        modifiers: [
          {
            id: "merchant.scout-mishap",
            label: "Scout mishap",
            modifier: -2,
          },
        ],
        extraModifierTotal: -2,
        modifierTotal: 0,
      },
    });
  });

  it("filters qualification history DMs by matching term counts", () => {
    const historyDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "merchant"
          ? {
              ...career,
              qualification: {
                id: "merchant.qualification",
                label: "Merchant Qualification",
                notation: "2d6",
                target: 6,
                characteristicModifier: "soc",
              },
              qualificationModifiers: [
                {
                  id: "merchant.scout-veteran",
                  label: "Two terms scout service",
                  modifier: 3,
                  when: "previousCareer",
                  careerIds: ["scout"],
                  minimumTerms: 2,
                  maximumTerms: 2,
                },
              ],
            }
          : career,
      ),
    };
    const completeScoutTerms = (termCount: number) => {
      let state = resolveLifepathTerm(
        readyForScoutTerm(),
        definition,
        queuedRolls(7, 2, 7, 7),
      );
      for (let index = 1; index < termCount; index += 1) {
        const continued = applyLifepathAction(
          state,
          definition,
          { type: "term.continue" },
        );
        state = resolveLifepathTerm(
          continued,
          definition,
          queuedRolls(7, 2, 7, 7),
        );
      }
      return state;
    };
    const selectMerchantAfter = (state: ReturnType<typeof completeScoutTerms>) => {
      const choosingCareer = applyLifepathAction(
        state,
        historyDefinition,
        { type: "career.change" },
      );
      return applyLifepathAction(
        choosingCareer,
        historyDefinition,
        { type: "career.select", careerId: "merchant" },
      );
    };

    expect(getCurrentLifepathStep(selectMerchantAfter(completeScoutTerms(1)), historyDefinition))
      .toMatchObject({
        kind: "roll",
        data: {
          modifiers: [],
          extraModifierTotal: 0,
          modifierTotal: 2,
        },
      });
    expect(getCurrentLifepathStep(selectMerchantAfter(completeScoutTerms(2)), historyDefinition))
      .toMatchObject({
        kind: "roll",
        data: {
          modifiers: [
            {
              id: "merchant.scout-veteran",
              label: "Two terms scout service",
              modifier: 3,
            },
          ],
          extraModifierTotal: 3,
          modifierTotal: 5,
        },
      });
    expect(getCurrentLifepathStep(selectMerchantAfter(completeScoutTerms(3)), historyDefinition))
      .toMatchObject({
        kind: "roll",
        data: {
          modifiers: [],
          extraModifierTotal: 0,
          modifierTotal: 2,
        },
      });
  });

  it("defaults relationship provenance from career event table context", () => {
    const survival = applyLifepathAction(
      readyForScoutTerm(),
      definition,
      { type: "term.survival.resolve" },
      queuedRolls(7),
    );
    const skill = applyLifepathAction(
      survival,
      definition,
      { type: "term.skill.resolve" },
      queuedRolls(4),
    );
    const event = applyLifepathAction(
      skill,
      definition,
      { type: "term.event.resolve" },
      queuedRolls(2),
    );

    expect(event.phase).toBe("advancement");
    expect(event.relationships).toContainEqual({
      type: "contact",
      label: "Survey Clerk",
      careerId: "scout",
      term: 1,
      eventId: "term-1.career-event.scout.events",
      eventType: "career-event.roll",
    });
  });

  it("defaults relationship provenance from table choice context", () => {
    const choiceDefinition: LifepathGeneratorDefinition = {
      ...definition,
      tables: definition.tables.map((table) =>
        table.id === "scout.events"
          ? {
              ...table,
              entries: table.entries.map((entry) =>
                entry.id === "scout.skill"
                  ? {
                      ...entry,
                      choices: entry.choices?.map((choice) =>
                        choice.id === "choose-recon"
                          ? {
                              ...choice,
                              effects: [
                                {
                                  id: "choice-contact",
                                  type: "relationship.add",
                                  payload: {
                                    relationshipType: "contact",
                                    label: "Field instructor",
                                  },
                                },
                              ],
                            }
                          : choice),
                    }
                  : entry),
            }
          : table),
    };
    const survival = applyLifepathAction(
      readyForScoutTerm(),
      choiceDefinition,
      { type: "term.survival.resolve" },
      queuedRolls(7),
    );
    const skill = applyLifepathAction(
      survival,
      choiceDefinition,
      { type: "term.skill.resolve" },
      queuedRolls(4),
    );
    const event = applyLifepathAction(
      skill,
      choiceDefinition,
      { type: "term.event.resolve" },
      queuedRolls(8),
    );
    const choice = applyLifepathAction(
      event,
      choiceDefinition,
      { type: "table.choice.select", choiceId: "choose-recon" },
    );

    expect(choice.relationships).toContainEqual({
      type: "contact",
      label: "Field instructor",
      careerId: "scout",
      term: 1,
      eventId: "term-1.table.choice.select",
      eventType: "table.choice.select",
    });
  });

  it("applies matched qualification modifier success effects", () => {
    const historyDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "merchant"
          ? {
              ...career,
              qualification: {
                id: "merchant.qualification",
                label: "Merchant Qualification",
                notation: "2d6",
                target: 6,
                characteristicModifier: "soc",
              },
              qualificationModifiers: [
                {
                  id: "merchant.scout-contact",
                  label: "Scout referral",
                  modifier: 1,
                  when: "previousCareer",
                  careerIds: ["scout"],
                  successEffects: [
                    {
                      id: "merchant.scout-contact.effect",
                      type: "relationship.add",
                      payload: {
                        relationshipId: "rel-scout-trade-referral",
                        relationshipType: "contact",
                        label: "Scout trade referral",
                        source: "qualification-history",
                        careerId: "merchant",
                        term: 2,
                        notes: "Introduced by a scout route contact.",
                        characterId: "npc-scout-referral",
                        role: "scout-broker",
                        eventId: "term-2.merchant.qualification",
                        eventType: "qualification.roll",
                      },
                    },
                  ],
                },
              ],
            }
          : career,
      ),
    };
    const complete = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(7, 2, 7, 7),
    );
    const choosingCareer = applyLifepathAction(
      complete,
      historyDefinition,
      { type: "career.change" },
    );
    const careerState = applyLifepathAction(
      choosingCareer,
      historyDefinition,
      { type: "career.select", careerId: "merchant" },
    );
    const qualified = applyLifepathAction(
      careerState,
      historyDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(3),
    );

    expect(qualified.phase).toBe("choose-assignment");
    expect(qualified.relationships).toContainEqual(
      {
        id: "rel-scout-trade-referral",
        type: "contact",
        label: "Scout trade referral",
        source: "qualification-history",
        careerId: "merchant",
        term: 2,
        notes: "Introduced by a scout route contact.",
        characterId: "npc-scout-referral",
        role: "scout-broker",
        eventId: "term-2.merchant.qualification",
        eventType: "qualification.roll",
      },
    );
  });

  it("applies matched qualification modifier failure effects", () => {
    const historyDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "merchant"
          ? {
              ...career,
              qualification: {
                id: "merchant.qualification",
                label: "Merchant Qualification",
                notation: "2d6",
                target: 8,
                characteristicModifier: "soc",
              },
              qualificationModifiers: [
                {
                  id: "merchant.scout-rival",
                  label: "Scout reputation",
                  modifier: 0,
                  when: "previousCareer",
                  careerIds: ["scout"],
                  failureEffects: [
                    {
                      id: "merchant.scout-rival.effect",
                      type: "relationship.add",
                      payload: {
                        relationshipId: "rel-suspicious-factor",
                        relationshipType: "rival",
                        label: "Suspicious merchant factor",
                        characterId: "npc-suspicious-factor",
                        role: "merchant-factor",
                        eventId: "term-2.merchant.qualification",
                        eventType: "qualification.roll",
                      },
                    },
                  ],
                },
              ],
            }
          : career,
      ),
    };
    const complete = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(7, 2, 7, 7),
    );
    const choosingCareer = applyLifepathAction(
      complete,
      historyDefinition,
      { type: "career.change" },
    );
    const careerState = applyLifepathAction(
      choosingCareer,
      historyDefinition,
      { type: "career.select", careerId: "merchant" },
    );
    const failed = applyLifepathAction(
      careerState,
      historyDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(3),
    );

    expect(failed.phase).toBe("qualification-failed");
    expect(failed.relationships).toContainEqual(
      {
        id: "rel-suspicious-factor",
        type: "rival",
        label: "Suspicious merchant factor",
        careerId: "merchant",
        term: 2,
        characterId: "npc-suspicious-factor",
        role: "merchant-factor",
        eventId: "term-2.merchant.qualification",
        eventType: "qualification.roll",
      },
    );
  });

  it("defaults relationship provenance from qualification effect context", () => {
    const historyDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "merchant"
          ? {
              ...career,
              qualification: {
                id: "merchant.qualification",
                label: "Merchant Qualification",
                notation: "2d6",
                target: 6,
                characteristicModifier: "soc",
              },
              qualificationModifiers: [
                {
                  id: "merchant.scout-contact",
                  label: "Scout referral",
                  modifier: 1,
                  when: "previousCareer",
                  careerIds: ["scout"],
                  successEffects: [
                    {
                      id: "merchant.scout-contact.effect",
                      type: "relationship.add",
                      payload: {
                        relationshipId: "rel-context-referral",
                        relationshipType: "contact",
                        label: "Context referral",
                      },
                    },
                  ],
                },
              ],
            }
          : career,
      ),
    };
    const complete = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(7, 2, 7, 7),
    );
    const choosingCareer = applyLifepathAction(
      complete,
      historyDefinition,
      { type: "career.change" },
    );
    const careerState = applyLifepathAction(
      choosingCareer,
      historyDefinition,
      { type: "career.select", careerId: "merchant" },
    );
    const qualified = applyLifepathAction(
      careerState,
      historyDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(3),
    );

    expect(qualified.relationships).toContainEqual({
      id: "rel-context-referral",
      type: "contact",
      label: "Context referral",
      careerId: "merchant",
      term: 2,
      eventId: "term-2.qualification",
      eventType: "qualification.roll",
    });
  });

  it("starts by asking the user to roll characteristics", () => {
    const state = createInitialLifepathState(definition);
    const step = getCurrentLifepathStep(state, definition);

    expect(state).toMatchObject({
      generatorId: "sample-lifepath",
      phase: "roll-characteristics",
      term: 1,
      selectedCareerId: null,
      selectedAssignmentId: null,
    });
    expect(step).toMatchObject({
      kind: "roll",
      id: "lifepath.characteristics",
      title: "Roll Characteristics",
      notation: "2d6",
    });
  });

  it("rolls characteristics and then asks the user to choose a career", () => {
    const state = rolledInitialState();
    const step = getCurrentLifepathStep(state, definition);

    expect(state).toMatchObject({
      phase: "choose-career",
      characteristics: {
        str: 7,
        dex: 8,
        end: 9,
        int: 10,
        edu: 11,
        soc: 12,
      },
    });
    expect(step).toMatchObject({
      kind: "choice",
      id: "lifepath.choose-career",
      title: "Choose Career",
    });
    expect(step.kind === "choice" ? step.options.map((option) => option.id) : []).toEqual([
      "scout",
      "merchant",
    ]);
  });

  it("asks for a pre-career choice when education paths exist", () => {
    const state = applyLifepathAction(
      createInitialLifepathState(preCareerDefinition),
      preCareerDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const step = getCurrentLifepathStep(state, preCareerDefinition);

    expect(state.phase).toBe("pre-career-choice");
    expect(step).toMatchObject({
      kind: "choice",
      id: "lifepath.pre-career-choice",
      title: "Choose Pre-Career Path",
      options: [
        {
          id: "enter-career",
          label: "Enter Career",
        },
        {
          id: "university",
          label: "University",
          data: {
            educationId: "university",
          },
        },
      ],
    });
  });

  it("skips pre-career education and enters career selection", () => {
    const state = applyLifepathAction(
      createInitialLifepathState(preCareerDefinition),
      preCareerDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const skipped = applyLifepathAction(
      state,
      preCareerDefinition,
      { type: "preCareer.skip" },
    );

    expect(skipped.phase).toBe("choose-career");
    expect(skipped.log.at(-1)).toMatchObject({
      type: "preCareer.skip",
      label: "Pre-Career: Enter Career",
    });
    expect(getCurrentLifepathStep(skipped, preCareerDefinition)).toMatchObject({
      id: "lifepath.choose-career",
    });
  });

  it("selects pre-career education and asks for admission qualification", () => {
    const state = applyLifepathAction(
      createInitialLifepathState(preCareerDefinition),
      preCareerDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const selected = applyLifepathAction(
      state,
      preCareerDefinition,
      { type: "preCareer.select", educationId: "university" },
    );
    const step = getCurrentLifepathStep(selected, preCareerDefinition);

    expect(selected.phase).toBe("pre-career-qualification");
    expect(selected.selectedPreCareerEducationId).toBe("university");
    expect(selected.log.at(-1)).toMatchObject({
      type: "preCareer.select",
      label: "Pre-Career: University",
      data: {
        educationId: "university",
        educationLabel: "University",
      },
    });
    expect(step).toMatchObject({
      kind: "roll",
      id: "lifepath.pre-career.qualification",
      title: "Resolve Pre-Career Admission",
      notation: "2d6",
      target: 7,
      data: {
        educationId: "university",
        characteristicId: "edu",
        characteristicScore: 11,
        characteristicModifier: 1,
      },
    });
  });

  it("resolves successful pre-career admission and asks for graduation", () => {
    const state = applyLifepathAction(
      createInitialLifepathState(preCareerDefinition),
      preCareerDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const selected = applyLifepathAction(
      state,
      preCareerDefinition,
      { type: "preCareer.select", educationId: "university" },
    );
    const resolved = applyLifepathAction(
      selected,
      preCareerDefinition,
      { type: "preCareer.qualification.resolve" },
      queuedRolls(6),
    );

    expect(resolved.phase).toBe("pre-career-graduation");
    expect(resolved.age).toBe(22);
    expect(resolved.log.at(-1)).toMatchObject({
      type: "preCareer.qualification.roll",
      label: "University Admission: Admitted",
      data: {
        educationId: "university",
        roll: 6,
        total: 7,
        target: 7,
        admitted: true,
      },
    });
    expect(getCurrentLifepathStep(resolved, preCareerDefinition)).toMatchObject({
      id: "lifepath.pre-career.graduation",
      title: "Resolve Pre-Career Graduation",
      notation: "2d6",
      target: 7,
      data: {
        educationId: "university",
        characteristicId: "int",
        characteristicScore: 10,
        characteristicModifier: 1,
      },
    });
  });

  it("resolves successful pre-career graduation and asks for a university skill", () => {
    const state = applyLifepathAction(
      createInitialLifepathState(preCareerDefinition),
      preCareerDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const selected = applyLifepathAction(
      state,
      preCareerDefinition,
      { type: "preCareer.select", educationId: "university" },
    );
    const admitted = applyLifepathAction(
      selected,
      preCareerDefinition,
      { type: "preCareer.qualification.resolve" },
      queuedRolls(6),
    );
    const graduated = applyLifepathAction(
      admitted,
      preCareerDefinition,
      { type: "preCareer.graduation.resolve" },
      queuedRolls(6),
    );

    expect(graduated.phase).toBe("pre-career-skill");
    expect(graduated.preCareerHonorsGraduated).toBe(false);
    expect(graduated.pendingPreCareerSkillRolls).toBe(1);
    expect(graduated.log.at(-1)).toMatchObject({
      type: "preCareer.graduation.roll",
      label: "University Graduation: Graduated",
      data: {
        educationId: "university",
        roll: 6,
        total: 7,
        target: 7,
        graduated: true,
        honorsTarget: 11,
        honorsGraduated: false,
      },
    });
    expect(getCurrentLifepathStep(graduated, preCareerDefinition)).toMatchObject({
      id: "lifepath.pre-career.skill",
      title: "Resolve Pre-Career Skill",
      tableId: "basic-human.university-skills",
      data: {
        educationId: "university",
      },
    });
  });

  it("resolves honors pre-career graduation and asks for two university skill rolls", () => {
    const state = applyLifepathAction(
      createInitialLifepathState(preCareerDefinition),
      preCareerDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const selected = applyLifepathAction(
      state,
      preCareerDefinition,
      { type: "preCareer.select", educationId: "university" },
    );
    const admitted = applyLifepathAction(
      selected,
      preCareerDefinition,
      { type: "preCareer.qualification.resolve" },
      queuedRolls(6),
    );
    const graduated = applyLifepathAction(
      admitted,
      preCareerDefinition,
      { type: "preCareer.graduation.resolve" },
      queuedRolls(10),
    );

    expect(graduated.phase).toBe("pre-career-skill");
    expect(graduated.preCareerHonorsGraduated).toBe(true);
    expect(graduated.pendingPreCareerSkillRolls).toBe(2);
    expect(graduated.log.at(-1)).toMatchObject({
      type: "preCareer.graduation.roll",
      label: "University Graduation: Graduated with Honors",
      data: {
        educationId: "university",
        roll: 10,
        total: 11,
        target: 7,
        honorsTarget: 11,
        graduated: true,
        honorsGraduated: true,
      },
    });
  });

  it("resolves a successful university skill and enters career selection", () => {
    const state = applyLifepathAction(
      createInitialLifepathState(preCareerDefinition),
      preCareerDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const selected = applyLifepathAction(
      state,
      preCareerDefinition,
      { type: "preCareer.select", educationId: "university" },
    );
    const admitted = applyLifepathAction(
      selected,
      preCareerDefinition,
      { type: "preCareer.qualification.resolve" },
      queuedRolls(6),
    );
    const graduated = applyLifepathAction(
      admitted,
      preCareerDefinition,
      { type: "preCareer.graduation.resolve" },
      queuedRolls(6),
    );
    const skilled = applyLifepathAction(
      graduated,
      preCareerDefinition,
      { type: "preCareer.skill.resolve" },
      queuedRolls(2),
    );

    expect(skilled.phase).toBe("choose-career");
    expect(skilled.skills).toEqual(
      expect.arrayContaining([
        {
          name: "Science",
          level: 1,
        },
      ]),
    );
    expect(skilled.log.at(-1)).toMatchObject({
      type: "skill.roll",
      label: "University Skills: Science",
      data: {
        tableId: "basic-human.university-skills",
        entryId: "university.skill-science",
        roll: 2,
      },
    });
    expect(getCurrentLifepathStep(skilled, preCareerDefinition)).toMatchObject({
      id: "lifepath.choose-career",
    });
  });

  it("resolves two university skills for an honors graduate before career selection", () => {
    const state = applyLifepathAction(
      createInitialLifepathState(preCareerDefinition),
      preCareerDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const selected = applyLifepathAction(
      state,
      preCareerDefinition,
      { type: "preCareer.select", educationId: "university" },
    );
    const admitted = applyLifepathAction(
      selected,
      preCareerDefinition,
      { type: "preCareer.qualification.resolve" },
      queuedRolls(6),
    );
    const graduated = applyLifepathAction(
      admitted,
      preCareerDefinition,
      { type: "preCareer.graduation.resolve" },
      queuedRolls(10),
    );
    const firstSkill = applyLifepathAction(
      graduated,
      preCareerDefinition,
      { type: "preCareer.skill.resolve" },
      queuedRolls(1),
    );
    const secondSkill = applyLifepathAction(
      firstSkill,
      preCareerDefinition,
      { type: "preCareer.skill.resolve" },
      queuedRolls(2),
    );

    expect(firstSkill.phase).toBe("pre-career-skill");
    expect(firstSkill.pendingPreCareerSkillRolls).toBe(1);
    expect(secondSkill.phase).toBe("choose-career");
    expect(secondSkill.pendingPreCareerSkillRolls).toBe(0);
    expect(secondSkill.skills).toEqual(
      expect.arrayContaining([
        {
          name: "Admin",
          level: 1,
        },
        {
          name: "Science",
          level: 1,
        },
      ]),
    );
  });

  it("applies pre-career graduate DMs to qualification rolls", () => {
    const modifierDefinition: LifepathGeneratorDefinition = {
      ...preCareerDefinition,
      careers: preCareerDefinition.careers.map((career) =>
        career.id === "scout"
          ? {
              ...career,
              qualificationModifiers: [
                {
                  id: "scout.university-graduate",
                  label: "University graduate",
                  modifier: 1,
                  when: "preCareerEducation",
                  educationIds: ["university"],
                  graduated: true,
                  honorsGraduated: false,
                },
              ],
            }
          : career,
      ),
    };
    const state = applyLifepathAction(
      createInitialLifepathState(modifierDefinition),
      modifierDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const selected = applyLifepathAction(
      state,
      modifierDefinition,
      { type: "preCareer.select", educationId: "university" },
    );
    const admitted = applyLifepathAction(
      selected,
      modifierDefinition,
      { type: "preCareer.qualification.resolve" },
      queuedRolls(6),
    );
    const graduated = applyLifepathAction(
      admitted,
      modifierDefinition,
      { type: "preCareer.graduation.resolve" },
      queuedRolls(6),
    );
    const skilled = applyLifepathAction(
      graduated,
      modifierDefinition,
      { type: "preCareer.skill.resolve" },
      queuedRolls(2),
    );
    const careerState = applyLifepathAction(
      skilled,
      modifierDefinition,
      { type: "career.select", careerId: "scout" },
    );

    expect(getCurrentLifepathStep(careerState, modifierDefinition)).toMatchObject({
      kind: "roll",
      data: {
        modifiers: [
          {
            id: "scout.university-graduate",
            label: "University graduate",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
        modifierTotal: 2,
      },
    });

    const qualified = applyLifepathAction(
      careerState,
      modifierDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(4),
    );

    expect(qualified.phase).toBe("choose-assignment");
    expect(qualified.log.at(-1)).toMatchObject({
      type: "qualification.roll",
      data: {
        roll: 4,
        characteristicModifier: 1,
        modifiers: [
          {
            id: "scout.university-graduate",
            label: "University graduate",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
        total: 6,
        qualified: true,
      },
    });
  });

  it("applies pre-career honors DMs to qualification rolls", () => {
    const modifierDefinition: LifepathGeneratorDefinition = {
      ...preCareerDefinition,
      careers: preCareerDefinition.careers.map((career) =>
        career.id === "scout"
          ? {
              ...career,
              qualificationModifiers: [
                {
                  id: "scout.university-honors",
                  label: "University honors graduate",
                  modifier: 2,
                  when: "preCareerEducation",
                  educationIds: ["university"],
                  honorsGraduated: true,
                },
              ],
            }
          : career,
      ),
    };
    const state = applyLifepathAction(
      createInitialLifepathState(modifierDefinition),
      modifierDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const selected = applyLifepathAction(
      state,
      modifierDefinition,
      { type: "preCareer.select", educationId: "university" },
    );
    const admitted = applyLifepathAction(
      selected,
      modifierDefinition,
      { type: "preCareer.qualification.resolve" },
      queuedRolls(6),
    );
    const graduated = applyLifepathAction(
      admitted,
      modifierDefinition,
      { type: "preCareer.graduation.resolve" },
      queuedRolls(10),
    );
    const firstSkill = applyLifepathAction(
      graduated,
      modifierDefinition,
      { type: "preCareer.skill.resolve" },
      queuedRolls(1),
    );
    const secondSkill = applyLifepathAction(
      firstSkill,
      modifierDefinition,
      { type: "preCareer.skill.resolve" },
      queuedRolls(2),
    );
    const careerState = applyLifepathAction(
      secondSkill,
      modifierDefinition,
      { type: "career.select", careerId: "scout" },
    );

    expect(getCurrentLifepathStep(careerState, modifierDefinition)).toMatchObject({
      kind: "roll",
      data: {
        modifiers: [
          {
            id: "scout.university-honors",
            label: "University honors graduate",
            modifier: 2,
          },
        ],
        extraModifierTotal: 2,
        modifierTotal: 3,
      },
    });
  });

  it("resolves failed pre-career graduation and enters career selection", () => {
    const state = applyLifepathAction(
      createInitialLifepathState(preCareerDefinition),
      preCareerDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const selected = applyLifepathAction(
      state,
      preCareerDefinition,
      { type: "preCareer.select", educationId: "university" },
    );
    const admitted = applyLifepathAction(
      selected,
      preCareerDefinition,
      { type: "preCareer.qualification.resolve" },
      queuedRolls(6),
    );
    const notGraduated = applyLifepathAction(
      admitted,
      preCareerDefinition,
      { type: "preCareer.graduation.resolve" },
      queuedRolls(5),
    );

    expect(notGraduated.phase).toBe("choose-career");
    expect(notGraduated.log.at(-1)).toMatchObject({
      type: "preCareer.graduation.roll",
      label: "University Graduation: Did not graduate",
      data: {
        educationId: "university",
        roll: 5,
        total: 6,
        target: 7,
        graduated: false,
      },
    });
  });

  it("resolves failed pre-career admission and enters career selection", () => {
    const state = applyLifepathAction(
      createInitialLifepathState(preCareerDefinition),
      preCareerDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const selected = applyLifepathAction(
      state,
      preCareerDefinition,
      { type: "preCareer.select", educationId: "university" },
    );
    const resolved = applyLifepathAction(
      selected,
      preCareerDefinition,
      { type: "preCareer.qualification.resolve" },
      queuedRolls(5),
    );

    expect(resolved.phase).toBe("choose-career");
    expect(resolved.age).toBe(18);
    expect(resolved.relationships).toEqual([
      expect.objectContaining({
        type: "contact",
        label: "Admissions tutor",
        eventType: "preCareer.qualification.roll",
      }),
    ]);
    expect(resolved.log.at(-1)).toMatchObject({
      type: "preCareer.qualification.roll",
      label: "University Admission: Not admitted",
      data: {
        educationId: "university",
        roll: 5,
        total: 6,
        target: 7,
        admitted: false,
      },
    });
  });

  it("rejects unknown pre-career education selection", () => {
    const state = applyLifepathAction(
      createInitialLifepathState(preCareerDefinition),
      preCareerDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );

    expect(() =>
      applyLifepathAction(
        state,
        preCareerDefinition,
        { type: "preCareer.select", educationId: "unknown" },
      ),
    ).toThrow("Unknown pre-career education: unknown");
  });

  it("disables career choices when eligibility requirements are not met", () => {
    const eligibilityDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "scout"
          ? {
              ...career,
              eligibility: {
                minimumCharacteristics: {
                  int: 11,
                },
              },
            }
          : career),
    };
    const state = applyLifepathAction(
      createInitialLifepathState(eligibilityDefinition),
      eligibilityDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const step = getCurrentLifepathStep(state, eligibilityDefinition);

    expect(step.kind === "choice" ? step.options.find((option) => option.id === "scout") : null)
      .toMatchObject({
        disabled: true,
        description: "Requires INT 11+",
        data: {
          ineligibleReason: "Requires INT 11+",
        },
      });
    expect(() =>
      applyLifepathAction(state, eligibilityDefinition, {
        type: "career.select",
        careerId: "scout",
      }),
    ).toThrow("Cannot select Scout: Requires INT 11+");
  });

  it("can ask for a background skill after rolling characteristics", () => {
    const backgroundDefinition: LifepathGeneratorDefinition = {
      ...definition,
      startingRules: {
        ...definition.startingRules,
        backgroundSkillTableIds: ["background.skills"],
      },
      tables: [
        ...definition.tables,
        {
          id: "background.skills",
          label: "Background Skills",
          kind: "choice",
          scope: "background",
          entries: [
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
          ],
        },
      ],
    };
    const rolled = applyLifepathAction(
      createInitialLifepathState(backgroundDefinition),
      backgroundDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const step = getCurrentLifepathStep(rolled, backgroundDefinition);

    expect(rolled.phase).toBe("background");
    expect(step).toMatchObject({
      kind: "choice",
      id: "lifepath.background-skill",
      title: "Choose Background Skill",
    });

    const selected = applyLifepathAction(
      rolled,
      backgroundDefinition,
      { type: "background.skill.select", tableId: "background.skills", entryId: "background-broker" },
    );

    expect(selected.phase).toBe("choose-career");
    expect(selected.skills).toEqual([{ name: "Broker", level: 0 }]);
    expect(selected.log.at(-1)).toMatchObject({
      type: "background.skill.select",
      label: "Background Skill: Broker",
      term: null,
    });
  });

  it("applies deterministic aging effects when crossing the aging threshold", () => {
    const agingDefinition: LifepathGeneratorDefinition = {
      ...definition,
      startingRules: {
        ...definition.startingRules,
        age: 30,
        agingRules: {
          startsAtAge: 34,
          characteristicCycle: ["end", "str", "dex"],
          modifier: -1,
        },
      },
    };
    const initial = applyLifepathAction(
      createInitialLifepathState(agingDefinition),
      agingDefinition,
      { type: "characteristics.roll" },
      queuedRolls(7, 8, 9, 10, 11, 12),
    );
    const careerState = applyLifepathAction(initial, agingDefinition, {
      type: "career.select",
      careerId: "scout",
    });
    const qualified = applyLifepathAction(
      careerState,
      agingDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(7),
    );
    const assigned = applyLifepathAction(qualified, agingDefinition, {
      type: "assignment.select",
      assignmentId: "scout.analysis",
    });
    const pending = resolveLifepathTerm(
      assigned,
      agingDefinition,
      queuedRolls(7, 4, 8),
    );
    const chosen = applyLifepathAction(
      pending,
      agingDefinition,
      { type: "table.choice.select", choiceId: "choose-recon" },
    );
    const aged = resolveLifepathTerm(
      chosen,
      agingDefinition,
      queuedRolls(9),
    );

    expect(aged.age).toBe(34);
    expect(aged.characteristics.end).toBe(8);
    expect(aged.log.at(-1)).toMatchObject({
      type: "aging.effect",
      label: "Aging: END -1",
      data: {
        age: 34,
        characteristicId: "end",
        modifier: -1,
        before: 9,
        after: 8,
      },
    });
    expect(aged.effects.map((effect) => effect.type)).toContain("characteristic.modify");

    const continued = applyLifepathAction(
      aged,
      agingDefinition,
      { type: "term.continue" },
    );
    const secondPending = resolveLifepathTerm(
      continued,
      agingDefinition,
      queuedRolls(7, 4, 8),
    );
    const secondChosen = applyLifepathAction(
      secondPending,
      agingDefinition,
      { type: "table.choice.select", choiceId: "choose-recon" },
    );
    const agedAgain = resolveLifepathTerm(
      secondChosen,
      agingDefinition,
      queuedRolls(9),
    );

    expect(agedAgain.age).toBe(38);
    expect(agedAgain.characteristics.end).toBe(8);
    expect(agedAgain.characteristics.str).toBe(6);
    expect(agedAgain.log.at(-1)).toMatchObject({
      type: "aging.effect",
      label: "Aging: STR -1",
      data: {
        age: 38,
        characteristicId: "str",
        modifier: -1,
        before: 7,
        after: 6,
      },
    });
  });

  it("selects a career and records an action and log entry", () => {
    const initial = rolledInitialState();
    const state = applyLifepathAction(initial, definition, {
      type: "career.select",
      careerId: "scout",
    });

    expect(state.phase).toBe("qualification");
    expect(state.selectedCareerId).toBe("scout");
    expect(state.actions).toEqual([
      expect.objectContaining({
        id: "lifepath.characteristics.roll",
        type: "characteristics.roll",
      }),
      expect.objectContaining({
        id: "term-1.career.select",
        type: "career.select",
        payload: { careerId: "scout" },
      }),
    ]);
    expect(state.log).toEqual([
      expect.objectContaining({
        sequence: 0,
        type: "characteristics.roll",
        label: "Characteristics Rolled",
      }),
      expect.objectContaining({
        sequence: 1,
        type: "career.select",
        label: "Career: Scout",
        data: {
          careerId: "scout",
          careerLabel: "Scout",
        },
      }),
    ]);
  });

  it("resolves career qualification before assignment", () => {
    const careerState = applyLifepathAction(
      rolledInitialState(),
      definition,
      { type: "career.select", careerId: "scout" },
    );
    const step = getCurrentLifepathStep(careerState, definition);

    expect(step).toMatchObject({
      kind: "roll",
      id: "lifepath.career.qualification",
      title: "Resolve Qualification",
      notation: "2d6",
      target: 6,
      data: { careerId: "scout" },
    });

    const qualified = applyLifepathAction(
      careerState,
      definition,
      { type: "career.qualification.resolve" },
      queuedRolls(7),
    );

    expect(qualified.phase).toBe("choose-assignment");
    expect(qualified.selectedCareerId).toBe("scout");
    expect(qualified.log.at(-1)).toMatchObject({
      type: "qualification.roll",
      label: "Scout Qualification: Qualified",
      data: {
        roll: 7,
        total: 8,
        target: 6,
        characteristicId: "edu",
        characteristicScore: 11,
        characteristicModifier: 1,
        qualified: true,
      },
    });
  });

  it("offers qualification failure choices when qualification fails", () => {
    const careerState = applyLifepathAction(
      rolledInitialState(),
      definition,
      { type: "career.select", careerId: "scout" },
    );
    const failed = applyLifepathAction(
      careerState,
      definition,
      { type: "career.qualification.resolve" },
      queuedRolls(4),
    );

    expect(failed.phase).toBe("qualification-failed");
    expect(failed.selectedCareerId).toBe("scout");
    expect(failed.selectedAssignmentId).toBeNull();
    expect(failed.relationships).toEqual([
      {
        type: "contact",
        label: "Scout recruiter",
        careerId: "scout",
        term: 1,
        eventId: "term-1.qualification",
        eventType: "qualification.roll",
      },
    ]);
    expect(failed.log.at(-1)).toMatchObject({
      type: "qualification.roll",
      label: "Scout Qualification: Not qualified",
      data: {
        roll: 4,
        target: 6,
        qualified: false,
      },
    });
    const failureStep = getCurrentLifepathStep(failed, definition);
    expect(failureStep).toMatchObject({
      kind: "choice",
      id: "lifepath.qualification-failed",
      title: "Qualification Failed",
      prompt: "Scout did not accept this character. Try another career, enter Merchant, or fall back.",
    });
    expect(
      failureStep.kind === "choice"
        ? failureStep.options.map((option) => option.id)
        : [],
    ).toEqual(["choose-another-career", "enter-career:merchant", "enter-fallback-career"]);
  });

  it("returns to career selection from qualification failure choices", () => {
    const careerState = applyLifepathAction(
      rolledInitialState(),
      definition,
      { type: "career.select", careerId: "scout" },
    );
    const failed = applyLifepathAction(
      careerState,
      definition,
      { type: "career.qualification.resolve" },
      queuedRolls(4),
    );
    const retry = applyLifepathAction(
      failed,
      definition,
      { type: "qualification.choose-career" },
    );

    expect(retry.phase).toBe("choose-career");
    expect(retry.selectedCareerId).toBeNull();
    expect(retry.log.at(-1)).toMatchObject({
      type: "qualification.choose-career",
      label: "Choose Another Career",
    });
  });

  it("enters the fallback career from qualification failure choices", () => {
    const careerState = applyLifepathAction(
      rolledInitialState(),
      definition,
      { type: "career.select", careerId: "scout" },
    );
    const failed = applyLifepathAction(
      careerState,
      definition,
      { type: "career.qualification.resolve" },
      queuedRolls(4),
    );
    const fallback = applyLifepathAction(
      failed,
      definition,
      { type: "qualification.fallback" },
    );

    expect(fallback.phase).toBe("choose-assignment");
    expect(fallback.selectedCareerId).toBe("drifter");
    expect(fallback.selectedAssignmentId).toBeNull();
    expect(fallback.log.at(-1)).toMatchObject({
      type: "qualification.fallback",
      label: "Fallback Career: Drifter",
      data: {
        failedCareerId: "scout",
        careerId: "drifter",
        careerLabel: "Drifter",
        failurePath: "fallback",
      },
    });
  });

  it("enters a career-specific alternate from qualification failure choices", () => {
    const careerState = applyLifepathAction(
      rolledInitialState(),
      definition,
      { type: "career.select", careerId: "scout" },
    );
    const failed = applyLifepathAction(
      careerState,
      definition,
      { type: "career.qualification.resolve" },
      queuedRolls(4),
    );
    const alternate = applyLifepathAction(
      failed,
      definition,
      { type: "qualification.fallback", careerId: "merchant" },
    );

    expect(alternate.phase).toBe("choose-assignment");
    expect(alternate.selectedCareerId).toBe("merchant");
    expect(alternate.selectedAssignmentId).toBeNull();
    expect(alternate.log.at(-1)).toMatchObject({
      type: "qualification.fallback",
      label: "Alternate Career: Merchant",
      data: {
        failedCareerId: "scout",
        careerId: "merchant",
        careerLabel: "Merchant",
        failurePath: "alternate",
      },
    });
  });

  it("asks for assignments after selecting a career", () => {
    const careerState = applyLifepathAction(
      rolledInitialState(),
      definition,
      { type: "career.select", careerId: "scout" },
    );
    const state = applyLifepathAction(
      careerState,
      definition,
      { type: "career.qualification.resolve" },
      queuedRolls(7),
    );
    const step = getCurrentLifepathStep(state, definition);

    expect(step).toMatchObject({
      kind: "choice",
      id: "lifepath.choose-assignment",
      title: "Choose Assignment",
      data: { careerId: "scout" },
    });
    expect(step.kind === "choice" ? step.options.map((option) => option.id) : []).toEqual([
      "scout.field",
      "scout.analysis",
    ]);
  });

  it("selects an assignment and stops at the ready-for-term phase", () => {
    const careerState = applyLifepathAction(
      rolledInitialState(),
      definition,
      { type: "career.select", careerId: "scout" },
    );
    const qualified = applyLifepathAction(
      careerState,
      definition,
      { type: "career.qualification.resolve" },
      queuedRolls(7),
    );
    const state = applyLifepathAction(qualified, definition, {
      type: "assignment.select",
      assignmentId: "scout.analysis",
    });
    const step = getCurrentLifepathStep(state, definition);

    expect(state.phase).toBe("ready-for-term");
    expect(state.selectedAssignmentId).toBe("scout.analysis");
    expect(state.log.map((entry) => entry.label)).toEqual([
      "Characteristics Rolled",
      "Career: Scout",
      "Scout Qualification: Qualified",
      "Assignment: Analysis",
    ]);
    expect(step).toMatchObject({
      kind: "roll",
      id: "lifepath.term.survival",
      title: "Resolve Survival",
      data: {
        careerId: "scout",
        assignmentId: "scout.analysis",
        term: 1,
      },
    });
  });

  it("resolves an optional commission before survival", () => {
    const commissionDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "scout"
          ? {
              ...career,
              ranks: [
                { rank: 0, title: "Scout", track: "enlisted" },
                {
                  rank: 1,
                  title: "Senior Scout",
                  track: "enlisted",
                  effects: [
                    {
                      id: "scout.rank-1.admin",
                      type: "skill.add",
                      payload: { skill: "Admin", level: 1 },
                    },
                  ],
                },
                {
                  rank: 1,
                  title: "Mission Officer",
                  track: "officer",
                  effects: [
                    {
                      id: "scout.officer-rank-1.leadership",
                      type: "skill.add",
                      payload: { skill: "Leadership", level: 1 },
                    },
                  ],
                },
              ],
              commission: {
                id: "scout.commission",
                label: "Scout Commission",
                notation: "2d6",
                target: 8,
                characteristicModifier: "edu",
              },
            }
          : career),
    };
    const careerState = applyLifepathAction(
      rolledInitialState(),
      commissionDefinition,
      { type: "career.select", careerId: "scout" },
    );
    const qualified = applyLifepathAction(
      careerState,
      commissionDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(7),
    );
    const assigned = applyLifepathAction(qualified, commissionDefinition, {
      type: "assignment.select",
      assignmentId: "scout.analysis",
    });

    expect(assigned.phase).toBe("commission");
    expect(getCurrentLifepathStep(assigned, commissionDefinition)).toMatchObject({
      kind: "roll",
      id: "lifepath.term.commission",
      title: "Resolve Commission",
      target: 8,
      data: {
        characteristicId: "edu",
        characteristicScore: 11,
        characteristicModifier: 1,
        skillName: null,
        skillLevel: null,
        skillModifier: 0,
        modifierTotal: 1,
      },
    });

    const commissioned = applyLifepathAction(
      assigned,
      commissionDefinition,
      { type: "term.commission.resolve" },
      queuedRolls(11),
    );

    expect(commissioned.phase).toBe("ready-for-term");
    expect(commissioned.commissioned).toBe(true);
    expect(commissioned.log.at(-1)).toMatchObject({
      type: "commission.roll",
      label: "Scout Commission: Commissioned",
      data: {
        careerId: "scout",
        roll: 11,
        total: 12,
        target: 8,
        characteristicId: "edu",
        commissioned: true,
      },
    });

    const advanced = applyLifepathAction(
      {
        ...commissioned,
        phase: "advancement",
        selectedAssignmentId: "scout.analysis",
      },
      commissionDefinition,
      { type: "term.advancement.resolve" },
      queuedRolls(9),
    );

    expect(advanced.careerRank).toBe(1);
    expect(advanced.skills).toEqual([
      { name: "Leadership", level: 1 },
    ]);
    expect(advanced.log.at(-2)).toMatchObject({
      type: "advancement.roll",
      data: {
        rank: 1,
        rankTitle: "Mission Officer",
      },
    });
    expect(advanced.log.at(-1)).toMatchObject({
      type: "rank.benefit",
      label: "Rank Benefit: Mission Officer",
      data: {
        effectSummary: ["Gained Leadership-1"],
      },
    });
  });

  it("walks a successful term one phase at a time", () => {
    const survival = applyLifepathAction(
      readyForScoutTerm(),
      definition,
      { type: "term.survival.resolve" },
      queuedRolls(7),
    );
    expect(survival.phase).toBe("skill");
    expect(survival.termSurvived).toBe(true);
    expect(getCurrentLifepathStep(survival, definition)).toMatchObject({
      kind: "table",
      id: "lifepath.term.skill",
      tableId: "scout.skills",
    });

    const skill = applyLifepathAction(
      survival,
      definition,
      { type: "term.skill.resolve" },
      queuedRolls(4),
    );
    expect(skill.phase).toBe("event");
    expect(skill.skills).toEqual([{ name: "Survival", level: 1 }]);
    expect(getCurrentLifepathStep(skill, definition)).toMatchObject({
      kind: "table",
      id: "lifepath.term.event",
      tableId: "scout.events",
    });

    const event = applyLifepathAction(
      skill,
      definition,
      { type: "term.event.resolve" },
      queuedRolls(8),
    );
    expect(event.phase).toBe("event");
    expect(event.pendingChoice).toMatchObject({
      id: "scout.events.scout.skill.choice",
      prompt: "Choose the skill learned in the field.",
    });
    expect(getCurrentLifepathStep(event, definition)).toMatchObject({
      kind: "choice",
      id: "scout.events.scout.skill.choice",
      title: "Field Lesson",
    });

    const chosenEvent = applyLifepathAction(
      event,
      definition,
      { type: "table.choice.select", choiceId: "choose-recon" },
    );
    expect(chosenEvent.phase).toBe("advancement");
    expect(chosenEvent.pendingChoice).toBeNull();
    expect(chosenEvent.skills).toEqual([
      { name: "Survival", level: 1 },
      { name: "Recon", level: 1 },
    ]);
    expect(getCurrentLifepathStep(chosenEvent, definition)).toMatchObject({
      kind: "roll",
      id: "lifepath.term.advancement",
      target: 8,
    });

    const advancement = applyLifepathAction(
      chosenEvent,
      definition,
      { type: "term.advancement.resolve" },
      queuedRolls(9),
    );
    expect(advancement.phase).toBe("aging");
    expect(advancement.careerRank).toBe(1);
    expect(getCurrentLifepathStep(advancement, definition)).toMatchObject({
      kind: "running",
      id: "lifepath.term.aging",
    });

    const complete = applyLifepathAction(
      advancement,
      definition,
      { type: "term.aging.resolve" },
    );
    expect(complete.phase).toBe("term-complete");
    expect(complete.completedTerms).toBe(1);
    expect(complete.careerHistory).toEqual([
      {
        term: 1,
        careerId: "scout",
        assignmentId: "scout.analysis",
        survived: true,
        rank: 1,
        commissioned: false,
      },
    ]);
    expect(complete.age).toBe(22);
    expect(getCurrentLifepathStep(complete, definition)).toMatchObject({
      kind: "choice",
      id: "lifepath.term-complete",
      title: "Term Complete",
    });
  });

  it("walks a failed term through mishap and aging", () => {
    const survival = applyLifepathAction(
      readyForScoutTerm(),
      definition,
      { type: "term.survival.resolve" },
      queuedRolls(4),
    );
    expect(survival.phase).toBe("mishap");
    expect(survival.termSurvived).toBe(false);
    expect(survival.injuries).toEqual([
      { severity: "minor", label: "Training accident" },
    ]);

    const mishap = applyLifepathAction(
      survival,
      definition,
      { type: "term.mishap.resolve" },
      queuedRolls(3),
    );
    expect(mishap.phase).toBe("aging");
    expect(mishap.selectedCareerId).toBeNull();
    expect(mishap.relationships).toEqual([
      {
        type: "rival",
        label: "Rival Surveyor",
        careerId: "scout",
        term: 1,
        eventId: "term-1.mishap.scout.mishaps",
        eventType: "mishap.roll",
      },
    ]);

    const complete = applyLifepathAction(
      mishap,
      definition,
      { type: "term.aging.resolve" },
    );
    expect(complete.phase).toBe("term-complete");
    expect(complete.age).toBe(22);
    expect(complete.careerHistory).toEqual([
      {
        term: 1,
        careerId: "scout",
        assignmentId: "scout.analysis",
        survived: false,
        rank: 0,
        commissioned: false,
      },
    ]);
  });

  it("rejects invalid phase transitions and ids", () => {
    expect(() =>
      applyLifepathAction(rolledInitialState(), definition, {
        type: "assignment.select",
        assignmentId: "scout.field",
      }),
    ).toThrow("Cannot select an assignment during choose-career.");

    expect(() =>
      applyLifepathAction(rolledInitialState(), definition, {
        type: "career.select",
        careerId: "unknown",
      }),
    ).toThrow("Unknown lifepath career: unknown");
  });

  it("continues an active career into another term", () => {
    const complete = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(7, 2, 7, 7),
    );

    const nextTerm = applyLifepathAction(
      complete,
      definition,
      { type: "term.continue" },
    );

    expect(nextTerm.phase).toBe("ready-for-term");
    expect(nextTerm.term).toBe(2);
    expect(nextTerm.completedTerms).toBe(1);
    expect(nextTerm.selectedCareerId).toBe("scout");
    expect(nextTerm.selectedAssignmentId).toBe("scout.analysis");
    expect(nextTerm.termSurvived).toBeNull();
    expect(nextTerm.log.at(-1)).toMatchObject({
      type: "term.continue",
      label: "Continue Career",
    });
  });

  it("gates continuation through reenlistment when the career defines it", () => {
    const reenlistDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "scout"
          ? {
              ...career,
              eligibility: {
                ...career.eligibility,
                disallowAfterFailedReenlistment: true,
              },
              reenlistment: {
                id: "scout.reenlistment",
                label: "Scout Reenlistment",
                notation: "2d6",
                target: 6,
                characteristicModifier: "edu",
                data: {
                  successOutcome: "may-continue",
                  failureOutcome: "forced-out",
                },
              },
            }
          : career),
    };
    const complete = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(7, 2, 7, 7),
    );
    const pending = applyLifepathAction(
      complete,
      reenlistDefinition,
      { type: "term.continue" },
    );

    expect(pending.phase).toBe("reenlistment");
    expect(pending.term).toBe(1);
    expect(getCurrentLifepathStep(pending, reenlistDefinition)).toMatchObject({
      kind: "roll",
      id: "lifepath.term.reenlistment",
      target: 6,
      data: {
        characteristicId: "edu",
        characteristicScore: 11,
        characteristicModifier: 1,
      },
    });

    const continued = applyLifepathAction(
      pending,
      reenlistDefinition,
      { type: "term.reenlistment.resolve" },
      queuedRolls(5),
    );

    expect(continued.phase).toBe("ready-for-term");
    expect(continued.term).toBe(2);
    expect(continued.selectedCareerId).toBe("scout");
    expect(continued.selectedAssignmentId).toBe("scout.analysis");
    expect(continued.log.at(-1)).toMatchObject({
      type: "reenlistment.roll",
      label: "Scout Reenlistment: Continued",
      data: {
        roll: 5,
        total: 6,
        target: 6,
        reenlisted: true,
        outcome: "may-continue",
        successOutcome: "may-continue",
        failureOutcome: "forced-out",
      },
    });
  });

  it("returns to career choice when reenlistment fails", () => {
    const reenlistDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "scout"
          ? {
              ...career,
              eligibility: {
                ...career.eligibility,
                disallowAfterFailedReenlistment: true,
              },
              reenlistment: {
                id: "scout.reenlistment",
                label: "Scout Reenlistment",
                notation: "2d6",
                target: 6,
                characteristicModifier: "edu",
                data: {
                  successOutcome: "may-continue",
                  failureOutcome: "forced-out",
                },
              },
            }
          : career),
    };
    const complete = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(7, 2, 7, 7),
    );
    const pending = applyLifepathAction(
      complete,
      reenlistDefinition,
      { type: "term.continue" },
    );
    const failed = applyLifepathAction(
      pending,
      reenlistDefinition,
      { type: "term.reenlistment.resolve" },
      queuedRolls(4),
    );

    expect(failed.phase).toBe("choose-career");
    expect(failed.term).toBe(2);
    expect(failed.selectedCareerId).toBeNull();
    expect(failed.selectedAssignmentId).toBeNull();
    expect(failed.careerRank).toBe(0);
    expect(failed.log.at(-1)).toMatchObject({
      type: "reenlistment.roll",
      label: "Scout Reenlistment: Not retained",
      data: {
        roll: 4,
        total: 5,
        target: 6,
        reenlisted: false,
        outcome: "forced-out",
        successOutcome: "may-continue",
        failureOutcome: "forced-out",
      },
    });
    const step = getCurrentLifepathStep(failed, reenlistDefinition);
    expect(
      step.kind === "choice"
        ? step.options.find((option) => option.id === "scout")
        : null,
    ).toMatchObject({
      disabled: true,
      description: "Not retained by Scout",
      data: {
        ineligibleReason: "Not retained by Scout",
      },
    });
    expect(() =>
      applyLifepathAction(failed, reenlistDefinition, {
        type: "career.select",
        careerId: "scout",
      }),
    ).toThrow("Cannot select Scout: Not retained by Scout");
  });

  it("changes career after a completed term", () => {
    const complete = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(7, 2, 7, 7),
    );

    const nextCareer = applyLifepathAction(
      complete,
      definition,
      { type: "career.change" },
    );

    expect(nextCareer.phase).toBe("choose-career");
    expect(nextCareer.term).toBe(2);
    expect(nextCareer.selectedCareerId).toBeNull();
    expect(nextCareer.selectedAssignmentId).toBeNull();
    expect(nextCareer.careerRank).toBe(0);
    expect(nextCareer.log.at(-1)).toMatchObject({
      type: "career.change",
      label: "Change Career",
    });
  });

  it("musters out after a completed term", () => {
    const complete = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(7, 2, 7, 7),
    );

    const musterOut = applyLifepathAction(
      complete,
      definition,
      { type: "generation.muster-out" },
    );

    expect(musterOut.phase).toBe("muster-out");
    expect(getCurrentLifepathStep(musterOut, definition)).toMatchObject({
      kind: "roll",
      id: "lifepath.muster-out",
    });
    expect(musterOut.log.at(-1)).toMatchObject({
      type: "generation.muster-out",
      label: "Muster Out",
    });

    const final = applyLifepathAction(
      musterOut,
      definition,
      { type: "muster-out.resolve" },
      queuedRolls(1),
    );

    expect(final.phase).toBe("generation-complete");
    expect(getCurrentLifepathStep(final, definition)).toMatchObject({
      kind: "running",
      id: "lifepath.generation-complete",
    });
    expect(final.log.at(-1)).toMatchObject({
      type: "benefit.roll",
    });
  });

  it("asks which benefit table to roll when a career has multiple muster-out tables", () => {
    const choiceDefinition: LifepathGeneratorDefinition = {
      ...definition,
      careers: definition.careers.map((career) =>
        career.id === "scout"
          ? { ...career, benefitTableIds: ["scout.benefits", "scout.cash-benefits"] }
          : career,
      ),
      tables: [
        ...definition.tables,
        {
          id: "scout.cash-benefits",
          label: "Scout Cash Benefits",
          kind: "roll",
          scope: "benefit",
          notation: "1d6",
          entries: [
            {
              id: "scout.cash-large",
              label: "Cash",
              range: [1, 6],
              effects: [
                {
                  id: "scout.cash-large.effect",
                  type: "credit.add",
                  payload: { amount: 10000 },
                },
              ],
            },
          ],
        },
      ],
    };
    const complete = resolveLifepathTerm(
      readyForScoutTerm(),
      choiceDefinition,
      queuedRolls(7, 2, 7, 7),
    );
    const musterOut = applyLifepathAction(
      complete,
      choiceDefinition,
      { type: "generation.muster-out" },
    );

    const choiceStep = getCurrentLifepathStep(musterOut, choiceDefinition);
    expect(choiceStep).toMatchObject({
      kind: "choice",
      id: "lifepath.muster-out-benefit-choice",
      title: "Choose Muster-Out Benefit",
    });
    expect(choiceStep.kind === "choice" ? choiceStep.options.map((option) => option.id) : []).toEqual([
      "scout.benefits",
      "scout.cash-benefits",
    ]);

    const selected = applyLifepathAction(
      musterOut,
      choiceDefinition,
      { type: "muster-out.benefit.select", tableId: "scout.cash-benefits" },
    );
    expect(selected.log.at(-1)).toMatchObject({
      type: "benefit.choice",
      label: "Scout Benefit Choice: Scout Cash Benefits",
    });
    expect(getCurrentLifepathStep(selected, choiceDefinition)).toMatchObject({
      kind: "roll",
      id: "lifepath.muster-out",
      data: {
        tableId: "scout.cash-benefits",
      },
    });

    const final = applyLifepathAction(
      selected,
      choiceDefinition,
      { type: "muster-out.resolve" },
      queuedRolls(3),
    );

    expect(final.phase).toBe("generation-complete");
    expect(final.credits).toBe(10000);
  });

  it("resolves a successful term with event, advancement, aging, effects, and logs", () => {
    const pending = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(7, 4, 8),
    );
    expect(pending.pendingChoice?.id).toBe("scout.events.scout.skill.choice");

    const chosen = applyLifepathAction(
      pending,
      definition,
      { type: "table.choice.select", choiceId: "choose-recon" },
    );
    const state = resolveLifepathTerm(
      chosen,
      definition,
      queuedRolls(9),
    );

    expect(state.phase).toBe("term-complete");
    expect(state.completedTerms).toBe(1);
    expect(state.age).toBe(22);
    expect(state.careerRank).toBe(1);
    expect(state.skills).toEqual([
      { name: "Survival", level: 1 },
      { name: "Recon", level: 1 },
      { name: "Admin", level: 1 },
    ]);
    expect(state.relationships).toEqual([]);
    expect(state.injuries).toEqual([]);
    expect(state.selectedCareerId).toBe("scout");
    expect(state.log.map((entry) => entry.type)).toEqual([
      "characteristics.roll",
      "career.select",
      "qualification.roll",
      "assignment.select",
      "survival.roll",
      "skill.roll",
      "career-event.roll",
      "table.choice.select",
      "advancement.roll",
      "rank.benefit",
    ]);
    expect(state.effects.map((effect) => effect.type)).toEqual([
      "skill.add",
      "skill.add",
      "career.promote",
      "skill.add",
      "age.add",
    ]);
    expect(state.log.at(-1)).toMatchObject({
      type: "rank.benefit",
      label: "Rank Benefit: Senior Scout",
      data: {
        careerId: "scout",
        rank: 1,
        rankTitle: "Senior Scout",
        effectSummary: ["Gained Admin-1"],
      },
    });
  });

  it("resolves a failed survival with mishap, injury, relationship, and career leave", () => {
    const state = resolveLifepathTerm(
      readyForScoutTerm(),
      definition,
      queuedRolls(4, 3),
    );

    expect(state.phase).toBe("term-complete");
    expect(state.completedTerms).toBe(1);
    expect(state.age).toBe(22);
    expect(state.selectedCareerId).toBeNull();
    expect(state.selectedAssignmentId).toBeNull();
    expect(state.injuries).toEqual([
      { severity: "minor", label: "Training accident" },
    ]);
    expect(state.relationships).toEqual([
      {
        type: "rival",
        label: "Rival Surveyor",
        careerId: "scout",
        term: 1,
        eventId: "term-1.mishap.scout.mishaps",
        eventType: "mishap.roll",
      },
    ]);
    expect(state.log.map((entry) => entry.type)).toEqual([
      "characteristics.roll",
      "career.select",
      "qualification.roll",
      "assignment.select",
      "survival.roll",
      "mishap.roll",
    ]);
    expect(state.effects.map((effect) => effect.type)).toEqual([
      "injury.add",
      "relationship.add",
      "career.leave",
      "age.add",
    ]);
  });
});
