import { economyPlugin } from "..";
import type { PluginEventHandler } from "@/plugin-api/types";
import {
  economyLedgerPostEffectType,
  economyPluginId,
  economyStateKey,
} from "../metadata";
import { economyLedgerPostResolver } from "../effectResolvers";
import { economyMonthlyExpensesHandler } from "../handlerRegistration";
import economyReducer, {
  commitEconomyLedgerRequest,
  initialEconomyState,
  recordEconomyLegacyMonthlyExpenses,
  recordEconomyLedgerRequest,
} from "../economySlice";
import {
  getPluginEffectResolversForType,
  resolvePluginWorkflowEffect,
} from "../../effectResolverRegistry";

describe("economy effect resolvers", () => {
  it("registers the economy plugin manifest", () => {
    expect(economyPlugin.metadata.id).toBe(economyPluginId);
    expect(economyPlugin.state.stateKey).toBe(economyStateKey);
    expect(economyPlugin.effectResolvers).toContain(economyLedgerPostResolver);
  });

  it("accepts balanced ledger posts", async () => {
    const resolution = await resolvePluginWorkflowEffect({
      type: economyLedgerPostEffectType,
      source: "test.expenses",
      payload: {
        memo: "Monthly expenses",
        entries: [
          { accountId: "character:owner:credits", change: -1000 },
          { accountId: "sink:monthly-expenses", change: 1000 },
        ],
      },
    }, {
      source: "test.workflow",
      currentTurn: 4,
    });

    expect(resolution).toMatchObject({
      status: "accepted",
      pluginId: economyPluginId,
      resolverId: economyLedgerPostResolver.id,
      reason: "Monthly expenses",
      actions: [expect.objectContaining({ type: recordEconomyLedgerRequest.type })],
    });
    expect(resolution.actions?.[0].payload).toMatchObject({
      total: 1000,
      validationStatus: "accepted",
      commitStatus: "notRequired",
    });
  });

  it("accepts debt ledger posts when policy allows debt", async () => {
    const resolution = await resolvePluginWorkflowEffect({
      type: economyLedgerPostEffectType,
      source: "test.expenses",
      payload: {
        memo: "Debt allowed",
        entries: [
          { accountId: "character:owner:credits", change: -1000 },
          { accountId: "sink:monthly-expenses", change: 1000 },
        ],
        funding: {
          availableCredits: 100,
          policy: "allowDebt",
        },
      },
    }, {
      source: "test.workflow",
      currentTurn: 4,
    });

    expect(resolution).toMatchObject({
      status: "accepted",
      reason: "Debt allowed",
    });
    expect(resolution.actions?.[0].payload).toMatchObject({
      fundingStatus: "debt",
      projectedBalance: -900,
      policy: "allowDebt",
      policyOutcome: "accepted",
      commitStatus: "notRequired",
    });
  });

  it("marks accepted ledger posts as pending when commit intent is pending", async () => {
    const resolution = await resolvePluginWorkflowEffect({
      type: economyLedgerPostEffectType,
      source: "test.expenses",
      payload: {
        memo: "Pending commit",
        commit: "pending",
        entries: [
          { accountId: "character:owner:credits", change: -1000 },
          { accountId: "sink:monthly-expenses", change: 1000 },
        ],
      },
    }, {
      source: "test.workflow",
      currentTurn: 4,
    });

    expect(resolution).toMatchObject({
      status: "accepted",
    });
    expect(resolution.actions?.[0].payload).toMatchObject({
      validationStatus: "accepted",
      commitStatus: "pending",
    });
  });

  it("rejects debt ledger posts when policy blocks payment", async () => {
    const resolution = await resolvePluginWorkflowEffect({
      type: economyLedgerPostEffectType,
      source: "test.expenses",
      payload: {
        memo: "Debt blocked",
        entries: [
          { accountId: "character:owner:credits", change: -1000 },
          { accountId: "sink:monthly-expenses", change: 1000 },
        ],
        funding: {
          availableCredits: 100,
          policy: "blockPayment",
        },
      },
    }, {
      source: "test.workflow",
      currentTurn: 4,
    });

    expect(resolution).toMatchObject({
      status: "rejected",
      reason: "Ledger post blocked by debt policy",
    });
    expect(resolution.actions?.[0].payload).toMatchObject({
      status: "rejected",
      validationStatus: "rejected",
      commitStatus: "blocked",
      fundingStatus: "debt",
      projectedBalance: -900,
      policy: "blockPayment",
      policyOutcome: "blocked",
    });
  });

  it("rejects unbalanced ledger posts", async () => {
    await expect(resolvePluginWorkflowEffect({
      type: economyLedgerPostEffectType,
      source: "test.expenses",
      payload: {
        entries: [
          { accountId: "character:owner:credits", change: -1000 },
          { accountId: "sink:monthly-expenses", change: 900 },
        ],
      },
    }, {
      source: "test.workflow",
      currentTurn: 4,
    })).resolves.toMatchObject({
      status: "rejected",
      reason: "Ledger post entries must balance to zero",
    });
  });

  it("routes ledger post effects to the economy resolver", () => {
    expect(getPluginEffectResolversForType(economyLedgerPostEffectType)).toContain(
      economyLedgerPostResolver,
    );
  });

  it("proposes mortgage and crew salary ledger entries on monthly expense turns", async () => {
    const handler = economyMonthlyExpensesHandler as PluginEventHandler;

    const result = await Promise.resolve(handler.handle({
      source: "test.workflow",
      lifecycle: "world",
      previousTurn: 3,
      currentTurn: 4,
      ownerCharacter: {
        id: "owner-1",
        name: "Owner",
        upp: "777777",
        strength: 7,
        dexterity: 7,
        endurance: 7,
        intelligence: 7,
        education: 7,
        socialStanding: 7,
        credits: 100000,
        skills: [],
        worldName: null,
        sectorAbbr: null,
        hex: null,
      },
      ship: {
        id: "ship-1",
        name: "Free Trader",
        type: "free_trader",
        jumpRating: 1,
        status: "docked",
        isMortgaged: true,
        mortgagePaid: 0,
        currentWorldId: "world-1",
        worldName: "Regina",
        sectorAbbr: "Spin",
        hex: "1910",
        cargoCapacity: 82,
        destinationWorldId: null,
        jumpArrivesTurn: null,
        cargo: [],
        crew: [
          {
            id: "crew-owner",
            role: "owner",
            isOwnerOperator: true,
            monthlySalary: 0,
            characterId: "owner-1",
            characterName: "Owner",
            npcName: null,
            keySkillName: null,
            keySkillLevel: 0,
          },
          {
            id: "crew-pilot",
            role: "pilot",
            isOwnerOperator: false,
            monthlySalary: 1000,
            characterId: null,
            characterName: null,
            npcName: "Pilot",
            keySkillName: "Pilot",
            keySkillLevel: 1,
          },
        ],
      },
    }, {
      source: "test.workflow",
      currentTurn: 4,
    }));

    expect(result).toMatchObject({
      disposition: "continue",
      effects: [expect.objectContaining({
        type: economyLedgerPostEffectType,
        source: economyPluginId,
      })],
    });
    expect(result.effects?.[0].payload).toMatchObject({
      commit: "pending",
    });
    expect(result.effects?.[0].payload?.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: "character:owner-1:credits",
          change: expect.any(Number),
        }),
        expect.objectContaining({
          accountId: "sink:monthly-mortgage",
          change: expect.any(Number),
        }),
        expect.objectContaining({
          accountId: "sink:crew-salaries",
          change: 1000,
        }),
      ]),
    );
  });

  it("marks monthly ledger requests when the legacy total matches", () => {
    const state = economyReducer(initialEconomyState, recordEconomyLedgerRequest({
      id: "ledger-1",
      turn: 4,
      source: economyPluginId,
      effectType: economyLedgerPostEffectType,
      status: "accepted",
      memo: "Monthly ship expenses",
      total: 167920,
      entries: [
        { accountId: "character:owner-1:credits", change: -167920 },
        { accountId: "sink:monthly-mortgage", change: 150920 },
        { accountId: "sink:crew-salaries", change: 17000 },
      ],
      createdAt: 1,
    }));

    const compared = economyReducer(state, recordEconomyLegacyMonthlyExpenses({
      turn: 4,
      total: 167920,
      newCredits: 1000,
      source: "legacy.monthlyCosts",
    }));

    expect(compared.ledgerRequests[0]).toMatchObject({
      legacyTotal: 167920,
      legacyNewCredits: 1000,
      comparisonStatus: "match",
    });
  });

  it("normalizes status-only ledger request payloads", () => {
    const state = economyReducer(initialEconomyState, recordEconomyLedgerRequest({
      id: "legacy-payload-1",
      turn: 4,
      source: "test.expenses",
      effectType: economyLedgerPostEffectType,
      status: "accepted",
      memo: "Legacy payload",
      total: 1000,
      entries: [
        { accountId: "character:owner-1:credits", change: -1000 },
        { accountId: "sink:monthly-expenses", change: 1000 },
      ],
      createdAt: 1,
    }));

    expect(state.ledgerRequests[0]).toMatchObject({
      status: "accepted",
      validationStatus: "accepted",
      commitStatus: "notRequired",
    });
  });

  it("simulates committing a pending ledger request", () => {
    const pendingState = economyReducer(initialEconomyState, recordEconomyLedgerRequest({
      id: "pending-1",
      turn: 4,
      source: economyPluginId,
      effectType: economyLedgerPostEffectType,
      status: "accepted",
      validationStatus: "accepted",
      commitStatus: "pending",
      memo: "Monthly ship expenses",
      total: 1000,
      entries: [
        { accountId: "character:owner-1:credits", change: -1000 },
        { accountId: "sink:monthly-expenses", change: 1000 },
      ],
      createdAt: 1,
    }));

    const committedState = economyReducer(
      pendingState,
      commitEconomyLedgerRequest({ id: "pending-1" }),
    );

    expect(committedState.ledgerRequests[0]).toMatchObject({
      commitStatus: "committed",
      commitNote: "Simulated commit bridge completed",
    });
  });

  it("can record a simulated commit failure", () => {
    const pendingState = economyReducer(initialEconomyState, recordEconomyLedgerRequest({
      id: "pending-fail-1",
      turn: 4,
      source: economyPluginId,
      effectType: economyLedgerPostEffectType,
      status: "accepted",
      validationStatus: "accepted",
      commitStatus: "pending",
      memo: "Monthly ship expenses",
      total: 1000,
      entries: [
        { accountId: "character:owner-1:credits", change: -1000 },
        { accountId: "sink:monthly-expenses", change: 1000 },
      ],
      createdAt: 1,
    }));

    const failedState = economyReducer(
      pendingState,
      commitEconomyLedgerRequest({
        id: "pending-fail-1",
        result: "failed",
        note: "Simulated persistence error",
      }),
    );

    expect(failedState.ledgerRequests[0]).toMatchObject({
      commitStatus: "failed",
      commitNote: "Simulated persistence error",
    });
  });

  it("does not commit non-pending ledger requests", () => {
    const notRequiredState = economyReducer(initialEconomyState, recordEconomyLedgerRequest({
      id: "scenario-1",
      turn: 0,
      source: "core.expenseScenario",
      effectType: economyLedgerPostEffectType,
      status: "accepted",
      validationStatus: "accepted",
      commitStatus: "notRequired",
      memo: "Expense scenario",
      total: 1000,
      entries: [
        { accountId: "scenario:owner:credits", change: -1000 },
        { accountId: "sink:monthly-expenses", change: 1000 },
      ],
      createdAt: 1,
    }));

    const nextState = economyReducer(
      notRequiredState,
      commitEconomyLedgerRequest({ id: "scenario-1" }),
    );

    expect(nextState.ledgerRequests[0]).toMatchObject({
      commitStatus: "notRequired",
    });
    expect(nextState.ledgerRequests[0].commitNote).toBeUndefined();
  });

  it("keeps one monthly ledger request per source and turn", () => {
    const firstState = economyReducer(initialEconomyState, recordEconomyLedgerRequest({
      id: "ledger-1",
      turn: 4,
      source: economyPluginId,
      effectType: economyLedgerPostEffectType,
      status: "accepted",
      memo: "Monthly ship expenses",
      total: 167920,
      entries: [
        { accountId: "character:owner-1:credits", change: -167920 },
        { accountId: "sink:monthly-mortgage", change: 150920 },
        { accountId: "sink:crew-salaries", change: 17000 },
      ],
      createdAt: 1,
    }));
    const comparedState = economyReducer(firstState, recordEconomyLegacyMonthlyExpenses({
      turn: 4,
      total: 167920,
      newCredits: 1000,
      source: "legacy.monthlyCosts",
    }));
    const replacedState = economyReducer(comparedState, recordEconomyLedgerRequest({
      id: "ledger-2",
      turn: 4,
      source: economyPluginId,
      effectType: economyLedgerPostEffectType,
      status: "accepted",
      memo: "Monthly ship expenses",
      total: 167920,
      entries: [
        { accountId: "character:owner-1:credits", change: -167920 },
        { accountId: "sink:monthly-mortgage", change: 150920 },
        { accountId: "sink:crew-salaries", change: 17000 },
      ],
      createdAt: 2,
    }));

    expect(replacedState.ledgerRequests).toHaveLength(1);
    expect(replacedState.ledgerRequests[0]).toMatchObject({
      id: "ledger-2",
      comparisonStatus: "match",
      comparisonTotal: 167920,
      legacyTotal: 167920,
    });
  });

  it("allows a replacement request to update comparison status", () => {
    const mismatchState = economyReducer(initialEconomyState, recordEconomyLedgerRequest({
      id: "scenario-1",
      turn: 0,
      source: "core.expenseScenario",
      effectType: economyLedgerPostEffectType,
      status: "accepted",
      memo: "Expense scenario",
      total: 17000,
      entries: [
        { accountId: "scenario:owner:credits", change: -17000 },
        { accountId: "sink:crew-salaries", change: 17000 },
      ],
      createdAt: 1,
      comparisonTotal: 167920,
      comparisonLabel: "Expected",
      comparisonStatus: "mismatch",
    }));
    const matchState = economyReducer(mismatchState, recordEconomyLedgerRequest({
      id: "scenario-2",
      turn: 0,
      source: "core.expenseScenario",
      effectType: economyLedgerPostEffectType,
      status: "accepted",
      memo: "Expense scenario",
      total: 167920,
      entries: [
        { accountId: "scenario:owner:credits", change: -167920 },
        { accountId: "sink:monthly-mortgage", change: 150920 },
        { accountId: "sink:crew-salaries", change: 17000 },
      ],
      createdAt: 2,
      comparisonTotal: 167920,
      comparisonLabel: "Expected",
      comparisonStatus: "match",
    }));

    expect(matchState.ledgerRequests).toHaveLength(1);
    expect(matchState.ledgerRequests[0]).toMatchObject({
      id: "scenario-2",
      total: 167920,
      comparisonTotal: 167920,
      comparisonStatus: "match",
    });
    expect(matchState.ledgerRequests[0].legacyTotal).toBeUndefined();
  });

  it("keeps successful monthly ledger requests from different turns", () => {
    const turnFourState = economyReducer(initialEconomyState, recordEconomyLedgerRequest({
      id: "ledger-4",
      turn: 4,
      source: economyPluginId,
      effectType: economyLedgerPostEffectType,
      status: "accepted",
      memo: "Monthly ship expenses",
      total: 167920,
      entries: [
        { accountId: "character:owner-1:credits", change: -167920 },
        { accountId: "sink:monthly-mortgage", change: 150920 },
        { accountId: "sink:crew-salaries", change: 17000 },
      ],
      createdAt: 1,
    }));
    const turnEightState = economyReducer(turnFourState, recordEconomyLedgerRequest({
      id: "ledger-8",
      turn: 8,
      source: economyPluginId,
      effectType: economyLedgerPostEffectType,
      status: "accepted",
      memo: "Monthly ship expenses",
      total: 167920,
      entries: [
        { accountId: "character:owner-1:credits", change: -167920 },
        { accountId: "sink:monthly-mortgage", change: 150920 },
        { accountId: "sink:crew-salaries", change: 17000 },
      ],
      createdAt: 2,
    }));

    expect(turnEightState.ledgerRequests.map((request) => request.turn)).toEqual([8, 4]);
  });

  it("logs a pending legacy observation when no economy request exists", () => {
    const state = economyReducer(initialEconomyState, recordEconomyLegacyMonthlyExpenses({
      turn: 4,
      total: 167920,
      newCredits: 1000,
      source: "legacy.monthlyCosts",
    }));

    expect(state.ledgerRequests[0]).toMatchObject({
      turn: 4,
      source: "legacy.monthlyCosts",
      status: "unresolved",
      legacyTotal: 167920,
      comparisonStatus: "pending",
    });
  });
});
