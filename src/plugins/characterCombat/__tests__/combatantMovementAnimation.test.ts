import { shouldStartCombatantMovement } from "../combatantMovementAnimation";

const movement = {
  sequence: 3,
  path: [
    [0, 0, 0],
    [1, 0, 0],
  ] as [number, number, number][],
  mode: "walk" as const,
};

describe("combatant movement animation", () => {
  it("starts a movement sequence supplied on initial mount", () => {
    expect(shouldStartCombatantMovement(null, movement)).toBe(true);
  });

  it("does not replay an animation sequence that was already handled", () => {
    expect(shouldStartCombatantMovement(3, movement)).toBe(false);
  });

  it("does not animate a path without a movement segment", () => {
    expect(
      shouldStartCombatantMovement(null, {
        ...movement,
        path: [[0, 0, 0]],
      }),
    ).toBe(false);
  });
});
