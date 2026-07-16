import { resolveAhlMoraleCheck } from "../combatResolution";

describe("AHL morale checks", () => {
  it("passes when 2d6 is below morale", () => {
    expect(resolveAhlMoraleCheck({ moraleFactor: 7, woundState: "healthy" }, { first: 3, second: 3 })).toEqual({
      roll: 6,
      baseMorale: 7,
      lightWoundModifier: 0,
      leadershipModifier: 0,
      modifiedMorale: 7,
      passed: true,
    });
  });

  it("passes when 2d6 equals modified morale", () => {
    expect(resolveAhlMoraleCheck({ moraleFactor: 7, woundState: "healthy" }, { first: 3, second: 4 }).passed).toBe(true);
  });

  it("fails when 2d6 exceeds modified morale", () => {
    expect(resolveAhlMoraleCheck({ moraleFactor: 7, woundState: "healthy" }, { first: 4, second: 4 }).passed).toBe(false);
  });

  it("reduces morale by one for a light wound", () => {
    expect(resolveAhlMoraleCheck({ moraleFactor: 7, woundState: "light" }, { first: 3, second: 4 })).toMatchObject({
      lightWoundModifier: -1,
      modifiedMorale: 6,
      passed: false,
    });
  });

  it("applies leadership to morale rather than the dice roll", () => {
    expect(resolveAhlMoraleCheck({ moraleFactor: 7, woundState: "healthy" }, { first: 4, second: 4 }, 1)).toEqual({
      roll: 8,
      baseMorale: 7,
      lightWoundModifier: 0,
      leadershipModifier: 1,
      modifiedMorale: 8,
      passed: true,
    });
  });
});
