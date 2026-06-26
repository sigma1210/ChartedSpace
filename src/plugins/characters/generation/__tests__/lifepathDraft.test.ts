import {
  applyLifepathAction,
  buildLifepathDraft,
  createInitialLifepathState,
  getCurrentLifepathStep,
  lifepathDraftToCharacterSheet,
  resolveLifepathTerm,
  type LifepathRollProvider,
} from "../";
import { basicHumanLifepathDefinition } from "../basicHuman";

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

const careerChoiceState = (entryId = "background-broker") =>
  applyLifepathAction(
    backgroundState(entryId),
    basicHumanLifepathDefinition,
    { type: "preCareer.skip" },
  );

const universityGraduateCareerChoiceState = () => {
  const selected = applyLifepathAction(
    backgroundState(),
    basicHumanLifepathDefinition,
    { type: "preCareer.select", educationId: "university" },
  );
  const admitted = applyLifepathAction(
    selected,
    basicHumanLifepathDefinition,
    { type: "preCareer.qualification.resolve" },
    queuedRolls(6),
  );
  const graduated = applyLifepathAction(
    admitted,
    basicHumanLifepathDefinition,
    { type: "preCareer.graduation.resolve" },
    queuedRolls(6),
  );

  return applyLifepathAction(
    graduated,
    basicHumanLifepathDefinition,
    { type: "preCareer.skill.resolve" },
    queuedRolls(2),
  );
};

const militaryAcademyGraduateCareerChoiceState = () => {
  const selected = applyLifepathAction(
    backgroundState(),
    basicHumanLifepathDefinition,
    { type: "preCareer.select", educationId: "military-academy" },
  );
  const admitted = applyLifepathAction(
    selected,
    basicHumanLifepathDefinition,
    { type: "preCareer.qualification.resolve" },
    queuedRolls(7),
  );
  const graduated = applyLifepathAction(
    admitted,
    basicHumanLifepathDefinition,
    { type: "preCareer.graduation.resolve" },
    queuedRolls(7),
  );

  return applyLifepathAction(
    graduated,
    basicHumanLifepathDefinition,
    { type: "preCareer.skill.resolve" },
    queuedRolls(2),
  );
};

const readyForFreeTraderBrokerTerm = () => {
  const career = applyLifepathAction(
    careerChoiceState(),
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
  it("offers Military Academy as a Basic Human pre-career option", () => {
    const preCareerState = backgroundState();

    expect(getCurrentLifepathStep(preCareerState, basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.pre-career-choice",
      options: expect.arrayContaining([
        expect.objectContaining({
          id: "military-academy",
          label: "Military Academy",
        }),
      ]),
    });
  });

  it("resolves Military Academy graduation into an academy skill roll", () => {
    const selected = applyLifepathAction(
      backgroundState(),
      basicHumanLifepathDefinition,
      { type: "preCareer.select", educationId: "military-academy" },
    );
    const admitted = applyLifepathAction(
      selected,
      basicHumanLifepathDefinition,
      { type: "preCareer.qualification.resolve" },
      queuedRolls(7),
    );
    const graduated = applyLifepathAction(
      admitted,
      basicHumanLifepathDefinition,
      { type: "preCareer.graduation.resolve" },
      queuedRolls(7),
    );

    expect(getCurrentLifepathStep(graduated, basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.pre-career.skill",
      tableId: "basic-human.military-academy-skills",
      data: {
        educationId: "military-academy",
      },
    });

    const skilled = applyLifepathAction(
      graduated,
      basicHumanLifepathDefinition,
      { type: "preCareer.skill.resolve" },
      queuedRolls(2),
    );

    expect(skilled.phase).toBe("choose-career");
    expect(skilled.skills).toEqual(
      expect.arrayContaining([
        {
          name: "Leadership",
          level: 1,
        },
      ]),
    );
  });

  it("offers Navy as a Basic Human career option", () => {
    expect(getCurrentLifepathStep(careerChoiceState(), basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.choose-career",
      options: expect.arrayContaining([
        expect.objectContaining({
          id: "navy",
          label: "Navy",
        }),
      ]),
    });
  });

  it("shows Military Academy graduate DMs when entering Navy", () => {
    const career = applyLifepathAction(
      militaryAcademyGraduateCareerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "navy" },
    );

    expect(getCurrentLifepathStep(career, basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.career.qualification",
      data: {
        careerId: "navy",
        modifiers: [
          {
            id: "navy.military-academy-graduate",
            label: "Military Academy graduate",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
      },
    });
  });

  it("shows Military Academy graduate DMs on Navy commission", () => {
    const career = applyLifepathAction(
      militaryAcademyGraduateCareerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "navy" },
    );
    const qualified = applyLifepathAction(
      career,
      basicHumanLifepathDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(6),
    );
    const assigned = applyLifepathAction(
      qualified,
      basicHumanLifepathDefinition,
      { type: "assignment.select", assignmentId: "navy.line" },
    );

    expect(getCurrentLifepathStep(assigned, basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.term.commission",
      data: {
        careerId: "navy",
        modifiers: [
          {
            id: "navy.commission.military-academy-graduate",
            label: "Military Academy graduate",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
      },
    });

    const commissioned = applyLifepathAction(
      assigned,
      basicHumanLifepathDefinition,
      { type: "term.commission.resolve" },
      queuedRolls(6),
    );

    expect(commissioned.commissioned).toBe(true);
    expect(commissioned.log.at(-1)).toMatchObject({
      type: "commission.roll",
      data: {
        roll: 6,
        characteristicModifier: 1,
        modifiers: [
          {
            id: "navy.commission.military-academy-graduate",
            label: "Military Academy graduate",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
        total: 8,
        commissioned: true,
      },
    });
  });

  it("can resolve a first Navy term and muster out", () => {
    const career = applyLifepathAction(
      careerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "navy" },
    );
    const qualified = applyLifepathAction(
      career,
      basicHumanLifepathDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(6),
    );
    const assigned = applyLifepathAction(
      qualified,
      basicHumanLifepathDefinition,
      { type: "assignment.select", assignmentId: "navy.line" },
    );
    const completed = resolveLifepathTerm(
      assigned,
      basicHumanLifepathDefinition,
      queuedRolls(8, 9, 2, 7, 8),
    );
    const musteringOut = applyLifepathAction(
      completed,
      basicHumanLifepathDefinition,
      { type: "generation.muster-out" },
    );
    const resolvedBenefits = resolveMusterOutBenefit(musteringOut, "navy.benefits", 1);

    expect(completed.phase).toBe("term-complete");
    expect(completed.careerHistory).toEqual([
      expect.objectContaining({
        careerId: "navy",
        assignmentId: "navy.line",
        survived: true,
      }),
    ]);
    expect(resolvedBenefits.phase).toBe("generation-complete");
    expect(resolvedBenefits.credits).toBeGreaterThanOrEqual(12000);
  });

  it("offers Army as a Basic Human career option", () => {
    expect(getCurrentLifepathStep(careerChoiceState(), basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.choose-career",
      options: expect.arrayContaining([
        expect.objectContaining({
          id: "army",
          label: "Army",
        }),
      ]),
    });
  });

  it("shows Military Academy graduate DMs when entering Army", () => {
    const career = applyLifepathAction(
      militaryAcademyGraduateCareerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "army" },
    );

    expect(getCurrentLifepathStep(career, basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.career.qualification",
      data: {
        careerId: "army",
        modifiers: [
          {
            id: "army.military-academy-graduate",
            label: "Military Academy graduate",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
      },
    });
  });

  it("shows Military Academy graduate DMs on Army commission", () => {
    const career = applyLifepathAction(
      militaryAcademyGraduateCareerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "army" },
    );
    const qualified = applyLifepathAction(
      career,
      basicHumanLifepathDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(6),
    );
    const assigned = applyLifepathAction(
      qualified,
      basicHumanLifepathDefinition,
      { type: "assignment.select", assignmentId: "army.infantry" },
    );

    expect(getCurrentLifepathStep(assigned, basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.term.commission",
      data: {
        careerId: "army",
        modifiers: [
          {
            id: "army.commission.military-academy-graduate",
            label: "Military Academy graduate",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
      },
    });
  });

  it("can resolve a first Army term and muster out", () => {
    const career = applyLifepathAction(
      careerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "army" },
    );
    const qualified = applyLifepathAction(
      career,
      basicHumanLifepathDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(6),
    );
    const assigned = applyLifepathAction(
      qualified,
      basicHumanLifepathDefinition,
      { type: "assignment.select", assignmentId: "army.infantry" },
    );
    const completed = resolveLifepathTerm(
      assigned,
      basicHumanLifepathDefinition,
      queuedRolls(8, 9, 2, 7, 8),
    );
    const musteringOut = applyLifepathAction(
      completed,
      basicHumanLifepathDefinition,
      { type: "generation.muster-out" },
    );
    const resolvedBenefits = resolveMusterOutBenefit(musteringOut, "army.benefits", 1);

    expect(completed.phase).toBe("term-complete");
    expect(completed.careerHistory).toEqual([
      expect.objectContaining({
        careerId: "army",
        assignmentId: "army.infantry",
        survived: true,
      }),
    ]);
    expect(resolvedBenefits.phase).toBe("generation-complete");
    expect(resolvedBenefits.credits).toBeGreaterThanOrEqual(10000);
  });

  it("offers Marines as a Basic Human career option", () => {
    expect(getCurrentLifepathStep(careerChoiceState(), basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.choose-career",
      options: expect.arrayContaining([
        expect.objectContaining({
          id: "marines",
          label: "Marines",
        }),
      ]),
    });
  });

  it("shows Military Academy graduate DMs when entering Marines", () => {
    const career = applyLifepathAction(
      militaryAcademyGraduateCareerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "marines" },
    );

    expect(getCurrentLifepathStep(career, basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.career.qualification",
      data: {
        careerId: "marines",
        modifiers: [
          {
            id: "marines.military-academy-graduate",
            label: "Military Academy graduate",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
      },
    });
  });

  it("shows Military Academy graduate DMs on Marines commission", () => {
    const career = applyLifepathAction(
      militaryAcademyGraduateCareerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "marines" },
    );
    const qualified = applyLifepathAction(
      career,
      basicHumanLifepathDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(6),
    );
    const assigned = applyLifepathAction(
      qualified,
      basicHumanLifepathDefinition,
      { type: "assignment.select", assignmentId: "marines.assault" },
    );

    expect(getCurrentLifepathStep(assigned, basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.term.commission",
      data: {
        careerId: "marines",
        modifiers: [
          {
            id: "marines.commission.military-academy-graduate",
            label: "Military Academy graduate",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
      },
    });
  });

  it("can resolve a first Marines term and muster out", () => {
    const career = applyLifepathAction(
      careerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "marines" },
    );
    const qualified = applyLifepathAction(
      career,
      basicHumanLifepathDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(7),
    );
    const assigned = applyLifepathAction(
      qualified,
      basicHumanLifepathDefinition,
      { type: "assignment.select", assignmentId: "marines.assault" },
    );
    const completed = resolveLifepathTerm(
      assigned,
      basicHumanLifepathDefinition,
      queuedRolls(8, 10, 1, 7, 8),
    );
    const musteringOut = applyLifepathAction(
      completed,
      basicHumanLifepathDefinition,
      { type: "generation.muster-out" },
    );
    const resolvedBenefits = resolveMusterOutBenefit(musteringOut, "marines.benefits", 1);

    expect(completed.phase).toBe("term-complete");
    expect(completed.careerHistory).toEqual([
      expect.objectContaining({
        careerId: "marines",
        assignmentId: "marines.assault",
        survived: true,
      }),
    ]);
    expect(resolvedBenefits.phase).toBe("generation-complete");
    expect(resolvedBenefits.credits).toBeGreaterThanOrEqual(9000);
  });

  it("offers Agent as a Basic Human career option", () => {
    expect(getCurrentLifepathStep(careerChoiceState(), basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.choose-career",
      options: expect.arrayContaining([
        expect.objectContaining({
          id: "agent",
          label: "Agent",
        }),
      ]),
    });
  });

  it("shows University graduate DMs when entering Agent", () => {
    const career = applyLifepathAction(
      universityGraduateCareerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "agent" },
    );

    expect(getCurrentLifepathStep(career, basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.career.qualification",
      data: {
        careerId: "agent",
        modifiers: [
          {
            id: "agent.university-graduate",
            label: "University graduate",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
      },
    });
  });

  it("can resolve a first Agent term and muster out", () => {
    const career = applyLifepathAction(
      careerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "agent" },
    );
    const qualified = applyLifepathAction(
      career,
      basicHumanLifepathDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(6),
    );
    const assigned = applyLifepathAction(
      qualified,
      basicHumanLifepathDefinition,
      { type: "assignment.select", assignmentId: "agent.intelligence" },
    );
    const completed = resolveLifepathTerm(
      assigned,
      basicHumanLifepathDefinition,
      queuedRolls(8, 1, 2, 8, 8),
    );
    const musteringOut = applyLifepathAction(
      completed,
      basicHumanLifepathDefinition,
      { type: "generation.muster-out" },
    );
    const resolvedBenefits = resolveMusterOutBenefit(musteringOut, "agent.benefits", 1);

    expect(completed.phase).toBe("term-complete");
    expect(completed.careerHistory).toEqual([
      expect.objectContaining({
        careerId: "agent",
        assignmentId: "agent.intelligence",
        survived: true,
      }),
    ]);
    expect(resolvedBenefits.phase).toBe("generation-complete");
    expect(resolvedBenefits.credits).toBeGreaterThanOrEqual(12000);
  });

  it("offers Scholar as a Basic Human career option", () => {
    expect(getCurrentLifepathStep(careerChoiceState(), basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.choose-career",
      options: expect.arrayContaining([
        expect.objectContaining({
          id: "scholar",
          label: "Scholar",
        }),
      ]),
    });
  });

  it("shows University graduate DMs when entering Scholar", () => {
    const career = applyLifepathAction(
      universityGraduateCareerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "scholar" },
    );

    expect(getCurrentLifepathStep(career, basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.career.qualification",
      data: {
        careerId: "scholar",
        modifiers: [
          {
            id: "scholar.university-graduate",
            label: "University graduate",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
      },
    });
  });

  it("can resolve a first Scholar term and muster out", () => {
    const career = applyLifepathAction(
      careerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "scholar" },
    );
    const qualified = applyLifepathAction(
      career,
      basicHumanLifepathDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(6),
    );
    const assigned = applyLifepathAction(
      qualified,
      basicHumanLifepathDefinition,
      { type: "assignment.select", assignmentId: "scholar.researcher" },
    );
    const completed = resolveLifepathTerm(
      assigned,
      basicHumanLifepathDefinition,
      queuedRolls(8, 1, 2, 8, 8),
    );
    const musteringOut = applyLifepathAction(
      completed,
      basicHumanLifepathDefinition,
      { type: "generation.muster-out" },
    );
    const resolvedBenefits = resolveMusterOutBenefit(musteringOut, "scholar.benefits", 1);

    expect(completed.phase).toBe("term-complete");
    expect(completed.careerHistory).toEqual([
      expect.objectContaining({
        careerId: "scholar",
        assignmentId: "scholar.researcher",
        survived: true,
      }),
    ]);
    expect(resolvedBenefits.phase).toBe("generation-complete");
    expect(resolvedBenefits.credits).toBeGreaterThanOrEqual(8000);
  });

  it("offers Entertainer as a Basic Human career option", () => {
    expect(getCurrentLifepathStep(careerChoiceState(), basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.choose-career",
      options: expect.arrayContaining([
        expect.objectContaining({
          id: "entertainer",
          label: "Entertainer",
        }),
      ]),
    });
  });

  it("shows University graduate DMs when entering Entertainer", () => {
    const career = applyLifepathAction(
      universityGraduateCareerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "entertainer" },
    );

    expect(getCurrentLifepathStep(career, basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.career.qualification",
      data: {
        careerId: "entertainer",
        modifiers: [
          {
            id: "entertainer.university-graduate",
            label: "University graduate",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
      },
    });
  });

  it("can resolve a first Entertainer term and muster out", () => {
    const career = applyLifepathAction(
      careerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "entertainer" },
    );
    const qualified = applyLifepathAction(
      career,
      basicHumanLifepathDefinition,
      { type: "career.qualification.resolve" },
      queuedRolls(6),
    );
    const assigned = applyLifepathAction(
      qualified,
      basicHumanLifepathDefinition,
      { type: "assignment.select", assignmentId: "entertainer.performer" },
    );
    const completed = resolveLifepathTerm(
      assigned,
      basicHumanLifepathDefinition,
      queuedRolls(8, 1, 2, 8, 8),
    );
    const musteringOut = applyLifepathAction(
      completed,
      basicHumanLifepathDefinition,
      { type: "generation.muster-out" },
    );
    const resolvedBenefits = resolveMusterOutBenefit(musteringOut, "entertainer.benefits", 1);

    expect(completed.phase).toBe("term-complete");
    expect(completed.careerHistory).toEqual([
      expect.objectContaining({
        careerId: "entertainer",
        assignmentId: "entertainer.performer",
        survived: true,
      }),
    ]);
    expect(resolvedBenefits.phase).toBe("generation-complete");
    expect(resolvedBenefits.credits).toBeGreaterThanOrEqual(10000);
  });

  it("shows University graduate DMs when entering Free Trader", () => {
    const career = applyLifepathAction(
      universityGraduateCareerChoiceState(),
      basicHumanLifepathDefinition,
      { type: "career.select", careerId: "free-trader" },
    );

    expect(getCurrentLifepathStep(career, basicHumanLifepathDefinition)).toMatchObject({
      id: "lifepath.career.qualification",
      data: {
        careerId: "free-trader",
        modifiers: [
          {
            id: "free-trader.university-graduate",
            label: "University graduate",
            modifier: 1,
          },
        ],
        extraModifierTotal: 1,
      },
    });
  });

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
      expect.objectContaining({
        type: "rank.benefit",
        label: "Rank benefit: Senior Crew",
        detail: "Gained Admin-1",
      }),
    ]));
    expect(draft.log.at(-1)).toMatchObject({
      type: "benefit.roll",
    });
  });

  it("preserves failed pre-career admission in history", () => {
    const selected = applyLifepathAction(
      backgroundState(),
      basicHumanLifepathDefinition,
      { type: "preCareer.select", educationId: "military-academy" },
    );
    const failedAdmission = applyLifepathAction(
      selected,
      basicHumanLifepathDefinition,
      { type: "preCareer.qualification.resolve" },
      queuedRolls(2),
    );

    const draft = buildLifepathDraft(
      failedAdmission,
      basicHumanLifepathDefinition,
      "Failed Cadet",
    );

    expect(draft.history).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "preCareer.select",
        label: "Selected pre-career education: Military Academy",
      }),
      expect.objectContaining({
        type: "preCareer.qualification.roll",
        label: "Failed admission: Military Academy",
        detail: expect.stringContaining("not admitted"),
      }),
    ]));
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

  it("preserves relationship metadata in draft and character sheet metadata", () => {
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
    const relationship = {
      id: "rel-scout-trade-referral",
      type: "contact",
      label: "Scout trade referral",
      source: "qualification-history",
      careerId: "free-trader",
      term: 1,
      notes: "Introduced by a scout route contact.",
      characterId: "npc-scout-referral",
      role: "scout-broker",
      eventId: "term-1.free-trader.event",
      eventType: "career-event.roll",
    };
    const draft = buildLifepathDraft(
      {
        ...termComplete,
        relationships: [...termComplete.relationships, relationship],
      },
      basicHumanLifepathDefinition,
      "Test Traveller",
    );
    const sheet = lifepathDraftToCharacterSheet(draft);

    expect(draft.relationships).toContainEqual(relationship);
    expect(sheet.generation.metadata).toMatchObject({
      relationships: [relationship],
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
      careerChoiceState(),
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
          detail: "Roll 3 +1 INT = 4 vs 5+; not qualified; Met Scout recruiter.",
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
