import { characterStartDecision } from "../CharacterStartLifecycle";

describe("characterStartDecision", () => {
  it("waits for ship and character data to finish loading", () => {
    expect(characterStartDecision({
      shipStatus: "loading",
      hasShip: false,
      charactersStatus: "loaded",
      characterCount: 0,
    })).toBeNull();
    expect(characterStartDecision({
      shipStatus: "loaded",
      hasShip: false,
      charactersStatus: "loading",
      characterCount: 0,
    })).toBeNull();
  });

  it("does nothing when an active ship exists", () => {
    expect(characterStartDecision({
      shipStatus: "loaded",
      hasShip: true,
      charactersStatus: "loaded",
      characterCount: 1,
    })).toBeNull();
  });

  it("opens the character list when characters exist without a ship", () => {
    expect(characterStartDecision({
      shipStatus: "loaded",
      hasShip: false,
      charactersStatus: "loaded",
      characterCount: 1,
    })).toBe("open-character-list");
  });

  it("opens character generation for a new player", () => {
    expect(characterStartDecision({
      shipStatus: "loaded",
      hasShip: false,
      charactersStatus: "loaded",
      characterCount: 0,
    })).toBe("open-character-generation");
  });
});
