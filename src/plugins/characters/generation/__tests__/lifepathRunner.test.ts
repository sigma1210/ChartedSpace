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
      { type: "rival", label: "Rival Surveyor" },
    ]);

    const complete = applyLifepathAction(
      mishap,
      definition,
      { type: "term.aging.resolve" },
    );
    expect(complete.phase).toBe("term-complete");
    expect(complete.age).toBe(22);
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
      { type: "rival", label: "Rival Surveyor" },
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
