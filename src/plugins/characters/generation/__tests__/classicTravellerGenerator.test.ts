import {
  characterSheetToLogEvents,
  classicTravellerGenerator,
  classicTravellerGeneratorId,
} from "../classicTravellerGenerator";
import type { CharacterSheet } from "@/lib/characters/types";

const sheet: CharacterSheet = {
  name: "Test Traveller",
  age: 22,
  upp: { str: 7, dex: 8, end: 9, int: 10, edu: 11, soc: 6 },
  skills: [{ name: "Pilot", level: 1 }],
  careers: [{ career: "merchants", terms: 1, rank: 0, commissioned: false }],
  credits: 1000,
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
    ruleset: "classic",
    mode: "random",
    targetRole: null,
    decisions: [
      {
        step: "characteristics",
        term: null,
        options: [],
        chosen: "789AB6",
        roll: null,
        madeBy: "random",
      },
      {
        step: "career_selection",
        term: null,
        options: ["navy", "merchants"],
        chosen: "merchants",
        roll: null,
        madeBy: "human",
      },
    ],
  },
};

describe("classicTravellerGenerator", () => {
  it("exposes the classic generator plugin identity", () => {
    expect(classicTravellerGenerator.id).toBe(classicTravellerGeneratorId);
    expect(classicTravellerGenerator.label).toBe("Classic Traveller");
  });

  it("maps existing generation decisions to ordered log events", () => {
    expect(characterSheetToLogEvents(sheet)).toEqual([
      {
        sequence: 0,
        type: "characteristics",
        term: null,
        label: "characteristics: 789AB6",
        data: {
          options: [],
          chosen: "789AB6",
          roll: null,
          madeBy: "random",
        },
      },
      {
        sequence: 1,
        type: "career_selection",
        term: null,
        label: "career_selection: merchants",
        data: {
          options: ["navy", "merchants"],
          chosen: "merchants",
          roll: null,
          madeBy: "human",
        },
      },
    ]);
  });
});
