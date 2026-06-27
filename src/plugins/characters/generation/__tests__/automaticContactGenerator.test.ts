import { generateAutomaticContactSheet } from "../automaticContactGenerator";

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

describe("generateAutomaticContactSheet", () => {
  it("generates a complete NPC contact sheet with history", () => {
    const sheet = withMockedRandom([0.5], () =>
      generateAutomaticContactSheet({
        currentLocation: "Spin:1809",
        targetTerms: 1,
      }));

    expect(sheet.name).not.toBe("Unnamed Traveller");
    expect(sheet.gender).toBeTruthy();
    expect(sheet.currentLocation).toBe("Spin:1809");
    expect(sheet.generation.ruleset).toBe("lifepath");
    expect(sheet.generation.metadata?.history).toEqual(expect.any(Array));
    expect((sheet.generation.metadata?.history as unknown[]).length).toBeGreaterThan(0);
  });

  it("treats lifepath generation-complete as terminal", () => {
    const sheet = withMockedRandom([0.5], () =>
      generateAutomaticContactSheet({
        currentLocation: null,
        targetTerms: 0,
      }));

    expect(sheet.generation.metadata?.completedTerms).toBeGreaterThanOrEqual(0);
    expect(sheet.generation.metadata?.history).toEqual(expect.any(Array));
  });

  it("recovers when a mishap clears the active career before the target terms are reached", () => {
    const sheet = withMockedRandom([0], () =>
      generateAutomaticContactSheet({
        currentLocation: "Spin:1910",
        targetTerms: 2,
      }));

    expect(sheet.currentLocation).toBe("Spin:1910");
    expect(sheet.generation.metadata?.completedTerms).toBeGreaterThanOrEqual(1);
    expect(sheet.generation.metadata?.history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "career.change" }),
      ]),
    );
  });

  it("keeps generated lifepath relationships abstract on the sheet", () => {
    const sheet = withMockedRandom([0], () =>
      generateAutomaticContactSheet({
        currentLocation: null,
        targetTerms: 1,
      }));

    expect(sheet.generation.metadata?.relationships).toEqual(expect.any(Array));
    expect(sheet.generation.metadata?.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: expect.any(String) }),
      ]),
    );
  });
});
