import type { CharacterSheet } from "@/lib/characters/types";
import {
  applyLifepathAction,
  buildLifepathDraft,
  createInitialLifepathState,
  lifepathDraftToCharacterSheet,
  type LifepathRollProvider,
} from "../";
import { generateAutomaticContactSheet } from "../automaticContactGenerator";
import { basicHumanLifepathDefinition } from "../basicHuman";
import { extractPendingGeneratedContacts } from "../pendingContacts";

const baseSheet = (relationships: unknown[]): CharacterSheet => ({
  name: "Test",
  gender: "female",
  age: 34,
  upp: { str: 7, dex: 7, end: 7, int: 7, edu: 7, soc: 7 },
  skills: [],
  careers: [],
  credits: 0,
  benefits: {
    passages: { low: 0, middle: 0, high: 0 },
    ships: [],
    societies: [],
    weapons: [],
    retirementPay: null,
  },
  homeWorldId: null,
  currentLocation: null,
  generation: {
    ruleset: "lifepath",
    mode: "directed",
    targetRole: null,
    decisions: [],
    metadata: { relationships },
  },
});

const withMockedRandom = <T,>(values: readonly number[], run: () => T): T => {
  let index = 0;
  const spy = jest.spyOn(Math, "random").mockImplementation(() => {
    const value = values[index] ?? values[values.length - 1] ?? 0.5;
    index += 1;
    return value;
  });

  try {
    return run();
  } finally {
    spy.mockRestore();
  }
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

const failedUniversityAdmissionSheet = () => {
  const rolled = applyLifepathAction(
    createInitialLifepathState(basicHumanLifepathDefinition),
    basicHumanLifepathDefinition,
    { type: "characteristics.roll" },
    queuedRolls(6, 7, 8, 9, 10, 11),
  );
  const background = applyLifepathAction(
    rolled,
    basicHumanLifepathDefinition,
    {
      type: "background.skill.select",
      tableId: "basic-human.background-skills",
      entryId: "background-broker",
    },
  );
  const selected = applyLifepathAction(
    background,
    basicHumanLifepathDefinition,
    { type: "preCareer.select", educationId: "university" },
  );
  const failed = applyLifepathAction(
    selected,
    basicHumanLifepathDefinition,
    { type: "preCareer.qualification.resolve" },
    queuedRolls(2),
  );
  const draft = buildLifepathDraft(failed, basicHumanLifepathDefinition, "Test Traveller", "female");
  return lifepathDraftToCharacterSheet(draft);
};

describe("extractPendingGeneratedContacts", () => {
  it("normalizes unresolved lifepath relationships into pending contact requests", () => {
    const pending = extractPendingGeneratedContacts(baseSheet([
      {
        id: "rel-port-factor",
        type: "contact",
        label: "Port factor",
        careerId: "free-trader",
        term: 1,
        eventId: "free-trader.event.1",
        eventType: "career-event",
        notes: "Helped with a cargo dispute.",
      },
      {
        type: "rival",
        label: "Competing broker",
        careerId: "free-trader",
        term: 2,
      },
    ]));

    expect(pending).toEqual([
      {
        sourceKey: "rel-port-factor",
        type: "contact",
        attitude: 20,
        label: "Port factor",
        notes: "Helped with a cargo dispute.",
        careerId: "free-trader",
        term: 1,
        eventId: "free-trader.event.1",
        eventType: "career-event",
        role: null,
      },
      {
        sourceKey: "free-trader:term-2:rival:Competing broker:1",
        type: "rival",
        attitude: -40,
        label: "Competing broker",
        notes: null,
        careerId: "free-trader",
        term: 2,
        eventId: null,
        eventType: null,
        role: null,
      },
    ]);
  });

  it("skips malformed and already-resolved relationships", () => {
    const pending = extractPendingGeneratedContacts(baseSheet([
      { type: "contact" },
      { label: "Missing type" },
      { type: "ally", label: "Already generated", characterId: "npc-1" },
      { type: "enemy", label: "Dockside enemy" },
    ]));

    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      type: "enemy",
      attitude: -80,
      label: "Dockside enemy",
    });
  });

  it("can extract abstract relationships from an automatically generated NPC sheet without generating secondary contacts", () => {
    const sheet = withMockedRandom([0], () =>
      generateAutomaticContactSheet({
        currentLocation: null,
        targetTerms: 1,
      }));

    const pending = extractPendingGeneratedContacts(sheet);

    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((contact) => !contact.sourceKey.includes("[object Object]"))).toBe(true);
  });

  it("extracts contacts that are only visible in history details after pre-career failure", () => {
    const sheet = failedUniversityAdmissionSheet();

    expect(sheet.generation.metadata?.history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "preCareer.qualification.roll",
          detail: expect.stringContaining("Met Admissions tutor"),
        }),
      ]),
    );

    expect(extractPendingGeneratedContacts(sheet)).toEqual([
      expect.objectContaining({
        type: "contact",
        attitude: 20,
        label: "Admissions tutor",
        sourceKey: "pre-career.university.qualification:preCareer.qualification.roll:contact:Admissions tutor",
      }),
    ]);
  });
});
