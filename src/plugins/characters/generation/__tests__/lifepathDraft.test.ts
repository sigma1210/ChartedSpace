import {
  applyLifepathAction,
  buildLifepathDraft,
  createInitialLifepathState,
  lifepathDraftToCharacterSheet,
  resolveLifepathTerm,
  type LifepathRollProvider,
} from "../";
import { basicHumanLifepathDefinition } from "../basicHumanLifepathDefinition";

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
    createInitialLifepathState(basicHumanLifepathDefinition),
    basicHumanLifepathDefinition,
    { type: "characteristics.roll" },
    queuedRolls(6, 7, 8, 9, 10, 11),
  );

const backgroundState = (entryId = "background-broker") =>
  applyLifepathAction(
    rolledInitialState(),
    basicHumanLifepathDefinition,
    { type: "background.skill.select", tableId: "basic-human.background-skills", entryId },
  );

const readyForFreeTraderBrokerTerm = () => {
  const career = applyLifepathAction(
    backgroundState(),
    basicHumanLifepathDefinition,
    { type: "career.select", careerId: "free-trader" },
  );
  const qualified = applyLifepathAction(
    career,
    basicHumanLifepathDefinition,
    { type: "career.qualification.resolve" },
    queuedRolls(7),
  );
  return applyLifepathAction(
    qualified,
    basicHumanLifepathDefinition,
    { type: "assignment.select", assignmentId: "free-trader.broker" },
  );
};

const resolveMusterOutBenefit = (
  state: ReturnType<typeof applyLifepathAction>,
  tableId: string,
  roll: number,
) => {
  const selected = applyLifepathAction(
    state,
    basicHumanLifepathDefinition,
    { type: "muster-out.benefit.select", tableId },
  );
  return applyLifepathAction(
    selected,
    basicHumanLifepathDefinition,
    { type: "muster-out.resolve" },
    queuedRolls(roll),
  );
};

describe("buildLifepathDraft", () => {
  it("builds a reviewable draft summary from a completed lifepath", () => {
    const complete = resolveLifepathTerm(
      readyForFreeTraderBrokerTerm(),
      basicHumanLifepathDefinition,
      queuedRolls(7, 2, 7, 7),
    );
    const afterEventChoice = applyLifepathAction(
      complete,
      basicHumanLifepathDefinition,
      { type: "table.choice.select", choiceId: "crew-ally" },
    );
    const completeAfterChoice = resolveLifepathTerm(
      afterEventChoice,
      basicHumanLifepathDefinition,
      queuedRolls(7),
    );
    const musteredOut = applyLifepathAction(
      completeAfterChoice,
      basicHumanLifepathDefinition,
      { type: "generation.muster-out" },
    );
    const resolvedBenefits = resolveMusterOutBenefit(
      musteredOut,
      "free-trader.cash-benefits",
      3,
    );

    const draft = buildLifepathDraft(
      resolvedBenefits,
      basicHumanLifepathDefinition,
      "Test Traveller",
    );

    expect(draft).toMatchObject({
      name: "Test Traveller",
      age: 22,
      completedTerms: 1,
      credits: 25000,
      characteristics: {
        str: 6,
        dex: 7,
        end: 8,
        int: 9,
        edu: 10,
        soc: 11,
      },
      metadata: {
        generatorId: "basic-human-lifepath",
      },
      careers: [
        {
          careerId: "free-trader",
          careerLabel: "Free Trader",
          assignmentId: "free-trader.broker",
          assignmentLabel: "Broker",
          terms: 1,
          finalRank: 1,
          finalRankTitle: "Senior Crew",
        },
      ],
    });
    expect(draft.history).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "background.skill.select",
        label: "Background skill: Broker",
      }),
    ]));
    expect(draft.log.at(-1)).toMatchObject({
      type: "benefit.roll",
    });
  });

  it("converts a lifepath draft into the current character sheet shape", () => {
    const complete = resolveLifepathTerm(
      readyForFreeTraderBrokerTerm(),
      basicHumanLifepathDefinition,
      queuedRolls(7, 2, 8),
    );
    const choice = applyLifepathAction(
      complete,
      basicHumanLifepathDefinition,
      { type: "table.choice.select", choiceId: "choose-broker" },
    );
    const termComplete = resolveLifepathTerm(
      choice,
      basicHumanLifepathDefinition,
      queuedRolls(9),
    );
    const musteredOut = applyLifepathAction(
      termComplete,
      basicHumanLifepathDefinition,
      { type: "generation.muster-out" },
    );
    const resolvedBenefits = resolveMusterOutBenefit(
      musteredOut,
      "free-trader.material-benefits",
      6,
    );

    const sheet = lifepathDraftToCharacterSheet(
      buildLifepathDraft(resolvedBenefits, basicHumanLifepathDefinition, "Test Traveller"),
    );

    expect(sheet).toMatchObject({
      name: "Test Traveller",
      age: 22,
      upp: {
        str: 6,
        dex: 7,
        end: 8,
        int: 9,
        edu: 10,
        soc: 11,
      },
      skills: [
        {
          name: "Broker",
          level: 2,
        },
        {
          name: "Admin",
          level: 1,
        },
      ],
      careers: [
        {
          career: "merchants",
          terms: 1,
          rank: 1,
          commissioned: false,
        },
      ],
      credits: 0,
      benefits: {
        ships: ["free_trader"],
      },
      generation: {
        ruleset: "lifepath",
        mode: "directed",
      },
    });
    expect(sheet.generation.decisions.every((decision) => decision.step === "lifepath_event")).toBe(true);
    expect(sheet.generation.metadata).toMatchObject({
      generatorId: "basic-human-lifepath",
      completedTerms: 1,
      credits: 0,
      benefits: {
        ships: ["free_trader"],
      },
      characteristics: {
        str: 6,
        dex: 7,
        end: 8,
        int: 9,
        edu: 10,
        soc: 11,
      },
    });
  });

  it("preserves skills earned across multiple terms in the character sheet", () => {
    const firstEventChoice = resolveLifepathTerm(
      readyForFreeTraderBrokerTerm(),
      basicHumanLifepathDefinition,
      queuedRolls(7, 2, 8),
    );
    const firstSkill = applyLifepathAction(
      firstEventChoice,
      basicHumanLifepathDefinition,
      { type: "table.choice.select", choiceId: "choose-broker" },
    );
    const firstComplete = resolveLifepathTerm(
      firstSkill,
      basicHumanLifepathDefinition,
      queuedRolls(7),
    );
    const secondTerm = applyLifepathAction(
      firstComplete,
      basicHumanLifepathDefinition,
      { type: "term.continue" },
    );
    const secondEventChoice = resolveLifepathTerm(
      secondTerm,
      basicHumanLifepathDefinition,
      queuedRolls(7, 2, 8),
    );
    const secondSkill = applyLifepathAction(
      secondEventChoice,
      basicHumanLifepathDefinition,
      { type: "table.choice.select", choiceId: "choose-broker" },
    );
    const secondComplete = resolveLifepathTerm(
      secondSkill,
      basicHumanLifepathDefinition,
      queuedRolls(7),
    );
    const musteredOut = applyLifepathAction(
      secondComplete,
      basicHumanLifepathDefinition,
      { type: "generation.muster-out" },
    );
    const firstBenefit = resolveMusterOutBenefit(
      musteredOut,
      "free-trader.cash-benefits",
      1,
    );
    const resolvedBenefits = resolveMusterOutBenefit(
      firstBenefit,
      "free-trader.material-benefits",
      1,
    );

    const sheet = lifepathDraftToCharacterSheet(
      buildLifepathDraft(resolvedBenefits, basicHumanLifepathDefinition, "Test Traveller"),
    );

    expect(sheet.skills).toEqual([
      {
        name: "Broker",
        level: 5,
      },
      {
        name: "Admin",
        level: 1,
      },
    ]);
    expect(sheet.generation.metadata).toMatchObject({
      completedTerms: 2,
      credits: 10000,
      benefits: {
        passages: {
          middle: 1,
        },
      },
    });
  });

  it("preserves failed qualification and fallback career history in the character sheet", () => {
    const career = applyLifepathAction(
      backgroundState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "survey-scout" },
    );
    const failedQualification = applyLifepathAction(
      career,
      basicHumanLifepathDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(3),
    );
    const fallback = applyLifepathAction(
      failedQualification,
      basicHumanLifepathDefinition,
      { type: "qualification.fallback" },
    );
    const assignment = applyLifepathAction(
      fallback,
      basicHumanLifepathDefinition,
      { type: "assignment.select", assignmentId: "drifter.wanderer" },
    );
    const complete = resolveLifepathTerm(
      assignment,
      basicHumanLifepathDefinition,
      queuedRolls(8, 1, 2, 9),
    );
    const musteredOut = applyLifepathAction(
      complete,
      basicHumanLifepathDefinition,
      { type: "generation.muster-out" },
    );
    const resolvedBenefits = applyLifepathAction(
      musteredOut,
      basicHumanLifepathDefinition,
      { type: "muster-out.resolve" },
      queuedRolls(1),
    );

    const sheet = lifepathDraftToCharacterSheet(
      buildLifepathDraft(resolvedBenefits, basicHumanLifepathDefinition, "Test Drifter"),
    );

    expect(sheet.careers).toEqual([
      {
        career: "other",
        terms: 1,
        rank: 0,
        commissioned: false,
      },
    ]);
    expect(sheet.generation.metadata).toMatchObject({
      careers: [
        {
          careerId: "drifter",
          careerLabel: "Drifter",
          assignmentId: "drifter.wanderer",
          assignmentLabel: "Wanderer",
          terms: 1,
        },
      ],
      history: expect.arrayContaining([
        expect.objectContaining({
          type: "career.select",
          label: "Attempted Survey Scout",
        }),
        expect.objectContaining({
          type: "qualification.roll",
          label: "Failed qualification: Survey Scout Qualification: Not qualified",
          detail: "Roll 3 +1 INT = 4 vs 5+; not qualified.",
          careerId: "survey-scout",
        }),
        expect.objectContaining({
          type: "qualification.fallback",
          label: "Entered fallback career: Drifter",
          careerId: "drifter",
          failedCareerId: "survey-scout",
        }),
        expect.objectContaining({
          type: "assignment.select",
          label: "Assignment: Wanderer",
          careerId: "drifter",
          assignmentId: "drifter.wanderer",
        }),
      ]),
    });
  });
});
